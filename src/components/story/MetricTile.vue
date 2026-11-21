<script setup lang="ts">
import { computed } from 'vue'
import { score, type Level } from './quality'

const props = defineProps<{
  label: string
  sub: string
  value: string
  level?: Level | null
  fill?: number
}>()
const dash = computed(() => {
  if (!props.level) return ''
  return `${(score[props.level] * (props.fill ?? 1) * 75.4).toFixed(1)} 75.4`
})
</script>

<template>
  <div class="am-tile">
    <div>
      <b>{{ label }}</b
      ><small>{{ sub }}</small
      ><strong>{{ value }}</strong>
    </div>
    <svg v-if="level" class="am-ring" :class="level" viewBox="0 0 32 32">
      <circle class="track" cx="16" cy="16" r="12" />
      <circle class="arc" cx="16" cy="16" r="12" :stroke-dasharray="dash" />
      <circle class="core" cx="16" cy="16" r="6" />
    </svg>
  </div>
</template>
