<script setup lang="ts">
defineProps<{ explode: number; on: boolean }>()
</script>

<template>
  <div class="story-layer hero-fx" :class="{ on }" aria-hidden="true">
    <p class="story-caption" :style="{ opacity: explode }">Android 连接页 · 分层立体拆解</p>
  </div>
</template>
