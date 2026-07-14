<template>
  <span
    v-if="showFallback || (src && !loadFailed)"
    class="master-data-logo"
    :class="{ 'has-image': fit === 'contain' && src && !loadFailed }"
    :style="logoStyle"
  >
    <img
      v-if="src && !loadFailed"
      :src="src"
      :alt="`${name || '品牌'} Logo`"
      :style="{ objectFit: fit }"
      @error="loadFailed = true"
    />
    <span v-else-if="showFallback" class="fallback-name">{{ displayName }}</span>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string;
    name?: string;
    seed?: string;
    size?: number;
    width?: number;
    showFallback?: boolean;
    fit?: 'cover' | 'contain';
  }>(),
  { src: '', name: '', seed: '', size: 40, width: undefined, showFallback: true, fit: 'cover' }
);

const colors = ['#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#dc2626', '#db2777', '#7c3aed'];
const loadFailed = ref(false);

watch(
  () => props.src,
  () => {
    loadFailed.value = false;
  }
);

const displayName = computed(() => props.name.trim() || '?');
const background = computed(() => {
  const value = props.seed.trim() || props.name.trim() || '?';
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + (char.codePointAt(0) ?? 0)) | 0;
  return colors[(hash >>> 0) % colors.length];
});
const boxWidth = computed(() => props.width ?? props.size);
const boxHeight = computed(() => props.size);

const logoStyle = computed(() => ({
  width: `${boxWidth.value}px`,
  height: `${boxHeight.value}px`,
  backgroundColor: props.fit === 'contain' && props.src && !loadFailed.value ? undefined : background.value,
  fontSize: `${fallbackFontSize(displayName.value, boxWidth.value, boxHeight.value)}px`
}));

function fallbackFontSize(value: string, width: number, height: number) {
  const length = Array.from(value).length;
  const byHeight = height * 0.38;
  const byWidth = (width - 12) / Math.max(1, length);
  return Math.max(8, Math.floor(Math.min(byHeight, byWidth)));
}
</script>

<style scoped lang="scss">
.master-data-logo {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  color: #fff;
  font-weight: 600;
  line-height: 1;
  vertical-align: middle;
}

.master-data-logo img {
  width: 100%;
  height: 100%;
  display: block;
}

.master-data-logo.has-image {
  background-color: var(--el-fill-color-lighter, #f5f7fa);
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  box-sizing: border-box;
}

.fallback-name {
  width: 100%;
  padding: 0 6px;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  line-height: 1;
}
</style>
