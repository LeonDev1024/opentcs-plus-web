<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      :r="isPark ? 8 : 6"
      :fill="fillColor"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
    />
    <text
      v-if="isPark"
      x="12"
      y="12"
      text-anchor="middle"
      alignment-baseline="central"
      font-size="10"
      font-weight="bold"
      :fill="glyphColor"
    >
      P
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    type: string;
    active?: boolean;
    size?: number;
  }>(),
  {
    active: false,
    size: 18
  }
);

const isPark = computed(() => props.type === 'Park point');
const strokeWidth = computed(() => (props.active ? 2 : 1.5));

const fillColor = computed(() => {
  if (isPark.value) {
    return '#409eff';
  }
  return props.active ? '#6b6b6b' : '#8c8c8c';
});

const strokeColor = computed(() => {
  if (isPark.value) {
    return '#1d6fd6';
  }
  return props.active ? '#4d4d4d' : '#bfbfbf';
});

const glyphColor = computed(() => (props.active ? '#ffffff' : isPark.value ? '#ffffff' : '#5c5c5c'));
</script>

<style scoped>
svg {
  display: block;
}
</style>


