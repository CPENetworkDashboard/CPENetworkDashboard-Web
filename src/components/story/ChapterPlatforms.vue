<script setup lang="ts">
import { computed } from 'vue'
import AppMock from './AppMock.vue'
import FitBox from './FitBox.vue'
import MetricTile from './MetricTile.vue'
import PhoneConnect from './PhoneConnect.vue'
import PhoneMock from './PhoneMock.vue'
import StoryChapter from './StoryChapter.vue'
import { useSiteTheme } from '@/composables/useSiteTheme'
import { useChapter } from './chapter'
import { finalPower, finalRadio } from './data'
import { ease, span } from './quality'

defineProps<{ versions: Array<{ name: string; version?: string }> }>()
const emit = defineEmits<{ progress: [number, number] }>()
const theme = useSiteTheme()
const { t, reveal } = useChapter(6500, (v, s) => emit('progress', v, s))
const slide = computed(() => ease(span(t.value, 0.04, 0.4)))
const wipe = computed(() => ease(span(t.value, 0.56, 0.9)))
const step = computed(() => (t.value < 0.3 ? 0 : t.value < 0.56 ? 1 : 2))
const steps = [
  ['手机与电脑', 'Android 现场调试，macOS 与 Windows 长时间观察。'],
  ['五家设备', '烽火、华为、鲲鹏无限、中兴、通则，同一套界面。'],
  ['深色与浅色', '跟随系统，或在设置里单独切换。'],
] as const
</script>

<template>
  <StoryChapter
    id="story-platforms"
    ref="chapter"
    eyebrow="06 多平台"
    :lines="['手机现场调，', '电脑长时间看。']"
    :steps
    :step
    :reveal
  >
    <template #extra>
      <ul class="story-versions">
        <li v-for="item in versions" :key="item.name">
          <b>{{ item.name }}</b
          ><span>v{{ item.version }}</span>
        </li>
      </ul>
    </template>
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
    <div class="story-front" :style="{ '--s': slide }">
      <FitBox :width="410" fit-height>
        <PhoneMock :theme page="connect" :wipe>
          <PhoneConnect :radio="finalRadio" :power="finalPower" />
        </PhoneMock>
      </FitBox>
    </div>
  </StoryChapter>
</template>
