<template>
  <div class="avatar-initial" :class="sizeClass" :style="{ width: sizePx, height: sizePx }">
    {{ initial }}
  </div>
</template>

<script setup lang="ts">
/**
 * 用户头像：昵称首字母，蓝色底白色字
 * 用于顶部导航、个人中心等
 */
const props = withDefaults(
  defineProps<{
    /** 用户昵称，优先取首字 */
    nickname?: string;
    /** 昵称为空时的回退（如 userName） */
    name?: string;
    /** 预设尺寸：sm=导航栏, lg=个人中心 */
    size?: 'sm' | 'lg';
    /** 自定义尺寸（如 '36px'），与 size 二选一 */
    customSize?: string;
  }>(),
  { nickname: '', name: '', size: 'sm' }
);

const sizeClass = computed(() => (props.size ? `avatar-initial--${props.size}` : ''));

const initial = computed(() => {
  const str = (props.nickname || props.name || '').trim();
  if (!str) return '?';
  // 取首字符（支持中文、英文）
  const first = [...str][0];
  return first ? first.toUpperCase() : '?';
});

const sizePx = computed(() => {
  if (props.customSize) return props.customSize;
  return props.size === 'lg' ? '120px' : '36px';
});
</script>

<style lang="scss" scoped>
.avatar-initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #409eff;
  color: #fff;
  font-weight: 600;
  user-select: none;
  flex-shrink: 0;

  &.avatar-initial--sm {
    font-size: 14px;
  }

  &.avatar-initial--lg {
    font-size: 40px;
  }
}
</style>
