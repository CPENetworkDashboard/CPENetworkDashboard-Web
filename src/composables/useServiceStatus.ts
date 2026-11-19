import { computed, onMounted, onUnmounted, ref } from 'vue'
import { API_BASE } from '@/api'
import { observationState, serviceDefinitions, type StoredStatusSummary } from '@/utils/status'

export function useServiceStatus() {
  const definitions = serviceDefinitions(API_BASE)
  const summary = ref<StoredStatusSummary | null>(null)
  const days = ref<30 | 90>(30)
  const checking = ref(false)
  const error = ref('')
  const autoRefresh = ref(true)
  const countdown = ref(60)
  const now = ref(Date.now())
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let disposed = false
  const results = computed(() => summary.value?.latest?.services || [])
  const history = computed(() => summary.value?.history || [])
  const daily = computed(() => summary.value?.daily || [])
  const latest = computed(() => summary.value?.latest || null)
  const stale = computed(
    () => !latest.value || now.value - Date.parse(latest.value.at) > 15 * 60_000
  )
  const state = computed(() => observationState(results.value))
  const available = computed(
    () => results.value.filter((item) => item.state !== 'unavailable').length
  )
  const build = computed(() => results.value.find((item) => item.id === 'health')?.build)
  const meanLatency = computed(() => summary.value?.totals.meanLatency ?? null)

  async function refresh() {
    if (checking.value || disposed) return
    checking.value = true
    error.value = ''
    controller = new AbortController()
    const timeout = setTimeout(() => controller?.abort(), 15_000)
    try {
      const response = await fetch(API_BASE + '/status/summary?days=' + days.value, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok)
        throw new Error(
          response.status === 404
            ? '状态服务尚未部署，请部署新版边缘函数。'
            : '监测记录暂时无法读取，请稍后重试。'
        )
      const data = await response.json()
      if (
        data.ok !== true ||
        data.source !== 'scheduled-monitor' ||
        !Array.isArray(data.daily) ||
        !Array.isArray(data.history) ||
        !data.totals
      )
        throw new Error('状态服务返回的数据格式不正确。')
      if (!disposed) {
        summary.value = data
        countdown.value = 60
        now.value = Date.now()
      }
    } catch (cause) {
      if (!disposed) error.value = cause instanceof Error ? cause.message : '无法读取监测记录。'
    } finally {
      clearTimeout(timeout)
      if (!disposed) checking.value = false
    }
  }
  async function setDays(value: 30 | 90) {
    if (checking.value || days.value === value) return
    days.value = value
    await refresh()
  }
  function toggleAutoRefresh() {
    autoRefresh.value = !autoRefresh.value
  }
  onMounted(() => {
    void refresh()
    timer = setInterval(() => {
      now.value = Date.now()
      if (!autoRefresh.value || checking.value || document.hidden) return
      countdown.value -= 1
      if (countdown.value <= 0) void refresh()
    }, 1000)
  })
  onUnmounted(() => {
    disposed = true
    controller?.abort()
    if (timer) clearInterval(timer)
  })
  return {
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
    meanLatency,
    refresh,
    setDays,
    toggleAutoRefresh,
  }
}
