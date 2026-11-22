<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteIcon from '@/components/SiteIcon.vue'
import { useStoryProgress } from '@/composables/useStoryProgress'
import FitBox from './FitBox.vue'
import PhoneConnect from './PhoneConnect.vue'
import PhoneMock from './PhoneMock.vue'
import { finalPower, finalRadio } from './data'
import { ease, span } from './quality'

const heroEl = ref<HTMLElement | null>(null)
const narrow = () => window.matchMedia('(max-width: 760px)').matches
// On phones the mock starts below the fold, so it waits until it has risen into view.
const { progress: t, scroll } = useStoryProgress(heroEl, 5600, {
  delay: 900,
  canStart: () => !narrow() || (heroEl.value?.getBoundingClientRect().top ?? 0) < -60,
})
const explode = computed(
  () => ease(span(t.value, 0.06, 0.36)) * (1 - ease(span(t.value, 0.76, 0.96)))
)
const rise = computed(() => ease(span(scroll.value, 0, 0.32)))
</script>

<template>
  <section ref="heroEl" class="story-scene hero" aria-labelledby="home-title">
    <div
      class="story-sticky"
      :style="{ '--rise': rise, '--e': explode, '--out': span(scroll, 0.55, 0.95) }"
    >
      <div class="story-hero-copy">
        <RouterLink class="story-release" to="/changelog"
          >Android 3.7.1 已发布<SiteIcon name="chevron" :size="14"
        /></RouterLink>
        <h1 id="home-title">每一项数据，<br />都摊开给你看。</h1>
        <p>
          CPE加加 连上 4G / 5G CPE
          后台，把信号、锁频和测速放进手机。支持烽火、华为、鲲鹏无限、中兴、通则，也有 macOS 与
          Windows 版本。
        </p>
        <div class="story-actions">
          <RouterLink class="story-button primary" to="/download"
            ><SiteIcon name="download" :size="18" />免费下载</RouterLink
          >
          <RouterLink class="story-button" to="/product">功能介绍</RouterLink>
        </div>
      </div>
      <div class="story-hero-phone">
        <FitBox :width="410" fit-height>
          <PhoneMock page="connect" theme="dark" :explode="explode">
            <PhoneConnect :radio="finalRadio" :power="finalPower" layered />
          </PhoneMock>
        </FitBox>
      </div>
      <p class="story-caption" :style="{ opacity: explode }">Android 连接页，一层一层拆开</p>
      <span class="story-scroll" :style="{ opacity: 1 - span(scroll, 0, 0.08) }">向下滚动</span>
    </div>
  </section>
</template>
