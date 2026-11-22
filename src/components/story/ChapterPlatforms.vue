<script setup lang="ts">
import { computed, toRef } from 'vue'
import AppMock from './AppMock.vue'
import FitBox from './FitBox.vue'
import MetricTile from './MetricTile.vue'
import { finalPower, finalRadio } from './data'
import { ease, span } from './quality'

const props = defineProps<{ t: number; on: boolean; theme: 'light' | 'dark' }>()
const t = toRef(props, 't')
const slide = computed(() => ease(span(t.value, 0.04, 0.4)))
const wipe = computed(() => ease(span(t.value, 0.56, 0.9)))
</script>

<template>
  <div class="story-layer back" :class="{ on }" aria-hidden="true">
    <div class="story-desktop" :style="{ '--s': slide }">
      <FitBox :width="1040">
        <AppMock page="connect" :theme="wipe > 0.5 ? (theme === 'dark' ? 'light' : 'dark') : theme">
          <section class="am-pane">
            <header class="am-pane-head">
              <h4>射频质量</h4>
              <span>5 项</span>
            </header>
            <div class="am-tiles radio">
              <MetricTile
                v-for="m in finalRadio"
                :key="m.label"
                :label="m.label"
                sub=""
                :value="m.value"
                :level="m.level"
              />
            </div>
          </section>
          <section class="am-pane">
            <header class="am-pane-head">
              <h4>当前功率</h4>
              <span>4 项</span>
            </header>
            <div class="am-tiles power">
              <MetricTile
                v-for="m in finalPower"
                :key="m.label"
                :label="m.label"
                sub=""
                :value="m.value"
                :level="m.level"
              />
            </div>
          </section>
        </AppMock>
      </FitBox>
    </div>
  </div>
</template>
