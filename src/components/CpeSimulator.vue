<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

type Page = 'connect' | 'lock' | 'test'
type LockMode = 'band' | 'arfcn' | 'pci'
type TestTab = 'speed' | 'ping' | 'route'
type NetMode = 'auto' | 'nr' | 'lte'
type Level = 'excellent' | 'good' | 'fair' | 'poor' | 'bad'

interface Cell {
  band: string
  rat: 'NR' | 'LTE'
  arfcn: number
  pci: number
  bw: number
  rsrp: number
  rsrq: number
  sinr: number
  rssi: number
  cqi: number
  pusch: number
  pucch: number
  srs: number
  prach: number
  down: number
  up: number
}

const cells: Cell[] = [
  {
    band: 'N41',
    rat: 'NR',
    arfcn: 504990,
    pci: 88,
    bw: 100,
    rsrp: -66,
    rsrq: -10,
    sinr: 22,
    rssi: -43,
    cqi: 14,
    pusch: 21,
    pucch: -13,
    srs: 28,
    prach: -3,
    down: 860,
    up: 118,
  },
  {
    band: 'N78',
    rat: 'NR',
    arfcn: 627264,
    pci: 312,
    bw: 100,
    rsrp: -84,
    rsrq: -11,
    sinr: 17,
    rssi: -58,
    cqi: 12,
    pusch: 23,
    pucch: -6,
    srs: 23,
    prach: 2,
    down: 940,
    up: 146,
  },
  {
    band: 'N28',
    rat: 'NR',
    arfcn: 154570,
    pci: 45,
    bw: 30,
    rsrp: -71,
    rsrq: -12,
    sinr: 9,
    rssi: -48,
    cqi: 9,
    pusch: 14,
    pucch: -2,
    srs: 17,
    prach: 6,
    down: 236,
    up: 58,
  },
  {
    band: 'N1',
    rat: 'NR',
    arfcn: 428000,
    pci: 207,
    bw: 20,
    rsrp: -93,
    rsrq: -13,
    sinr: 6,
    rssi: -63,
    cqi: 8,
    pusch: 19,
    pucch: 3,
    srs: 21,
    prach: 9,
    down: 158,
    up: 41,
  },
  {
    band: 'B3',
    rat: 'LTE',
    arfcn: 1850,
    pci: 301,
    bw: 20,
    rsrp: -82,
    rsrq: -9,
    sinr: 15,
    rssi: -54,
    cqi: 12,
    pusch: 12,
    pucch: -4,
    srs: 14,
    prach: 1,
    down: 142,
    up: 44,
  },
  {
    band: 'B8',
    rat: 'LTE',
    arfcn: 3590,
    pci: 156,
    bw: 10,
    rsrp: -76,
    rsrq: -11,
    sinr: 10,
    rssi: -50,
    cqi: 10,
    pusch: 9,
    pucch: -6,
    srs: 11,
    prach: -1,
    down: 64,
    up: 21,
  },
]
const nrBands = ['N1', 'N28', 'N41', 'N78', 'N79']
const lteBands = ['B1', 'B3', 'B8', 'B39', 'B40', 'B41']
const netModes: Array<[NetMode, string]> = [
  ['auto', '自动'],
  ['nr', '仅5G'],
  ['lte', '仅4G'],
]
const pingTargets: Array<[string, string, number]> = [
  ['淘宝', 'www.taobao.com', 22],
  ['QQ', 'www.qq.com', 18],
  ['京东', 'www.jd.com', 24],
  ['B站', 'www.bilibili.com', 27],
  ['优酷', 'www.youku.com', 31],
  ['爱奇艺', 'www.iqiyi.com', 29],
  ['腾讯视频', 'v.qq.com', 19],
  ['网易', 'www.163.com', 26],
  ['百度', 'www.baidu.com', 21],
]
const speedSources: Array<[string, string]> = [
  ['Cloudflare 25MB', 'speed.cloudflare.com/__down?bytes=25000000'],
  ['Cloudflare 100MB', 'speed.cloudflare.com/__down?bytes=100000000'],
]
const icons: Record<string, string> = {
  login:
    '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  connect: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4"/><path d="M10 12h.01M12 12h.01M14 12h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  test: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m9 3-.6 2.4-2.3 1-2.2-.9-2 3.4 1.8 1.6v3l-1.8 1.6 2 3.4 2.2-.9 2.3 1L9 21h6l.6-2.4 2.3-1 2.2.9 2-3.4-1.8-1.6v-3l1.8-1.6-2-3.4-2.2.9-2.3-1L15 3Z"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  log: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6m-6 3h6m-6 3h4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 6m2-11v5h-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m2 4a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  play: '<path d="M8 5v14l11-7Z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none"/>',
}
const navItems: Array<[string, string, Page | null]> = [
  ['login', '登录', null],
  ['connect', '连接', 'connect'],
  ['lock', '锁频', 'lock'],
  ['test', '测试', 'test'],
  ['settings', '设置', null],
  ['about', '关于', null],
]
const pageTitle: Record<Page, string> = { connect: '连接', lock: '锁频', test: '测试' }

