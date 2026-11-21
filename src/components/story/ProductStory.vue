<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteIcon from '@/components/SiteIcon.vue'
import { useScrollProgress } from '@/composables/useScrollProgress'
import AppMock from './AppMock.vue'
import FitBox from './FitBox.vue'
import MetricTile from './MetricTile.vue'
import PhoneMock from './PhoneMock.vue'
import PhoneTile from './PhoneTile.vue'
import { ease, level, mix, span, type Level } from './quality'

defineProps<{ versions: Array<{ name: string; version?: string }> }>()

const heroEl = ref<HTMLElement | null>(null)
const connectEl = ref<HTMLElement | null>(null)
const lockEl = ref<HTMLElement | null>(null)
const testEl = ref<HTMLElement | null>(null)
const platformEl = ref<HTMLElement | null>(null)
const hero = useScrollProgress(heroEl)
const connect = useScrollProgress(connectEl)
const lock = useScrollProgress(lockEl)
const test = useScrollProgress(testEl)
const platform = useScrollProgress(platformEl)
const reveal = (t: number) => ease(span(t, 0, 0.07))

const chapters = ['连接', '锁频', '测试', '多平台']
const chapterEls = [connectEl, lockEl, testEl, platformEl]
const chapterProgress = computed(() => [connect.value, lock.value, test.value, platform.value])
const railActive = computed(() => chapterProgress.value.findIndex((p) => p > 0 && p < 1))
function jump(index: number) {
  const element = chapterEls[index]?.value
  if (!element) return
  const top = element.getBoundingClientRect().top + window.scrollY
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: top + (element.offsetHeight - window.innerHeight) * 0.3,
    behavior: reduce ? 'auto' : 'smooth',
  })
}

const narrow = ref(false)
let query: MediaQueryList | undefined
const onQuery = () => (narrow.value = !!query?.matches)
onMounted(() => {
  query = window.matchMedia('(max-width: 760px)')
  onQuery()
  query.addEventListener('change', onQuery)
})
onUnmounted(() => query?.removeEventListener('change', onQuery))

// Tile widths inside the 410px phone frame: 336px of card content.
const W = { c2: 164, c3: 106.67, c4: 78 }
const words: Record<Level, string> = {
  excellent: '极佳',
  good: '良好',
  fair: '一般',
  poor: '较弱',
  bad: '很弱',
}

const cellFacts = [
  ['Band', 'N41'],
  ['PCI', '88'],
  ['ARFCN', '504990'],
  ['gCellID', '3518/2'],
  ['TAC', '0x5A2F'],
  ['DL', '100MHz'],
]
const radioSpec = [
  ['RSRP', -121, -66, 0, '≥ -80 dBm'],
  ['RSRQ', -19, -10, 1, '≥ -10 dB'],
  ['SINR', -4, 22, 0, '≥ 20 dB'],
  ['RSSI', -96, -43, 0, '≥ -65 dBm'],
  ['CQI', 2, 14, 0, '≥ 13'],
] as const
const powerSpec = [
  ['PUSCH', 4, 23],
  ['PUCCH', 6, -12],
  ['SRS', 6, 28],
  ['PRACH', 9, -3],
] as const
function radioAt(r: number) {
  return radioSpec.map(([label, from, to, digits, rule]) => {
    const value = mix(from, to, r)
    return { label, value: value.toFixed(digits), level: level(label, value), rule }
  })
}
function powerAt(r: number) {
  return powerSpec.map(([label, from, to]) => {
    const value = mix(from, to, r)
    return { label, value: `${value.toFixed(0)}dBm`, level: level(label, value) }
  })
}
const finalRadio = radioAt(1)
const finalPower = powerAt(1)

/* Hero: the phone slides to centre, lifts apart into its layers, then settles back. */
const heroShift = computed(() => ease(span(hero.value, 0.03, 0.3)))
const explode = computed(
  () => ease(span(hero.value, 0.14, 0.44)) * (1 - ease(span(hero.value, 0.84, 0.99)))
)

