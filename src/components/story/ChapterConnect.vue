<script setup lang="ts">
import { computed, toRef } from 'vue'
import PhoneConnect from './PhoneConnect.vue'
import { powerAt, radioAt } from './data'
import { ease, pop, span } from './quality'

const props = defineProps<{ t: number }>()
const t = toRef(props, 't')
const step = computed(() => (t.value < 0.22 ? 0 : t.value < 0.58 ? 1 : 2))
const fill = computed(() => ease(span(t.value, 0.06, 0.46)))
const radio = computed(() => radioAt(fill.value))
const power = computed(() => powerAt(ease(span(t.value, 0.16, 0.5))))
const lift = computed(() => pop(span(t.value, 0.56, 0.74)) * (1 - ease(span(t.value, 0.84, 0.96))))
const grades = computed(() => pop(span(t.value, 0.7, 0.86)))
</script>

<template>
  <PhoneConnect
    :radio
    :power
    :fill
    :focus="step === 0 ? 'cell' : step === 2 && t < 0.84 ? 'radio' : null"
    :pop="lift"
    :grades
  />
</template>
