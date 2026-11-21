<script setup lang="ts">
type Page = 'connect' | 'lock' | 'test'
withDefaults(
  defineProps<{
    page: Page
    explode?: number
    variant?: 'desktop' | 'phone'
    theme?: 'dark' | 'light'
    connected?: boolean
  }>(),
  { explode: 0, variant: 'desktop', theme: 'dark', connected: true }
)

const icons: Record<string, string> = {
  login:
    '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  connect: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4"/><path d="M10 12h.01M12 12h.01M14 12h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  test: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m9 3-.6 2.4-2.3 1-2.2-.9-2 3.4 1.8 1.6v3l-1.8 1.6 2 3.4 2.2-.9 2.3 1L9 21h6l.6-2.4 2.3-1 2.2.9 2-3.4-1.8-1.6v-3l1.8-1.6-2-3.4-2.2.9-2.3-1L15 3Z"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  log: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6m-6 3h6m-6 3h4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 6m2-11v5h-5"/>',
}
const nav: Array<[string, string]> = [
  ['login', '登录'],
  ['connect', '连接'],
  ['lock', '锁频'],
  ['test', '测试'],
  ['settings', '设置'],
  ['about', '关于'],
]
const titles: Record<Page, string> = { connect: '连接', lock: '锁频', test: '测试' }
</script>

<template>
  <div class="am" :class="[variant, theme]" :style="{ '--e': explode }" aria-hidden="true">
    <div v-if="variant === 'desktop'" class="am-chrome"><i></i><i></i><i></i></div>
    <div class="am-shell">
      <aside v-if="variant === 'desktop'" class="am-side am-layer" style="--z: 1">
        <span class="am-tag">厂家与设备</span>
        <div class="am-brand">
          <strong>CPE网络看板</strong><span>CPE Network Dashboard</span>
          <em><i></i>{{ connected ? '已连接' : '注册中' }}</em>
        </div>
        <div class="am-nav">
          <span v-for="[icon, label] in nav" :key="icon" :class="{ active: icon === page }">
            <svg viewBox="0 0 24 24" v-html="icons[icon]"></svg>{{ label }}
          </span>
        </div>
        <dl class="am-foot">
          <div>
            <dt>状态</dt>
            <dd>已登录</dd>
          </div>
          <div>
            <dt>刷新</dt>
            <dd>自动</dd>
          </div>
        </dl>
      </aside>
      <div class="am-main">
        <header class="am-top am-layer" style="--z: 2">
          <span class="am-tag">自动刷新</span>
          <h3>{{ titles[page] }}</h3>
          <b class="am-auto">自动刷新</b>
          <i class="am-spacer"></i>
          <span v-if="variant === 'desktop'" class="am-btn"
            ><svg viewBox="0 0 24 24" v-html="icons.log"></svg>日志</span
          >
          <span class="am-btn primary"
            ><svg viewBox="0 0 24 24" v-html="icons.refresh"></svg>刷新</span
          >
        </header>
        <div class="am-panes"><slot /></div>
      </div>
    </div>
    <div v-if="variant === 'phone'" class="am-dock am-layer" style="--z: 6">
      <span v-for="[icon, label] in nav.slice(1, 5)" :key="icon" :class="{ active: icon === page }">
        <svg viewBox="0 0 24 24" v-html="icons[icon]"></svg>{{ label }}
      </span>
    </div>
  </div>
</template>