/* 01 Connect */
const connectFill = computed(() => ease(span(connect.value, 0.04, 0.42)))
const connectRadio = computed(() => radioAt(connectFill.value))
const connectPower = computed(() => powerAt(ease(span(connect.value, 0.2, 0.5))))
const burst = computed(() => ease(span(connect.value, 0.52, 0.8)))
const connectStep = computed(() => (connect.value < 0.22 ? 0 : connect.value < 0.52 ? 1 : 2))
const burstSpots = [
  [-1, -0.95],
  [-1.12, 0],
  [-1, 0.95],
  [1, -0.55],
  [1.05, 0.5],
] as const

/* 02 Lock */
const deal = computed(() => 1 - ease(span(lock.value, 0, 0.24)))
const lockPhase = computed(() => {
  const t = lock.value
  return t < 0.32 ? 0 : t < 0.44 ? 1 : t < 0.54 ? 2 : t < 0.74 ? 3 : 4
})
const lockStep = computed(() => [0, 0, 1, 1, 2][lockPhase.value]!)
const nrBands = [
  ['N1', '2100 MHz'],
  ['N28', '700 MHz'],
  ['N41', '2.6 GHz'],
  ['N78', '3.5 GHz'],
  ['N79', '4.9 GHz'],
]
const lockLines = computed(() =>
  lockPhase.value === 4
    ? ['LTE: mode=0 bands=(无)', 'NR:  mode=1 bands=78']
    : lockPhase.value === 3
      ? ['LTE: mode=0 bands=(无)', 'NR:  重新注册中…']
      : ['LTE: mode=0 bands=(无)', 'NR:  mode=0 bands=(无)']
)
const toast = computed(
  () =>
    [
      null,
      null,
      { tone: 'info', text: '写入锁频段 N78' },
      { tone: 'info', text: '设备重新注册中…' },
      { tone: 'ok', text: '回读校验通过' },
    ][lockPhase.value]
)
const callout = computed(() => ease(span(lock.value, 0.76, 0.9)))

/* 03 Test */
const speedK = computed(() => ease(span(test.value, 0.04, 0.42)))
const pingK = computed(() => ease(span(test.value, 0.58, 0.92)))
const testTab = computed(() => (test.value < 0.5 ? 1 : 0))
const rates = computed(() => {
  const k = speedK.value
  const f = (v: number) => `${mix(0, v, k).toFixed(v > 200 ? 0 : 1)} Mbps`
  return [
    ['下载速度', f(932)],
    ['上传速度', f(148)],
    ['平均下载', f(861)],
    ['平均上传', f(131)],
    ['最高下载', f(948)],
    ['最高上传', f(156)],
  ]
})
const pingSamples = [26.1, 31.4, 24.8, 33.2, 27.9, 35.6, 34.1, 32.7, 30.2, 42.8]
const pingCount = computed(() => Math.round(pingK.value * pingSamples.length))
const pingSeen = computed(() => pingSamples.slice(0, pingCount.value))
const pingStats = computed(() => {
  const seen = pingSeen.value
  const ms = (v?: number) => (v === undefined ? '—' : `${v.toFixed(1)} ms`)
  return [
    ['已发送', String(seen.length)],
    ['已接收', String(seen.length)],
    ['丢包率', '0%'],
    ['最小', ms(seen.length ? Math.min(...seen) : undefined)],
    ['平均', ms(seen.length ? seen.reduce((a, b) => a + b, 0) / seen.length : undefined)],
    ['最大', ms(seen.length ? Math.max(...seen) : undefined)],
  ]
})
const pingPoints = pingSamples.map(
  (v, i) => [12 + (i / 9) * 312, 140 - ((v - 15) / 35) * 120] as const
)
const pingLine = computed(() =>
  pingPoints
    .slice(0, pingCount.value)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
)
const giant = computed(() =>
  testTab.value === 1
    ? {
        value: mix(0, 932, speedK.value).toFixed(0),
        unit: 'Mbps 下载',
        show: span(test.value, 0, 0.08) * (1 - span(test.value, 0.44, 0.5)),
      }
    : {
        value: pingSeen.value.length
          ? (pingSeen.value.reduce((a, b) => a + b, 0) / pingSeen.value.length).toFixed(1)
          : '0.0',
        unit: 'ms 平均延迟',
        show: span(test.value, 0.5, 0.58),
      }
)

