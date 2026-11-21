# 服务状态监测部署说明

状态页位于 `#/status`。监测任务独立于浏览器运行，结果写入现有 `cpeweb` EdgeKV namespace。浏览器只读取记录，关闭页面不影响采集或历史保存。

## 上线步骤

1. 部署本仓库的 `edge/index.js`，保留现有 `/api/*` 路由和 `cpeweb` namespace。
2. 在 `cpeweb` 的现有 `config` JSON 中增加 `CPE_STATUS_TOKEN`，值为单独生成的长随机令牌。其他字段保持原值。也支持独立 KV key `CPE_STATUS_TOKEN`。该令牌必须单独配置，不复用 `CPE_STATS_TOKEN`。
3. 在 GitHub 仓库的 Actions secrets 中增加同名 `CPE_STATUS_TOKEN`，值与上一步一致。不要放入前端环境变量或提交到 Git。
4. 在默认分支启用 `.github/workflows/status-collector.yml`。默认监测地址为 `https://cpe.yuan6.cn`，可通过仓库变量 `CPE_STATUS_ORIGIN` 修改。
5. 手动运行一次 **Service availability monitoring**，确认 `GET /api/status/summary?days=30&verify=1` 的 `monitor.runUrl` 对应本次运行。随后验证至少两次 GitHub `schedule` 运行成功，并确认线上摘要的 `monitor.event` 为 `schedule`、最后检查时间持续更新。
6. 构建并部署 `dist/`。用户即可查看已保存的 30/90 天统计，历史从启用采集时开始积累。

## 采集任务

工作流每 5 分钟运行，使用 Node 24，无需安装 npm 依赖。检查官网 HTML、健康接口、版本列表，以及 Android、Windows、macOS 的实际 `POST /api/updates/check` 请求；响应结构、平台、渠道和下载方式均会校验。每轮把待补传记录合并为一个批次、一次写入 KV，避免边缘副本同步期间连续读改写丢失记录。

本地执行 `node scripts/collect-status.mjs --dry-run` 仅检查、不上传。已在环境中设置 `CPE_STATUS_TOKEN` 时，运行 `node scripts/collect-status.mjs` 会上传。只判断服务可用或不可用，不按响应耗时划分等级。单项检查保留 20 秒连接与读取超时，以便在连接异常时结束请求。

GitHub 定时任务可能延迟；公开仓库长期无活动时可能自动停用。页面以 15 分钟为新鲜度阈值，迟到或漏采会显示更新延迟和较低采集覆盖率。需要更严格的调度保障时，可使用下文的 Cloudflare Worker 采集，或由现有服务器运行同一脚本。

## Cloudflare Worker 采集

不使用自有服务器和 GitHub Actions 时，由 `deploy/cloudflare/status-monitor/` 中的 Worker 采集。Worker 只在 Cron Trigger 中运行，于每小时第 2、7、12…57 分钟（UTC）执行，与 Node 脚本共用 `scripts/status-client.mjs`：检查六项服务，带 `monitor.source = external`、`event = schedule` 写入 `/api/status/ingest`。Worker 不提供公开 URL。

上传失败（包括网站整体不可用时的真实故障结果）保存在 Workers KV 的 `pending` 键，下一轮合并补传；超过 7 天的记录移入 `expired-recovery`，不阻塞新采集。正常运行时每轮只读一次 KV，失败时才写入，免费额度足够。

Worker 需要：

| 名称                | 类型                 | 值                                  |
| ------------------- | -------------------- | ----------------------------------- |
| `CPE_STATUS_TOKEN`  | Secret               | 与 EdgeKV 一致的 `CPE_STATUS_TOKEN` |
| `CPE_STATUS_ORIGIN` | Text                 | `https://cpe.yuan6.cn`              |
| `STATUS_QUEUE`      | KV namespace binding | 新建的 Workers KV namespace         |

命令行部署：

```bash
cd deploy/cloudflare/status-monitor
npx wrangler@4 login
npx wrangler@4 kv namespace create STATUS_QUEUE   # 将输出的 id 填入 wrangler.toml
npx wrangler@4 secret put CPE_STATUS_TOKEN
npx wrangler@4 deploy
```

网页部署时，可用 `npx wrangler@4 deploy --dry-run --outdir dist-worker` 生成单文件 `dist-worker/worker.js`，粘贴到 Cloudflare 编辑器，再在 Settings 中添加上表的变量、KV 绑定和 Cron Trigger（`2,7,12,17,22,27,32,37,42,47,52,57 * * * *`）。

验收：Worker **Logs** 每轮输出一行 JSON，`stored + duplicates` 等于上传数量；线上摘要 `monitor.source` 为 `external`、`stale` 为 `false`，`lastCheckedAt` 和样本数持续增长；随后运行 `node scripts/verify-deployment.mjs --skip-downloads --require-fresh`。通过后删除 GitHub 工作流中的 `schedule`，避免多个主采集器并存。按 5 分钟槽位去重，切换期间短暂重叠不会产生重复样本。

