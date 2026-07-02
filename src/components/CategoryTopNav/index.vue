<template>
  <el-menu
    :key="activeCategory"
    :default-active="activeCategory"
    class="category-top-nav"
    mode="horizontal"
    :ellipsis="false"
    @select="handleSelect"
  >
    <el-menu-item v-for="c in TOP_NAV_CATEGORIES" :key="c.id" :index="c.id" :style="{ '--theme': theme }">
      {{ c.title }}
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import { TOP_NAV_CATEGORIES, resolveNavCategory, type TopNavCategoryId } from '@/settings/navCategories';
import { buildSidebarRoutesForCategory } from '@/utils/navCategorySidebar';
import { pickFirstSidebarPath } from '@/utils/navFirstPath';
import { useAppStore } from '@/store/modules/app';
import { usePermissionStore } from '@/store/modules/permission';
import { useSettingsStore } from '@/store/modules/settings';
import { useTagsViewStore } from '@/store/modules/tagsView';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const permissionStore = usePermissionStore();
const settingsStore = useSettingsStore();
const tagsViewStore = useTagsViewStore();

const theme = computed(() => settingsStore.theme);

const activeCategory = computed(() => resolveNavCategory(route.path));

function applySidebarForCategory(cat: TopNavCategoryId) {
  const backendRoots = permissionStore.getDefaultRoutes() as any[];
  const sidebar = buildSidebarRoutesForCategory(cat, backendRoots);
  permissionStore.setSidebarRouters(sidebar);
  appStore.toggleSideBarHide(cat === 'home' || sidebar.length === 0);
}

watch(
  () => [route.path, permissionStore.getDefaultRoutes().length] as const,
  () => {
    if (!settingsStore.topNav) return;
    applySidebarForCategory(resolveNavCategory(route.path));
  },
  { immediate: true }
);

const FALLBACK: Partial<Record<TopNavCategoryId, string>> = {
  deploy: '/vehicle/brand',
  ops: '/task/operation',
  analytics: '/analytics/stats/task',
  system: '/system/management/user'
};

function handleSelect(key: string) {
  const id = key as TopNavCategoryId;
  if (id === 'home') {
    tagsViewStore.delAllViews();
    permissionStore.setSidebarRouters([]);
    appStore.toggleSideBarHide(true);
    router.push('/dashboard');
    return;
  }
  const backendRoots = permissionStore.getDefaultRoutes() as any[];
  const sidebar = buildSidebarRoutesForCategory(id, backendRoots);
  permissionStore.setSidebarRouters(sidebar);
  appStore.toggleSideBarHide(sidebar.length === 0);

  const cur = route.path;
  if (resolveNavCategory(cur) !== id) {
    const next = pickFirstSidebarPath(sidebar) || FALLBACK[id];
    if (next) {
      router.push(next);
    }
  }
}
</script>

<style lang="scss">
.category-top-nav.el-menu--horizontal {
  background: transparent !important;
  border-bottom: none !important;
}

.category-top-nav.el-menu--horizontal > .el-menu-item {
  float: left;
  height: var(--navbar-height) !important;
  line-height: var(--navbar-height) !important;
  color: var(--text-secondary) !important;
  padding: 0 6px !important;
  margin: 0 10px !important;
  border-bottom: 2px solid transparent !important;
}

.category-top-nav.el-menu--horizontal > .el-menu-item.is-active,
.category-top-nav.el-menu--horizontal > .el-sub-menu.is-active .el-sub-menu__title {
  border-bottom-color: #{'var(--theme)'} !important;
  color: var(--text-primary) !important;
  font-weight: 600;
}

.category-top-nav.el-menu--horizontal > .el-sub-menu .el-sub-menu__title {
  float: left;
  height: var(--navbar-height) !important;
  line-height: var(--navbar-height) !important;
  color: var(--text-secondary) !important;
  padding: 0 5px !important;
  margin: 0 10px !important;
}

.category-top-nav.el-menu--horizontal > .el-menu-item:not(.is-disabled):focus,
.category-top-nav.el-menu--horizontal > .el-menu-item:not(.is-disabled):hover,
.category-top-nav.el-menu--horizontal > .el-submenu .el-submenu__title:hover {
  background-color: var(--bg-secondary) !important;
  color: var(--primary-600) !important;
}
</style>
