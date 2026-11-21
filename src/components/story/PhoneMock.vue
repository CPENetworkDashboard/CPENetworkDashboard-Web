<script setup lang="ts">
type Page = 'connect' | 'lock' | 'test'
withDefaults(
  defineProps<{
    page: Page
    explode?: number
    theme?: 'dark' | 'light'
    wipe?: number
    tabs?: string[]
    tab?: number
    clip?: boolean
  }>(),
  { explode: 0, theme: 'dark', wipe: 0, tabs: () => [], tab: 0, clip: true }
)
const icons: Record<string, string> = {
  connect: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4"/><path d="M10 12h.01M12 12h.01M14 12h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  test: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m9 3-.6 2.4-2.3 1-2.2-.9-2 3.4 1.8 1.6v3l-1.8 1.6 2 3.4 2.2-.9 2.3 1L9 21h6l.6-2.4 2.3-1 2.2.9 2-3.4-1.8-1.6v-3l1.8-1.6-2-3.4-2.2.9-2.3-1L15 3Z"/>',
}
const dock: Array<[string, string]> = [
  ['connect', '连接'],
  ['lock', '锁频'],
  ['test', '测试'],
  ['settings', '设置'],
]
</script>

<template>
  <div
    class="pm"
    :class="{ exploding: explode > 0 }"
    :style="{ '--e': explode }"
    aria-hidden="true"
  >
    <div
      v-for="layer in wipe > 0 ? ['dark', 'light'] : [theme]"
      :key="layer"
      class="pm-screen"
      :class="[layer, { clip: clip && explode === 0, wiped: layer === 'light' && wipe > 0 }]"
      :style="
        layer === 'light' && wipe > 0
          ? { clipPath: `inset(${(1 - wipe) * 100}% 0 0 0 round 44px)` }
          : undefined
      "
    >
      <div class="pm-status pm-layer" style="--z: 1">
        <b>17:27</b><i class="pm-camera"></i>
        <span class="pm-icons"><i class="sig"></i><i class="wifi"></i><i class="bat"></i></span>
      </div>
      <nav v-if="tabs.length" class="pm-tabs pm-layer" style="--z: 2">
        <span v-for="(name, index) in tabs" :key="name" :class="{ on: index === tab }">{{
          name
        }}</span>
      </nav>
      <div class="pm-body"><slot /></div>
      <div class="pm-dock pm-layer" style="--z: 7">
        <span class="am-tag pm-tag">底部导航</span>
        <span v-for="[icon, label] in dock" :key="icon" :class="{ on: icon === page }">
          <svg viewBox="0 0 24 24" v-html="icons[icon]"></svg>{{ label }}
        </span>
      </div>
    </div>
  </div>
</template>
