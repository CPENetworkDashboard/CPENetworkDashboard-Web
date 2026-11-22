<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  eyebrow: string
  lines: string[]
  steps: ReadonlyArray<readonly [string, string]>
  step: number
  reveal: number
  tall?: boolean
}>()
const offsets = computed(() =>
  props.lines.map((_, row) => props.lines.slice(0, row).join('').length)
)
const total = computed(() => props.lines.join('').length)
</script>

<template>
  <section :id="id" class="story-scene" :class="{ tall }" :aria-labelledby="`${id}-title`">
    <div class="story-sticky stage">
      <header class="story-head">
        <p class="story-eyebrow">{{ eyebrow }}</p>
        <h2 :id="`${id}-title`" class="story-reveal">
          <template v-for="(line, row) in lines" :key="line"
            ><br v-if="row" /><i
              v-for="(char, index) in line"
              :key="index"
              :style="{
                '--c': Math.min(1, Math.max(0, reveal * total * 1.25 - offsets[row]! - index)),
              }"
              >{{ char }}</i
            ></template
          >
        </h2>
        <ol class="story-steps">
          <li v-for="([title, text], index) in steps" :key="title" :class="{ on: index === step }">
            <b>{{ title }}</b
            ><span>{{ text }}</span>
          </li>
        </ol>
        <slot name="extra" />
      </header>
      <div class="story-stagebox"><slot /></div>
    </div>
  </section>
</template>
