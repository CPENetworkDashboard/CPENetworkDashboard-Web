<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CpeSimulator from '@/components/CpeSimulator.vue'
import ProductStage from '@/components/ProductStage.vue'
import SiteIcon from '@/components/SiteIcon.vue'
import { downloads, supportedDevices } from '@/content'
import { useProductMotion } from '@/composables/useProductMotion'

const page = ref<HTMLElement | null>(null)
useProductMotion(page)

const platforms = computed(() =>
  [
    { name: 'Android', icon: 'android', id: 'android-3.7.1', note: 'Android 8.0 及以上' },
    { name: 'macOS', icon: 'apple', id: 'macos-3.5.3', note: 'Apple Silicon · arm64' },
    { name: 'Windows', icon: 'windows', id: 'windows-exe-3.5.3', note: 'EXE / MSI / 免安装' },
  ].map((platform) => ({
    ...platform,
    version: downloads.find((download) => download.id === platform.id)?.version,
  }))
)
const brands = supportedDevices.map(([brand]) => brand.split(' / ')[0])
</script>

<template>
  <div ref="page" class="home">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-glow" aria-hidden="true"></div>
      <div class="home-hero-copy content-width">
        <RouterLink class="home-pill" to="/changelog"
          ><span>新版本</span>Android 3.7.1 正式版已发布<SiteIcon name="chevron" :size="14"
        /></RouterLink>
        <h1 id="home-title">看清每一格信号，<br /><em>调好你的 CPE。</em></h1>
        <p>
          面向 4G / 5G CPE
          的监测与调试工具。信号、小区、锁频和测速集中在同一个界面，调整前后的变化一目了然。
        </p>
        <div class="home-actions">
          <RouterLink class="home-button primary" to="/download"
            ><SiteIcon name="download" :size="18" />免费下载</RouterLink
          ><RouterLink class="home-button ghost" to="/product">了解全部功能</RouterLink>
        </div>
        <ul class="home-platforms" aria-label="支持的平台">
          <li v-for="platform in platforms" :key="platform.name">
            <SiteIcon :name="platform.icon" :size="16" />{{ platform.name }}
          </li>
        </ul>
      </div>
      <div class="home-stage content-width">
        <div class="home-stage-tilt">
          <CpeSimulator />
        </div>
        <p class="home-stage-hint">
          <i aria-hidden="true"></i>可以直接点击试用：切换页签、锁定频段、开始测速。数据为模拟演示。
        </p>
      </div>
    </section>

    <section class="home-brands content-width" aria-label="已适配的设备厂商">
      <p>适配主流 CPE 设备</p>
      <ul>
        <li v-for="brand in brands" :key="brand">{{ brand }}</li>
      </ul>
      <RouterLink :to="{ path: '/product', hash: '#devices' }"
        >查看机型<SiteIcon name="chevron" :size="14"
      /></RouterLink>
    </section>

    <section class="home-features content-width" aria-labelledby="features-title">
      <header class="home-heading" data-reveal>
        <small>从发现问题到验证结果</small>
        <h2 id="features-title">调网络，不再靠猜。</h2>
        <p>每一项数据都直接读自设备，每一次调整都能马上看到效果。</p>
      </header>
      <div class="home-bento">
        <article class="home-card wide" data-reveal>
          <div class="home-card-copy">
            <SiteIcon name="signal" :size="20" />
            <h3>实时信号</h3>
            <p>RSRP、RSRQ、SINR 与服务小区持续刷新，信号好坏用颜色和曲线直接呈现。</p>
          </div>
          <div class="viz-wave" aria-hidden="true">
            <i v-for="index in 24" :key="index" :style="{ '--i': index }"></i>
          </div>
        </article>
        <article class="home-card" data-reveal>
          <div class="home-card-copy">
            <SiteIcon name="sliders" :size="20" />
            <h3>锁频与锁小区</h3>
            <p>锁定频段、ARFCN 与 PCI，并回读设备上的实际配置。</p>
          </div>
          <div class="viz-bands" aria-hidden="true">
            <span>n78</span><span class="on">n41</span><span>n28</span><span>n1</span>
          </div>
        </article>
        <article class="home-card" data-reveal>
          <div class="home-card-copy">
            <SiteIcon name="activity" :size="20" />
            <h3>链路诊断</h3>
            <p>测速、Ping 与路由追踪，判断问题出在信号、基站还是外网。</p>
          </div>
          <ol class="viz-log" aria-hidden="true">
            <li><span>1</span>192.168.8.1<b>1.2 ms</b></li>
            <li><span>2</span>10.64.0.1<b>9.8 ms</b></li>
            <li><span>3</span>223.5.5.5<b>12.4 ms</b></li>
          </ol>
        </article>
        <article class="home-card wide" data-reveal>
          <div class="home-card-copy">
            <SiteIcon name="monitor" :size="20" />
            <h3>手机和电脑都能用</h3>
            <p>Android 适合现场调试，macOS 与 Windows 适合长时间观察，功能保持一致。</p>
          </div>
          <ul class="viz-platforms" aria-hidden="true">
            <li v-for="platform in platforms" :key="platform.id">
              <SiteIcon :name="platform.icon" :size="26" /><strong>{{ platform.name }}</strong
              ><span>v{{ platform.version }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="home-real content-width" aria-labelledby="real-title">
      <header class="home-heading" data-reveal>
        <small>真实应用界面</small>
        <h2 id="real-title">桌面端与 Android，同一套体验。</h2>
      </header>
      <div class="home-real-stage" data-reveal><ProductStage /></div>
    </section>

    <section class="home-cta content-width" aria-labelledby="cta-title" data-reveal>
      <div class="home-glow small" aria-hidden="true"></div>
      <h2 id="cta-title">现在就看清你的网络。</h2>
      <p>免费下载，无需注册。所有安装包都提供 SHA-256 校验。</p>
      <div class="home-download">
        <RouterLink
          v-for="platform in platforms"
          :key="platform.id"
          :to="{ path: '/download', query: { file: platform.id } }"
        >
          <SiteIcon :name="platform.icon" :size="26" />
          <strong>{{ platform.name }}</strong>
          <span>{{ platform.note }}</span>
          <em>v{{ platform.version }}<SiteIcon name="download" :size="16" /></em>
        </RouterLink>
      </div>
      <RouterLink class="home-status-link" to="/status"
        ><i aria-hidden="true"></i>查看官网与更新服务的运行状态<SiteIcon name="chevron" :size="14"
      /></RouterLink>
    </section>
  </div>
</template>
