<script setup lang="ts">
import { computed, toRef } from 'vue'
import SiteIcon from '@/components/SiteIcon.vue'
import { ease, pop, span } from './quality'

const props = defineProps<{ t: number; on?: boolean; mode: 'screen' | 'stage' }>()
const t = toRef(props, 't')
const deal = computed(() => {
  const open = ease(span(t.value, 0.02, 0.14))
  return open * (1 - ease(span(t.value, 0.16, 0.3)))
})
const phase = computed(() => {
  const v = t.value
  return v < 0.34 ? 0 : v < 0.44 ? 1 : v < 0.54 ? 2 : v < 0.7 ? 3 : 4
})
const bands = [
  ['N1', '2100 MHz'],
  ['N28', '700 MHz'],
  ['N41', '2.6 GHz'],
  ['N78', '3.5 GHz'],
  ['N79', '4.9 GHz'],
]
const statusBadge = computed(() =>
  phase.value === 4
    ? { cls: 'ok', text: '回读一致' }
    : phase.value === 3
      ? { cls: 'busy', text: '重新注册中' }
      : phase.value === 2
        ? { cls: 'busy', text: '正在写入' }
        : phase.value === 1
          ? { cls: 'ready', text: '待应用 · N78' }
          : { cls: 'idle', text: '未锁定' }
)
const nrRule = computed(() =>
  phase.value === 4
    ? 'mode=1 · bands=78 (SA)'
    : phase.value === 3
      ? '设备重新注册蜂窝小区…'
      : 'mode=0 · bands=(无)'
)
const cardShow = computed(() => pop(span(t.value, 0.44, 0.56)))
</script>

<template>
  <template v-if="mode === 'screen'">
    <div class="pm-card" :class="{ glow: phase === 2 || phase === 3, 'glow-ok': phase === 4 }">
      <div class="pm-card-head">
        <h4>当前状态</h4>
        <span class="pm-status-pill" :class="statusBadge.cls">
          <i v-if="phase === 2 || phase === 3" class="am-spin"></i>
          <SiteIcon v-else-if="phase === 4" name="check" :size="13" />
          {{ statusBadge.text }}
        </span>
      </div>
      <div class="pm-rules">
        <div><span>LTE</span><b>mode=0 · bands=(无)</b></div>
        <div :class="{ verified: phase === 4, active: phase === 3 }">
          <span>NR</span><b>{{ nrRule }}</b>
        </div>
      </div>
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
        :class="{ on: band === 'N78' && phase >= 1, locked: band === 'N78' && phase === 4 }"
        :style="{
          transform: `translate3d(${deal * (index - 2) * 140}px, ${deal * (Math.abs(index - 2) * 30 - 36)}px, 0) rotate(${deal * (index - 2) * 8}deg)`,
        }"
      >
        <div>
          <b>{{ band }}</b
          ><small>NR 频段 · {{ freq }}</small>
        </div>
        <span>SA</span><span>NSA</span><i></i>
      </div>
    </div>
  </template>

  <div v-else class="story-layer" :class="{ on }" aria-hidden="true">
    <div
      v-if="phase >= 2"
      class="story-lock-card"
      :class="{ ok: phase === 4 }"
      :style="{ '--c': cardShow }"
    >
      <div class="story-lock-eyebrow">
        <i v-if="phase < 4" class="am-spin"></i>
        <SiteIcon v-else name="check" :size="15" />
        <span>{{
          phase === 2 ? '正在写入锁频配置' : phase === 3 ? '设备重新注册中' : '回读校验通过'
        }}</span>
      </div>
      <div class="story-lock-band">
        <strong>N78</strong>
        <span>3.5 GHz · SA</span>
      </div>
      <small>{{
        phase === 4 ? '回读 NR bands=78，与设置一致' : '下发 NR Band 78 锁定指令并驻留'
      }}</small>
    </div>
  </div>
</template>
