<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import SiteIcon from '@/components/SiteIcon.vue'
import { useSiteTheme } from '@/composables/useSiteTheme'
import ChapterConnect from './ChapterConnect.vue'
import ChapterLock from './ChapterLock.vue'
import ChapterPlatforms from './ChapterPlatforms.vue'
import ChapterStyle from './ChapterStyle.vue'
import ChapterTest from './ChapterTest.vue'
import ChapterTools from './ChapterTools.vue'
import StoryHero from './StoryHero.vue'
import { span } from './quality'

defineProps<{ versions: Array<{ name: string; version?: string }> }>()

interface Chapter {
  id: string
  name: string
  eyebrow: string
  lines: string[]
  steps: Array<[string, string]>
  /** Timeline positions where each step starts. */
  marks: number[]
  duration: number
}
const hero = { id: 'story-top', duration: 5600 }
const chapters: Chapter[] = [
  {
    id: 'story-connect',
    name: '连接',
    eyebrow: '01 连接',
    lines: ['信号好不好，', '一眼就知道。'],
    steps: [
      ['连接概览', '运营商、制式和连接状态集中在第一张卡片。'],
      ['射频质量', '数值实时刷新，磁贴下方的条随信号伸缩、变色。'],
      ['按门限评级', 'RSRP、RSRQ、SINR、RSSI、CQI 按客户端内置门限分为五档。'],
    ],
    marks: [0, 0.22, 0.58],
    duration: 7000,
  },
  {
    id: 'story-lock',
    name: '锁频',
    eyebrow: '02 锁频',
    lines: ['换一个频段，', '结果当场验证。'],
    steps: [
      ['选择频段', '按设备能力列出可锁的 NR 与 LTE 频段。'],
      ['写入并重新注册', '写入配置后设备重新注册，过程实时显示。'],
      ['回读校验', '读取设备上的实际规则，确认与设置一致。'],
    ],
    marks: [0, 0.44, 0.7],
    duration: 8000,
  },
  {
    id: 'story-test',
    name: '测试',
    eyebrow: '03 测试',
    lines: ['信号还是外网，', '测一下就清楚。'],
    steps: [
      ['多线程测速', '直接在手机上测速，实时、平均与峰值速率都有记录。'],
      ['悬浮速率窗', '切到别的应用也能看到实时速率，默认关闭，按需开启。'],
      ['Ping 延迟', '常用站点一键 Ping，丢包与延迟曲线一目了然。'],
    ],
    marks: [0, 0.3, 0.5],
    duration: 9000,
  },
  {
    id: 'story-tools',
    name: '工具',
    eyebrow: '04 工具',
    lines: ['不只看信号，', '排查也在手边。'],
    steps: [
      ['Wi-Fi 信道分析', '2.4 / 5 / 6 GHz 周边热点和信道占用一屏看完。'],
      ['诊断与报告', '载波聚合、邻区扫描、离线诊断报告，排查有据可查。'],
      ['插件与终端', '签名插件扩展卡片；烽火、通则支持 SSH，鲲鹏无限、通则可收短信。'],
    ],
    marks: [0, 0.3, 0.62],
    duration: 7000,
  },
  {
    id: 'story-style',
    name: '个性化',
    eyebrow: '05 个性化',
    lines: ['界面的质感，', '按你的习惯调。'],
    steps: [
      ['液态玻璃底栏', '折射、模糊与高光随手机倾斜变化；也可换成悬浮底栏或 MIUIX。'],
      ['壁纸与卡片', '自定义壁纸，卡片透明度、背景模糊和高光都能调。'],
      ['两种质量样式', '磁贴内部条，或沿边框绕一圈的跑道，在界面风格里切换。'],
    ],
    marks: [0, 0.44, 0.7],
    duration: 8500,
  },
  {
    id: 'story-platforms',
    name: '多平台',
    eyebrow: '06 多平台',
    lines: ['手机现场调，', '电脑长时间看。'],
    steps: [
      ['手机与电脑', 'Android 现场调试，macOS 与 Windows 长时间观察。'],
      ['五家设备', '烽火、华为、鲲鹏无限、中兴、通则，同一套界面。'],
      ['深色与浅色', '跟随系统，或在设置里单独切换。'],
    ],
    marks: [0, 0.3, 0.56],
    duration: 6500,
  },
]
const scenes = [hero, ...chapters]
const theme = useSiteTheme()

// One pinned stage for the whole story: scrolling picks the scene, each scene then plays by itself.
const track = ref<HTMLElement | null>(null)
const active = ref(0)
const inside = ref(true)
const t = ref(0)
let frame = 0
let start = 0
let reduce = false
const tick = (now: number) => {
  t.value = Math.min(1, (now - start) / scenes[active.value]!.duration)
  frame = t.value < 1 ? requestAnimationFrame(tick) : 0
}
function play(delay = 0) {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  t.value = 0
  if (reduce) {
    t.value = 1
    return
  }
  start = performance.now() + delay
  frame = requestAnimationFrame(tick)
}
watch(active, () => play(250))
const tFor = (index: number) =>
  index === active.value ? Math.max(0, t.value) : index < active.value ? 1 : 0
