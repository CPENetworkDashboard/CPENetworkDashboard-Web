<script setup lang="ts">
import { computed, toRef } from 'vue'
import PhoneConnect from './PhoneConnect.vue'
import { finalPower, finalRadio } from './data'
import { ease, span } from './quality'

const props = defineProps<{ t: number }>()
const t = toRef(props, 't')
const border = computed(() => t.value >= 0.7)
const trace = computed(() => ease(span(t.value, 0.72, 0.94)))
</script>

<template>
  <PhoneConnect
    :radio="finalRadio"
    :power="finalPower"
    :mode="border ? 'border' : 'bar'"
    :fill="border ? trace : 1"
  />
</template>