const root = ref<HTMLElement | null>(null)
const page = ref<Page>('connect')
const autoRefresh = ref(true)
const refreshing = ref(false)
const showLog = ref(false)
const notice = ref('')
const reduced = ref(false)

const camped = ref<Cell>(cells[0]!)
const registering = ref(false)
const live = reactive({ ...cells[0]! })

const netMode = ref<NetMode>('auto')
const appliedNetMode = ref<NetMode>('auto')
const lockMode = ref<LockMode>('band')
const selectedNr = ref<string[]>([])
const selectedLte = ref<string[]>([])
const lockedBands = ref<string[]>([])
const lockedCell = ref('')
const form = reactive({ arfcn: String(cells[1]!.arfcn), pci: String(cells[1]!.pci) })
const lockBusy = ref(false)
const lockMessage = ref<{ text: string; tone: 'info' | 'ok' | 'warn' } | null>(null)

const testTab = ref<TestTab>('speed')
const speed = reactive({
  source: 0,
  threads: 16,
  running: false,
  elapsed: 0,
  total: 0,
  current: 0,
  samples: [] as number[],
})
const ping = reactive({ target: 0, count: 10, running: false, samples: [] as number[] })
const route = reactive({ running: false, hops: [] as Array<{ ip: string; ms: number | null }> })
const logs = ref<Array<{ at: string; text: string }>>([])

let visible = false
let tick: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined
let motionQuery: MediaQueryList | undefined
const timers = new Set<ReturnType<typeof setTimeout>>()

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const noise = (amount: number) => (Math.random() * 2 - 1) * amount
const now = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })

function later(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}
function log(text: string) {
  logs.value.unshift({ at: now(), text })
  if (logs.value.length > 30) logs.value.pop()
}
function say(text: string) {
  notice.value = text
  later(() => {
    if (notice.value === text) notice.value = ''
  }, 2600)
}

function level(label: string, value: number): Level {
  const up = (e: number, g: number, f: number, p: number): Level =>
    value >= e
      ? 'excellent'
      : value >= g
        ? 'good'
        : value >= f
          ? 'fair'
          : value >= p
            ? 'poor'
            : 'bad'
  const down = (): Level =>
    value <= 0
      ? 'excellent'
      : value <= 10
        ? 'good'
        : value <= 15
          ? 'fair'
          : value <= 20
            ? 'poor'
            : 'bad'
  if (label === 'RSRP') return up(-80, -90, -100, -110)
  if (label === 'RSRQ') return up(-10, -12, -15, -18)
  if (label === 'SINR') return up(20, 13, 0, -5)
  if (label === 'RSSI') return up(-65, -75, -85, -95)
  if (label === 'CQI') return up(13, 10, 7, 4)
  return down()
}
const scores: Record<Level, number> = {
  excellent: 1,
  good: 0.78,
  fair: 0.56,
  poor: 0.34,
  bad: 0.16,
}
const ring = (lv: Level) => `${(scores[lv] * 75.4).toFixed(1)} 75.4`

