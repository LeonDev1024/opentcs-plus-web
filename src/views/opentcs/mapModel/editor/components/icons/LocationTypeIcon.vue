<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <!-- 外边框：正方形方框 -->
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      :rx="cornerRadius"
      :ry="cornerRadius"
      :fill="fillColor"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
    />
    <!-- 中间的 symbol 文本，可根据需要传入不同符号 -->
    <text
      v-if="symbol"
      x="12"
      y="12"
      text-anchor="middle"
      alignment-baseline="central"
      :font-size="fontSize"
      font-weight="bold"
      :fill="symbolColor"
    >
      {{ symbol }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 是否为激活状态（当前选中的绘制位置工具） */
    active?: boolean;
    /** 中间展示的符号，例如 'L'、'S' 等 */
    symbol?: string;
    /** 图标大小 */
    size?: number;
  }>(),
  {
    active: false,
    symbol: 'L',
    size: 18
  }
);

const strokeWidth = computed(() => (props.active ? 2 : 1.5));
const cornerRadius = computed(() => (props.active ? 3 : 2));
const fontSize = computed(() => (props.size ? props.size * 0.55 : 12));

const fillColor = computed(() => (props.active ? '#e6f2ff' : '#f5f5f5'));
const strokeColor = computed(() => (props.active ? '#409eff' : '#bfbfbf'));
const symbolColor = computed(() => (props.active ? '#409eff' : '#606266'));
</script>

<style scoped>
svg {
  display: block;
}
</style>


