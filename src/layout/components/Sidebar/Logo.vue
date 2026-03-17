<template>
  <div
    class="sidebar-logo-container"
    :class="{ collapse: collapse }"
    :style="{ backgroundColor: 'transparent' }"
  >
    <transition :enter-active-class="proxy?.animate.logoAnimate.enter" mode="out-in">
      <router-link key="expand" class="sidebar-logo-link" to="/">
        <div class="logo-content">
          <img v-if="logo" :src="logo" class="sidebar-logo" />
          <h1 class="sidebar-title" :style="{ color: sideTheme === 'theme-dark' ? variables.logoTitleColor : variables.logoLightTitleColor }">
            {{ title }}
          </h1>
        </div>
      </router-link>
    </transition>
  </div>
</template>

<script setup lang="ts">
import variables from '@/assets/styles/variables.module.scss';
import logo from '@/assets/logo/logo-rectangle.svg';
import { useSettingsStore } from '@/store/modules/settings';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;

defineProps({
  collapse: {
    type: Boolean,
    required: true
  }
});

const title = import.meta.env.VITE_APP_LOGO_TITLE;
const settingsStore = useSettingsStore();
const sideTheme = computed(() => settingsStore.sideTheme);
</script>

<style lang="scss" scoped>
.sidebarLogoFade-enter-active {
  transition: opacity 1.5s;
}

.sidebarLogoFade-enter,
.sidebarLogoFade-leave-to {
  opacity: 0;
}

/* 顶部导航栏Logo容器样式 */
.sidebar-logo-container {
  position: relative !important;
  width: auto !important;
  height: var(--navbar-height) !important;
  background: transparent !important;
  border: none !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;

  /* Logo链接样式 */
  .sidebar-logo-link {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    padding: 0 8px !important;
    text-decoration: none !important;
    transition: var(--transition-all) !important;
    height: 100% !important;
    width: auto !important;
    box-sizing: border-box !important;

    &:hover {
      transform: scale(1.02) !important;
    }

    /* Logo内容容器 */
    .logo-content {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      white-space: nowrap !important;
    }

    /* Logo图片 */
    .sidebar-logo {
      width: 24px !important;
      height: 24px !important;
      flex-shrink: 0 !important;
      transition: var(--transition-transform) !important;

      &:hover {
        transform: rotate(360deg) !important;
      }
    }

    /* Logo标题 */
    .sidebar-title {
      margin: 0 !important;
      color: var(--text-primary) !important;
      font-weight: var(--font-weight-bold) !important;
      font-size: 14px !important;
      letter-spacing: 0.3px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      line-height: 1 !important;
      font-family:
        Avenir,
        Helvetica Neue,
        Arial,
        Helvetica,
        sans-serif !important;
    }
  }

  /* 折叠状态 */
  &.collapse {
    .sidebar-logo {
      margin-right: 0px !important;
    }
  }
}
</style>