const radio = computed(() =>
  (
    [
      ['RSRQ', '参考质量', live.rsrq, live.rsrq.toFixed(1)],
      ['SINR', '信干噪比', live.sinr, live.sinr.toFixed(0)],
      ['CQI', '信道质量', live.cqi, live.cqi.toFixed(0)],
      ['RSSI', '接收强度', live.rssi, live.rssi.toFixed(0)],
      ['RSRP', '参考功率', live.rsrp, live.rsrp.toFixed(0)],
    ] as const
  ).map(([label, sub, raw, value]) => ({ label, sub, value, level: level(label, raw) }))
)
const power = computed(() =>
  (
    [
      ['PUSCH', '上行业务功率', live.pusch],
      ['PUCCH', '上行控制功率', live.pucch],
      ['SRS', '探测功率', live.srs],
      ['PRACH', '接入功率', live.prach],
    ] as const
  ).map(([label, sub, raw]) => ({
    label,
    sub,
    value: `${raw.toFixed(0)}dBm`,
    level: level(label, raw),
  }))
)
const ratLabel = computed(() => (camped.value.rat === 'NR' ? '5G SA' : '4G LTE'))
const cellFacts = computed(() => [
  ['Band', camped.value.band],
  ['PCI', String(camped.value.pci)],
  [camped.value.rat === 'NR' ? 'ARFCN' : 'EARFCN', String(camped.value.arfcn)],
  ['TAC', '0x5A2F'],
  ['DL', `${camped.value.bw}MHz`],
  ['MCS', registering.value ? '—' : String(clamp(Math.round(live.cqi * 1.8), 0, 27))],
])
const lockStatus = computed(() => [
  ['网络首选', netModes.find(([key]) => key === appliedNetMode.value)![1]],
  ['LTE 频段', lockedBands.value.filter((band) => band.startsWith('B')).join(' ') || '未设置'],
  ['NR 频段', lockedBands.value.filter((band) => band.startsWith('N')).join(' ') || '未设置'],
  ['小区锁定', lockedCell.value || '未设置'],
])
const speedStats = computed(() => {
  const avg = speed.elapsed ? (speed.total * 8) / speed.elapsed : 0
  const seconds = Math.floor(speed.elapsed)
  return [
    ['总流量', `${speed.total.toFixed(2)} MB`],
    ['平均速度', `${avg.toFixed(2)} Mbps`],
    ['当前速度', `${speed.current.toFixed(2)} Mbps`],
    ['运行时间', `00:${String(seconds).padStart(2, '0')}`],
  ]
})
const pingStats = computed(() => {
  const list = ping.samples
  const fmt = (value: number | undefined) => (value === undefined ? '—' : `${value.toFixed(1)} ms`)
  return [
    ['最后延迟', fmt(list[list.length - 1])],
    ['平均延迟', fmt(list.length ? list.reduce((a, b) => a + b, 0) / list.length : undefined)],
    ['最小延迟', fmt(list.length ? Math.min(...list) : undefined)],
    ['最大延迟', fmt(list.length ? Math.max(...list) : undefined)],
  ]
})

function linePoints(values: number[], width: number, height: number, floor = 0) {
  if (values.length < 2) return ''
  const top = Math.max(...values) * 1.25 || 1
  const base = Math.min(floor, ...values)
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - base) / (top - base)) * (height - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
const pingLine = computed(() => linePoints(ping.samples, 600, 110))
const pingDots = computed(() =>
  pingLine.value
    .split(' ')
    .filter(Boolean)
    .map((point) => point.split(',').map(Number) as [number, number])
)
const speedLine = computed(() => linePoints(speed.samples, 600, 90))

function step() {
  if (registering.value) return
  const cell = camped.value
  const pull = (current: number, target: number, spread: number, min: number, max: number) =>
    clamp(current * 0.55 + target * 0.45 + noise(spread), min, max)
  live.rsrp = Math.round(pull(live.rsrp, cell.rsrp, 2, -125, -44))
  live.rsrq = Math.round(pull(live.rsrq, cell.rsrq, 0.8, -20, -3) * 2) / 2
  live.sinr = Math.round(pull(live.sinr, cell.sinr, 2, -5, 30))
  live.rssi = Math.round(pull(live.rssi, cell.rssi, 2, -110, -30))
  live.cqi = Math.round(pull(live.cqi, cell.cqi, 1, 1, 15))
  live.pusch = Math.round(pull(live.pusch, cell.pusch, 2, -10, 26))
  live.pucch = Math.round(pull(live.pucch, cell.pucch, 2, -20, 23))
  live.srs = Math.round(pull(live.srs, cell.srs, 2, -10, 26))
  live.prach = Math.round(pull(live.prach, cell.prach, 1.5, -10, 23))
}
function manualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  later(() => {
    step()
    refreshing.value = false
    log('刷新连接数据')
  }, 450)
}
function toggleAuto() {
  autoRefresh.value = !autoRefresh.value
  log(autoRefresh.value ? '开启自动刷新' : '暂停自动刷新')
  sync()
}
function navigate(target: Page | null, label: string) {
  if (!target) {
    say(`演示中未开放「${label}」页，可以试试连接、锁频和测试。`)
    return
  }
  page.value = target
  showLog.value = false
}

