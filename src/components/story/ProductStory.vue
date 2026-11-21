<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteIcon from '@/components/SiteIcon.vue'
import { useScrollProgress } from '@/composables/useScrollProgress'
import AppMock from './AppMock.vue'
import FitBox from './FitBox.vue'
import MetricTile from './MetricTile.vue'
import { ease, level, mix, span } from './quality'

defineProps<{ versions: Array<{ name: string; version?: string }> }>()

const heroEl = ref<HTMLElement | null>(null)
const connectEl = ref<HTMLElement | null>(null)
const lockEl = ref<HTMLElement | null>(null)
const testEl = ref<HTMLElement | null>(null)
const hero = useScrollProgress(heroEl)
const connect = useScrollProgress(connectEl)
const lock = useScrollProgress(lockEl)
const test = useScrollProgress(testEl)

const phone = ref(false)
let query: MediaQueryList | undefined
const onQuery = () => (phone.value = !!query?.matches)
onMounted(() => {
  query = window.matchMedia('(max-width: 760px)')
  onQuery()
  query.addEventListener('change', onQuery)
})
onUnmounted(() => query?.removeEventListener('change', onQuery))
const variant = computed(() => (phone.value ? 'phone' : 'desktop'))
const mockWidth = computed(() => (phone.value ? 380 : 1040))

/* Hero: the window lifts apart into its layers, holds, then settles back. */
const explode = computed(
  () => ease(span(hero.value, 0.1, 0.42)) * (1 - ease(span(hero.value, 0.8, 0.98)))
)
const heroCopy = computed(() => span(hero.value, 0.03, 0.24))
const heroRise = computed(() => ease(span(hero.value, 0.02, 0.32)))

/* Shared connect data. */
const radioTargets = [
  ['RSRQ', '参考质量', -19, -10, 1],
  ['SINR', '信干噪比', -4, 22, 0],
  ['CQI', '信道质量', 2, 14, 0],
  ['RSSI', '接收强度', -96, -43, 0],
  ['RSRP', '参考功率', -121, -66, 0],
] as const
const powerTargets = [
  ['PUSCH', '上行业务功率', 4, 21],
  ['PUCCH', '上行控制功率', 6, -13],
  ['SRS', '探测功率', 6, 23],
  ['PRACH', '接入功率', 9, -3],
] as const
function radioAt(r: number) {
  return radioTargets.map(([label, sub, from, to, digits]) => {
    const value = mix(from, to, r)
    return { label, sub, value: value.toFixed(digits), level: level(label, value) }
  })
}
function powerAt(r: number) {
  return powerTargets.map(([label, sub, from, to]) => {
    const value = mix(from, to, r)
    return { label, sub, value: `${value.toFixed(0)}dBm`, level: level(label, value) }
  })
}
const cellFacts = [
  ['Band', 'N41'],
  ['PCI', '88'],
  ['ARFCN', '504990'],
  ['TAC', '0x5A2F'],
  ['DL', '100MHz'],
  ['MCS', '25'],
]
const heroRadio = radioAt(1)
const heroPower = powerAt(1)

/* 01 Connect: values settle from a weak signal to the live reading. */
const connectFill = computed(() => ease(span(connect.value, 0.04, 0.5)))
const connectStep = computed(() => (connect.value < 0.34 ? 0 : connect.value < 0.67 ? 1 : 2))
const connectRadio = computed(() => radioAt(connectFill.value))
const connectPower = computed(() => powerAt(ease(span(connect.value, 0.5, 0.8))))

/* 02 Lock: select N78, write, re-register, read back. */
const lockPhase = computed(() => {
  const t = lock.value
  return t < 0.18 ? 0 : t < 0.36 ? 1 : t < 0.52 ? 2 : t < 0.72 ? 3 : 4
})
const lockStep = computed(() => [0, 0, 1, 1, 2][lockPhase.value]!)
const lockCell = computed(() =>
  lockPhase.value < 4
    ? { band: 'N41', pci: '88', arfcn: '504990', rsrp: -88, sinr: 9 }
    : { band: 'N78', pci: '312', arfcn: '627264', rsrp: -79, sinr: 24 }
)
const lockMessage = computed(
  () =>
    [
      null,
      null,
      { tone: 'info', text: '写入锁频段：N78' },
      { tone: 'info', text: '设备重新注册中…' },
      { tone: 'ok', text: '已驻留 N78 · PCI 312，回读校验通过' },
    ][lockPhase.value]
)
const nrBands = ['N1', 'N28', 'N41', 'N78', 'N79']
const lteBands = ['B1', 'B3', 'B8', 'B39', 'B40', 'B41']

