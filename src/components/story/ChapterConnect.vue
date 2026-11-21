<script setup lang="ts">
import { computed } from 'vue'
import FitBox from './FitBox.vue'
import PhoneConnect from './PhoneConnect.vue'
import PhoneMock from './PhoneMock.vue'
import StoryChapter from './StoryChapter.vue'
import { useChapter } from './chapter'
import { powerAt, radioAt } from './data'
import { ease, pop, span } from './quality'

const emit = defineEmits<{ progress: [number] }>()
const { t, reveal } = useChapter(7000, (v) => emit('progress', v))
const fill = computed(() => ease(span(t.value, 0.06, 0.46)))
const radio = computed(() => radioAt(fill.value))
const power = computed(() => powerAt(ease(span(t.value, 0.16, 0.5))))
const lift = computed(() => pop(span(t.value, 0.56, 0.74)))
const grades = computed(() => pop(span(t.value, 0.7, 0.86)))
const step = computed(() => (t.value < 0.22 ? 0 : t.value < 0.58 ? 1 : 2))
const steps = [
  ['连接概览', '运营商、制式和连接状态集中在第一张卡片。'],
  ['射频质量', '数值实时刷新，磁贴下方的条随信号伸缩、变色。'],
  ['按门限评级', 'RSRP、RSRQ、SINR、RSSI、CQI 按客户端内置门限分为五档。'],
] as const
</script>

<template>
  <StoryChapter
    id="story-connect"
    ref="chapter"
    eyebrow="01 连接"
    :lines="['信号好不好，', '一眼就知道。']"
    :steps
    :step
    :reveal
  >
    <div class="story-phone" :style="{ '--t': t }">
      <FitBox :width="410" fit-height>
        <PhoneMock page="connect" spill>
          <PhoneConnect
            :radio
            :power
            :fill
            :focus="step === 0 ? 'cell' : step === 2 ? 'radio' : null"
            :pop="lift"
            :grades
          />
        </PhoneMock>
      </FitBox>
    </div>
  </StoryChapter>
</template>
