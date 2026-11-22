<script setup lang="ts">
import { computed } from 'vue'

type Page = 'connect' | 'lock' | 'test' | 'settings'
const props = withDefaults(
  defineProps<{
    page: Page
    explode?: number
    theme?: 'dark' | 'light'
    wipe?: number
    tabs?: string[]
    tab?: number
    title?: string
    wallpaper?: boolean
    /** Let popped-out content cross the screen edge. */
    spill?: boolean
    /** Position of the glass lens over the dock, defaults to the current page. */
    lens?: number
    lensScale?: number
  }>(),
  {
    explode: 0,
    theme: 'dark',
    wipe: 0,
    tabs: () => [],
    tab: 0,
    title: '',
    wallpaper: false,
    spill: false,
    lens: undefined,
    lensScale: 1,
  }
)
const icons: Record<string, string> = {
  connect: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/>',
  test: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3h4"/>',
  settings: '<path d="M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6z"/><circle cx="12" cy="12" r="3"/>',
}
const dock: Array<[Page, string]> = [
  ['connect', '连接'],
  ['lock', '锁频'],
  ['test', '测试'],
  ['settings', '设置'],
]
const overlay = computed(() => (props.theme === 'dark' ? 'light' : 'dark'))
const lensAt = computed(() => props.lens ?? dock.findIndex(([id]) => id === props.page))
</script>

<template>
  <div
    class="pm"
    :class="{ exploding: explode > 0 }"
    :style="{ '--e': explode }"
    aria-hidden="true"
  >
    <div
      v-for="layer in wipe > 0 ? [theme, overlay] : [theme]"
      :key="layer"
      class="pm-screen"
      :class="[
        layer,
        { clip: explode === 0 && !spill, wiped: layer === overlay && wipe > 0, wall: wallpaper },
      ]"
      :style="
        layer === overlay && wipe > 0
          ? { clipPath: `inset(${(1 - wipe) * 100}% 0 0 0 round 46px)` }
          : undefined
      "
    >
      <div class="pm-status pm-layer" style="--z: 1">
        <b>18:00</b><i class="pm-camera"></i>
        <span class="pm-icons"
          ><small>5G</small><i class="sig"></i><i class="wifi"></i><i class="bat">96</i></span
        >
      </div>
      <header v-if="title" class="pm-title pm-layer" style="--z: 2">
        <i></i><b>{{ title }}</b>
      </header>
      <nav v-if="tabs.length" class="pm-tabs pm-layer" style="--z: 2">
        <span v-for="(name, index) in tabs" :key="name" :class="{ on: index === tab }">{{
          name
        }}</span>
      </nav>
      <div class="pm-body"><slot /></div>
      <div class="pm-dock pm-layer" style="--z: 5">
        <span class="am-tag pm-tag">液态玻璃底栏</span>
        <i class="pm-lens" :style="{ '--i': lensAt, '--ls': lensScale }"></i>
        <span
          v-for="([id, label], index) in dock"
          :key="id"
          class="pm-tab"
          :class="{ on: index === Math.round(lensAt) }"
        >
          <svg viewBox="0 0 24 24" v-html="icons[id]"></svg>{{ label }}
        </span>
      </div>
    </div>
  </div>
</template>
