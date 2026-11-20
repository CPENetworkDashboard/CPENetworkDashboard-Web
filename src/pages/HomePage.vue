<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ProductExplorer from '@/components/ProductExplorer.vue'
import SiteIcon from '@/components/SiteIcon.vue'
import { downloads, supportedDevices } from '@/content'
import ProductStage from '@/components/ProductStage.vue'
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
</script>

<template>
  <div ref="page" class="landing">
    <section class="landing-hero content-width" aria-labelledby="home-title">
      <div class="landing-hero-copy">
        <RouterLink class="release-note" to="/changelog"
          ><span>Android 3.7.1</span>正式版现已发布</RouterLink
        >
        <h1 id="home-title">CPE 网络管理<br />与诊断工具。</h1>
        <p>
          面向 4G / 5G CPE 的跨平台管理软件。集中查看网络状态、管理频段与小区，并通过测速、Ping
          和路由追踪完成链路诊断。
        </p>
        <div class="landing-actions">
          <RouterLink class="action primary" to="/download"
            ><SiteIcon name="download" :size="18" />下载 CPE加加</RouterLink
          ><RouterLink class="landing-text-link" to="/product">了解产品功能</RouterLink>
        </div>
        <div class="landing-platforms" aria-label="支持的平台">
          <span v-for="platform in platforms" :key="platform.name"
            ><SiteIcon :name="platform.icon" :size="17" />{{ platform.name }}</span
          >
        </div>
      </div>
      <ProductStage />
    </section>
    <section class="landing-devices content-width" data-reveal aria-label="已适配的设备厂商">
      <p>支持多种主流 CPE 设备</p>
      <div>
        <span v-for="[brand] in supportedDevices" :key="brand">{{ brand.split(' / ')[0] }}</span>
      </div>
      <RouterLink :to="{ path: '/product', hash: '#devices' }">查看适配机型</RouterLink>
    </section>
    <section class="landing-workflow content-width" data-reveal aria-labelledby="workflow-title">
      <div class="landing-section-heading">
        <h2 id="workflow-title">网络监测、设备管理<br />与链路诊断。</h2>
        <p>以统一的工作界面完成日常排查。<br />关键指标、配置操作与测试结果集中呈现。</p>
      </div>
      <ProductExplorer />
    </section>
    <section
      class="landing-mobile-section content-width"
      data-reveal
      aria-labelledby="mobile-title"
    >
      <div class="landing-mobile-images" aria-label="Android 功能界面">
        <img
          src="/media/phone/mobile-device-neighbor-cells.webp"
          alt="Android 端设备信息与邻区界面"
          width="1264"
          height="2660"
          loading="lazy"
          decoding="async"
        /><img
          src="/media/phone/mobile-band-selection.webp"
          alt="Android 端频段选择界面"
          width="1264"
          height="2660"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="landing-mobile-copy">
        <SiteIcon name="phone" :size="30" />
        <h2 id="mobile-title">移动端管理，<br />适用于现场调试。</h2>
        <p>
          通过 Android
          客户端查看信号与邻区、配置频段及小区锁定，并在现场执行网络测试。适合设备安装、位置调整与日常维护。
        </p>
        <ul>
          <li><SiteIcon name="check" :size="17" />实时查看连接与射频状态</li>
          <li><SiteIcon name="check" :size="17" />管理频段、ARFCN 与 PCI</li>
          <li><SiteIcon name="check" :size="17" />测速、Ping 与路由测试</li>
        </ul>
        <RouterLink class="landing-text-link" :to="{ path: '/product', hash: '#mobile' }"
          >查看 Android 功能</RouterLink
        >
      </div>
    </section>
    <section class="landing-download content-width" data-reveal aria-labelledby="platform-title">
      <div class="landing-section-heading">
        <h2 id="platform-title">在常用设备上，<br />管理你的 CPE。</h2>
        <RouterLink class="landing-text-link" to="/download">全部下载与校验</RouterLink>
      </div>
      <div class="landing-download-platforms">
        <RouterLink
          v-for="platform in platforms"
          :key="platform.id"
          :to="{ path: '/download', query: { file: platform.id } }"
          ><SiteIcon :name="platform.icon" :size="29" />
          <h3>{{ platform.name }}</h3>
          <p>{{ platform.note }}</p>
          <span>v{{ platform.version }}<SiteIcon name="download" :size="18" /></span
        ></RouterLink>
      </div>
    </section>
    <section class="landing-status content-width" data-reveal>
      <div>
        <SiteIcon name="activity" :size="24" />
        <h2>服务运行记录</h2>
        <p>查看各项服务的可用率、采集覆盖与历史记录。</p>
      </div>
      <RouterLink class="action secondary" to="/status">打开服务状态</RouterLink>
    </section>
  </div>
</template>
