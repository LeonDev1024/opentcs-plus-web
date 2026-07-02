<template>
  <div class="map-editor-tabs" :class="{ 'is-maximized': mapEditorTabsStore.isMaximized }">
    <div class="editor-container">
      <div v-if="mapEditorTabsStore.tabCount > 0" class="tabs-header">
        <div class="tabs-list">
          <div
            v-for="tab in mapEditorTabsStore.tabs"
            :key="tab.id"
            class="tab-item"
            :class="{ active: tab.id === mapEditorTabsStore.activeTabId }"
            @click="switchTab(tab.id)"
          >
            <span class="tab-title">{{ tab.name }}</span>
            <el-icon class="tab-close" @click.stop="closeTab(tab.id)"><Close /></el-icon>
          </div>
        </div>
        <div class="tabs-actions">
          <el-button link type="primary" @click="openMapDialog = true">打开地图</el-button>
        </div>
      </div>

      <div class="tabs-content">
        <template v-if="mapEditorTabsStore.activeTab">
          <MapEditor
            :key="mapEditorTabsStore.activeTabId"
            :map-id="mapEditorTabsStore.activeTabId"
            :map-name="mapEditorTabsStore.activeTab?.name"
            @map-updated="handleMapUpdated"
          />
        </template>
        <div v-else class="empty-state">
          <el-empty description="暂无打开的地图">
            <el-button type="primary" @click="openMapDialog = true">打开地图</el-button>
            <el-button @click="handleNewMap">新建地图</el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <OpenMapDialog v-model:visible="openMapDialog" @select="handleOpenMap" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Close } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useMapEditorTabsStore } from '@/store/modules/mapEditorTabs';
import { useAppStore } from '@/store/modules/app';
import type { NavigationMapVO } from '@/api/deploy/factory/map/types';
import MapEditor from './MapEditor.vue';
import OpenMapDialog from './components/OpenMapDialog.vue';

const router = useRouter();
const route = useRoute();
const mapEditorTabsStore = useMapEditorTabsStore();
const appStore = useAppStore();
const openMapDialog = ref(false);

const openMap = (mapId: string, name?: string) => {
  if (!mapId) return;
  mapEditorTabsStore.addTab({ id: String(mapId), name: name || '地图' });
  appStore.closeSideBar({ withoutAnimation: false });
  router.replace({ path: '/map/console', query: { mapId: String(mapId) } });
};

const handleRouteParams = () => {
  const mapId = route.query.mapId as string;
  if (mapId) {
    openMap(mapId, '地图');
    return true;
  }
  return false;
};

const handleMapUpdated = (mapName: string) => {
  if (mapEditorTabsStore.activeTabId) {
    mapEditorTabsStore.updateTab(mapEditorTabsStore.activeTabId, { name: mapName });
  }
};

const handleNewMap = () => {
  ElMessage.info('新建地图请先在场景管理中创建地图记录');
};

const handleOpenMap = (row: NavigationMapVO) => {
  openMap(String(row.mapId), row.name);
};

const switchTab = (tabId: string) => {
  mapEditorTabsStore.setActiveTab(tabId);
  router.replace({ path: '/map/console', query: { mapId: tabId } });
};

const closeTab = (tabId: string) => {
  mapEditorTabsStore.removeTab(tabId);
  if (mapEditorTabsStore.activeTabId) {
    router.replace({ path: '/map/console', query: { mapId: mapEditorTabsStore.activeTabId } });
  } else {
    router.replace({ path: '/map/console' });
    openMapDialog.value = true;
  }
};

onMounted(() => {
  const opened = handleRouteParams();
  if (!opened && mapEditorTabsStore.tabCount === 0) {
    openMapDialog.value = true;
  }
});

watch(
  () => route.query.mapId,
  (mapId) => {
    if (mapId) {
      openMap(String(mapId), '地图');
    }
  },
);
</script>

<style scoped lang="scss">
.map-editor-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  box-sizing: border-box;
  background: #f5f7fa;
  overflow: hidden;

  &.is-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    padding: 0;
    height: 100vh;
  }

  .editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e6e8ee;
    border-radius: 6px;
    overflow: hidden;
    min-height: 0;
  }

  .tabs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid #e6e8ee;
    background: #fafbfc;
  }

  .tabs-list {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    overflow-x: auto;
  }

  .tab-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 220px;
    padding: 6px 10px;
    border: 1px solid #e6e8ee;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;

    &.active {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-close {
    font-size: 14px;
    color: #909399;

    &:hover {
      color: #f56c6c;
    }
  }

  .tabs-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0;

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: #fff;
    }
  }
}
</style>

<style lang="scss">
.app-main:has(.map-editor-tabs),
.app-main:has(.map-console-page) {
  overflow: hidden !important;
}
</style>
