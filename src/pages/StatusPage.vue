<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteIcon from '@/components/SiteIcon.vue'
import { useServiceStatus } from '@/composables/useServiceStatus'
import type { StatusDay } from '@/utils/status'

const {
  definitions,
  summary,
  results,
  history,
  daily,
  days,
  checking,
  autoRefresh,
  countdown,
  error,
  state,
  latest,
  stale,
  available,
  build,
  ageSeconds,
  refresh,
  setDays,
  toggleAutoRefresh,
} = useServiceStatus()
const exportMessage = ref('')
const selectedDay = ref<string | null>(null)
const selectedService = ref('')
const workflowUrl =
  'https://github.com/CPENetworkDashboard/CPENetworkDashboard-Web/actions/workflows/service-status.yml'
const headline = computed(() => {
  if (error.value) return '暂时无法读取服务状态'
  if (!latest.value) return checking.value ? '正在读取检查结果' : '等待首次检查'
  if (stale.value) return '当前状态待确认'
  return {
    operational: '所有服务可用',
    partial: '部分服务不可用',
    unavailable: '服务暂时不可用',
    unknown: '当前状态待确认',
  }[state.value]
})
const ageLabel = computed(() => {
  const age = ageSeconds.value
  if (age === null || !Number.isFinite(age)) return '尚无检查记录'
  if (age < 60) return '不到 1 分钟前'
  if (age < 3600) return Math.floor(age / 60) + ' 分钟前'
  if (age < 86400) return Math.floor(age / 3600) + ' 小时前'
  return Math.floor(age / 86400) + ' 天前'
})
const rows = computed(() =>
  definitions.map((definition) => ({
    ...definition,
    result: results.value.find((item) => item.id === definition.id),
    metric: summary.value?.services[definition.id],
  }))
)
const recentObservations = computed(() => [...history.value].reverse().slice(0, 8))
const failedObservations = computed(() =>
  [...history.value]
    .reverse()
    .filter((item) => item.services.some((service) => service.state === 'unavailable'))
    .slice(0, 6)
)
const chosenDay = computed(() => daily.value.find((day) => day.date === selectedDay.value))
const lowCoverage = computed(
  () => summary.value?.totals.coverage !== null && (summary.value?.totals.coverage ?? 100) < 80
)
const monitorLabel = computed(() =>
  !latest.value ? '等待采集' : stale.value ? '采集更新中断' : '采集记录已更新'
)
const lastEvent = computed(
  () =>
    ({
      schedule: '定时检查',
      workflow_dispatch: '手动检查',
      repository_dispatch: '外部触发',
      external: '独立采集',
    })[summary.value?.monitor?.event || ''] || '已保存的检查'
)
const hours = computed(() => {
  const end = Date.parse(summary.value?.generatedAt || new Date().toISOString())
  const lastHour = Math.floor(end / 3600000) * 3600000
  return Array.from({ length: 24 }, (_, index) => {
    const start = lastHour - (23 - index) * 3600000
    const samples = history.value.filter(
      (item) => Date.parse(item.at) >= start && Date.parse(item.at) < start + 3600000
    )
    const failed = samples.some((item) =>
      item.services.some((service) => service.state === 'unavailable')
    )
    const hourState = !samples.length ? 'unknown' : failed ? 'unavailable' : 'operational'
    return {
      at: new Date(start).toISOString(),
      state: hourState,
      count: samples.length,
      title:
        time(new Date(start).toISOString()) +
        ' · ' +
        (samples.length
          ? samples.length + ' 轮检查，' + (failed ? '发现异常' : '均可用')
          : '无检查记录'),
    }
  })
})
function time(value?: string | null, full = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return '等待数据'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    ...(full ? { month: '2-digit', day: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
function percent(value?: number | null) {
  return value === null || value === undefined ? '—' : value.toFixed(2) + '%'
}
function dayState(day: StatusDay, id: string) {
  const metric = day.services[id]
  return !metric?.checks
    ? 'unknown'
    : metric.failed
      ? 'unavailable'
      : (day.coverage ?? 0) < 80
        ? 'incomplete'
        : 'operational'
}
function dayLabel(day: StatusDay, id: string) {
  const metric = day.services[id]
  return (
    day.date +
    '：' +
    (metric?.checks
      ? metric.checks +
        ' 次检查，' +
        percent(metric.availability) +
        ' 可用，采集覆盖 ' +
        percent(day.coverage)
      : '无检查记录')
  )
}
function selectDay(date: string, id: string) {
  selectedDay.value = selectedDay.value === date && selectedService.value === id ? null : date
  selectedService.value = id
}
function availableServices(item: (typeof history.value)[number]) {
  return item.services.filter((service) => service.state === 'operational').length
}
function exportResults() {
  if (!summary.value) return
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(summary.value, null, 2)], { type: 'application/json' })
  )
  const a = document.createElement('a')
  a.href = url
  a.download = 'cpe-availability-' + days.value + 'days.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  exportMessage.value = '历史记录已导出'
}
</script>

