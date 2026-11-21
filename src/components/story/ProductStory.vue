<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import ChapterConnect from './ChapterConnect.vue'
import ChapterLock from './ChapterLock.vue'
import ChapterPlatforms from './ChapterPlatforms.vue'
import ChapterStyle from './ChapterStyle.vue'
import ChapterTest from './ChapterTest.vue'
import ChapterTools from './ChapterTools.vue'
import StoryHero from './StoryHero.vue'

defineProps<{ versions: Array<{ name: string; version?: string }> }>()

const chapters = [
  ['story-connect', '连接'],
  ['story-lock', '锁频'],
  ['story-test', '测试'],
  ['story-tools', '工具'],
  ['story-style', '个性化'],
  ['story-platforms', '多平台'],
] as const
const progress = reactive(chapters.map(() => 0))
const scrolled = reactive(chapters.map(() => 0))
const report = (index: number, value: number, position: number) => {
  progress[index] = value
  scrolled[index] = position
}
// The latest chapter the reader has entered; hidden before the first and once scrolled past the last.
const active = computed(() => {
  let index = -1
  progress.forEach((p, i) => {
    if (p > 0) index = i
  })
  return scrolled[progress.length - 1]! >= 1 ? -1 : index
})
function jump(index: number) {
  const element = document.getElementById(chapters[index]![0])
  if (!element) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY + 2,
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
</script>

<template>
  <div class="story" :class="{ narrow }">
    <nav class="story-rail" :class="{ show: active >= 0 }" aria-label="功能章节">
      <button
        v-for="([id, name], index) in chapters"
        :key="id"
        type="button"
        :class="{ on: index === active }"
        :aria-current="index === active ? 'step' : undefined"
        @click="jump(index)"
      >
        <i :style="{ '--p': progress[index] }"></i><span>0{{ index + 1 }}</span
        >{{ name }}
      </button>
    </nav>
    <StoryHero />
    <ChapterConnect @progress="(v, s) => report(0, v, s)" />
    <ChapterLock @progress="(v, s) => report(1, v, s)" />
    <ChapterTest @progress="(v, s) => report(2, v, s)" />
    <ChapterTools @progress="(v, s) => report(3, v, s)" />
    <ChapterStyle @progress="(v, s) => report(4, v, s)" />
    <ChapterPlatforms :versions @progress="(v, s) => report(5, v, s)" />
  </div>
</template>
