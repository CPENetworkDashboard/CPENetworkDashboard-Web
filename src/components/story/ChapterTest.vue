<script setup lang="ts">
import { computed } from 'vue'
import FitBox from './FitBox.vue'
import PhoneMock from './PhoneMock.vue'
import PhoneTile from './PhoneTile.vue'
import RollNumber from './RollNumber.vue'
import StoryChapter from './StoryChapter.vue'
import { useSiteTheme } from '@/composables/useSiteTheme'
import { useChapter } from './chapter'
import { W } from './data'
import { ease, pop, span } from './quality'

const emit = defineEmits<{ progress: [number, number] }>()
const theme = useSiteTheme()
const { t, reveal } = useChapter(9000, (v, s) => emit('progress', v, s))

// Samples jump the way a live multi-thread test does, rather than gliding.
const downSteps = [0, 96, 284, 461, 618, 742, 836, 893, 921, 932]
const upSteps = [0, 18, 46, 77, 101, 122, 136, 144, 147, 148]
const run = computed(() => span(t.value, 0.04, 0.42))
const sample = computed(() =>
  Math.min(downSteps.length - 1, Math.floor(run.value * downSteps.length))
)
const down = computed(() => downSteps[sample.value]!)
const up = computed(() => upSteps[sample.value]!)
const speed = computed(() => t.value < 0.5)
const rates = computed(() => {
  const f = (v: number) => `${v} Mbps`
  const peak = (list: number[]) => Math.max(...list.slice(0, sample.value + 1))
  return [
    ['下载速度', f(down.value)],
    ['上传速度', f(up.value)],
    ['平均下载', f(Math.round(down.value * 0.92))],
    ['平均上传', f(Math.round(up.value * 0.9))],
    ['最高下载', f(peak(downSteps) + (sample.value > 7 ? 16 : 0))],
    ['最高上传', f(peak(upSteps) + (sample.value > 7 ? 8 : 0))],
  ]
})
const out = computed(() => pop(span(t.value, 0.02, 0.16)))
const bubble = computed(() => pop(span(t.value, 0.22, 0.34)))

const pingSamples = [26, 31, 24, 33, 28, 36, 34, 32, 30, 43, 29, 27]
const pingK = computed(() => span(t.value, 0.56, 0.92))
const pingCount = computed(() => Math.round(pingK.value * pingSamples.length))
const seen = computed(() => pingSamples.slice(0, pingCount.value))
const avg = computed(() =>
  seen.value.length ? seen.value.reduce((a, b) => a + b, 0) / seen.value.length : 0
)
const pingStats = computed(() => {
  const ms = (v?: number) => (v === undefined ? '—' : `${v.toFixed(1)} ms`)
  const list = seen.value
  return [
    ['已发送', String(list.length)],
    ['已接收', String(list.length)],
    ['丢包率', '0%'],
    ['最小', ms(list.length ? Math.min(...list) : undefined)],
    ['平均', ms(list.length ? avg.value : undefined)],
    ['最大', ms(list.length ? Math.max(...list) : undefined)],
  ]
})
const chartPoint = (v: number, i: number, w: number, h: number) =>
  [(i / (pingSamples.length - 1)) * w, h - ((v - 18) / 30) * h] as const
const phonePoints = computed(() => seen.value.map((v, i) => chartPoint(v, i, 336, 130)))
const wide = computed(() => seen.value.map((v, i) => chartPoint(v, i, 1000, 300)))
const path = (list: ReadonlyArray<readonly [number, number]>) =>
  list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const pingOut = computed(() => ease(span(t.value, 0.54, 0.62)))
const step = computed(() => (t.value < 0.3 ? 0 : t.value < 0.5 ? 1 : 2))
const steps = [
  ['多线程测速', '直接在手机上测速，实时、平均与峰值速率都有记录。'],
  ['悬浮速率窗', '切到别的应用也能看到实时速率，默认关闭，按需开启。'],
  ['Ping 延迟', '常用站点一键 Ping，丢包与延迟曲线一目了然。'],
] as const
</script>

<template>
  <StoryChapter
    id="story-test"
    ref="chapter"
    eyebrow="03 测试"
    :lines="['信号还是外网，', '测一下就清楚。']"
    :steps
    :step
    :reveal
  >
    <svg
      class="story-wave"
      viewBox="-20 -20 1040 340"
      preserveAspectRatio="none"
      :style="{ opacity: pingOut }"
      aria-hidden="true"
    >
      <polyline v-if="wide.length > 1" :points="path(wide)" />
      <circle v-for="([x, y], index) in wide" :key="index" :cx="x" :cy="y" r="7" />
    </svg>
    <div class="story-phone" :style="{ '--t': t }">
      <FitBox :width="410" fit-height>
        <PhoneMock :theme page="test" :title="speed ? '测速' : 'Ping'" spill>
          <template v-if="speed">
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
              <div class="pm-switch" :class="{ on: bubble > 0.5 }">
                <span>悬浮实时速率窗</span><i></i>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="pm-card">
              <h4>Ping</h4>
              <div class="pm-field plain">www.taobao.com</div>
              <div class="pm-actions">
                <span class="fill">{{
                  pingCount < pingSamples.length ? 'Ping 中…' : '开始 Ping'
                }}</span>
              </div>
            </div>
            <div class="pm-card">
              <div class="pm-grid c3">
                <PhoneTile
                  v-for="[label, value] in pingStats"
                  :key="label"
                  :label
                  :value
                  :w="W.c3"
                />
              </div>
            </div>
            <div class="pm-card glow">
              <h4>延迟曲线</h4>
              <svg class="pm-chart" viewBox="-8 -8 352 146">
                <path class="grid" d="M0 0H336M0 43H336M0 86H336M0 130H336" />
                <polyline v-if="phonePoints.length > 1" :points="path(phonePoints)" />
                <circle
                  v-for="([x, y], index) in phonePoints"
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
    <div class="story-float" :style="{ '--f': bubble * (speed ? 1 : 0) }" aria-hidden="true">
      <span>↓ {{ down }} <small>Mbps</small></span
      ><span>↑ {{ up }} <small>Mbps</small></span>
    </div>
    <p class="story-speed" :style="{ '--o': out }" aria-hidden="true">
      <template v-if="speed"><RollNumber :value="String(down)" /><small>Mbps 下载</small></template>
      <template v-else><RollNumber :value="avg.toFixed(1)" /><small>ms 平均延迟</small></template>
    </p>
  </StoryChapter>
</template>
