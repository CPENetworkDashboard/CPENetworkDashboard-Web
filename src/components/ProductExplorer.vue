<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import SiteIcon from '@/components/SiteIcon.vue'
import { desktopScreenItems, mobileScreenItems } from '@/content'

const props = withDefaults(defineProps<{ mobile?: boolean }>(), { mobile: false })
const selected = ref(0)
const dialog = ref<HTMLDialogElement | null>(null)
const previewOpen = ref(false)
const chosenScreen = ref<string | null>(null)
const screens = computed(() => (props.mobile ? mobileScreenItems : desktopScreenItems))
const features = computed(() =>
  props.mobile
    ? [
        {
          name: '状态看板',
          icon: 'signal',
          title: '移动端网络状态监测',
          copy: '集中显示连接状态、射频指标与当前小区，便于安装部署与现场巡检时检查信号变化。',
          image: '/media/phone/mobile-status-dashboard-dark.webp',
          tags: ['信号质量', '当前小区', '连接状态'],
        },
        {
          name: '频段选择',
          icon: 'sliders',
          title: '频段与小区配置',
          copy: '按机型支持情况配置频段、ARFCN 与 PCI 锁定，并回读设备状态以确认配置结果。',
          image: '/media/phone/mobile-band-selection.webp',
          tags: ['Band', 'ARFCN', 'PCI'],
        },
        {
          name: '链路验证',
          icon: 'activity',
          title: '现场链路测试',
          copy: '在移动端发起下载测速、Ping 与路由追踪，辅助评估网络时延、传输能力与链路路径。',
          image: '/media/phone/mobile-speed-test.webp',
          tags: ['下载测速', 'Ping', '路由追踪'],
        },
      ]
    : [
        {
          name: '状态看板',
          icon: 'signal',
          title: '集中查看网络运行状态',
          copy: '汇总当前小区、邻区、射频质量与连接信息，便于持续观察网络状态并定位异常。',
          image: '/media/computer/desktop-signal-dashboard.webp',
          tags: ['RSRP / RSRQ', 'SINR', 'PCI / ARFCN'],
        },
        {
          name: '频段锁定',
          icon: 'sliders',
          title: '频段锁定与配置回读',
          copy: '统一管理 Band、ARFCN、PCI 及网络偏好。配置发送后回读设备状态，确认锁定结果。',
          image: '/media/computer/desktop-frequency-lock.webp',
          tags: ['Band', 'ARFCN / PCI', '锁定回读'],
        },
        {
          name: '链路测试',
          icon: 'activity',
          title: '网络性能与链路诊断',
          copy: '结合测速、Ping 与路由追踪分析传输性能、时延及路由路径，为网络排查提供参考。',
          image: '/media/computer/desktop-speed-test.webp',
          tags: ['下载测速', '时延', '路由追踪'],
        },
      ]
)
const current = computed(() => features.value[selected.value] || features.value[0]!)
const currentImage = computed(() => chosenScreen.value || current.value.image)
const imageLabel = computed(
  () =>
    screens.value.find((screen) => screen.image === currentImage.value)?.label || current.value.name
)
function selectFeature(index: number) {
  selected.value = index
  chosenScreen.value = null
}
function selectScreen(image: string) {
  selected.value = /lock|band|frequency|preference/.test(image)
    ? 1
    : /speed|ping|route/.test(image)
      ? 2
      : 0
  chosenScreen.value = image
}
async function openPreview() {
  previewOpen.value = true
  await nextTick()
  dialog.value?.showModal()
}
function closePreview() {
  dialog.value?.close()
}
onUnmounted(closePreview)
</script>

<template>
  <div class="product-explorer" :class="{ 'product-explorer-mobile': mobile }">
    <div
      class="explorer-navigation"
      role="group"
      :aria-label="mobile ? '手机端功能预览' : '桌面端功能预览'"
    >
      <button
        v-for="(feature, index) in features"
        :key="feature.name"
        type="button"
        :aria-pressed="selected === index"
        @click="selectFeature(index)"
      >
        <SiteIcon :name="feature.icon" /><span>{{ feature.name }}</span>
      </button>
    </div>
    <div class="explorer-body">
      <div class="explorer-copy" aria-live="polite" aria-atomic="true">
        <Transition name="explorer-copy-change" mode="out-in"
          ><div :key="selected">
            <h3>{{ current.title }}</h3>
            <p>{{ current.copy }}</p>
          </div></Transition
        >
        <ul class="explorer-tags" aria-label="相关功能">
          <li v-for="tag in current.tags" :key="tag">{{ tag }}</li>
        </ul>
        <span class="explorer-caption"
          >{{ mobile ? 'Android' : 'macOS / Windows' }} 实际应用界面</span
        >
      </div>
      <div class="explorer-media">
        <div class="explorer-window" :class="{ 'explorer-handset': mobile }">
          <div v-if="!mobile" class="explorer-window-bar" aria-hidden="true">
            <span></span><span></span><span></span><small>CPE++</small>
          </div>
          <Transition name="screenshot-change" mode="out-in">
            <img
              :key="currentImage"
              :src="currentImage"
              :alt="imageLabel + '，CPE加加' + (mobile ? '手机端' : '桌面端') + '实际界面'"
              :width="mobile ? 700 : 1600"
              :height="mobile ? 1471 : 997"
              loading="lazy"
              decoding="async"
            />
          </Transition>
        </div>
        <button type="button" class="explorer-zoom" @click="openPreview">
          <SiteIcon name="zoom" :size="17" />放大界面
        </button>
      </div>
    </div>
    <details class="explorer-gallery">
      <summary>浏览全部 {{ screens.length }} 个界面<SiteIcon name="chevron" :size="16" /></summary>
      <div>
        <button
          v-for="screen in screens"
          :key="screen.image"
          type="button"
          :aria-pressed="currentImage === screen.image"
          @click="selectScreen(screen.image)"
        >
          {{ screen.label }}
        </button>
      </div>
    </details>
    <dialog
      ref="dialog"
      class="screenshot-dialog"
      aria-label="应用界面大图"
      @close="previewOpen = false"
      @click="$event.target === dialog && closePreview()"
    >
      <div class="screenshot-dialog-inner">
        <header>
          <span>{{ imageLabel }} / {{ mobile ? 'Android' : '桌面端' }}</span
          ><button type="button" aria-label="关闭大图" @click="closePreview">
            <SiteIcon name="close" />
          </button>
        </header>
        <img
          v-if="previewOpen"
          :src="currentImage.replace(/\.webp$/, mobile ? '.jpg' : '.png')"
          :alt="imageLabel + '完整应用界面'"
        />
      </div>
    </dialog>
  </div>
</template>
