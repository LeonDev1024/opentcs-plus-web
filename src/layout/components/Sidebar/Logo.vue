<template>
  <div class="sidebar-logo-container" :class="{ collapse: collapse }">
    <transition :enter-active-class="proxy?.animate.logoAnimate.enter" mode="out-in">
      <router-link key="logo" class="sidebar-logo-link" to="/">
        <span class="logo-content">
          <span class="logo-mark" :class="{ 'logo-mark--mini': collapse }">
            <img v-if="logo" :src="logo" class="sidebar-logo" alt="logo" />
          </span>
          <span v-if="!collapse" class="sidebar-title" :title="titleMain">{{ titleMain }}</span>
        </span>
      </router-link>
    </transition>
  </div>
</template>

<script setup lang="ts">
import logo from '@/assets/logo/logo-robot.svg';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;

defineProps({
  collapse: {
    type: Boolean,
    required: true
  }
});

const titleMain = 'OPENTCS调度平台';
</script>

<style lang="scss" scoped>
/* Logo 位于侧边栏顶部，与顶部导航等高，形成对齐 */
.sidebar-logo-container {
  height: var(--navbar-height);
  flex-shrink: 0;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--menuBg);
  border-bottom: none;

  .sidebar-logo-link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    height: 100%;
    padding: 0 10px;
    text-decoration: none;
    box-sizing: border-box;
    overflow: hidden;

    .logo-content {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 7px;
      width: 100%;
      height: 100%;
      min-width: 0;
      white-space: nowrap;
      flex-wrap: nowrap;
    }

    .logo-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 8px;
      background: rgba(56, 189, 248, 0.14);
      border: 1px solid rgba(125, 211, 252, 0.24);
      box-sizing: border-box;
    }

    .logo-mark--mini {
      width: 32px;
      height: 32px;
    }

    .sidebar-logo {
      width: 23px;
      height: 23px;
      object-fit: contain;
    }

    .sidebar-title {
      display: block;
      min-width: 0;
      flex: 1;
      overflow: hidden;
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: 0;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #ffffff;
    }
  }

  /* 折叠状态：仅显示图标并居中 */
  &.collapse {
    .sidebar-logo-link {
      justify-content: center;
      padding: 0;
    }

    .logo-content {
      justify-content: center;
    }
  }
}
</style>
