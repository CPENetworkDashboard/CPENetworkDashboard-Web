<script setup lang="ts">
import { computed, toRef } from 'vue'
import FitBox from './FitBox.vue'
import PhoneMock from './PhoneMock.vue'
import { ease, pop, span } from './quality'

const props = defineProps<{ t: number; on: boolean; theme: 'light' | 'dark' }>()
const t = toRef(props, 't')

// [name, channel position 0..336, half width, peak height, colour]
const aps = [
  ['CMCC-5G-A8F2', 70, 46, 30, '#9cc8ff'],
  ['ChinaNet-7K', 120, 46, 70, '#7ae0a1'],
  ['Xiaomi_5G', 175, 62, 18, '#ffcb6b'],
  ['TP-LINK_3B', 230, 46, 58, '#ff8a80'],
  ['HUAWEI-H168', 285, 62, 40, '#c4a5ff'],
] as const
const draw = computed(() => ease(span(t.value, 0.02, 0.3)))
const curve = (x: number, w: number, h: number) => {
  const y = 132 - h * draw.value
  return `M${x - w} 132C${x - w * 0.45} 132 ${x - w * 0.45} ${y} ${x} ${y}S${x + w * 0.45} 132 ${x + w} 132`
}
const list = [
  ['ChinaNet-7K', 'CH 6 · Wi-Fi 6', '-48 dBm'],
  ['TP-LINK_3B', 'CH 11 · Wi-Fi 5', '-55 dBm'],
  ['HUAWEI-H168', 'CH 13 · Wi-Fi 7', '-63 dBm'],
  ['CMCC-5G-A8F2', 'CH 1 · Wi-Fi 6', '-71 dBm'],
]
const tools = [
  ['载波聚合', '五家设备统一展示主辅载波'],
  ['邻区扫描', '周边小区的 PCI、频点与信号'],
  ['诊断报告', '一键导出离线 HTML 中文报告'],
  ['签名插件', '原生与 HTML 卡片，导入先校验'],
  ['SSH 终端', '烽火、通则，先校验主机公钥'],
  ['短信', '鲲鹏无限、通则短信收件箱'],
] as const
const spots = [
  [-1, -0.78],
  [-1.14, 0.06],
  [-1, 0.86],
  [1, -0.82],
  [1.12, 0.02],
  [1, 0.84],
] as const
const fly = (index: number) => pop(span(t.value, 0.3 + index * 0.06, 0.5 + index * 0.06))
</script>

<template>
  <div class="story-layer" :class="{ on }">
    <div class="story-phone" :style="{ '--t': t }">
      <FitBox :width="410" fit-height>
        <PhoneMock :theme page="test" title="Wi-Fi 信道" spill>
          <div class="pm-seg">
            <span>2.4 GHz</span><span class="on">5 GHz</span><span>6 GHz</span>
          </div>
          <div class="pm-card glow">
            <h4>信道占用</h4>
            <svg class="pm-wifi" viewBox="0 0 336 150">
              <path class="grid" d="M0 132H336M0 92H336M0 52H336M0 12H336" />
              <path
                v-for="[name, x, w, h, color] in aps"
                :key="name"
                :d="curve(x, w, h)"
                :style="{ stroke: color, fill: color }"
              />
            </svg>
            <p class="pm-axis">
              <span>36</span><span>64</span><span>100</span><span>149</span><span>165</span>
            </p>
          </div>
          <div class="pm-card">
            <h4>周边热点</h4>
            <div v-for="[name, meta, rssi] in list" :key="name" class="pm-ap">
              <div>
                <b>{{ name }}</b
                ><small>{{ meta }}</small>
              </div>
              <strong>{{ rssi }}</strong>
            </div>
          </div>
        </PhoneMock>
      </FitBox>
    </div>
    <div
      v-for="([title, text], index) in tools"
      :key="title"
      class="story-tool"
      :style="{ '--bx': spots[index]![0], '--by': spots[index]![1], '--b': fly(index) }"
      aria-hidden="true"
    >
      <b>{{ title }}</b
      ><span>{{ text }}</span>
    </div>
  </div>
</template>
