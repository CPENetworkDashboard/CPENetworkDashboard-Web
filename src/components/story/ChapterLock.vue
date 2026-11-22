<script setup lang="ts">
import { computed, toRef } from 'vue'
import SiteIcon from '@/components/SiteIcon.vue'
import FitBox from './FitBox.vue'
import PhoneMock from './PhoneMock.vue'
import { ease, pop, span } from './quality'

const props = defineProps<{ t: number; on: boolean; theme: 'light' | 'dark' }>()
const t = toRef(props, 't')
const deal = computed(() => {
  const open = ease(span(t.value, 0.02, 0.14))
  return open * (1 - ease(span(t.value, 0.16, 0.3)))
})
const phase = computed(() => {
  const v = t.value
  return v < 0.34 ? 0 : v < 0.44 ? 1 : v < 0.52 ? 2 : v < 0.7 ? 3 : 4
})
const bands = [
  ['N1', '2100 MHz'],
  ['N28', '700 MHz'],
  ['N41', '2.6 GHz'],
  ['N78', '3.5 GHz'],
  ['N79', '4.9 GHz'],
]
const lines = computed(() =>
  phase.value === 4
    ? ['LTE: mode=0 bands=(无)', 'NR:  mode=1 bands=78']
    : phase.value === 3
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
    ][phase.value]
)
const giant = computed(() => pop(span(t.value, 0.72, 0.9)))
</script>

<template>
  <div class="story-layer" :class="{ on }">
    <p class="story-giant band" :style="{ '--g': giant }" aria-hidden="true">N78</p>
    <div class="story-phone" :style="{ '--t': t }">
      <FitBox :width="410" fit-height>
        <PhoneMock
          :theme
          page="lock"
          :tabs="['网络首选', '锁频段', '锁ARFCN', '锁PCI']"
          :tab="1"
          spill
        >
          <div class="pm-card" :class="{ glow: phase >= 3 }">
            <h4>当前状态</h4>
            <p class="pm-lines">
              <template v-for="line in lines" :key="line">{{ line }}<br /></template>
            </p>
          </div>
          <div class="pm-actions">
            <span>读取</span><span class="fill" :class="{ pressed: phase === 2 }">应用</span>
          </div>
          <div class="pm-card">
            <h4>NR 频段</h4>
            <div
              v-for="([band, freq], index) in bands"
              :key="band"
              class="pm-band"
              :class="{ on: band === 'N78' && phase >= 1 }"
              :style="{
                transform: `translate3d(${deal * (index - 2) * 150}px, ${deal * (Math.abs(index - 2) * 34 - 40)}px, ${deal * 120}px) rotate(${deal * (index - 2) * 9}deg)`,
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
    </div>
    <p v-if="toast" :key="toast.text" class="story-toast" :class="toast.tone">
      <i v-if="phase < 4" class="am-spin"></i><SiteIcon v-else name="check" :size="16" />{{
        toast.text
      }}
    </p>
  </div>
</template>
