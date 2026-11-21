<script setup lang="ts">
import { computed } from 'vue'

// Odometer digits: each column rolls to its digit with a springy overshoot.
const props = defineProps<{ value: string }>()
const chars = computed(() => props.value.split(''))
</script>

<template>
  <span class="roll" :aria-label="value">
    <span v-for="(char, index) in chars" :key="chars.length - index" class="roll-col">
      <span
        v-if="/\d/.test(char)"
        class="roll-strip"
        :style="{ transform: `translateY(${-Number(char) * 10}%)` }"
        ><i v-for="n in 10" :key="n">{{ n - 1 }}</i></span
      ><span v-else class="roll-dot">{{ char }}</span>
    </span>
  </span>
</template>
