# CPE++ 官网设计与体验方案

## 产品定位

面向 4G / 5G CPE 调试者的产品官网。用户需要先看懂工具能做什么，再确认设备适配、平台版本和下载入口。服务状态必须显示实际检查结果，不能用装饰性绿点代替测量。

## 调研参考

- [Linear](https://linear.app/)：从实际界面展开叙事，用功能和场景解释价值。吸收信息层次，不复制品牌外观。
- [Raycast](https://www.raycast.com/)：以可操作的功能展示连接下载动作，控制解释文字长度。
- [GitHub Status](https://www.githubstatus.com/)：总体状态、服务分项、时间与观测范围分开表达。没有历史监控数据时不显示虚构可用率。

## 使用的 skills

两份外部 skill 下载到本地 `../cpe-web-design-skills/`，已在本次实现中读取使用；没有改写全局 Codex 设置。该目录的 SKILL.md 也可在后续任务中显式引用。

| Skill                 | 来源                                                                                         | 用途                                         |
| --------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| frontend-design       | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design)           | 有产品依据的构图、排版、文案与去模板化检查   |
| web-design-guidelines | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | 焦点、触控目标、语义控件、加载与失败状态审查 |

同时参考 [Chrome Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) 的动效与无障碍指导。项目沿用 Vue 3，未引入只适用于 React 的组件技能。

## 视觉系统

- 雾白背景 `#f3f6f2`、白色内容面 `#ffffff`、石墨文字 `#181b18`、墨绿强调 `#176b5b`；暗色背景 `#101613`。
- 中文优先 PingFang SC / Microsoft YaHei，正文跟随系统字号；数字使用等宽数字特性，接口代码使用系统等宽字体。无需下载外部字体。
- 首页采用文字与真实桌面/移动截图组合，随后展开可选择的诊断流程、设备适配与下载。左对齐为主，避免每个章节都变成相同的圆角卡片。
- 不使用虚构客户、评价、下载量、速度和在线信号数值；真实应用截图明确标为界面预览。
- 保留单次入场与操作反馈，取消持续装饰循环；尊重减少动态效果偏好。

## 状态页面的数据边界

状态来源是独立定时任务的 HTTP 检查，结果持续写入现有 `cpeweb` EdgeKV。展示 30/90 天每日可用率、采集覆盖率、最近 24 小时检查记录与异常记录。关闭页面不影响保存与采集。缺失记录与服务故障分开表达。部署步骤见 [STATUS-OPERATIONS.md](STATUS-OPERATIONS.md)。

## 页面结构

```text
首页：产品主张 + 真实截图 → 设备覆盖 → 可切换诊断界面 → 平台下载 → 服务状态
产品：诊断流程 → 桌面演示 → 移动演示 → 可搜索设备清单
下载：当前设备推荐 → 全平台选择 → 校验与下载进度
状态：整体运行情况 → 30/90 天可用率 → 每日记录 → 最新检查记录 → 异常记录
```
