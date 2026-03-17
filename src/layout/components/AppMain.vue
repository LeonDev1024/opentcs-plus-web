<template>
  <section class="app-main">
    <router-view v-slot="{ Component, route }">
      <transition :enter-active-class="animate" mode="out-in">
        <keep-alive :include="tagsViewStore.cachedViews">
          <component :is="Component" v-if="!route.meta.link" :key="route.path" />
        </keep-alive>
      </transition>
    </router-view>
    <iframe-toggle />
  </section>
</template>

<script setup name="AppMain" lang="ts">
import { useSettingsStore } from '@/store/modules/settings';
import { useTagsViewStore } from '@/store/modules/tagsView';

import IframeToggle from './IframeToggle/index.vue';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const route = useRoute();
const tagsViewStore = useTagsViewStore();
const settingsStore = useSettingsStore();

// 随机动画集合
const animate = ref<string>('');
const animationEnable = ref(settingsStore.animationEnable);

watch(
  () => useSettingsStore().animationEnable,
  (val: boolean) => {
    animationEnable.value = val;
    if (val) {
      animate.value = proxy?.animate.animateList[Math.round(Math.random() * proxy?.animate.animateList.length)] as string;
    } else {
      animate.value = proxy?.animate.defaultAnimate as string;
    }
  },
  { immediate: true }
);

onMounted(() => {
  addIframe();
});

watchEffect(() => {
  addIframe();
});

function addIframe() {
  if (route.meta.link) {
    useTagsViewStore().addIframeView(route);
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  overflow: auto;
  transition: margin-left 0.3s ease-in-out;
  background: var(--bg-secondary);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background-color: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background-color: #c0c0c0;
  border-radius: 3px;
}
</style>