/* 03 Test: the speed trace draws itself, then Ping fills in point by point. */
const speedSamples = Array.from({ length: 40 }, (_, i) => {
  const ramp = Math.min(1, i / 7)
  return ramp * (860 + Math.sin(i * 1.7) * 38 + Math.cos(i * 0.6) * 22)
})
const speedDraw = computed(() => ease(span(test.value, 0.06, 0.46)))
const testStep = computed(() => (test.value < 0.5 ? 0 : 1))
function points(values: number[], width: number, height: number) {
  const top = Math.max(...values) * 1.15
  return values
    .map(
      (value, index) =>
        `${((index / (values.length - 1)) * width).toFixed(1)},${(height - (value / top) * (height - 6) - 3).toFixed(1)}`
    )
    .join(' ')
}
const speedLine = points(speedSamples, 600, 96)
const speedStats = computed(() => {
  const count = Math.max(1, Math.round(speedDraw.value * speedSamples.length))
  const seen = speedSamples.slice(0, count)
  const seconds = speedDraw.value * 10
  const total = ((seen.reduce((sum, value) => sum + value, 0) / speedSamples.length) * 10) / 8
  return [
    ['总流量', `${total.toFixed(1)} MB`],
    ['平均速度', `${seconds ? ((total * 8) / seconds).toFixed(1) : '0.0'} Mbps`],
    ['当前速度', `${(seen[seen.length - 1] ?? 0).toFixed(1)} Mbps`],
    ['运行时间', `00:${String(Math.floor(seconds)).padStart(2, '0')}`],
  ]
})
const pingSamples = [23.5, 20.9, 24.8, 20.1, 21.6, 22.0, 20.8, 20.9, 22.3, 21.5]
const pingShown = computed(() =>
  Math.round(ease(span(test.value, 0.55, 0.92)) * pingSamples.length)
)
const pingDots = pingSamples.map(
  (value, index) => [(index / 9) * 600, 100 - ((value - 12) / 18) * 80] as const
)
const pingLine = computed(() =>
  pingDots
    .slice(0, pingShown.value)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
)
const pingStats = computed(() => {
  const seen = pingSamples.slice(0, pingShown.value)
  const fmt = (value?: number) => (value === undefined ? '—' : `${value.toFixed(1)} ms`)
  return [
    ['最后延迟', fmt(seen[seen.length - 1])],
    ['平均延迟', fmt(seen.length ? seen.reduce((a, b) => a + b, 0) / seen.length : undefined)],
    ['最小延迟', fmt(seen.length ? Math.min(...seen) : undefined)],
    ['最大延迟', fmt(seen.length ? Math.max(...seen) : undefined)],
  ]
})

const steps = {
  connect: [
    ['小区与制式', 'Band、PCI、ARFCN 和 RRC 状态，登录后自动刷新。'],
    ['射频质量', 'RSRP、RSRQ、SINR、CQI 按阈值着色，圆环越满信号越好。'],
    ['上行功率', 'PUSCH、PUCCH、SRS、PRACH 放在一起，看上行是否吃力。'],
  ],
  lock: [
    ['选择频段', '按厂家能力列出 NR 与 LTE 频段，也能锁 ARFCN 或 PCI。'],
    ['写入并重新注册', '写入配置后设备重新注册，过程实时显示。'],
    ['回读校验', '读取设备上的实际规则，确认与设置一致。'],
  ],
  test: [
    ['多线程测速', '在本机直接测速，记录平均和实时速率。'],
    ['Ping 与路由', '常用站点一键 Ping，延迟走势一目了然。'],
  ],
}
</script>