function toggleBand(band: string) {
  const list = band.startsWith('N') ? selectedNr : selectedLte
  list.value = list.value.includes(band)
    ? list.value.filter((item) => item !== band)
    : [...list.value, band]
}
function camp(cell: Cell, done: string) {
  registering.value = true
  live.rsrp = -140
  later(() => {
    camped.value = cell
    Object.assign(live, cell)
    registering.value = false
    lockBusy.value = false
    lockMessage.value = { text: done, tone: 'ok' }
    log(done)
  }, 1500)
}
function beginWrite(text: string) {
  lockBusy.value = true
  lockMessage.value = { text, tone: 'info' }
  log(text)
}
function readLock() {
  selectedNr.value = lockedBands.value.filter((band) => band.startsWith('N'))
  selectedLte.value = lockedBands.value.filter((band) => band.startsWith('B'))
  netMode.value = appliedNetMode.value
  lockMessage.value = { text: '已读取设备当前锁定规则', tone: 'info' }
  log('读取锁频设置')
}
function best(list: Cell[]) {
  return [...list].sort((a, b) => b.sinr - a.sinr)[0]
}
function applyNetMode() {
  if (lockBusy.value) return
  const mode = netMode.value
  const label = netModes.find(([key]) => key === mode)![1]
  const pool = cells.filter((cell) =>
    mode === 'nr' ? cell.rat === 'NR' : mode === 'lte' ? cell.rat === 'LTE' : true
  )
  appliedNetMode.value = mode
  if (pool.includes(camped.value)) {
    lockMessage.value = { text: `网络首选已设为${label}，当前小区保持不变`, tone: 'ok' }
    log(`应用网络首选：${label}`)
    return
  }
  beginWrite(`写入网络首选：${label}，等待重新注册…`)
  later(() => camp(best(pool)!, `已切换到 ${best(pool)!.band}，回读与设置一致`), 600)
}
function applyLock() {
  if (lockBusy.value) return
  if (lockMode.value === 'band') {
    const picked = [...selectedLte.value, ...selectedNr.value]
    if (!picked.length) {
      lockMessage.value = { text: '请至少选择一个频段', tone: 'warn' }
      return
    }
    beginWrite(`写入锁频段：${picked.join(' ')}`)
    later(() => {
      lockedBands.value = picked
      const pool = cells.filter((cell) => picked.includes(cell.band))
      const target = best(pool)
      if (!target) {
        lockBusy.value = false
        lockMessage.value = { text: '所选频段未搜索到可用小区，设备保持原驻留', tone: 'warn' }
        log('未搜索到所选频段的小区')
        return
      }
      if (target === camped.value) {
        lockBusy.value = false
        lockMessage.value = {
          text: `已锁定 ${picked.join(' ')}，当前已驻留 ${target.band}`,
          tone: 'ok',
        }
        log('回读校验通过')
        return
      }
      lockMessage.value = { text: '设备重新注册中…', tone: 'info' }
      camp(target, `已驻留 ${target.band} · PCI ${target.pci}，回读校验通过`)
    }, 700)
    return
  }
  const arfcn = Number(form.arfcn)
  const pci = Number(form.pci)
  const target = cells.find(
    (cell) => cell.arfcn === arfcn && (lockMode.value === 'arfcn' || cell.pci === pci)
  )
  const label = lockMode.value === 'arfcn' ? `ARFCN ${arfcn}` : `ARFCN ${arfcn} / PCI ${pci}`
  beginWrite(`写入${lockMode.value === 'arfcn' ? '锁 ARFCN' : '锁 PCI'}：${label}`)
  later(() => {
    if (!target) {
      lockBusy.value = false
      lockMessage.value = { text: `未搜索到 ${label} 对应的小区`, tone: 'warn' }
      log('未搜索到目标小区')
      return
    }
    lockedCell.value = label
    lockMessage.value = { text: '设备重新注册中…', tone: 'info' }
    camp(target, `已驻留 ${target.band} · ${label}`)
  }, 700)
}
function clearLock() {
  if (lockBusy.value) return
  selectedNr.value = []
  selectedLte.value = []
  lockedBands.value = []
  lockedCell.value = ''
  beginWrite('解除全部锁定，恢复自动选网')
  const target = best(cells.filter((cell) => appliedNetMode.value !== 'lte' || cell.rat === 'LTE'))!
  later(() => camp(target, `已解除锁定，设备自动驻留 ${target.band}`), 600)
}
function pickCellForm(cell: Cell) {
  form.arfcn = String(cell.arfcn)
  form.pci = String(cell.pci)
}

