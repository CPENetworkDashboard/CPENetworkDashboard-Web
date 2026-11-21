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
const vendors = supportedDevices.map(([brand, models]) => {
  const [en, zh] = brand.split(' / ')
  return { en, zh, models }
})
const features = [
  {
    title: '连接',
    lead: '登录后自动刷新，设备上能读到的数据都会列出来。',
    items: [
      '当前小区、辅载波、邻区与载波聚合',
      'RSRP、RSRQ、SINR、CQI 按阈值标出好坏',
      '上行功率、带宽、MCS 与流量统计',
      '卡片的显示、顺序和宽度可以自己调整',
    ],
  },
  {
    title: '锁频',
    lead: '按厂家能力显示可用的选项，不支持的不会出现。',
    items: [
      '网络首选：自动、仅 5G、仅 4G、SA / NSA',
      '锁频段、锁 ARFCN、锁 PCI 与小区锁定',
      '写入前读取当前规则，写入后回读校验',
      '一键解除锁定，恢复自动选网',
    ],
  },
  {
    title: '测试',
    lead: '确认问题出在信号、基站还是外网。',
    items: [
      '本机多线程测速，记录平均和实时速率',
      'Ping 常用站点或自定义地址，查看延迟走势',
      '路由测试与会话数并发测试',
      '诊断页可导出离线 HTML 报告',
    ],
  },
]
</script>

<template>
  <div ref="page" class="home">
    <section class="home-hero content-width" aria-labelledby="home-title">
      <div class="home-intro">
        <RouterLink class="home-release" to="/changelog">
          Android 3.7.1 · 桌面版 3.5.3<SiteIcon name="chevron" :size="14" />
        </RouterLink>
        <h1 id="home-title">4G / 5G CPE 的<br />本地看板。</h1>
        <p>
          登录 CPE 后台，实时查看小区和射频质量。锁频、测速、Ping
          和路由测试都在同一个应用里完成，数据只在你的设备和 CPE 之间传输。
        </p>
        <div class="home-actions">
          <RouterLink class="home-button primary" to="/download">
            <SiteIcon name="download" :size="18" />下载 CPE加加
          </RouterLink>
          <RouterLink class="home-button" to="/product">功能介绍</RouterLink>
        </div>
      </div>
      <dl class="home-facts">
        <div>
          <dt>支持厂家</dt>
          <dd>{{ vendors.map((vendor) => vendor.zh).join('、') }}</dd>
        </div>
        <div>
          <dt>平台</dt>
          <dd>Android、macOS、Windows</dd>
        </div>
        <div>
          <dt>价格</dt>
          <dd>免费，无需注册账号</dd>
        </div>
      </dl>
    </section>

    <section class="home-demo content-width" aria-label="桌面端演示">
      <CpeSimulator />
      <p class="home-demo-note">
        这是按桌面端界面还原的演示，可以点「连接」「锁频」「测试」试用。数据是模拟的，不会连接任何设备。
      </p>
    </section>

    <section class="home-features content-width" aria-labelledby="features-title">
      <h2 id="features-title" data-reveal>三个页面，覆盖日常调试</h2>
      <div class="home-columns">
        <article v-for="(feature, index) in features" :key="feature.title" data-reveal>
          <span>0{{ index + 1 }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.lead }}</p>
          <ul>
            <li v-for="item in feature.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="home-devices content-width" aria-labelledby="devices-title">
      <header data-reveal>
        <h2 id="devices-title">已适配的设备</h2>
        <RouterLink :to="{ path: '/product', hash: '#devices' }"
          >完整列表<SiteIcon name="chevron" :size="14"
        /></RouterLink>
      </header>
      <dl data-reveal>
        <div v-for="vendor in vendors" :key="vendor.en">
          <dt>
            <strong>{{ vendor.zh }}</strong
            ><span>{{ vendor.en }}</span>
          </dt>
          <dd>{{ vendor.models }}</dd>
        </div>
      </dl>
    </section>

    <section class="home-real content-width" aria-labelledby="real-title">
      <header data-reveal>
        <h2 id="real-title">真实界面</h2>
        <p>桌面端与 Android 截图，未经修饰。</p>
      </header>
      <div class="home-real-stage" data-reveal><ProductStage /></div>
    </section>

    <section class="home-get content-width" aria-labelledby="get-title" data-reveal>
      <div>
        <h2 id="get-title">下载</h2>
        <p>所有安装包都提供 SHA-256 校验值。</p>
        <RouterLink class="home-get-status" to="/status"
          ><i aria-hidden="true"></i>服务状态<SiteIcon name="chevron" :size="14"
        /></RouterLink>
      </div>
      <ul>
        <li v-for="platform in platforms" :key="platform.id">
          <RouterLink :to="{ path: '/download', query: { file: platform.id } }">
            <SiteIcon :name="platform.icon" :size="22" />
            <strong>{{ platform.name }}</strong>
            <span>{{ platform.note }}</span>
            <em>v{{ platform.version }}</em>
            <SiteIcon name="download" :size="18" />
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
