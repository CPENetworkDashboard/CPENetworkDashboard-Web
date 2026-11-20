<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteIcon from '@/components/SiteIcon.vue'
import { useServiceStatus } from '@/composables/useServiceStatus'

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
  refresh,
  setDays,
  toggleAutoRefresh,
} = useServiceStatus()
const exportMessage = ref('')
const selectedDay = ref<string | null>(null)
const selectedService = ref('website')
function selectDay(date: string, service: string) {
  selectedDay.value = date
  selectedService.value = service
}
const headline = computed(() => {
  if (error.value) return '监测数据暂时无法更新'
  if (!latest.value) return checking.value ? '正在读取监测数据' : '监测数据准备中'
  if (stale.value) return '监测数据更新延迟'
  return {
    operational: '所有服务运行正常',
    partial: '部分服务出现异常',
    unavailable: '服务暂时不可用',
    unknown: '等待监测结果',
  }[state.value]
})
const rows = computed(() =>
  definitions.map((definition) => ({
    ...definition,
    result: results.value.find((result) => result.id === definition.id),
    metric: summary.value?.services[definition.id],
  }))
)
const recentObservations = computed(() => [...history.value].reverse().slice(0, 12))
function availableServices(observation: (typeof history.value)[number]) {
  return observation.services.filter((service) => service.state !== 'unavailable').length
}
const failedObservations = computed(() =>
  [...history.value]
    .reverse()
    .filter((observation) =>
      observation.services.some((service) => service.state === 'unavailable')
    )
    .slice(0, 6)
)
const chosenDay = computed(() => daily.value.find((day) => day.date === selectedDay.value))
function time(value?: string | null, full = false): string {
  if (!value) return '等待数据'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    ...(full ? { month: 'long', day: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(full ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(new Date(value))
}
function percent(value?: number | null) {
  return value === null || value === undefined
    ? '—'
    : (Math.floor(value * 100) / 100).toFixed(2) + '%'
}
function label(value?: string) {
  return value
    ? ({ operational: '可用', unavailable: '不可用' } as Record<string, string>)[value] || '待监测'
    : '待监测'
}
function dayState(day: (typeof daily.value)[number], id: string) {
  const metric = day.services[id]
  if (!metric?.checks) return 'unknown'
  if (metric.failed) return 'unavailable'
  if (day.coverage !== null && day.coverage < 80) return 'incomplete'
  return 'operational'
}
function dayLabel(day: (typeof daily.value)[number], id: string) {
  const metric = day.services[id]
  return (
    day.date +
    '：' +
    (metric?.checks
      ? percent(metric.availability) +
        ' 可用率，' +
        metric.checks +
        ' 次检查，采集覆盖率 ' +
        percent(day.coverage)
      : '暂无监测数据')
  )
}
function exportResults() {
  if (!summary.value) return
  const blob = new Blob([JSON.stringify(summary.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'cpe-status-' + days.value + 'days.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  exportMessage.value = '历史监测数据已导出。'
}
</script>

<template>
  <section class="page-view status-dashboard" aria-labelledby="status-title">
    <header class="status-heading">
      <div>
        <RouterLink class="status-home" to="/">CPE加加</RouterLink>
        <h1 id="status-title">服务状态</h1>
        <p>查看官网、版本发布与各平台更新服务的运行情况。</p>
      </div>
      <div class="status-tools">
        <button
          type="button"
          class="status-auto"
          :aria-pressed="autoRefresh"
          @click="toggleAutoRefresh"
        >
          <span class="status-switch" aria-hidden="true"></span>自动刷新</button
        ><button class="status-refresh" type="button" :disabled="checking" @click="refresh">
          <SiteIcon name="refresh" :class="{ 'is-spinning': checking }" />刷新状态
        </button>
      </div>
    </header>
    <section
      class="status-banner"
      :data-state="error || stale ? 'unknown' : state"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="status-banner-icon">
        <SiteIcon
          :name="state === 'operational' && !stale && !error ? 'check' : 'activity'"
          :size="28"
        />
      </div>
      <div class="status-banner-copy">
        <h2>{{ headline }}</h2>
        <p>
          {{
            latest
              ? '最近监测 ' + time(latest.at, true) + '（北京时间）'
              : '监测启动后，检查结果将持续保存。'
          }}
        </p>
      </div>
      <div class="status-countdown">
        {{ checking ? '更新中…' : autoRefresh ? countdown + ' 秒后刷新' : '自动刷新已暂停' }}
      </div>
    </section>
    <p v-if="error" class="status-read-error" role="alert">
      {{ error }}<span v-if="latest">以下保留最近一次取得的记录。</span>
    </p>
    <div class="status-history-toolbar">
      <span>历史可用性</span>
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
    <dl class="status-metrics status-metrics-history">
      <div>
        <dt>整体可用率</dt>
        <dd>{{ percent(summary?.totals.availability) }}</dd>
      </div>
      <div>
        <dt>当前可用服务</dt>
        <dd>
          {{ stale ? '—' : available }}<span> / {{ definitions.length }}</span>
        </dd>
      </div>
      <div>
        <dt>采集覆盖率</dt>
        <dd>{{ percent(summary?.totals.coverage) }}</dd>
      </div>
      <div>
        <dt>累计检查记录</dt>
        <dd>{{ summary?.totals.samples.toLocaleString('zh-CN') ?? '—' }}<span> 轮</span></dd>
      </div>
    </dl>
    <section class="status-components" aria-labelledby="components-title" :aria-busy="checking">
      <div class="status-section-top">
        <h2 id="components-title">服务组件</h2>
        <span>{{
          latest && !stale ? available + ' / ' + definitions.length + ' 项可用' : '等待最新监测'
        }}</span>
      </div>
      <div class="status-component-list">
        <article
          v-for="row in rows"
          :key="row.id"
          class="status-component status-component-history"
          :data-state="row.result?.state || 'unknown'"
        >
          <div class="status-component-icon">
            <SiteIcon
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
            />
          </div>
          <div class="status-component-copy">
            <h3>
              {{ row.name
              }}<span v-if="row.result?.version" class="status-version"
                >v{{ row.result.version }}</span
              >
            </h3>
            <details>
              <summary>
                <span>{{ row.method }}</span
                ><code>{{ row.path }}</code
                ><SiteIcon name="chevron" :size="14" />
              </summary>
              <p>
                {{ row.description }}。{{
                  row.result
                    ? row.result.detail + ' · ' + time(row.result.checkedAt, true)
                    : '尚无检查记录'
                }}
              </p>
            </details>
          </div>
          <div class="status-component-result">
            <span class="status-pill"
              ><i aria-hidden="true"></i>{{ stale ? '待更新' : label(row.result?.state) }}</span
            ><span class="status-availability">{{ percent(row.metric?.availability) }}</span>
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
        </article>
      </div>
      <div class="status-legend">
        <span><i data-state="operational"></i>正常</span
        ><span><i data-state="unavailable"></i>异常</span
        ><span><i data-state="incomplete"></i>采集不完整</span
        ><span><i data-state="unknown"></i>无数据</span>
      </div>
      <p v-if="chosenDay" class="status-day-detail" role="status">
        {{ definitions.find((service) => service.id === selectedService)?.name }} ·
        {{ dayLabel(chosenDay, selectedService) }}
      </p>
    </section>
    <section class="status-session" aria-labelledby="history-title">
      <div class="status-section-top">
        <div>
          <h2 id="history-title">最近检查记录</h2>
          <p>最近 24 小时已保存 {{ history.length }} 轮检查，以下显示最新 12 轮。</p>
        </div>
        <button type="button" class="status-export" :disabled="!summary" @click="exportResults">
          <SiteIcon name="download" :size="16" />导出历史
        </button>
      </div>
      <ul
        v-if="recentObservations.length"
        class="status-observations"
        aria-label="最近服务可用性检查"
      >
        <li v-for="observation in recentObservations" :key="observation.at">
          <time :datetime="observation.at">{{ time(observation.at, true) }}</time>
          <span
            :data-state="
              availableServices(observation) === definitions.length ? 'operational' : 'unavailable'
            "
          >
            {{
              availableServices(observation) === definitions.length
                ? '全部服务可用'
                : '部分服务不可用'
            }}
          </span>
          <span>{{ availableServices(observation) }} / {{ definitions.length }} 项可用</span>
        </li>
      </ul>
      <p v-else class="status-empty">尚无历史监测记录</p>
      <p class="status-export-message" role="status">{{ exportMessage }}</p>
    </section>
    <section class="status-events">
      <div class="status-section-top">
        <h2>近期异常记录</h2>
        <span>最近 24 小时</span>
      </div>
      <ul v-if="failedObservations.length">
        <li v-for="observation in failedObservations" :key="observation.at">
          <time :datetime="observation.at">{{ time(observation.at, true) }}</time
          ><span
            >{{
              observation.services
                .filter((service) => service.state === 'unavailable')
                .map((service) => definitions.find((item) => item.id === service.id)?.name)
                .join('、')
            }}检查异常</span
          >
        </li>
      </ul>
      <p v-else>
        {{ history.length ? '已采集的记录中未发现服务异常。' : '监测启动后显示异常记录。' }}
      </p>
    </section>
    <aside class="status-method">
      <SiteIcon name="info" />
      <div>
        <strong>监测说明</strong>
        <p>
          独立监测任务按 5 分钟计划运行；GitHub
          调度可能延迟，页面始终显示实际检查时间。结果持续保存并用于历史统计。可用率按已完成的检查计算，采集覆盖率单独显示；超过
          15 分钟未取得新数据时标记为更新延迟。历史按北京时间汇总。
        </p>
        <p v-if="build">
          边缘服务构建 {{ build
          }}<span v-if="summary?.firstCheckedAt">
            · 开始监测 {{ time(summary.firstCheckedAt, true) }}</span
          >
        </p>
      </div>
    </aside>
  </section>
</template>
