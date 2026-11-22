<script setup lang="ts">
import { computed, toRef } from 'vue'
import FitBox from './FitBox.vue'
import PhoneConnect from './PhoneConnect.vue'
import PhoneMock from './PhoneMock.vue'
import { finalPower, finalRadio } from './data'
import { clamp, ease, pop, span } from './quality'

const props = defineProps<{ t: number; on: boolean; theme: 'light' | 'dark' }>()
const t = toRef(props, 't')

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
const labels = ['连接', '锁频', '测试', '设置']
</script>

<template>
  <div class="story-layer" :class="{ on }">
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
  </div>
</template>
