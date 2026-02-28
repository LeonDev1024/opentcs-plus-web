<template>
  <div
    class="sidebar-logo-container"
    :class="{ collapse: collapse }"
    :style="{ backgroundColor: sideTheme === 'theme-dark' ? variables.menuBackground : variables.menuLightBackground }"
  >
    <transition :enter-active-class="proxy?.animate.logoAnimate.enter" mode="out-in">
      <router-link v-if="collapse" key="collapse" class="sidebar-logo-link" to="/">
        <img v-if="logo" :src="logo" class="sidebar-logo" />
      </router-link>
      <router-link v-else key="expand" class="sidebar-logo-link" to="/">
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

/* 侧边栏Logo容器样式 */
.sidebar-logo-container {
  position: relative !important;
  width: 100% !important;
  height: var(--navbar-height) !important;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
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
    padding: 0 12px !important;
    text-decoration: none !important;
    transition: var(--transition-all) !important;
    height: 100% !important;
    width: 100% !important;
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
      width: 28px !important;
      height: 28px !important;
      flex-shrink: 0 !important;
      transition: var(--transition-transform) !important;

      &:hover {
        transform: rotate(360deg) !important;
      }
    }

    /* Logo标题 */
    .sidebar-title {
      margin: 0 !important;
      color: #fff !important;
      font-weight: var(--font-weight-bold) !important;
      font-size: 16px !important;
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