<template>
  <section class="page-view status-dashboard" aria-labelledby="status-title">
    <header class="status-heading">
      <div>
        <RouterLink class="status-home" to="/">CPE加加</RouterLink>
        <h1 id="status-title">服务状态</h1>
        <p>官网与应用更新服务的可用性，以及每一次已保存的检查。</p>
      </div>
      <div class="status-tools">
        <button
          type="button"
          class="status-auto"
          :aria-pressed="autoRefresh"
          @click="toggleAutoRefresh"
        >
          <span class="status-switch" aria-hidden="true"></span>自动刷新</button
        ><button type="button" class="status-refresh" :disabled="checking" @click="refresh">
          <SiteIcon name="refresh" :class="{ 'is-spinning': checking }" />{{
            checking ? '读取中' : '刷新记录'
          }}
        </button>
      </div>
    </header>
    <div class="status-overview">
      <section class="status-banner" :data-state="state" aria-live="polite" aria-atomic="true">
        <div class="status-banner-icon">
          <SiteIcon
            :name="state === 'operational' ? 'check' : state === 'unknown' ? 'clock' : 'activity'"
            :size="30"
          />
        </div>
        <div class="status-banner-copy">
          <span class="status-banner-kicker">当前服务</span>
          <h2>{{ headline }}</h2>
          <p v-if="latest">
            最近检查于 <time :datetime="latest.at">{{ time(latest.at, true) }}</time
            >（北京时间）
          </p>
          <p v-else>首次检查完成后，这里将展示已验证的运行状态。</p>
          <p v-if="stale && latest" class="status-stale-note">
            最后一条记录已过期，不能据此判断服务当前是否可用。
          </p>
          <p v-else-if="!error && latest">
            {{ available }} / {{ definitions.length }} 项服务检查通过
          </p>
        </div>
        <span class="status-banner-age">{{ ageLabel }}</span>
      </section>
      <aside
        class="status-collector"
        :data-state="stale || error ? 'delayed' : 'current'"
        aria-label="采集任务状态"
      >
        <div class="status-collector-title">
          <SiteIcon name="activity" :size="18" /><strong>{{ monitorLabel }}</strong>
        </div>
        <p>
          {{
            stale
              ? '独立采集未按计划更新。刷新页面只会重新读取历史。'
              : '页面从持久记录读取，关闭网页也会保留历史。'
          }}
        </p>
        <div><span>计划周期</span><strong>每 5 分钟</strong></div>
        <div>
          <span>最近来源</span><strong>{{ lastEvent }}</strong>
        </div>
        <a :href="summary?.monitor?.runUrl || workflowUrl" target="_blank" rel="noopener noreferrer"
          >查看采集任务<SiteIcon name="github" :size="16"
        /></a>
      </aside>
    </div>
    <p v-if="error" class="status-read-error" role="alert">
      {{ error }}<span v-if="latest">以下保留最近一次成功读取的历史。</span>
    </p>
    <section class="status-history" aria-labelledby="availability-title">
      <div class="status-section-top">
        <div>
          <h2 id="availability-title">历史可用性</h2>
          <p>按实际完成的检查计算，未采集时段不计为成功。</p>
        </div>
        <div class="status-range" role="group" aria-label="历史统计周期">
          <button
            v-for="range in [30, 90] as const"
            :key="range"
            type="button"
            :aria-pressed="days === range"
            :disabled="checking"
            @click="setDays(range)"
          >
            近 {{ range }} 天
          </button>
        </div>
      </div>
      <dl class="status-metrics">
        <div>
          <dt>已检查记录可用率</dt>
          <dd>{{ percent(summary?.totals.availability) }}</dd>
          <small>{{
            lowCoverage ? '覆盖不足，请结合采集覆盖率查看' : '六项服务均可用的检查占比'
          }}</small>
        </div>
        <div>
          <dt>采集覆盖率</dt>
          <dd>{{ percent(summary?.totals.coverage) }}</dd>
          <small>实际检查 / 计划检查</small>
        </div>
        <div>
          <dt>已保存检查</dt>
          <dd>{{ summary?.totals.samples.toLocaleString('zh-CN') ?? '—' }}<span> 轮</span></dd>
          <small>历史持续保存在服务端</small>
        </div>
      </dl>
      <p v-if="lowCoverage" class="status-coverage-note">
        <SiteIcon
          name="info"
          :size="16"
        />部分时段缺少记录。历史可用率仅描述已检查的样本，不代表整个周期连续可用。
      </p>
    </section>
    <section class="status-components" aria-labelledby="components-title" :aria-busy="checking">
      <div class="status-section-top">
        <div>
          <h2 id="components-title">服务组件</h2>
          <p>
            {{
              stale
                ? '当前状态待确认，以下保留历史检查情况。'
                : '官网和应用实际使用的更新检查接口。'
            }}
          </p>
        </div>
        <span class="status-refresh-note">{{
          checking ? '读取中' : autoRefresh ? countdown + ' 秒后刷新' : '已暂停刷新'
        }}</span>
      </div>
      <div class="status-component-list">
        <article
          v-for="row in rows"
          :key="row.id"
          class="status-component"
          :data-state="stale || error ? 'unknown' : row.result?.state || 'unknown'"
        >
          <div class="status-component-heading">
            <div class="status-component-name">
              <span class="status-component-icon"
                ><SiteIcon
                  :name="
                    row.id === 'website'
                      ? 'globe'
                      : row.platform === 'android'
                        ? 'android'
                        : row.platform === 'windows'
                          ? 'windows'
                          : row.platform === 'macos'
                            ? 'apple'
                            : 'code'
                  "
              /></span>
              <h3>
                {{ row.name }}<small v-if="row.result?.version">v{{ row.result.version }}</small>
              </h3>
            </div>
            <span class="status-pill"
              ><i aria-hidden="true"></i
              >{{
                stale || error
                  ? '待确认'
                  : row.result?.state === 'operational'
                    ? '可用'
                    : row.result?.state === 'unavailable'
                      ? '不可用'
                      : '待检查'
              }}</span
            >
          </div>
          <div class="status-component-meta">
            <details>
              <summary>
                <code>{{ row.method }} {{ row.path }}</code
                ><SiteIcon name="chevron" :size="14" />
              </summary>
              <p>
                {{ row.description }}。{{
                  row.result
                    ? '最后检查：' + time(row.result.checkedAt, true) + '，' + row.result.detail
                    : '尚无检查记录'
                }}
              </p>
            </details>
            <span>已检查记录 {{ percent(row.metric?.availability) }}</span>
          </div>
          <div
            class="status-uptime-bars"
            :style="{ '--days': daily.length || days }"
            :aria-label="row.name + '每日运行记录'"
          >
            <button
              v-for="day in daily"
              :key="day.date"
              type="button"
              :data-state="dayState(day, row.id)"
              :title="dayLabel(day, row.id)"
              :aria-label="dayLabel(day, row.id)"
              :aria-pressed="selectedDay === day.date && selectedService === row.id"
              @click="selectDay(day.date, row.id)"
            ></button>
          </div>
          <div class="status-uptime-axis">
            <span>{{ daily[0]?.date || '—' }}</span
            ><span>今天</span>
          </div>
          <Transition name="status-detail"
            ><p
              v-if="chosenDay && selectedService === row.id"
              class="status-day-detail"
              role="status"
            >
              {{ dayLabel(chosenDay, row.id) }}
            </p></Transition
          >
        </article>
      </div>
      <div class="status-legend">
        <span><i data-state="operational"></i>可用</span
        ><span><i data-state="unavailable"></i>有异常</span
        ><span><i data-state="incomplete"></i>覆盖不足</span
        ><span><i data-state="unknown"></i>无记录</span>
      </div>
    </section>
    <section class="status-day-strip" aria-labelledby="day-title">
      <div class="status-section-top">
        <div>
          <h2 id="day-title">过去 24 小时</h2>
          <p>每格代表一小时。空白表示没有检查记录。</p>
        </div>
        <span>北京时间</span>
      </div>
      <div class="status-hour-grid">
        <div
          v-for="hour in hours"
          :key="hour.at"
          :data-state="hour.state"
          :title="hour.title"
          :aria-label="hour.title"
        >
          <i v-if="hour.count"></i>
        </div>
      </div>
      <div class="status-uptime-axis">
        <span>{{ time(hours[0]?.at) }}</span
        ><span>现在</span>
      </div>
    </section>
    <div class="status-bottom-grid">
      <section class="status-session" aria-labelledby="history-title">
        <div class="status-section-top">
          <h2 id="history-title">最近检查</h2>
          <button type="button" class="status-export" :disabled="!summary" @click="exportResults">
            <SiteIcon name="download" :size="16" />导出历史
          </button>
        </div>
        <ul v-if="recentObservations.length" class="status-observations">
          <li v-for="observation in recentObservations" :key="observation.at">
            <time :datetime="observation.at">{{ time(observation.at, true) }}</time
            ><span
              :data-state="
                availableServices(observation) === definitions.length
                  ? 'operational'
                  : 'unavailable'
              "
              >{{
                availableServices(observation) === definitions.length ? '全部可用' : '存在异常'
              }}</span
            ><small>{{ availableServices(observation) }} / {{ definitions.length }}</small>
          </li>
        </ul>
        <p v-else class="status-empty">检查完成后，记录会显示在这里。</p>
        <p class="status-export-message" role="status">{{ exportMessage }}</p>
      </section>
      <section class="status-events" aria-labelledby="events-title">
        <div class="status-section-top">
          <h2 id="events-title">异常记录</h2>
          <span>过去 24 小时</span>
        </div>
        <ul v-if="failedObservations.length">
          <li v-for="item in failedObservations" :key="item.at">
            <time :datetime="item.at">{{ time(item.at, true) }}</time>
            <p>
              {{
                item.services
                  .filter((service) => service.state === 'unavailable')
                  .map(
                    (service) =>
                      definitions.find((definition) => definition.id === service.id)?.name
                  )
                  .join('、')
              }}检查未通过
            </p>
          </li>
        </ul>
        <div v-else class="status-event-empty">
          <SiteIcon name="check" :size="25" /><strong>{{
            history.length ? '已检查记录中无异常' : '尚无异常记录'
          }}</strong>
          <p>{{ lowCoverage ? '未采集时段的运行情况未知。' : '异常会随检查结果持续记录。' }}</p>
        </div>
      </section>
    </div>
    <details class="status-method">
      <summary>监测方法与数据说明<SiteIcon name="chevron" :size="16" /></summary>
      <p>
        采集器独立检查官网、边缘服务、版本列表，以及 Android、Windows、macOS 更新接口。HTTP
        请求成功且返回结构有效才记为可用。结果写入现有 KV，按北京时间汇总，支持 30 / 90 天查询。
      </p>
      <p>
        任务按 5 分钟计划触发。GitHub 调度可能延迟或漏触发；超过 15
        分钟没有新检查时，当前状态显示为待确认。可用率仅计算已检查的样本，采集覆盖率另行展示。
      </p>
      <p v-if="build">
        最后检查的边缘构建 {{ build }}。{{
          summary?.firstCheckedAt ? '首次记录于 ' + time(summary.firstCheckedAt, true) + '。' : ''
        }}
      </p>
    </details>
  </section>
</template>
