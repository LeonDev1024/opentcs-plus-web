<template>
  <div :class="classObj" class="app-wrapper" :style="{ '--current-color': theme }">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside" />

    <!-- 侧边栏（全高，Logo 在顶部） -->
    <side-bar v-if="!sidebar.hide" class="sidebar-container" />

    <!-- 右侧内容区：顶部导航 + 标签 + 主内容 -->
    <div :class="{ hasTagsView: needTagsView, sidebarHide: sidebar.hide }" class="main-container">
      <navbar ref="navbarRef" class="layout-header" @set-layout="setLayout" />
      <tags-view v-if="needTagsView" class="layout-tags" />
      <app-main />
      <settings ref="settingRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SideBar from './components/Sidebar/index.vue';
import { AppMain, Navbar, Settings, TagsView } from './components';
import { useAppStore } from '@/store/modules/app';
import { useSettingsStore } from '@/store/modules/settings';
import { initWebSocket } from '@/utils/websocket';
import { initSSE } from '@/utils/sse';

const settingsStore = useSettingsStore();
const theme = computed(() => settingsStore.theme);
const sidebar = computed(() => useAppStore().sidebar);
const device = computed(() => useAppStore().device);
const route = useRoute();
const isHomePage = computed(() => route.path === '/dashboard' || route.path === '/');
const needTagsView = computed(() => settingsStore.tagsView && !isHomePage.value);

const classObj = computed(() => ({
  hideSidebar: !sidebar.value.opened && !sidebar.value.hide,
  openSidebar: sidebar.value.opened && !sidebar.value.hide,
  withoutAnimation: sidebar.value.withoutAnimation,
  mobile: device.value === 'mobile'
}));

const { width } = useWindowSize();
const WIDTH = 992; // refer to Bootstrap's responsive design

watchEffect(() => {
  if (device.value === 'mobile') {
    useAppStore().closeSideBar({ withoutAnimation: false });
  }
  if (width.value - 1 < WIDTH) {
    useAppStore().toggleDevice('mobile');
    useAppStore().closeSideBar({ withoutAnimation: true });
  } else {
    useAppStore().toggleDevice('desktop');
  }
});

const navbarRef = ref<InstanceType<typeof Navbar>>();
const settingRef = ref<InstanceType<typeof Settings>>();

onMounted(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  initWebSocket(protocol + window.location.host + import.meta.env.VITE_APP_BASE_API + '/resource/websocket');
});

onMounted(() => {
  initSSE(import.meta.env.VITE_APP_BASE_API + '/resource/sse');
});

const handleClickOutside = () => {
  useAppStore().closeSideBar({ withoutAnimation: false });
};

const setLayout = () => {
  settingRef.value?.openSetting();
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mixin.scss';

// 布局根容器：横向排列（侧边栏 + 内容区）
.app-wrapper {
  @include mixin.clearfix;
  position: relative;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100vh;
  overflow: hidden;

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
  }
}

.drawer-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: #000;
  opacity: 0.3;
}

// 右侧内容区：纵向排列（顶部导航 + 标签 + 主内容）
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-secondary);
}

// 顶部导航：内容区顶部，仅占内容区宽度
.layout-header {
  flex-shrink: 0;
  z-index: 2;
}

// 标签栏：紧贴导航下方
.layout-tags {
  flex-shrink: 0;
}
</style>
