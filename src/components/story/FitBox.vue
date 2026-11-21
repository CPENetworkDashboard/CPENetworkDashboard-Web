<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ width: number; fitHeight?: boolean }>()
const outer = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const scale = ref(1)
const height = ref<number>()
let observer: ResizeObserver | undefined

function measure() {
  if (!outer.value || !inner.value) return
  const natural = inner.value.offsetHeight
  let next = Math.min(1, outer.value.clientWidth / props.width)
  if (props.fitHeight && outer.value.clientHeight)
    next = Math.min(next, outer.value.clientHeight / natural)
  scale.value = next
  height.value = props.fitHeight ? undefined : natural * next
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (outer.value) observer.observe(outer.value)
  if (inner.value) observer.observe(inner.value)
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div
    ref="outer"
    class="fit"
    :class="{ 'fit-height': fitHeight }"
    :style="{ height: height ? `${height}px` : undefined }"
  >
    <div
      ref="inner"
      class="fit-inner"
      :style="{
        width: `${width}px`,
        transform: fitHeight ? `translate(-50%, -50%) scale(${scale})` : `scale(${scale})`,
      }"
    >
      <slot />
    </div>
  </div>
</template>
