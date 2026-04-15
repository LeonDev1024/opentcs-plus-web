<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <path
      :d="pathData"
      :stroke="strokeColor"
      :stroke-width="active ? 2.2 : 1.8"
      fill="none"
      stroke-linecap="round"
      :stroke-linejoin="type === 'orthogonal' ? 'miter' : 'round'"
    />
    <circle
      v-for="(point, index) in endPoints"
      :key="index"
      :cx="point.x"
      :cy="point.y"
      :r="active ? 2.5 : 2"
      :fill="strokeColor"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    type: 'direct' | 'orthogonal' | 'curve';
    active?: boolean;
    size?: number;
  }>(),
  {
    active: false,
    size: 18
  }
);

const strokeColor = computed(() => (props.active ? '#409eff' : '#4c4c4c'));

const pathData = computed(() => {
  switch (props.type) {
    case 'orthogonal':
      return 'M4 19 L4 10 L18 10';
    case 'curve':
      return 'M4 19 Q12 4 18 7';
    case 'direct':
    default:
      return 'M4 19 L18 5';
  }
});

const endPoints = computed(() => {
  switch (props.type) {
    case 'orthogonal':
      return [
        { x: 4, y: 19 },
        { x: 18, y: 10 }
      ];
    case 'curve':
      return [
        { x: 4, y: 19 },
        { x: 18, y: 7 }
      ];
    case 'direct':
    default:
      return [
        { x: 4, y: 19 },
        { x: 18, y: 5 }
      ];
  }
});
</script>

<style scoped>
svg {
  display: block;
}
</style>

