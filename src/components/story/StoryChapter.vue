<script setup lang="ts">
defineProps<{
  id: string
  eyebrow: string
  lines: string[]
  steps: ReadonlyArray<readonly [string, string]>
  step: number
  reveal: number
  tall?: boolean
}>()
</script>

<template>
  <section :id="id" class="story-scene" :class="{ tall }" :aria-labelledby="`${id}-title`">
    <div class="story-sticky stage">
      <header class="story-head">
        <p class="story-eyebrow">{{ eyebrow }}</p>
        <h2 :id="`${id}-title`">
          <span class="story-reveal" :style="{ '--r': reveal }"
            ><template v-for="(line, index) in lines" :key="line"
              ><br v-if="index" />{{ line }}</template
            ></span
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
