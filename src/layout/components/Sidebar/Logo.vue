<template>
  <div
    class="sidebar-logo-container"
    :class="{ collapse: collapse }"
    :style="{ backgroundColor: sideTheme === 'theme-dark' ? variables.menuBackground : variables.menuLightBackground }"
  >
    <transition :enter-active-class="proxy?.animate.logoAnimate.enter" mode="out-in">
      <router-link v-if="collapse" key="collapse" class="sidebar-logo-link" to="/">
        <img v-if="logo" :src="logo" class="sidebar-logo" />
        <h1 v-else class="sidebar-title" :style="{ color: sideTheme === 'theme-dark' ? variables.logoTitleColor : variables.logoLightTitleColor }">
          {{ title }}
        </h1>
      </router-link>
      <router-link v-else key="expand" class="sidebar-logo-link" to="/">
        <img v-if="logo" :src="logo" class="sidebar-logo" />
        <h1 class="sidebar-title" :style="{ color: sideTheme === 'theme-dark' ? variables.logoTitleColor : variables.logoLightTitleColor }">
          {{ title }}
        </h1>
      </router-link>
    </transition>
  </div>
</template>

<script setup lang="ts">
import variables from '@/assets/styles/variables.module.scss';
import logo from '@/assets/logo/logo.svg';
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

.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: var(--navbar-height);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-3);
    text-decoration: none;
    transition: var(--transition-all);

    &:hover {
      transform: scale(1.02);
    }

    & .sidebar-logo {
      width: 32px;
      height: 32px;
      transition: var(--transition-transform);

      &:hover {
        transform: rotate(360deg);
      }
    }

    & .sidebar-title {
      margin: 0;
      color: #fff;
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-lg);
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family:
        Avenir,
        Helvetica Neue,
        Arial,
        Helvetica,
        sans-serif;
    }
  }

  &.collapse {
    .sidebar-logo {
      margin-right: 0px;
    }
  }
}
</style>
