<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import SiteIcon from '@/components/SiteIcon.vue'

type Tab = 'signal' | 'lock' | 'speed' | 'ping'
type LockPhase = 'idle' | 'write' | 'register' | 'done'
type SpeedPhase = 'idle' | 'latency' | 'download' | 'upload' | 'done'

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'signal', label: '信号', icon: 'signal' },
  { id: 'lock', label: '频段锁定', icon: 'sliders' },
  { id: 'speed', label: '测速', icon: 'download' },
  { id: 'ping', label: 'Ping', icon: 'activity' },
]
const bands = [
  {
    id: 'n78',
    freq: '3.5 GHz',
    arfcn: 627264,
    pci: 312,
    rsrp: -84,
    rsrq: -10,
    sinr: 22,
    bw: 100,
    down: 1186,
    up: 148,
  },
  {
    id: 'n41',
    freq: '2.6 GHz',
    arfcn: 504990,
    pci: 118,
    rsrp: -78,
    rsrq: -11,
    sinr: 18,
    bw: 100,
    down: 912,
    up: 121,
  },
  {
    id: 'n28',
    freq: '700 MHz',
    arfcn: 154570,
    pci: 45,
    rsrp: -71,
    rsrq: -12,
    sinr: 11,
    bw: 30,
    down: 268,
    up: 62,
  },
  {
    id: 'n1',
    freq: '2.1 GHz',
    arfcn: 428000,
    pci: 207,
    rsrp: -90,
    rsrq: -12,
    sinr: 14,
    bw: 20,
    down: 384,
    up: 74,
  },
] as const
type Band = (typeof bands)[number]
const targets = ['223.5.5.5', '119.29.29.29', '1.1.1.1']
const targetBase: Record<string, number> = { '223.5.5.5': 12, '119.29.29.29': 16, '1.1.1.1': 38 }

const root = ref<HTMLElement | null>(null)
const tab = ref<Tab>('signal')
const camped = ref<Band>(bands[0])
const picked = ref<Band['id']>('n41')
const lockPhase = ref<LockPhase>('idle')
const live = reactive({
  rsrp: -84,
  rsrq: -10,
  sinr: 22,
  trend: Array.from({ length: 40 }, () => 22),
})
const speed = reactive({ phase: 'idle' as SpeedPhase, value: 0, latency: 0, down: 0, up: 0 })
const ping = reactive({
  target: targets[0]!,
  lines: [] as Array<{ seq: number; ms: number | null }>,
  bars: [] as number[],
  sent: 0,
  lost: 0,
})
const autoplay = ref(true)
let visible = false
let reduced = false
let tick: ReturnType<typeof setInterval> | undefined
let tour: ReturnType<typeof setInterval> | undefined
let speedTimer: ReturnType<typeof setInterval> | undefined
const timeouts: Array<ReturnType<typeof setTimeout>> = []
let observer: IntersectionObserver | undefined

const jitter = (base: number, spread: number) => base + (Math.random() - 0.5) * spread
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const level = (value: number, min: number, max: number) => clamp((value - min) / (max - min), 0, 1)