function runSpeed() {
  if (speed.running) {
    speed.running = false
    log('停止测速')
    return
  }
  Object.assign(speed, { running: true, elapsed: 0, total: 0, current: 0, samples: [] })
  log(`开始测速：${speedSources[speed.source]![0]} · ${speed.threads} 线程`)
  const capacity = camped.value.down * Math.min(1, 0.35 + speed.threads / 24)
  const tickSpeed = () => {
    if (!speed.running) return
    speed.elapsed = Math.round((speed.elapsed + 0.25) * 100) / 100
    const ramp = Math.min(1, speed.elapsed / 2)
    speed.current = Math.max(0, capacity * ramp * (0.86 + Math.random() * 0.14))
    speed.total += (speed.current / 8) * 0.25
    speed.samples.push(speed.current)
    if (speed.samples.length > 40) speed.samples.shift()
    if (speed.elapsed >= 10) {
      speed.running = false
      log(`测速完成：平均 ${((speed.total * 8) / speed.elapsed).toFixed(1)} Mbps`)
      return
    }
    later(tickSpeed, reduced.value ? 500 : 250)
  }
  later(tickSpeed, 250)
}
function runPing() {
  if (ping.running) return
  ping.running = true
  ping.samples = []
  const [, host, base] = pingTargets[ping.target]!
  log(`开始 Ping：${host}，${ping.count} 次`)
  const next = () => {
    const extra = camped.value.rat === 'LTE' ? 9 : 0
    ping.samples.push(Math.max(6, base + extra + noise(4) + (Math.random() < 0.1 ? 8 : 0)))
    if (ping.samples.length >= ping.count) {
      ping.running = false
      log(`Ping 完成：${host}`)
      return
    }
    later(next, 320)
  }
  later(next, 320)
}
function runRoute() {
  if (route.running) return
  route.running = true
  route.hops = []
  const host = pingTargets[ping.target]![1]
  const hops: Array<{ ip: string; ms: number | null }> = [
    { ip: '192.168.0.1', ms: 1.2 },
    { ip: '10.128.36.1', ms: 11.8 },
    { ip: '*', ms: null },
    { ip: '221.183.62.17', ms: 15.6 },
    { ip: '221.183.55.110', ms: 17.9 },
    { ip: host, ms: pingTargets[ping.target]![2] },
  ]
  log(`开始路由测试：${host}`)
  const next = () => {
    const hop = hops[route.hops.length]!
    route.hops.push({ ip: hop.ip, ms: hop.ms === null ? null : hop.ms + noise(1.5) })
    if (route.hops.length >= hops.length) {
      route.running = false
      log('路由测试完成')
      return
    }
    later(next, 380)
  }
  later(next, 380)
}

function sync() {
  const active = visible && !document.hidden && autoRefresh.value
  if (active && !tick) tick = setInterval(step, reduced.value ? 4000 : 2000)
  if (!active && tick) {
    clearInterval(tick)
    tick = undefined
  }
}
const onMotion = (event: MediaQueryListEvent) => (reduced.value = event.matches)
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced.value = motionQuery.matches
  motionQuery.addEventListener('change', onMotion)
  document.addEventListener('visibilitychange', sync)
  log('登录成功：VN007+ · 演示设备')
  log('读取连接数据')
  if (!('IntersectionObserver' in window) || !root.value) {
    visible = true
    sync()
    return
  }
  observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting)
    sync()
  })
  observer.observe(root.value)
})
onUnmounted(() => {
  observer?.disconnect()
  motionQuery?.removeEventListener('change', onMotion)
  document.removeEventListener('visibilitychange', sync)
  if (tick) clearInterval(tick)
  for (const id of timers) clearTimeout(id)
})
</script>

