<script setup lang="ts">
import PhoneTile from './PhoneTile.vue'
import { W, cellFacts, words, type Metric } from './data'

// Connection page of the Android client, as in the v3.7 dashboard.
withDefaults(
  defineProps<{
    radio: Metric[]
    power: Metric[]
    fill?: number
    mode?: 'bar' | 'border'
    layered?: boolean
    focus?: 'cell' | 'radio' | 'power' | null
    pop?: number
    grades?: number
  }>(),
  { fill: 1, mode: 'bar', layered: false, focus: null, pop: 0, grades: 0 }
)
</script>

<template>
  <div class="pm-card pm-overview" :class="{ 'pm-layer': layered, dim: focus }" style="--z: 2">
    <span v-if="layered" class="am-tag pm-tag">连接概览</span>
    <div class="pm-head">
      <h4>中国移动:46000 - 5G SA</h4>
      <span class="pm-sig"><i></i><i></i><i></i><i></i><i></i><b>5G</b></span>
    </div>
    <div class="pm-ambr">SIM卡AMBR 暂无数据<span>获取</span></div>
    <b class="pm-ok">蜂窝已连接</b>
  </div>
  <div
    class="pm-card"
    :class="{ 'pm-layer': layered, glow: focus === 'cell', dim: focus && focus !== 'cell' }"
    style="--z: 3"
  >
    <span v-if="layered" class="am-tag pm-tag">当前小区</span>
    <h4>当前小区（NR PCC）</h4>
    <div class="pm-grid c3">
      <PhoneTile v-for="[label, value] in cellFacts" :key="label" :label :value :w="W.c3" />
    </div>
  </div>
  <div
    class="pm-card pm-radio"
    :class="{
      'pm-layer': layered,
      glow: focus === 'radio',
      dim: focus && focus !== 'radio',
      popped: pop > 0,
    }"
    :style="{ '--z': 4, '--k': pop }"
  >
    <span v-if="layered" class="am-tag pm-tag">射频质量</span>
    <h4>射频质量（NR PCC）</h4>
    <div class="pm-grid c3">
      <div v-for="m in radio.slice(0, 3)" :key="m.label" class="pm-cell">
        <PhoneTile v-bind="m" :w="W.c3" :fill :mode />
        <em v-if="m.level" :class="m.level" :style="{ '--g': grades }">{{ words[m.level] }}</em>
      </div>
    </div>
    <div class="pm-grid c2">
      <div v-for="m in radio.slice(3)" :key="m.label" class="pm-cell">
        <PhoneTile v-bind="m" :w="W.c2" :fill :mode />
        <em v-if="m.level" :class="m.level" :style="{ '--g': grades }">{{ words[m.level] }}</em>
      </div>
    </div>
  </div>
  <div
    class="pm-card"
    :class="{ 'pm-layer': layered, glow: focus === 'power', dim: focus && focus !== 'power' }"
    style="--z: 5"
  >
    <span v-if="layered" class="am-tag pm-tag">当前功率</span>
    <h4>当前功率（NR PCC）</h4>
    <div class="pm-grid c4">
      <PhoneTile v-for="m in power" :key="m.label" v-bind="m" :w="W.c4" :mode />
    </div>
  </div>
  <div class="pm-card pm-link" :class="{ 'pm-layer': layered, dim: focus }" style="--z: 3">
    <div>
      <h4>下行链路（NR PCC）</h4>
      <p>MCS 16<br />RANK 2</p>
    </div>
    <div>
      <h4>上行链路（NR PCC）</h4>
      <p>MCS 25</p>
    </div>
  </div>
</template>
