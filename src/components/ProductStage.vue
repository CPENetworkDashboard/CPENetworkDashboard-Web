<script setup lang="ts">
import { computed, ref } from 'vue'
import SiteIcon from '@/components/SiteIcon.vue'

const selected = ref(0)
const scene = ref<HTMLElement | null>(null)
const features = [
  {
    label: '网络监测',
    icon: 'signal',
    desktop: 'desktop-signal-dashboard',
    phone: 'mobile-status-dashboard-dark',
  },
  {
    label: '频段管理',
    icon: 'sliders',
    desktop: 'desktop-frequency-lock',
    phone: 'mobile-band-selection',
  },
  { label: '链路诊断', icon: 'activity', desktop: 'desktop-ping-test', phone: 'mobile-ping-test' },
]
const current = computed(() => features[selected.value]!)
function move(event: PointerEvent) {
  if (
    !scene.value ||
    event.pointerType !== 'mouse' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const bounds = scene.value.getBoundingClientRect()
  scene.value.style.setProperty(
    '--stage-x',
    ((event.clientX - bounds.left) / bounds.width - 0.5) * 2 + 'deg'
  )
  scene.value.style.setProperty(
    '--stage-y',
    ((event.clientY - bounds.top) / bounds.height - 0.5) * -2 + 'deg'
  )
}
function reset() {
  scene.value?.style.setProperty('--stage-x', '0deg')
  scene.value?.style.setProperty('--stage-y', '0deg')
}
</script>

<template>
  <figure
    ref="scene"
    class="landing-product product-stage"
    @pointermove="move"
    @pointerleave="reset"
  >
    <div class="stage-orbit" aria-hidden="true"></div>
    <svg class="landing-waves" viewBox="0 0 680 580" fill="none" aria-hidden="true">
      <circle cx="410" cy="275" r="110" />
      <circle cx="410" cy="275" r="190" />
      <circle cx="410" cy="275" r="270" />
      <path class="landing-signal-path" d="M25 460H125L175 410H235L270 375H650" />
    </svg>
    <div class="landing-desktop">
      <div class="landing-window-bar" aria-hidden="true">
        <i></i><i></i><i></i><span>CPE++ Desktop</span>
      </div>
      <Transition name="stage-screen" mode="out-in"
        ><img
          :key="current.desktop"
          :src="'/media/computer/' + current.desktop + '.webp'"
          :alt="'CPE加加桌面端' + current.label + '实际界面'"
          width="1600"
          height="997"
          fetchpriority="high"
          decoding="async"
      /></Transition>
    </div>
    <div class="landing-phone">
      <Transition name="stage-screen" mode="out-in"
        ><img
          :key="current.phone"
          :src="'/media/phone/' + current.phone + '.webp'"
          :alt="'CPE加加 Android ' + current.label + '实际界面'"
          width="700"
          height="1471"
          decoding="async"
      /></Transition>
    </div>
    <figcaption class="stage-controls" role="group" aria-label="产品界面预览">
      <button
        v-for="(feature, index) in features"
        :key="feature.label"
        type="button"
        :aria-pressed="selected === index"
        @click="selected = index"
      >
        <SiteIcon :name="feature.icon" :size="15" />{{ feature.label }}
      </button>
    </figcaption>
  </figure>
</template>
