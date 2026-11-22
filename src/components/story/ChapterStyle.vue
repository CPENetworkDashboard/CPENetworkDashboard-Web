<script setup lang="ts">
import { computed } from 'vue'
import FitBox from './FitBox.vue'
import PhoneConnect from './PhoneConnect.vue'
import PhoneMock from './PhoneMock.vue'
import StoryChapter from './StoryChapter.vue'
import { useSiteTheme } from '@/composables/useSiteTheme'
import { useChapter } from './chapter'
import { finalPower, finalRadio } from './data'
import { clamp, ease, pop, span } from './quality'

const emit = defineEmits<{ progress: [number, number] }>()
const theme = useSiteTheme()
const { t, reveal } = useChapter(8500, (v, s) => emit('progress', v, s))

const zoom = computed(() => pop(span(t.value, 0.02, 0.14)) * (1 - ease(span(t.value, 0.4, 0.48))))
// The lens hops tab to tab, stretching while it moves like the real dock.
const hop = computed(() => span(t.value, 0.1, 0.4) * 3)
const lens = computed(() => {
  const index = Math.floor(hop.value)
  return Math.min(3, index + ease(clamp((hop.value - index) * 2.2)))
})
const stretch = computed(() => {
  const frac = clamp((hop.value - Math.floor(hop.value)) * 2.2)
  return hop.value >= 3 ? 1 : 1 + Math.sin(frac * Math.PI) * 0.16
})
const wall = computed(() => ease(span(t.value, 0.46, 0.64)))
const border = computed(() => t.value >= 0.7)
const trace = computed(() => ease(span(t.value, 0.72, 0.94)))
const step = computed(() => (t.value < 0.44 ? 0 : t.value < 0.7 ? 1 : 2))
const steps = [
  ['液态玻璃底栏', '折射、模糊与高光随手机倾斜变化；也可换成悬浮底栏或 MIUIX。'],
  ['壁纸与卡片', '自定义壁纸，卡片透明度、背景模糊和高光都能调。'],
  ['两种质量样式', '磁贴内部条，或沿边框绕一圈的跑道，在界面风格里切换。'],
] as const
const labels = ['连接', '锁频', '测试', '设置']
</script>

<template>
  <StoryChapter
    id="story-style"
    ref="chapter"
    eyebrow="05 个性化"
    :lines="['界面的质感，', '按你的习惯调。']"
    :steps
    :step
    :reveal
  >
    <div class="story-phone" :style="{ '--t': t, '--w': wall }">
      <FitBox :width="410" fit-height>
        <PhoneMock :theme page="connect" wallpaper :lens :lens-scale="stretch">
          <PhoneConnect
            :radio="finalRadio"
            :power="finalPower"
            :mode="border ? 'border' : 'bar'"
            :fill="border ? trace : 1"
          />
        </PhoneMock>
      </FitBox>
    </div>
    <div class="story-dock" :style="{ '--z': zoom }" aria-hidden="true">
      <i class="pm-lens" :style="{ '--i': lens, '--ls': stretch }"></i>
      <span
        v-for="(label, index) in labels"
        :key="label"
        :class="{ on: index === Math.round(lens) }"
        >{{ label }}</span
      >
    </div>
  </StoryChapter>
</template>
