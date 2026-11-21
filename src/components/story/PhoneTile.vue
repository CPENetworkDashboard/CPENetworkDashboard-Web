<script setup lang="ts">
import { computed } from 'vue'
import { score, type Level } from './quality'

// Mirrors MetricTileView + RacetrackBorder: the border traces clockwise from the top-left corner.
const props = defineProps<{
  label: string
  value: string
  w: number
  h?: number
  level?: Level | null
  fill?: number
}>()
const height = computed(() => props.h ?? 58)
const trace = computed(() => (props.level ? score[props.level] * (props.fill ?? 1) : 0))
</script>

<template>
  <div class="pt" :class="level ?? 'plain'" :style="{ height: `${height}px` }">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <svg v-if="level" class="pt-race" :viewBox="`0 0 ${w} ${height}`" :width="w" :height="height">
      <rect class="base" x="1.5" y="1.5" :width="w - 3" :height="height - 3" rx="13" />
      <rect
        class="run"
        x="1.5"
        y="1.5"
        :width="w - 3"
        :height="height - 3"
        rx="13"
        pathLength="1"
        :stroke-dasharray="`${trace} 1`"
      />
    </svg>
  </div>
</template>
