<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ProductStory from '@/components/story/ProductStory.vue'
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
</script>

<template>
  <div ref="page" class="home">
    <ProductStory :versions="platforms" />

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