<template>
  <div ref="root" class="sim" role="region" aria-label="CPE加加 桌面端演示（模拟数据）">
    <div class="sim-chrome" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="sim-shell">
      <aside class="sim-side">
        <div class="sim-brand">
          <strong>CPE网络看板</strong>
          <span>CPE Network Dashboard</span>
          <em><i></i>{{ registering ? '注册中' : '已连接' }}</em>
        </div>
        <nav class="sim-nav" aria-label="演示导航">
          <button
            v-for="[icon, label, target] in navItems"
            :key="label"
            type="button"
            :class="{ active: target === page, inert: !target }"
            :aria-current="target === page ? 'page' : undefined"
            @click="navigate(target, label)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons[icon]"></svg>{{ label }}
          </button>
        </nav>
        <dl class="sim-side-foot">
          <div>
            <dt>状态</dt>
            <dd>已登录</dd>
          </div>
          <div>
            <dt>刷新</dt>
            <dd>{{ autoRefresh ? '自动' : '已暂停' }}</dd>
          </div>
          <div>
            <dt>数据</dt>
            <dd class="demo">演示</dd>
          </div>
        </dl>
      </aside>

      <div class="sim-main">
        <header class="sim-top">
          <h3>{{ pageTitle[page] }}</h3>
          <button
            type="button"
            class="sim-auto"
            :class="{ off: !autoRefresh }"
            :aria-pressed="autoRefresh"
            @click="toggleAuto"
          >
            {{ autoRefresh ? '自动刷新' : '已暂停' }}
          </button>
          <p v-if="notice" class="sim-notice" role="status">{{ notice }}</p>
          <span class="sim-spacer"></span>
          <button type="button" class="sim-btn" :aria-pressed="showLog" @click="showLog = !showLog">
            <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons.log"></svg>日志
          </button>
          <button
            type="button"
            class="sim-btn primary"
            :class="{ spinning: refreshing }"
            @click="manualRefresh"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons.refresh"></svg>刷新
          </button>
        </header>

        <div class="sim-scroll">
          <section v-if="showLog" class="sim-pane">
            <header class="sim-pane-head">
              <h4>会话日志</h4>
              <span>{{ logs.length }} 条</span>
            </header>
            <ol class="sim-log">
              <li v-for="(entry, index) in logs" :key="index">
                <time>{{ entry.at }}</time
                >{{ entry.text }}
              </li>
            </ol>
          </section>

          <template v-else-if="page === 'connect'">
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>连接情况</h4>
                <span class="sim-chips">
                  <b class="amber">{{ registering ? '注册中' : 'RRC正常' }}</b
                  ><b class="blue">{{ ratLabel }}</b
                  ><b>中国移动</b>
                </span>
              </header>
              <div class="sim-mini">
                <div v-for="[label, value] in cellFacts" :key="label">
                  <span>{{ label }}</span
                  ><strong>{{ value }}</strong>
                </div>
              </div>
            </section>
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>射频质量</h4>
                <span>5 项</span>
              </header>
              <div class="sim-tiles radio">
                <div v-for="metric in radio" :key="metric.label" class="sim-tile">
                  <div>
                    <b>{{ metric.label }}</b
                    ><small>{{ metric.sub }}</small>
                    <strong>{{ registering ? '—' : metric.value }}</strong>
                  </div>
                  <svg
                    v-if="!registering"
                    class="sim-ring"
                    :class="metric.level"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <circle class="track" cx="16" cy="16" r="12" />
                    <circle
                      class="arc"
                      cx="16"
                      cy="16"
                      r="12"
                      :stroke-dasharray="ring(metric.level)"
                    />
                    <circle class="core" cx="16" cy="16" r="6" />
                  </svg>
                </div>
              </div>
            </section>
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>当前功率</h4>
                <span>6 项</span>
              </header>
              <div class="sim-tiles power">
                <div v-for="metric in power" :key="metric.label" class="sim-tile">
                  <div>
                    <b>{{ metric.label }}</b
                    ><small>{{ metric.sub }}</small>
                    <strong>{{ registering ? '—' : metric.value }}</strong>
                  </div>
                  <svg
                    v-if="!registering"
                    class="sim-ring"
                    :class="metric.level"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <circle class="track" cx="16" cy="16" r="12" />
                    <circle
                      class="arc"
                      cx="16"
                      cy="16"
                      r="12"
                      :stroke-dasharray="ring(metric.level)"
                    />
                    <circle class="core" cx="16" cy="16" r="6" />
                  </svg>
                </div>
                <div class="sim-tile wide">
                  <div>
                    <b>DL BW</b><small>下行带宽</small><strong>{{ camped.bw }}MHz</strong>
                  </div>
                </div>
                <div class="sim-tile wide">
                  <div>
                    <b>UL BW</b><small>上行带宽</small><strong>{{ camped.bw }}MHz</strong>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <template v-else-if="page === 'lock'">
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>网络首选</h4>
                <span>{{ netModes.find(([key]) => key === appliedNetMode)![1] }}</span>
              </header>
              <div class="sim-seg three" role="radiogroup" aria-label="网络首选">
                <button
                  v-for="[key, label] in netModes"
                  :key="key"
                  type="button"
                  role="radio"
                  :aria-checked="netMode === key"
                  @click="netMode = key"
                >
                  {{ label }}
                </button>
              </div>
              <div class="sim-row">
                <button type="button" class="sim-wide" :disabled="lockBusy" @click="readLock">
                  读取
                </button>
                <button
                  type="button"
                  class="sim-wide fill"
                  :disabled="lockBusy"
                  @click="applyNetMode"
                >
                  应用
                </button>
              </div>
            </section>
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>锁定模式</h4>
                <span>{{ lockedBands.length || lockedCell ? '已锁定' : '未锁定' }}</span>
              </header>
              <div class="sim-seg three" role="radiogroup" aria-label="锁定模式">
                <button
                  v-for="[key, label] in [
                    ['band', '锁频段'],
                    ['arfcn', '锁ARFCN'],
                    ['pci', '锁PCI'],
                  ] as const"
                  :key="key"
                  type="button"
                  role="radio"
                  :aria-checked="lockMode === key"
                  @click="lockMode = key"
                >
                  {{ label }}
                </button>
              </div>
              <div v-if="lockMode === 'band'" class="sim-bands">
                <div
                  v-for="[rat, list] in [
                    ['NR', nrBands],
                    ['LTE', lteBands],
                  ] as const"
                  :key="rat"
                >
                  <span>{{ rat }}</span>
                  <button
                    v-for="band in list"
                    :key="band"
                    type="button"
                    :aria-pressed="(rat === 'NR' ? selectedNr : selectedLte).includes(band)"
                    :class="{ camped: camped.band === band }"
                    @click="toggleBand(band)"
                  >
                    {{ band }}
                  </button>
                </div>
              </div>
              <div v-else class="sim-fields">
                <label>ARFCN<input v-model="form.arfcn" inputmode="numeric" /></label>
                <label v-if="lockMode === 'pci'"
                  >PCI<input v-model="form.pci" inputmode="numeric"
                /></label>
                <p>
                  附近小区：
                  <button
                    v-for="cell in cells"
                    :key="cell.band"
                    type="button"
                    @click="pickCellForm(cell)"
                  >
                    {{ cell.band }} · {{ cell.arfcn }} / {{ cell.pci }}
                  </button>
                </p>
              </div>
              <div class="sim-row">
                <button type="button" class="sim-wide" :disabled="lockBusy" @click="readLock">
                  读取
                </button>
                <button type="button" class="sim-wide fill" :disabled="lockBusy" @click="applyLock">
                  应用
                </button>
                <button type="button" class="sim-wide" :disabled="lockBusy" @click="clearLock">
                  解除
                </button>
              </div>
              <p v-if="lockMessage" class="sim-message" :class="lockMessage.tone" role="status">
                <i v-if="lockBusy" class="sim-spin" aria-hidden="true"></i>{{ lockMessage.text }}
              </p>
            </section>
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>当前状态</h4>
                <span>4 项</span>
              </header>
              <div class="sim-mini four left">
                <div v-for="[label, value] in lockStatus" :key="label">
                  <span>{{ label }}</span
                  ><strong>{{ value }}</strong>
                </div>
              </div>
            </section>
          </template>

          <template v-else>
            <section class="sim-pane">
              <header class="sim-pane-head">
                <h4>测试</h4>
                <span>测速 / Ping / 路由</span>
              </header>
              <div class="sim-seg three" role="radiogroup" aria-label="测试类型">
                <button
                  v-for="[key, label] in [
                    ['speed', '测速'],
                    ['ping', 'Ping测试'],
                    ['route', '路由测试'],
                  ] as const"
                  :key="key"
                  type="button"
                  role="radio"
                  :aria-checked="testTab === key"
                  @click="testTab = key"
                >
                  {{ label }}
                </button>
              </div>
            </section>

            <section v-if="testTab === 'speed'" class="sim-pane">
              <header class="sim-pane-head">
                <h4>本机测速</h4>
                <span>{{ speedStats[3]![1] }}</span>
              </header>
              <div class="sim-source">
                <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons.link"></svg>
                <div>
                  <strong>{{ speedSources[speed.source]![0] }}</strong
                  ><span>{{ speedSources[speed.source]![1] }}</span>
                </div>
              </div>
              <div class="sim-pills">
                <button
                  v-for="([label], index) in speedSources"
                  :key="label"
                  type="button"
                  :aria-pressed="speed.source === index"
                  :disabled="speed.running"
                  @click="speed.source = index"
                >
                  {{ label }}
                </button>
              </div>
              <label class="sim-slider">
                线程<b>{{ speed.threads }}</b>
                <input
                  v-model.number="speed.threads"
                  type="range"
                  min="1"
                  max="32"
                  :disabled="speed.running"
                />
              </label>
              <button type="button" class="sim-wide fill block" @click="runSpeed">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  v-html="speed.running ? icons.stop : icons.play"
                ></svg>
                {{ speed.running ? '停止测速' : '开始测速' }}
              </button>
              <svg
                v-if="speedLine"
                class="sim-chart"
                viewBox="0 0 600 90"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path class="grid" d="M0 22H600M0 45H600M0 68H600" />
                <polyline :points="speedLine" />
              </svg>
              <div class="sim-mini four left">
                <div v-for="[label, value] in speedStats" :key="label">
                  <span>{{ label }}</span
                  ><strong>{{ value }}</strong>
                </div>
              </div>
            </section>

            <section v-else-if="testTab === 'ping'" class="sim-pane">
              <header class="sim-pane-head">
                <h4>Ping测试</h4>
                <span>{{ ping.running ? '进行中' : ping.samples.length ? '完成' : '就绪' }}</span>
              </header>
              <label class="sim-input"
                >目标地址<input :value="pingTargets[ping.target]![1]" readonly
              /></label>
              <div class="sim-pills">
                <button
                  v-for="([label], index) in pingTargets"
                  :key="label"
                  type="button"
                  :aria-pressed="ping.target === index"
                  :disabled="ping.running"
                  @click="ping.target = index"
                >
                  {{ label }}
                </button>
              </div>
              <label class="sim-slider">
                次数<b>{{ ping.count }}</b>
                <input
                  v-model.number="ping.count"
                  type="range"
                  min="2"
                  max="30"
                  :disabled="ping.running"
                />
              </label>
              <button
                type="button"
                class="sim-wide fill block"
                :disabled="ping.running"
                @click="runPing"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons.play"></svg>开始Ping
              </button>
              <figure class="sim-graph">
                <figcaption>
                  <b>Ping 延迟走势</b><span>{{ ping.samples.length }} 点</span>
                </figcaption>
                <svg viewBox="0 0 600 110" preserveAspectRatio="none" aria-hidden="true">
                  <path class="grid" d="M0 20H600M0 50H600M0 80H600" />
                  <polyline v-if="pingLine" :points="pingLine" />
                  <circle
                    v-for="([x, y], index) in pingDots"
                    :key="index"
                    :cx="x"
                    :cy="y"
                    r="2.5"
                  />
                </svg>
              </figure>
              <div class="sim-mini four left">
                <div v-for="[label, value] in pingStats" :key="label">
                  <span>{{ label }}</span
                  ><strong>{{ value }}</strong>
                </div>
              </div>
            </section>

            <section v-else class="sim-pane">
              <header class="sim-pane-head">
                <h4>路由测试</h4>
                <span>{{ pingTargets[ping.target]![1] }}</span>
              </header>
              <div class="sim-pills">
                <button
                  v-for="([label], index) in pingTargets"
                  :key="label"
                  type="button"
                  :aria-pressed="ping.target === index"
                  :disabled="route.running"
                  @click="ping.target = index"
                >
                  {{ label }}
                </button>
              </div>
              <button
                type="button"
                class="sim-wide fill block"
                :disabled="route.running"
                @click="runRoute"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons.play"></svg>开始路由测试
              </button>
              <ol v-if="route.hops.length" class="sim-hops">
                <li v-for="(hop, index) in route.hops" :key="index">
                  <span>{{ index + 1 }}</span
                  ><code>{{ hop.ip }}</code
                  ><b>{{ hop.ms === null ? '超时' : `${hop.ms.toFixed(1)} ms` }}</b>
                </li>
              </ol>
            </section>
          </template>
        </div>
      </div>
    </div>
    <nav class="sim-dock" aria-label="演示导航">
      <button
        v-for="[icon, label, target] in navItems.filter(([key]) =>
          ['connect', 'lock', 'test', 'settings'].includes(key)
        )"
        :key="label"
        type="button"
        :class="{ active: target === page }"
        @click="navigate(target, label)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons[icon]"></svg>{{ label }}
      </button>
    </nav>
  </div>
</template>