/* 04 Platforms */
const slide = computed(() => ease(span(platform.value, 0.04, 0.42)))
const wipe = computed(() => ease(span(platform.value, 0.56, 0.9)))
const platformStep = computed(() => (platform.value < 0.5 ? 0 : 1))

const steps = {
  connect: [
    ['小区与制式', '登录后自动刷新 Band、PCI、ARFCN 与 RRC 状态。'],
    ['射频质量', '数值越好，边框绕得越满，颜色越绿。'],
    ['按阈值评级', 'RSRP、RSRQ、SINR、RSSI、CQI 各有门限，好坏一眼可辨。'],
  ],
  lock: [
    ['选择频段', '按设备能力列出可锁的 NR 与 LTE 频段。'],
    ['写入并重新注册', '写入配置后设备重新注册，过程实时显示。'],
    ['回读校验', '读取设备上的实际规则，确认与设置一致。'],
  ],
  test: [
    ['多线程测速', '直接在手机上测速，实时、平均与峰值速率都有记录。'],
    ['Ping 延迟', '常用站点一键 Ping，丢包与延迟曲线一目了然。'],
  ],
  platform: [
    ['手机与电脑', 'Android 现场调试，macOS 与 Windows 长时间观察，功能一致。'],
    ['深色与浅色', '跟随系统，或在设置里单独切换。'],
  ],
}
</script>

