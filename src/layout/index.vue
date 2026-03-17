<template>
  <div :class="classObj" class="app-wrapper" :style="{ '--current-color': theme }">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside" />

    <!-- 侧边栏 -->
    <side-bar v-if="!sidebar.hide" class="sidebar-container" />

    <!-- 右侧内容区 -->
    <div :class="{ hasTagsView: needTagsView, sidebarHide: sidebar.hide }" class="main-container">
      <!-- 顶部导航（固定，全宽） -->
      <div class="fixed-header">
        <navbar ref="navbarRef" @set-layout="setLayout" />
      </div>

      <!-- 标签栏 + 主内容（与内容区同宽，自适应侧边栏） -->
      <tags-view v-if="needTagsView" class="tags-view-adaptive" />
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
const needTagsView = computed(() => settingsStore.tagsView);
const fixedHeader = computed(() => settingsStore.fixedHeader);

const classObj = computed(() => ({
  hideSidebar: !sidebar.value.opened,
  openSidebar: sidebar.value.opened,
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
  nextTick(() => {
    navbarRef.value?.initTenantList();
  });
});

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

.app-wrapper {
  @include mixin.clearfix;
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;

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

// 主内容区（顶部导航下方：侧边栏 + 内容）
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  overflow: hidden;
  padding-top: var(--navbar-height);
  background: var(--bg-secondary);
}

// 标签栏：与内容同宽，紧贴内容上方
.tags-view-adaptive {
  flex-shrink: 0;
}

// 固定头部区域（全宽，贯穿视口）
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
</style>