Workers 免费版每次调用的 CPU 时间上限为 10 ms，等待网络不计入；若日志出现 `exceededCpu`，需改用 Workers Paid。停用时在 Cloudflare 中删除 Cron Trigger 或 Worker；EdgeKV 历史不受影响。

## Linux 服务器采集

安装包内的 `deploy/systemd/` 提供独立服务器方案。需要 Linux、systemd 与系统目录中的 Node 24+。安装器不安装 npm 依赖，不改变网站和 EdgeKV 中已有数据。

```bash
sudo bash scripts/install-status-monitor.sh
sudoedit /etc/cpe-status/collector.env
# 填入现有 EdgeKV 的 CPE_STATUS_TOKEN，保留默认监测域名。
sudo bash scripts/install-status-monitor.sh --enable
```

默认程序目录 `/opt/cpe-status`；安装时可设置 `CPE_INSTALL_DIR` 和 `CPE_NODE`，例如 `sudo CPE_NODE=/usr/local/bin/node bash scripts/install-status-monitor.sh`。Node 与程序均须位于 `/home`、`/root` 之外。更新时重跑安装器即可，配置和历史队列都会保留。

服务使用 systemd 动态用户；令牌文件为 root 所有、权限 0600，队列写入持久目录 `/var/lib/cpe-status/`。每小时第 2、7、12…57 分钟运行；重启后补一次触发。单次失败自动重试，后续周期继续补传。服务在同一时间只执行一个进程，网站不可用时也会保存真实失败结果。

```bash
sudo systemctl list-timers --all cpe-status.timer
sudo systemctl status cpe-status.service cpe-status.timer --no-pager
sudo journalctl -u cpe-status.service --since '1 hour ago' --no-pager
curl -fsS 'https://cpe.yuan6.cn/api/status/summary?days=30&verify=1'
```

切换验收：先在 GitHub 禁用 **Service availability monitoring**，避免两个采集器同时写入；启动服务器服务后，确认连续两轮检查均保存成功、`monitor.source` 为 `external`、`stale` 为 `false`，并核对历史样本增加。再删除 GitHub 工作流中的 `schedule` 并重新启用该工作流，保留手动检查和外部触发入口。若服务器部署失败，重新启用 GitHub 工作流以保留原有能力；已有历史不做清空。

停用服务器任务时执行 `sudo systemctl disable --now cpe-status.timer`；记录与令牌保留。需要即时采集可执行 `sudo systemctl start cpe-status.service`。

## 数据与接口

| 接口                              | 权限                                       | 用途                                 |
| --------------------------------- | ------------------------------------------ | ------------------------------------ |
| `GET /api/status/summary?days=30` | 公开                                       | 最近 30 天统计与最近 24 小时原始记录 |
| `GET /api/status/summary?days=90` | 公开                                       | 最近 90 天统计与最近 24 小时原始记录 |
| `POST /api/status/ingest`         | `Authorization: Bearer <CPE_STATUS_TOKEN>` | 上传单条报告或最多 2016 条的补传批次 |

服务状态使用一个 `status_v1_store` key，不覆盖现有统计或版本数据：

| key               | 数据                                            |
| ----------------- | ----------------------------------------------- |
| `status_v1_store` | 最近 100 天每日汇总、24 小时明细与 7 天去重槽位 |

记录持久保存，不随浏览器会话删除。每次采集运行将当前报告和待补传记录合并为一个请求，在一次 KV 写入中同时保存每日汇总与原始明细，避免连续读改写受边缘副本同步延迟影响。重试按 5 分钟时间槽去重。补传请求上限为 1.5 MiB、2016 条记录。按北京时间划分日期；API 时间戳使用 ISO 8601 UTC。

整体可用率以六项服务全部可用的轮次除以已采集轮次计算；单项可用率按该服务成功次数除以检查次数计算。采集覆盖率单独计算为已采集轮次与计划时间槽之比。没有数据的时段保持灰色，不算成功；故障记录保留，不由成功请求覆盖。

上传失败时，未上传报告保存在 `.status-reports/pending.json`，工作流通过 Actions cache 在后续运行恢复并补写。补写窗口为 7 天；超过窗口的报告会转存到 `.status-reports/expired-recovery.json`，从待发送队列隔离，避免旧数据持续阻塞新采集，同时保留人工恢复所需的原始记录。请只运行一个主采集任务，避免不同节点在同一时间槽互相竞争。

## 本地验证

Vite 仅在开发模式为 `/api/status/*` 提供与线上函数相同的接口，使用 `.status-data/` 文件作为 EdgeKV 适配器；数据跨页面和 Vite 重启保留。开发令牌位于 `.status-data/monitor-token`，目录已加入 `.gitignore`。

其余 `/api` 请求仍代理现有官网。本地验证检查真实公共服务，但状态报告只写本地文件；生产构建不包含开发适配器或令牌。

测试见 `edge/__tests__/status-history.test.js`，覆盖鉴权、非法输入、去重、跨运行时持久读取、跨日汇总、写入失败重试及 KV 故障状态。

参考：[ESA EdgeKV API](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/edge-storage-api)、[ESA 函数限制](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/what-is-functions-and-pages)、[GitHub 定时工作流](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。