const quality = computed(() => {
  const sinr = live.sinr
  if (sinr >= 20) return { label: '极好', bars: 4 }
  if (sinr >= 13) return { label: '良好', bars: 3 }
  if (sinr >= 5) return { label: '一般', bars: 2 }
  return { label: '较弱', bars: 1 }
})
const trendPath = computed(() => {
  const points = live.trend.map((value, index) => {
    const x = (index / (live.trend.length - 1)) * 100
    const y = 37 - level(value, 6, 28) * 32
    return x.toFixed(2) + ',' + y.toFixed(2)
  })
  return { line: 'M' + points.join(' L'), area: 'M0,40 L' + points.join(' L') + ' L100,40 Z' }
})
const metrics = computed(() => [
  { label: 'RSRP', unit: 'dBm', value: live.rsrp.toFixed(0), level: level(live.rsrp, -120, -60) },
  { label: 'RSRQ', unit: 'dB', value: live.rsrq.toFixed(1), level: level(live.rsrq, -20, -3) },
  { label: 'SINR', unit: 'dB', value: live.sinr.toFixed(1), level: level(live.sinr, -5, 30) },
])
const lockSteps = computed(() => {
  const order: LockPhase[] = ['write', 'register', 'done']
  const at = order.indexOf(lockPhase.value)
  return [
    { label: '写入频段配置', state: at > 0 ? 'done' : at === 0 ? 'active' : 'idle' },
    { label: '重新注册网络', state: at > 1 ? 'done' : at === 1 ? 'active' : 'idle' },
    { label: '驻留新小区', state: at === 2 ? 'done' : 'idle' },
  ]
})
const gauge = computed(() => {
  const max = speed.phase === 'upload' ? 200 : 1500
  return clamp(speed.value / max, 0, 1)
})
const speedLabel = computed(
  () =>
    ({
      idle: '点击开始',
      latency: '测量延迟',
      download: '下载',
      upload: '上传',
      done: '测速完成',
    })[speed.phase]
)
const pingStats = computed(() => {
  const values = ping.lines.map((line) => line.ms).filter((ms): ms is number => ms !== null)
  const all = ping.bars
  return {
    avg: all.length ? (all.reduce((sum, ms) => sum + ms, 0) / all.length).toFixed(1) : '—',
    min: values.length ? Math.min(...values).toFixed(1) : '—',
    loss: ping.sent ? ((ping.lost / ping.sent) * 100).toFixed(1) : '0.0',
  }
})

function later(fn: () => void, ms: number) {
  timeouts.push(setTimeout(fn, ms))
}
function step() {
  const band = camped.value
  const settling = lockPhase.value === 'register'
  live.rsrp = settling ? -118 : clamp(jitter(live.rsrp * 0.7 + band.rsrp * 0.3, 3), -125, -55)
  live.rsrq = settling ? -19.5 : clamp(jitter(live.rsrq * 0.7 + band.rsrq * 0.3, 1.2), -20, -3)
  live.sinr = settling ? -1 : clamp(jitter(live.sinr * 0.7 + band.sinr * 0.3, 3), -5, 30)
  live.trend.push(live.sinr)
  live.trend.shift()
  if (tab.value === 'ping') sendPing()
}
function sendPing() {
  ping.sent += 1
  const lost = Math.random() < 0.02
  const ms = lost ? null : Math.max(4, jitter(targetBase[ping.target] ?? 20, 8))
  if (lost) ping.lost += 1
  ping.lines.push({ seq: ping.sent, ms })
  if (ping.lines.length > 6) ping.lines.shift()
  ping.bars.push(ms ?? 0)
  if (ping.bars.length > 28) ping.bars.shift()
}
function setTarget(target: string) {
  ping.target = target
  ping.lines = []
  ping.bars = []
  ping.sent = 0
  ping.lost = 0
}
function applyLock() {
  if (lockPhase.value === 'write' || lockPhase.value === 'register') return
  const band = bands.find((item) => item.id === picked.value)!
  lockPhase.value = 'write'
  later(() => (lockPhase.value = 'register'), 900)
  later(() => {
    camped.value = band
    live.rsrp = band.rsrp - 6
    live.sinr = band.sinr - 4
    lockPhase.value = 'done'
  }, 2300)
}
function runSpeed() {
  if (speedTimer) return
  Object.assign(speed, { phase: 'latency', value: 0, latency: 0, down: 0, up: 0 })
  const band = camped.value
  let elapsed = 0
  speedTimer = setInterval(() => {
    elapsed += 80
    if (elapsed < 800) {
      speed.latency = Math.round(jitter(14, 4))
      return
    }
    if (elapsed < 3600) {
      speed.phase = 'download'
      const ramp = Math.min(1, (elapsed - 800) / 1200)
      speed.value = Math.max(0, jitter(band.down * ramp, band.down * 0.08))
      speed.down = Math.max(speed.down, speed.value)
      return
    }
    if (elapsed < 5800) {
      if (speed.phase !== 'upload') speed.value = 0
      speed.phase = 'upload'
      const ramp = Math.min(1, (elapsed - 3600) / 900)
      speed.value = Math.max(0, jitter(band.up * ramp, band.up * 0.1))
      speed.up = Math.max(speed.up, speed.value)
      return
    }
    speed.phase = 'done'
    speed.value = speed.down
    clearInterval(speedTimer)
    speedTimer = undefined
  }, 80)
}
function choose(next: Tab, fromUser = true) {
  if (fromUser) stopTour()
  tab.value = next
  if (next === 'ping' && !ping.lines.length) sendPing()
}
function stopTour() {
  autoplay.value = false
  if (tour) clearInterval(tour)
  tour = undefined
}
function runTourStep() {
  const order: Tab[] = ['signal', 'lock', 'speed', 'ping']
  const next = order[(order.indexOf(tab.value) + 1) % order.length]!
  choose(next, false)
  if (next === 'lock') {
    picked.value = bands[(bands.indexOf(camped.value) + 1) % 2]!.id
    later(applyLock, 900)
  }
  if (next === 'speed') later(runSpeed, 500)
}
function sync() {
  const active = visible && !document.hidden
  if (active && !tick) tick = setInterval(step, 1000)
  if (!active && tick) {
    clearInterval(tick)
    tick = undefined
  }
  if (active && autoplay.value && !reduced && !tour) tour = setInterval(runTourStep, 7000)
  if (!active && tour) {
    clearInterval(tour)
    tour = undefined
  }
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('visibilitychange', sync)
  if (!('IntersectionObserver' in window)) {
    visible = true
    return sync()
  }
  observer = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    sync()
  })
  if (root.value) observer.observe(root.value)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', sync)
  observer?.disconnect()
  for (const timer of [tick, tour, speedTimer]) if (timer) clearInterval(timer)
  for (const timer of timeouts) clearTimeout(timer)
})
</script>

