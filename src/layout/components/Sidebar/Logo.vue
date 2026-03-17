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
          <div class="sidebar-title-wrap">
            <span class="sidebar-title-main">{{ titleMain }}</span>
            <span class="sidebar-title-sub">{{ titleSub }}</span>
          </div>
        </div>
      </router-link>
    </transition>
  </div>
</template>

<script setup lang="ts">
import logo from '@/assets/logo/logo-robot.svg';
import { useSettingsStore } from '@/store/modules/settings';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;

defineProps({
  collapse: {
    type: Boolean,
    required: true
  }
});

const titleMain = import.meta.env.VITE_APP_LOGO_TITLE_MAIN ?? 'OPENTCSPLUS';
const titleSub = import.meta.env.VITE_APP_LOGO_TITLE_SUB ?? '调度管理平台';
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
  overflow: visible !important;
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
      gap: 12px !important;
      white-space: nowrap !important;
    }

    /* Logo图片（机器人图标） */
    .sidebar-logo {
      width: 40px !important;
      height: 40px !important;
      flex-shrink: 0 !important;
    }

    /* Logo标题 - 双行样式 */
    .sidebar-title-wrap {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: center !important;
      line-height: 1.3 !important;
      gap: 2px !important;
      min-width: 0 !important;
      flex: 1 1 auto !important;
      overflow: visible !important;
    }
    .sidebar-title-main {
      font-size: 17px !important;
      font-weight: 800 !important;
      letter-spacing: 1.2px !important;
      white-space: nowrap !important;
      color: var(--text-primary) !important;
      font-family:
        Avenir,
        Helvetica Neue,
        Arial,
        Helvetica,
        sans-serif !important;
    }
    .sidebar-title-sub {
      font-size: 12px !important;
      font-weight: 500 !important;
      letter-spacing: 0.5px !important;
      white-space: nowrap !important;
      color: var(--text-secondary) !important;
      opacity: 0.9 !important;
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
