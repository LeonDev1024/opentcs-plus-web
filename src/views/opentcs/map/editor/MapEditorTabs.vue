<template>
  <div class="map-editor-tabs" :class="{ 'is-maximized': mapEditorTabsStore.isMaximized }">
    <div class="editor-container">
      <!-- 标签内容区 -->
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
            <el-button type="primary" @click="handleNewMap">新建地图</el-button>
            <el-button @click="goToMapList">从地图列表打开</el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useMapEditorTabsStore } from '@/store/modules/mapEditorTabs';
import MapEditor from './MapEditor.vue';

const router = useRouter();
const route = useRoute();
const mapEditorTabsStore = useMapEditorTabsStore();

// 处理路由参数，打开对应地图
const handleRouteParams = () => {
  const mapId = route.query.id as string;
  if (mapId) {
    mapEditorTabsStore.addTab({
      id: mapId,
      name: route.query.name as string || '地图'
    });
  }
};

// 地图更新回调
const handleMapUpdated = (mapName: string) => {
  if (mapEditorTabsStore.activeTabId) {
    mapEditorTabsStore.updateTab(mapEditorTabsStore.activeTabId, { name: mapName });
  }
};

// 新建地图
const handleNewMap = () => {
  ElMessage.info('新建地图功能开发中...');
};

// 跳转到地图列表
const goToMapList = () => {
  router.push('/opentcs/map');
};

onMounted(() => {
  handleRouteParams();
});

// 监听路由变化
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.id) {
      mapEditorTabsStore.addTab({
        id: newQuery.id as string,
        name: (newQuery.name as string) || '地图'
      });
    }
  }
);
</script>

<style scoped lang="scss">
.map-editor-tabs {
  /* 占满 AppMain 可用高度，由父级控制整体滚动 */
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
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
    border-radius: 10px;
    overflow: hidden;
  }

  .tabs-content {
    flex: 1;
    overflow: hidden;
    position: relative;

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
/* 覆盖父级 AppMain 的 overflow，防止地图编辑器页面出现双滚动条 */
.app-main:has(.map-editor-tabs) {
  overflow: hidden !important;
}
</style>