<template>
  <div class="story" :class="{ narrow }">
    <nav class="story-rail" :class="{ show: railActive >= 0 }" aria-label="功能章节">
      <button
        v-for="(name, index) in chapters"
        :key="name"
        type="button"
        :class="{ on: index === railActive }"
        :aria-current="index === railActive ? 'step' : undefined"
        @click="jump(index)"
      >
        <i :style="{ '--p': chapterProgress[index] }"></i><span>0{{ index + 1 }}</span
        >{{ name }}
      </button>
    </nav>
    <!-- Hero -->
    <section ref="heroEl" class="story-scene hero" aria-labelledby="home-title">
      <div class="story-sticky" :style="{ '--shift': heroShift, '--e': explode }">
        <div class="story-hero-copy" :style="{ opacity: 1 - span(hero, 0.03, 0.2) }">
          <RouterLink class="story-release" to="/changelog"
            >Android 3.7.1 已发布<SiteIcon name="chevron" :size="14"
          /></RouterLink>
          <h1 id="home-title">每一项数据，<br />都摊开给你看。</h1>
          <p>
            CPE加加 连上 4G / 5G CPE 后台，把信号、锁频和测速放进手机。也有 macOS 与 Windows 版本。
          </p>
          <div class="story-actions">
            <RouterLink class="story-button primary" to="/download"
              ><SiteIcon name="download" :size="18" />免费下载</RouterLink
            >
            <RouterLink class="story-button" to="/product">功能介绍</RouterLink>
          </div>
        </div>
        <div class="story-hero-phone">
          <FitBox :width="410" fit-height>
            <PhoneMock page="connect" :explode="explode">
              <div class="pm-card pm-layer" style="--z: 2">
                <span class="am-tag pm-tag">连接状态</span>
                <div class="pm-head">
                  <h4>连接情况</h4>
                  <em>刷新</em>
                </div>
                <div class="pm-chips">
                  <b class="amber">RRC正常</b><b class="blue">5G SA</b><b>中国移动</b>
                </div>
              </div>
              <div class="pm-card pm-layer" style="--z: 3">
                <span class="am-tag pm-tag">当前小区</span>
                <h4>当前小区</h4>
                <div class="pm-grid c3">
                  <PhoneTile
                    v-for="[label, value] in cellFacts"
                    :key="label"
                    :label="label"
                    :value="value"
                    :w="W.c3"
                  />
                </div>
              </div>
              <div class="pm-card pm-layer" style="--z: 4">
                <span class="am-tag pm-tag">射频质量</span>
                <h4>射频质量</h4>
                <div class="pm-grid c3">
                  <PhoneTile
                    v-for="m in finalRadio.slice(0, 3)"
                    :key="m.label"
                    v-bind="m"
                    :w="W.c3"
                  />
                </div>
                <div class="pm-grid c2">
                  <PhoneTile v-for="m in finalRadio.slice(3)" :key="m.label" v-bind="m" :w="W.c2" />
                </div>
              </div>
              <div class="pm-card pm-layer" style="--z: 5">
                <span class="am-tag pm-tag">上行功率</span>
                <h4>当前功率</h4>
                <div class="pm-grid c4">
                  <PhoneTile v-for="m in finalPower" :key="m.label" v-bind="m" :w="W.c4" />
                </div>
              </div>
            </PhoneMock>
          </FitBox>
        </div>
        <p class="story-caption" :style="{ opacity: explode }">
          Android 连接页的真实结构，一层一层拆开
        </p>
        <span class="story-scroll" :style="{ opacity: 1 - span(hero, 0, 0.06) }">向下滚动</span>
      </div>
    </section>

    <!-- 01 Connect -->
    <section ref="connectEl" class="story-scene" aria-labelledby="story-connect">
      <div class="story-sticky stage" :style="{ '--t': connect }">
        <header class="story-head">
          <p class="story-eyebrow">01 连接</p>
          <h2 id="story-connect">
            <span class="story-reveal" :style="{ '--r': reveal(connect) }"
              >信号好不好，<br />一眼就知道。</span
            >
          </h2>
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
        </header>
        <div class="story-stagebox">
          <FitBox :width="410" fit-height>
            <PhoneMock page="connect">
              <div class="pm-card" :class="{ dim: connectStep === 2 }">
                <div class="pm-head">
                  <h4>连接情况</h4>
                  <em>刷新</em>
                </div>
                <div class="pm-chips">
                  <b class="amber">RRC正常</b><b class="blue">5G SA</b><b>中国移动</b>
                </div>
              </div>
              <div class="pm-card" :class="{ glow: connectStep === 0, dim: connectStep === 2 }">
                <h4>当前小区</h4>
                <div class="pm-grid c3">
                  <PhoneTile
                    v-for="[label, value] in cellFacts"
                    :key="label"
                    :label="label"
                    :value="value"
                    :w="W.c3"
                  />
                </div>
              </div>
              <div class="pm-card" :class="{ glow: connectStep >= 1 }">
                <h4>射频质量</h4>
                <div class="pm-grid c3">
                  <PhoneTile
                    v-for="m in connectRadio.slice(0, 3)"
                    :key="m.label"
                    v-bind="m"
                    :w="W.c3"
                    :fill="connectFill"
                  />
                </div>
                <div class="pm-grid c2">
                  <PhoneTile
                    v-for="m in connectRadio.slice(3)"
                    :key="m.label"
                    v-bind="m"
                    :w="W.c2"
                    :fill="connectFill"
                  />
                </div>
              </div>
              <div class="pm-card" :class="{ dim: connectStep === 2 }">
                <h4>当前功率</h4>
                <div class="pm-grid c4">
                  <PhoneTile v-for="m in connectPower" :key="m.label" v-bind="m" :w="W.c4" />
                </div>
              </div>
            </PhoneMock>
          </FitBox>
          <div
            v-for="(m, index) in finalRadio"
            :key="m.label"
            class="story-burst"
            :style="{
              '--bx': burstSpots[index]![0],
              '--by': burstSpots[index]![1],
              '--b': burst,
              transitionDelay: `${index * 30}ms`,
            }"
          >
            <span>{{ m.label }}</span>
            <strong :class="m.level">{{ m.value }}</strong>
            <em :class="m.level">{{ words[m.level] }}</em>
            <small>{{ m.rule }} 为极佳</small>
          </div>
        </div>
      </div>
    </section>

    <!-- 02 Lock -->
    <section ref="lockEl" class="story-scene" aria-labelledby="story-lock">
      <div class="story-sticky stage" :style="{ '--t': lock }">
        <header class="story-head">
          <p class="story-eyebrow">02 锁频</p>
          <h2 id="story-lock">
            <span class="story-reveal" :style="{ '--r': reveal(lock) }"
              >换一个频段，<br />结果当场验证。</span
            >
          </h2>
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
        </header>
        <div class="story-stagebox">
          <FitBox :width="410" fit-height>
            <PhoneMock
              page="lock"
              :tabs="['网络首选', '锁频段', '锁ARFCN', '锁PCI']"
              :tab="1"
              :clip="false"
            >
              <div class="pm-card" :class="{ glow: lockPhase >= 3 }">
                <h4>当前状态</h4>
                <p class="pm-lines">
                  <template v-for="line in lockLines" :key="line">{{ line }}<br /></template>
                </p>
              </div>
              <div class="pm-actions">
                <span>读取</span
                ><span class="fill" :class="{ pressed: lockPhase === 2 }">应用</span>
              </div>
              <div class="pm-card">
                <h4>NR 频段</h4>
                <div
                  v-for="([band, freq], index) in nrBands"
                  :key="band"
                  class="pm-band"
                  :class="{ on: band === 'N78' && lockPhase >= 1 }"
                  :style="{
                    transform: `translate3d(${deal * (index - 2) * 120}px, ${deal * (Math.abs(index - 2) * 26 - 30)}px, ${deal * 90}px) rotate(${deal * (index - 2) * 7}deg)`,
                  }"
                >
                  <div>
                    <b>{{ band }}</b
                    ><small>NR 频段 · {{ freq }}</small>
                  </div>
                  <span>SA</span><span>NSA</span><i></i>
                </div>
              </div>
            </PhoneMock>
          </FitBox>
          <p v-if="toast" class="story-toast" :class="toast.tone">
            <i v-if="lockPhase < 4" class="am-spin"></i
            ><SiteIcon v-else name="check" :size="16" />{{ toast.text }}
          </p>
          <div class="story-callout" :style="{ '--c': callout }">
            <div><span>锁定前</span><b>N41</b><small>SINR 9 · RSRP -88</small></div>
            <i aria-hidden="true">→</i>
            <div class="after"><span>锁定后</span><b>N78</b><small>SINR 24 · RSRP -79</small></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 03 Test -->
    <section ref="testEl" class="story-scene" aria-labelledby="story-test">
      <div class="story-sticky stage" :style="{ '--t': test }">
        <header class="story-head">
          <p class="story-eyebrow">03 测试</p>
          <h2 id="story-test">
            <span class="story-reveal" :style="{ '--r': reveal(test) }"
              >信号还是外网，<br />测一下就清楚。</span
            >
          </h2>
          <ol class="story-steps">
            <li
              v-for="([title, text], index) in steps.test"
              :key="title"
              :class="{ on: index === 1 - testTab }"
            >
              <b>{{ title }}</b
              ><span>{{ text }}</span>
            </li>
          </ol>
        </header>
        <div class="story-stagebox">
          <p class="story-giant" :style="{ opacity: giant.show }">
            {{ giant.value }}<small>{{ giant.unit }}</small>
          </p>
          <FitBox :width="410" fit-height>
            <PhoneMock page="test" :tabs="['Ping', '测速', '路由测试']" :tab="testTab">
              <template v-if="testTab === 1">
                <div class="pm-card glow">
                  <h4>速率监控</h4>
                  <div class="pm-grid c2">
                    <div v-for="[label, value] in rates" :key="label" class="pm-rate">
                      <span>{{ label }}</span
                      ><strong>{{ value }}</strong>
                    </div>
                  </div>
                </div>
                <div class="pm-card">
                  <h4>原生测速</h4>
                  <div class="pm-field">Cloudflare 100MB</div>
                  <p class="pm-note">
                    下载 https://speed.cloudflare.com/__down?bytes=100000000<br />上传
                    https://speed.cloudflare.com/__up
                  </p>
                  <div class="pm-slider">
                    线程数：16<i><s style="width: 26%"></s></i>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="pm-card">
                  <h4>Ping</h4>
                  <div class="pm-field plain">www.taobao.com</div>
                  <div class="pm-actions">
                    <span class="fill">{{ pingCount < 10 ? 'Ping 中…' : '开始 Ping' }}</span>
                  </div>
                </div>
                <div class="pm-card">
                  <div class="pm-grid c3">
                    <PhoneTile
                      v-for="[label, value] in pingStats"
                      :key="label"
                      :label="label"
                      :value="value"
                      :w="W.c3"
                    />
                  </div>
                </div>
                <div class="pm-card glow">
                  <h4>延迟曲线</h4>
                  <svg class="pm-chart" viewBox="0 0 336 150">
                    <path class="grid" d="M0 20H336M0 60H336M0 100H336M0 140H336" />
                    <polyline v-if="pingCount > 1" :points="pingLine" />
                    <circle
                      v-for="([x, y], index) in pingPoints.slice(0, pingCount)"
                      :key="index"
                      :cx="x"
                      :cy="y"
                      r="4.5"
                    />
                  </svg>
                </div>
              </template>
            </PhoneMock>
          </FitBox>
        </div>
      </div>
    </section>

    <!-- 04 Platforms -->
    <section ref="platformEl" class="story-scene short" aria-labelledby="story-platforms">
      <div class="story-sticky stage" :style="{ '--s': slide, '--t': platform }">
        <header class="story-head">
          <p class="story-eyebrow">04 多平台</p>
          <h2 id="story-platforms">
            <span class="story-reveal" :style="{ '--r': reveal(platform) }"
              >手机现场调，<br />电脑长时间看。</span
            >
          </h2>
          <ol class="story-steps">
            <li
              v-for="([title, text], index) in steps.platform"
              :key="title"
              :class="{ on: index === platformStep }"
            >
              <b>{{ title }}</b
              ><span>{{ text }}</span>
            </li>
          </ol>
          <ul class="story-versions">
            <li v-for="item in versions" :key="item.name">
              <b>{{ item.name }}</b
              ><span>v{{ item.version }}</span>
            </li>
          </ul>
        </header>
        <div class="story-stagebox">
          <div class="story-desktop">
            <FitBox :width="1040">
              <AppMock page="connect" :theme="wipe > 0.5 ? 'light' : 'dark'">
                <section class="am-pane">
                  <header class="am-pane-head">
                    <h4>射频质量</h4>
                    <span>5 项</span>
                  </header>
                  <div class="am-tiles radio">
                    <MetricTile
                      v-for="m in finalRadio"
                      :key="m.label"
                      :label="m.label"
                      sub=""
                      :value="m.value"
                      :level="m.level"
                    />
                  </div>
                </section>
                <section class="am-pane">
                  <header class="am-pane-head">
                    <h4>当前功率</h4>
                    <span>6 项</span>
                  </header>
                  <div class="am-tiles power">
                    <MetricTile
                      v-for="m in finalPower"
                      :key="m.label"
                      :label="m.label"
                      sub=""
                      :value="m.value"
                      :level="m.level"
                    />
                  </div>
                </section>
              </AppMock>
            </FitBox>
          </div>
          <div class="story-front">
            <FitBox :width="410" fit-height>
              <PhoneMock page="connect" :wipe="wipe">
                <div class="pm-card">
                  <div class="pm-head">
                    <h4>连接情况</h4>
                    <em>刷新</em>
                  </div>
                  <div class="pm-chips">
                    <b class="amber">RRC正常</b><b class="blue">5G SA</b><b>中国移动</b>
                  </div>
                </div>
                <div class="pm-card">
                  <h4>当前小区</h4>
                  <div class="pm-grid c3">
                    <PhoneTile
                      v-for="[label, value] in cellFacts"
                      :key="label"
                      :label="label"
                      :value="value"
                      :w="W.c3"
                    />
                  </div>
                </div>
                <div class="pm-card">
                  <h4>射频质量</h4>
                  <div class="pm-grid c3">
                    <PhoneTile
                      v-for="m in finalRadio.slice(0, 3)"
                      :key="m.label"
                      v-bind="m"
                      :w="W.c3"
                    />
                  </div>
                  <div class="pm-grid c2">
                    <PhoneTile
                      v-for="m in finalRadio.slice(3)"
                      :key="m.label"
                      v-bind="m"
                      :w="W.c2"
                    />
                  </div>
                </div>
                <div class="pm-card">
                  <h4>当前功率</h4>
                  <div class="pm-grid c4">
                    <PhoneTile v-for="m in finalPower" :key="m.label" v-bind="m" :w="W.c4" />
                  </div>
                </div>
              </PhoneMock>
            </FitBox>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
