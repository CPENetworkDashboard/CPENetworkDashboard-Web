<script setup lang="ts">
import { computed } from 'vue'
import FitBox from './FitBox.vue'
import PhoneConnect from './PhoneConnect.vue'
import PhoneMock from './PhoneMock.vue'
import { finalPower, finalRadio } from './data'
import { ease, span } from './quality'

const props = defineProps<{ t: number; on: boolean }>()
const explode = computed(
  () => ease(span(props.t, 0.1, 0.4)) * (1 - ease(span(props.t, 0.78, 0.97)))
)
</script>

<template>
  <div class="story-layer" :class="{ on }">
    <i class="story-ring" :style="{ '--e': explode }" aria-hidden="true"></i>
    <div class="story-phone">
      <FitBox :width="410" fit-height>
        <PhoneMock page="connect" theme="dark" :explode>
          <PhoneConnect :radio="finalRadio" :power="finalPower" layered />
        </PhoneMock>
      </FitBox>
    </div>
    <p class="story-caption" :style="{ opacity: explode }">Android 连接页，一层一层拆开</p>
  </div>
</template>