<template>
  <div class="story">
    <!-- Hero: exploded view -->
    <section ref="heroEl" class="story-scene hero" aria-labelledby="home-title">
      <div class="story-sticky">
        <div
          class="story-hero-copy content-width"
          :style="{ opacity: 1 - heroCopy, transform: `translateY(${-heroCopy * 48}px)` }"
        >
          <RouterLink class="story-release" to="/changelog"
            >Android 3.7.1 · 桌面版 3.5.3<SiteIcon name="chevron" :size="14"
          /></RouterLink>
          <h1 id="home-title">把 CPE 的每一项数据，<br />摊开给你看。</h1>
          <p>实时射频质量、锁频与测速，Android、macOS、Windows 同一套界面。</p>
          <div class="story-actions">
            <RouterLink class="story-button primary" to="/download"
              ><SiteIcon name="download" :size="18" />免费下载</RouterLink
            >
            <RouterLink class="story-button" to="/product">功能介绍</RouterLink>
          </div>
        </div>
        <div class="story-hero-stage" :style="{ transform: `translateY(${-heroRise * 36}vh)` }">
          <FitBox :width="mockWidth">
            <AppMock page="connect" :variant="variant" :explode="explode">
              <section class="am-pane am-layer" style="--z: 3">
                <span class="am-tag">小区与制式</span>
                <header class="am-pane-head">
                  <h4>连接情况</h4>
                  <span class="am-chips"
                    ><b class="amber">RRC正常</b><b class="blue">5G SA</b><b>中国移动</b></span
                  >
                </header>
                <div class="am-mini">
                  <div v-for="[label, value] in cellFacts" :key="label">
                    <span>{{ label }}</span
                    ><strong>{{ value }}</strong>
                  </div>
                </div>
              </section>
              <section class="am-pane am-layer" style="--z: 4">
                <span class="am-tag">RSRP · RSRQ · SINR · CQI</span>
                <header class="am-pane-head">
                  <h4>射频质量</h4>
                  <span>5 项</span>
                </header>
                <div class="am-tiles radio">
                  <MetricTile v-for="m in heroRadio" :key="m.label" v-bind="m" />
                </div>
              </section>
              <section class="am-pane am-layer" style="--z: 5">
                <span class="am-tag">上行功率与带宽</span>
                <header class="am-pane-head">
                  <h4>当前功率</h4>
                  <span>6 项</span>
                </header>
                <div class="am-tiles power">
                  <MetricTile v-for="m in heroPower" :key="m.label" v-bind="m" />
                </div>
              </section>
            </AppMock>
          </FitBox>
        </div>
        <p class="story-caption" :style="{ opacity: explode }">
          桌面端连接页的实际结构：侧栏、顶栏和三组数据卡片
        </p>
      </div>
    </section>

    <!-- 01 Connect -->
    <section ref="connectEl" class="story-scene" aria-labelledby="story-connect">
      <div class="story-sticky split content-width">
        <div class="story-text">
          <p class="story-eyebrow">01 · 连接</p>
          <h2 id="story-connect">信号好不好，<br />一眼就知道。</h2>
          <ol class="story-steps">
            <li
              v-for="([title, text], index) in steps.connect"
              :key="title"
              :class="{ on: index === connectStep }"
            >
              <b>{{ title }}</b
              ><span>{{ text }}</span>
            </li>
          </ol>
        </div>
        <div class="story-device focusing">
          <FitBox :width="mockWidth" fit-height>
            <AppMock page="connect" :variant="variant">
              <section class="am-pane" :class="{ focus: connectStep === 0 }">
                <header class="am-pane-head">
                  <h4>连接情况</h4>
                  <span class="am-chips"
                    ><b class="amber">RRC正常</b><b class="blue">5G SA</b><b>中国移动</b></span
                  >
                </header>
                <div class="am-mini">
                  <div v-for="[label, value] in cellFacts" :key="label">
                    <span>{{ label }}</span
                    ><strong>{{ value }}</strong>
                  </div>
                </div>
              </section>
              <section class="am-pane" :class="{ focus: connectStep === 1 }">
                <header class="am-pane-head">
                  <h4>射频质量</h4>
                  <span>5 项</span>
                </header>
                <div class="am-tiles radio">
                  <MetricTile
                    v-for="m in connectRadio"
                    :key="m.label"
                    v-bind="m"
                    :fill="connectFill"
                  />
                </div>
              </section>
              <section class="am-pane" :class="{ focus: connectStep === 2 }">
                <header class="am-pane-head">
                  <h4>当前功率</h4>
                  <span>6 项</span>
                </header>
                <div class="am-tiles power">
                  <MetricTile v-for="m in connectPower" :key="m.label" v-bind="m" />
                </div>
              </section>
            </AppMock>
          </FitBox>
        </div>
      </div>
    </section>

    <!-- 02 Lock -->
    <section ref="lockEl" class="story-scene" aria-labelledby="story-lock">
      <div class="story-sticky split content-width">
        <div class="story-text">
          <p class="story-eyebrow">02 · 锁频</p>
          <h2 id="story-lock">换一个频段，<br />结果当场验证。</h2>
          <ol class="story-steps">
            <li
              v-for="([title, text], index) in steps.lock"
              :key="title"
              :class="{ on: index === lockStep }"
            >
              <b>{{ title }}</b
              ><span>{{ text }}</span>
            </li>
          </ol>
        </div>
        <div class="story-device">
          <FitBox :width="mockWidth" fit-height>
            <AppMock page="lock" :variant="variant" :connected="lockPhase !== 3">
              <section class="am-pane">
                <header class="am-pane-head">
                  <h4>锁定模式</h4>
                  <span>{{ lockPhase === 4 ? '已锁定' : '未锁定' }}</span>
                </header>
                <div class="am-seg">
                  <span class="on">锁频段</span><span>锁ARFCN</span><span>锁PCI</span>
                </div>
                <div class="am-bands">
                  <div>
                    <em>NR</em>
                    <span
                      v-for="band in nrBands"
                      :key="band"
                      :class="{
                        on: band === 'N78' && lockPhase >= 1,
                        camped: band === lockCell.band && lockPhase !== 3,
                      }"
                      >{{ band }}</span
                    >
                  </div>
                  <div>
                    <em>LTE</em><span v-for="band in lteBands" :key="band">{{ band }}</span>
                  </div>
                </div>
                <div class="am-row">
                  <span class="am-wide">读取</span>
                  <span class="am-wide fill" :class="{ pressed: lockPhase === 2 }">应用</span>
                  <span class="am-wide">解除</span>
                </div>
                <p class="am-message" :class="[lockMessage?.tone, { empty: !lockMessage }]">
                  <i v-if="lockPhase === 2 || lockPhase === 3" class="am-spin"></i
                  >{{ lockMessage?.text ?? '选择频段后点击应用' }}
                </p>
              </section>
              <section class="am-pane">
                <header class="am-pane-head">
                  <h4>当前小区</h4>
                  <span class="am-chips"
                    ><b class="amber">{{ lockPhase === 3 ? '注册中' : 'RRC正常' }}</b
                    ><b class="blue">5G SA</b></span
                  >
                </header>
                <div class="am-mini">
                  <div>
                    <span>Band</span><strong>{{ lockPhase === 3 ? '—' : lockCell.band }}</strong>
                  </div>
                  <div>
                    <span>PCI</span><strong>{{ lockPhase === 3 ? '—' : lockCell.pci }}</strong>
                  </div>
                  <div>
                    <span>ARFCN</span><strong>{{ lockPhase === 3 ? '—' : lockCell.arfcn }}</strong>
                  </div>
                </div>
                <div class="am-tiles two">
                  <MetricTile
                    label="RSRP"
                    sub="参考功率"
                    :value="lockPhase === 3 ? '—' : String(lockCell.rsrp)"
                    :level="lockPhase === 3 ? null : level('RSRP', lockCell.rsrp)"
                  />
                  <MetricTile
                    label="SINR"
                    sub="信干噪比"
                    :value="lockPhase === 3 ? '—' : String(lockCell.sinr)"
                    :level="lockPhase === 3 ? null : level('SINR', lockCell.sinr)"
                  />
                </div>
              </section>
            </AppMock>
          </FitBox>
        </div>
      </div>
    </section>

    <!-- 03 Test -->
    <section ref="testEl" class="story-scene" aria-labelledby="story-test">
      <div class="story-sticky split content-width">
        <div class="story-text">
          <p class="story-eyebrow">03 · 测试</p>
          <h2 id="story-test">问题在信号还是外网，<br />测一下就清楚。</h2>
          <ol class="story-steps">
            <li
              v-for="([title, text], index) in steps.test"
              :key="title"
              :class="{ on: index === testStep }"
            >
              <b>{{ title }}</b
              ><span>{{ text }}</span>
            </li>
          </ol>
        </div>
        <div class="story-device">
          <FitBox :width="mockWidth" fit-height>
            <AppMock page="test" :variant="variant">
              <section v-if="testStep === 0" class="am-pane">
                <header class="am-pane-head">
                  <h4>本机测速</h4>
                  <span>{{ speedStats[3]![1] }}</span>
                </header>
                <div class="am-source">
                  <strong>Cloudflare 100MB</strong
                  ><span>speed.cloudflare.com/__down?bytes=100000000</span>
                </div>
                <div class="am-slider">
                  <em>线程</em><b>16</b><i><s style="width: 50%"></s></i>
                </div>
                <span class="am-wide fill block">{{
                  speedDraw < 1 ? '停止测速' : '开始测速'
                }}</span>
                <svg class="am-chart" viewBox="0 0 600 96" preserveAspectRatio="none">
                  <path class="grid" d="M0 24H600M0 48H600M0 72H600" />
                  <polyline
                    :points="speedLine"
                    pathLength="1"
                    :style="{ strokeDashoffset: 1 - speedDraw }"
                  />
                </svg>
                <div class="am-mini four">
                  <div v-for="[label, value] in speedStats" :key="label">
                    <span>{{ label }}</span
                    ><strong>{{ value }}</strong>
                  </div>
                </div>
              </section>
              <section v-else class="am-pane">
                <header class="am-pane-head">
                  <h4>Ping测试</h4>
                  <span>{{ pingShown === pingSamples.length ? '完成' : '进行中' }}</span>
                </header>
                <div class="am-input">www.taobao.com</div>
                <div class="am-pills">
                  <span
                    v-for="(name, index) in [
                      '淘宝',
                      'QQ',
                      '京东',
                      'B站',
                      '优酷',
                      '爱奇艺',
                      '腾讯视频',
                      '网易',
                      '百度',
                    ]"
                    :key="name"
                    :class="{ on: index === 0 }"
                    >{{ name }}</span
                  >
                </div>
                <figure class="am-graph">
                  <figcaption>
                    <b>Ping 延迟走势</b><span>{{ pingShown }} 点</span>
                  </figcaption>
                  <svg viewBox="0 0 600 110" preserveAspectRatio="none">
                    <path class="grid" d="M0 20H600M0 50H600M0 80H600" />
                    <polyline v-if="pingShown > 1" :points="pingLine" />
                    <circle
                      v-for="([x, y], index) in pingDots.slice(0, pingShown)"
                      :key="index"
                      :cx="x"
                      :cy="y"
                      r="3"
                    />
                  </svg>
                </figure>
                <div class="am-mini four">
                  <div v-for="[label, value] in pingStats" :key="label">
                    <span>{{ label }}</span
                    ><strong>{{ value }}</strong>
                  </div>
                </div>
              </section>
            </AppMock>
          </FitBox>
        </div>
      </div>
    </section>

    <!-- 04 Platforms -->
    <section class="story-platforms content-width" aria-labelledby="story-platforms">
      <div class="story-text center" data-reveal>
        <p class="story-eyebrow">04 · 多平台</p>
        <h2 id="story-platforms">手机现场调，<br />电脑长时间看。</h2>
        <p>Android、macOS 与 Windows 功能一致，深色和浅色主题都支持。</p>
        <ul class="story-versions">
          <li v-for="item in versions" :key="item.name">
            <b>{{ item.name }}</b
            ><span>v{{ item.version }}</span>
          </li>
        </ul>
      </div>
      <div class="story-pair" data-reveal>
        <div class="story-pair-desktop">
          <FitBox :width="1040">
            <AppMock page="connect" theme="light">
              <section class="am-pane">
                <header class="am-pane-head">
                  <h4>射频质量</h4>
                  <span>5 项</span>
                </header>
                <div class="am-tiles radio">
                  <MetricTile v-for="m in heroRadio" :key="m.label" v-bind="m" />
                </div>
              </section>
              <section class="am-pane">
                <header class="am-pane-head">
                  <h4>当前功率</h4>
                  <span>6 项</span>
                </header>
                <div class="am-tiles power">
                  <MetricTile v-for="m in heroPower" :key="m.label" v-bind="m" />
                </div>
              </section>
            </AppMock>
          </FitBox>
        </div>
        <div class="story-pair-phone">
          <FitBox :width="380">
            <AppMock page="connect" variant="phone">
              <section class="am-pane">
                <header class="am-pane-head">
                  <h4>连接情况</h4>
                  <span class="am-chips"
                    ><b class="amber">RRC正常</b><b class="blue">5G SA</b></span
                  >
                </header>
                <div class="am-mini">
                  <div v-for="[label, value] in cellFacts" :key="label">
                    <span>{{ label }}</span
                    ><strong>{{ value }}</strong>
                  </div>
                </div>
              </section>
              <section class="am-pane">
                <header class="am-pane-head">
                  <h4>射频质量</h4>
                  <span>5 项</span>
                </header>
                <div class="am-tiles radio">
                  <MetricTile v-for="m in heroRadio" :key="m.label" v-bind="m" />
                </div>
              </section>
            </AppMock>
          </FitBox>
        </div>
      </div>
    </section>
  </div>
</template>
