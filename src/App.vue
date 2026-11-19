<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import SiteFooter from '@/components/SiteFooter.vue'
import SiteHeader from '@/components/SiteHeader.vue'
import { useAnalytics } from '@/composables/useAnalytics'

const route = useRoute()
const { loadSummary, recordVisit } = useAnalytics()

const pageKey = computed(() => route.fullPath)
const privacyStorageKey = 'cpe-plus-plus-privacy-notice-v1'
const privacyNoticeVisible = ref(false)
const trackingAllowed = ref(false)
function focusMain() {
  document.getElementById('main-content')?.focus()
}

async function refreshPublicStats(): Promise<void> {
  await loadSummary()
}

async function maybeRecordVisit(path: string): Promise<void> {
  if (trackingAllowed.value) {
    await recordVisit(path)
    return
  }
  await refreshPublicStats()
}

async function acceptPrivacyNotice(): Promise<void> {
  try {
    localStorage.setItem(privacyStorageKey, 'accepted')
  } catch {
    /* Consent applies to this session. */
  }
  privacyNoticeVisible.value = false
  trackingAllowed.value = true
  await recordVisit(route.path)
}

watch(
  () => route.path,
  async (path) => {
    document.title = `${String(route.meta.title || 'CPE加加')} / CPE++`
    await maybeRecordVisit(path)
  }
)

onMounted(async () => {
  document.title = `${String(route.meta.title || 'CPE加加')} / CPE++`
  let accepted = false
  try {
    accepted = localStorage.getItem(privacyStorageKey) === 'accepted'
  } catch {
    /* Show the notice. */
  }
  trackingAllowed.value = accepted
  privacyNoticeVisible.value = !accepted
  await maybeRecordVisit(route.path)
})
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">跳转到主要内容</a>
    <SiteHeader />
    <main id="main-content" tabindex="-1">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="pageKey" />
        </Transition>
      </RouterView>
    </main>
    <SiteFooter />
    <div v-if="privacyNoticeVisible" class="privacy-notice" role="status" aria-live="polite">
      <div>
        <strong>隐私统计说明</strong>
        <p>
          官网会统计访问页面、来源、设备/浏览器/系统、粗略地区和安装包下载点击，用于判断版本下载量和站点运行情况；不公开完整
          IP、原始 User-Agent 或设备登录信息。
        </p>
      </div>
      <button type="button" @click="acceptPrivacyNotice">知道了</button>
    </div>
  </div>
</template>