<template>
  <div ref="root" class="sim" @pointerdown="stopTour">
    <div class="sim-bar">
      <span class="sim-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <strong>CPE++</strong>
      <span class="sim-conn"><i aria-hidden="true"></i>5G SA · {{ camped.id }}</span>
      <span class="sim-badge">演示数据</span>
    </div>
    <div class="sim-body">
      <nav class="sim-nav" aria-label="演示功能">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          :aria-pressed="tab === item.id"
          @click="choose(item.id)"
        >
          <SiteIcon :name="item.icon" :size="16" /><span>{{ item.label }}</span>
        </button>
        <div class="sim-device">
          <small>当前设备</small>
          <strong>5G CPE Pro</strong>
          <span>192.168.8.1</span>
        </div>
      </nav>
      <div class="sim-main" aria-live="polite">
        <Transition name="sim-swap" mode="out-in">
          <section v-if="tab === 'signal'" key="signal" class="sim-panel">
            <header class="sim-head">
              <div>
                <small>服务小区</small>
                <h3>
                  {{ camped.id }}<span>{{ camped.freq }} · {{ camped.bw }} MHz</span>
                </h3>
              </div>
              <div class="sim-quality" :data-bars="quality.bars">
                <span aria-hidden="true"><i></i><i></i><i></i><i></i></span>{{ quality.label }}
              </div>
            </header>
            <dl class="sim-cell">
              <div>
                <dt>ARFCN</dt>
                <dd>{{ camped.arfcn }}</dd>
              </div>
              <div>
                <dt>PCI</dt>
                <dd>{{ camped.pci }}</dd>
              </div>
              <div>
                <dt>载波聚合</dt>
                <dd>{{ camped.id === 'n78' ? 'n78 + n41' : camped.id }}</dd>
              </div>
            </dl>
            <div class="sim-metrics">
              <div v-for="metric in metrics" :key="metric.label" class="sim-metric">
                <small>{{ metric.label }}</small>
                <strong
                  >{{ metric.value }}<span>{{ metric.unit }}</span></strong
                >
                <i :style="{ '--level': metric.level }" aria-hidden="true"></i>
              </div>
            </div>
            <figure class="sim-chart">
              <figcaption>SINR 实时曲线<span>近 40 秒</span></figcaption>
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="sim-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stop-color="#5eead4" stop-opacity="0.35" />
                    <stop offset="1" stop-color="#5eead4" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path :d="trendPath.area" fill="url(#sim-fill)" />
                <path :d="trendPath.line" class="sim-line" />
              </svg>
            </figure>
          </section>

          <section v-else-if="tab === 'lock'" key="lock" class="sim-panel">
            <header class="sim-head">
              <div>
                <small>锁定 5G 频段</small>
                <h3>
                  选择频段<span>当前驻留 {{ camped.id }}</span>
                </h3>
              </div>
            </header>
            <div class="sim-bands" role="radiogroup" aria-label="5G 频段">
              <button
                v-for="band in bands"
                :key="band.id"
                type="button"
                role="radio"
                :aria-checked="picked === band.id"
                :data-camped="camped.id === band.id"
                @click="picked = band.id"
              >
                <strong>{{ band.id }}</strong
                ><span>{{ band.freq }}</span>
              </button>
            </div>
            <button
              type="button"
              class="sim-action"
              :disabled="lockPhase === 'write' || lockPhase === 'register' || picked === camped.id"
              @click="applyLock"
            >
              {{
                lockPhase === 'write' || lockPhase === 'register'
                  ? '正在切换…'
                  : picked === camped.id
                    ? '已锁定 ' + camped.id
                    : '锁定到 ' + picked
              }}
            </button>
            <ol class="sim-steps">
              <li v-for="item in lockSteps" :key="item.label" :data-state="item.state">
                <i aria-hidden="true"></i>{{ item.label }}
              </li>
            </ol>
            <p v-if="lockPhase === 'done'" class="sim-result">
              已驻留 {{ camped.id }} · PCI {{ camped.pci }} · RSRP {{ live.rsrp.toFixed(0) }} dBm
            </p>
          </section>

          <section v-else-if="tab === 'speed'" key="speed" class="sim-panel sim-speed">
            <div class="sim-gauge" :data-phase="speed.phase">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="50" class="sim-gauge-track" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  class="sim-gauge-value"
                  :style="{ '--gauge': gauge }"
                />
              </svg>
              <div>
                <strong>{{ speed.phase === 'idle' ? '—' : speed.value.toFixed(0) }}</strong>
                <span>Mbps · {{ speedLabel }}</span>
              </div>
            </div>
            <dl class="sim-cell">
              <div>
                <dt>延迟</dt>
                <dd>{{ speed.latency ? speed.latency + ' ms' : '—' }}</dd>
              </div>
              <div>
                <dt>下载</dt>
                <dd>{{ speed.down ? speed.down.toFixed(0) + ' Mbps' : '—' }}</dd>
              </div>
              <div>
                <dt>上传</dt>
                <dd>{{ speed.up ? speed.up.toFixed(0) + ' Mbps' : '—' }}</dd>
              </div>
            </dl>
            <button
              type="button"
              class="sim-action"
              :disabled="speed.phase !== 'idle' && speed.phase !== 'done'"
              @click="runSpeed"
            >
              {{
                speed.phase === 'done'
                  ? '重新测速'
                  : speed.phase === 'idle'
                    ? '开始测速'
                    : '测速中…'
              }}
            </button>
          </section>

          <section v-else key="ping" class="sim-panel">
            <header class="sim-head">
              <div>
                <small>Ping 测试</small>
                <h3>{{ ping.target }}<span>每秒 1 次</span></h3>
              </div>
            </header>
            <div class="sim-targets" role="radiogroup" aria-label="Ping 目标">
              <button
                v-for="target in targets"
                :key="target"
                type="button"
                role="radio"
                :aria-checked="ping.target === target"
                @click="setTarget(target)"
              >
                {{ target }}
              </button>
            </div>
            <div class="sim-bars" aria-hidden="true">
              <i
                v-for="(ms, index) in ping.bars"
                :key="index"
                :style="{ '--h': ms ? clamp(ms / 60, 0.06, 1) : 1 }"
                :data-lost="!ms"
              ></i>
            </div>
            <ol class="sim-log">
              <li v-for="line in ping.lines" :key="line.seq">
                <template v-if="line.ms !== null"
                  >seq={{ line.seq }} 来自 {{ ping.target }}：time=<b>{{ line.ms.toFixed(1) }}</b>
                  ms</template
                >
                <template v-else>seq={{ line.seq }} 请求超时</template>
              </li>
            </ol>
            <dl class="sim-cell">
              <div>
                <dt>平均</dt>
                <dd>{{ pingStats.avg }} ms</dd>
              </div>
              <div>
                <dt>最低</dt>
                <dd>{{ pingStats.min }} ms</dd>
              </div>
              <div>
                <dt>丢包</dt>
                <dd>{{ pingStats.loss }}%</dd>
              </div>
            </dl>
          </section>
        </Transition>
      </div>
    </div>
  </div>
</template>
