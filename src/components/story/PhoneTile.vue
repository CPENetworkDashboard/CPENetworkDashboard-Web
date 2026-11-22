<script setup lang="ts">
import { computed } from 'vue'
import { score, type Level } from './quality'

// Mirrors MetricTile in the Android client: label, value, then the inline quality bar
// (MetricQualityStyle.Bar) or the racetrack border (MetricQualityStyle.Border).
const props = withDefaults(
  defineProps<{
    label: string
    value: string
    w: number
    level?: Level | null
    fill?: number
    mode?: 'bar' | 'border'
  }>(),
  { level: null, fill: 1, mode: 'bar' }
)
const quality = computed(() => (props.level ? score[props.level] * props.fill : 0))
const height = computed(() => (props.level && props.mode === 'bar' ? 58 : 50))
</script>

<template>
  <div
    class="pt"
    :class="[level ?? 'plain', level ? mode : '']"
    :style="{ height: `${height}px`, '--q': quality }"
  >
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <i v-if="level && mode === 'bar'" class="pt-bar"><s></s></i>
    <svg
      v-if="level && mode === 'border'"
      class="pt-race"
      :viewBox="`0 0 ${w} ${height}`"
      :width="w"
      :height="height"
    >
      <rect class="base" x="1.5" y="1.5" :width="w - 3" :height="height - 3" rx="13" />
      <rect
        class="run"
        x="1.5"
        y="1.5"
        :width="w - 3"
        :height="height - 3"
        rx="13"
        pathLength="1"
        :stroke-dasharray="`${quality} 1`"
      />
    </svg>
  </div>
</template>
