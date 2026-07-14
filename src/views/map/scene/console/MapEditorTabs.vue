<template>
  <div class="map-editor-tabs" :class="{ 'is-maximized': mapEditorTabsStore.isMaximized }">
    <div class="editor-container">
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
          <el-empty description="请从地图控制台选择地图进入编辑">
            <el-button @click="handleNewMap">新建地图</el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useMapEditorTabsStore } from '@/store/modules/mapEditorTabs';
import MapEditor from './MapEditor.vue';

const router = useRouter();
const route = useRoute();
const mapEditorTabsStore = useMapEditorTabsStore();

const openMap = (mapId: string, name?: string) => {
  if (!mapId) return;
  mapEditorTabsStore.addTab({ id: String(mapId), name: name || '地图' });
  router.replace({ path: '/map-editor', query: { mapId: String(mapId) } });
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

onMounted(() => {
  handleRouteParams();
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