const step = (chapter: Chapter, index: number) =>
  index + 1 === active.value ? chapter.marks.filter((m) => t.value >= m).length - 1 : 0
const reveal = (index: number) => (index + 1 === active.value ? span(t.value, 0, 0.3) : 0)
const charAt = (lines: string[], row: number, index: number, r: number) => {
  const total = lines.join('').length
  const offset = lines.slice(0, row).join('').length
  return Math.min(1, Math.max(0, r * total * 1.25 - offset - index))
}

let scrollFrame = 0
const measure = () => {
  scrollFrame = 0
  const element = track.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const vh = element.querySelector<HTMLElement>('.story-anchor')?.offsetHeight || window.innerHeight
  const index = Math.floor((-rect.top + vh * 0.5) / vh)
  active.value = Math.min(scenes.length - 1, Math.max(0, index))
  inside.value = rect.top < vh * 0.5 && rect.bottom > vh * 0.5
}
const onScroll = () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(measure)
}
const rail = computed(() => (inside.value && active.value > 0 ? active.value - 1 : -1))
const railProgress = (index: number) =>
  index + 1 < active.value ? 1 : index + 1 === active.value ? t.value : 0
function jump(index: number) {
  const element = document.getElementById(chapters[index]!.id)
  if (!element) return
  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY,
    behavior: reduce ? 'auto' : 'smooth',
  })
}

const narrow = ref(false)
let query: MediaQueryList | undefined
const onQuery = () => (narrow.value = !!query?.matches)
onMounted(() => {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  query = window.matchMedia('(max-width: 760px)')
  onQuery()
  query.addEventListener('change', onQuery)
  document.documentElement.classList.add('story-snap')
  measure()
  play(700)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onUnmounted(() => {
  query?.removeEventListener('change', onQuery)
  document.documentElement.classList.remove('story-snap')
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) cancelAnimationFrame(frame)
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <div class="story" :class="{ narrow }">
    <nav class="story-rail" :class="{ show: rail >= 0 }" aria-label="功能章节">
      <button
        v-for="(chapter, index) in chapters"
        :key="chapter.id"
        type="button"
        :class="{ on: index === rail }"
        :aria-current="index === rail ? 'step' : undefined"
        @click="jump(index)"
      >
        <i :style="{ '--p': railProgress(index) }"></i><span>0{{ index + 1 }}</span
        >{{ chapter.name }}
      </button>
    </nav>
    <section ref="track" class="story-track" aria-labelledby="home-title">
      <div class="story-sticky stage" :class="{ dark: active === 0 }">
        <div class="story-heads">
          <header class="story-head story-hero-copy" :class="{ on: active === 0 }">
            <RouterLink class="story-release" to="/changelog"
              >Android 3.7.1 已发布<SiteIcon name="chevron" :size="14"
            /></RouterLink>
            <h1 id="home-title">每一项数据，<br />都摊开给你看。</h1>
            <p>
              CPE加加 连上 4G / 5G CPE
              后台，把信号、锁频和测速放进手机。支持烽火、华为、鲲鹏无限、中兴、通则，也有 macOS 与
              Windows 版本。
            </p>
            <div class="story-actions">
              <RouterLink class="story-button primary" to="/download"
                ><SiteIcon name="download" :size="18" />免费下载</RouterLink
              >
              <RouterLink class="story-button" to="/product">功能介绍</RouterLink>
            </div>
          </header>
          <header
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            class="story-head"
            :class="{ on: active === index + 1 }"
          >
            <p class="story-eyebrow">{{ chapter.eyebrow }}</p>
            <h2 class="story-reveal">
              <template v-for="(line, row) in chapter.lines" :key="line"
                ><br v-if="row" /><i
                  v-for="(char, at) in line"
                  :key="at"
                  :style="{ '--c': charAt(chapter.lines, row, at, reveal(index)) }"
                  >{{ char }}</i
                ></template
              >
            </h2>
            <ol class="story-steps">
              <li
                v-for="([title, text], at) in chapter.steps"
                :key="title"
                :class="{ on: at === step(chapter, index) }"
              >
                <b>{{ title }}</b
                ><span>{{ text }}</span>
              </li>
            </ol>
            <ul v-if="chapter.id === 'story-platforms'" class="story-versions">
              <li v-for="item in versions" :key="item.name">
                <b>{{ item.name }}</b
                ><span>v{{ item.version }}</span>
              </li>
            </ul>
          </header>
        </div>
        <div class="story-stagebox">
          <StoryHero :t="tFor(0)" :on="active === 0" />
          <ChapterConnect :t="tFor(1)" :on="active === 1" :theme />
          <ChapterLock :t="tFor(2)" :on="active === 2" :theme />
          <ChapterTest :t="tFor(3)" :on="active === 3" :theme />
          <ChapterTools :t="tFor(4)" :on="active === 4" :theme />
          <ChapterStyle :t="tFor(5)" :on="active === 5" :theme />
          <ChapterPlatforms :t="tFor(6)" :on="active === 6" :theme />
        </div>
        <span class="story-scroll" :class="{ on: active === 0 }">向下滚动</span>
      </div>
      <div v-for="scene in scenes" :id="scene.id" :key="scene.id" class="story-anchor"></div>
    </section>
  </div>
</template>
