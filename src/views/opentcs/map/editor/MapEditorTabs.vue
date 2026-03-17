<template>
  <div class="map-editor-tabs" :class="{ 'is-maximized': mapEditorTabsStore.isMaximized }">
    <!-- 标签栏 -->
    <div class="tabs-header">
      <div class="tabs-list">
        <div
          v-for="tab in mapEditorTabsStore.tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ 'is-active': tab.id === mapEditorTabsStore.activeTabId }"
          @click="handleTabClick(tab.id)"
        >
          <span class="tab-name">{{ tab.name || '未命名' }}</span>
          <el-icon class="tab-close" @click.stop="handleTabClose(tab.id)">
            <Close />
          </el-icon>
        </div>
      </div>
      <div class="tabs-actions">
        <el-button size="small" type="primary" text @click="handleNewMap">
          <el-icon><Plus /></el-icon>
          新建地图
        </el-button>
      </div>
    </div>

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
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Close, Plus } from '@element-plus/icons-vue';
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

// 标签点击
const handleTabClick = (tabId: string) => {
  mapEditorTabsStore.setActiveTab(tabId);
};

// 标签关闭
const handleTabClose = async (tabId: string) => {
  try {
    await ElMessageBox.confirm('确定要关闭此地图编辑器吗？', '确认关闭', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    mapEditorTabsStore.removeTab(tabId);
  } catch {
    // 用户取消
  }
};

// 新建地图
const handleNewMap = () => {
  // TODO: 打开新建地图对话框
  ElMessage.info('新建地图功能开发中...');
};

// 地图更新回调
const handleMapUpdated = (mapName: string) => {
  if (mapEditorTabsStore.activeTabId) {
    mapEditorTabsStore.updateTab(mapEditorTabsStore.activeTabId, { name: mapName });
  }
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

  &.is-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
  }

  .tabs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    padding: 0 12px;
    flex-shrink: 0;

    .tabs-list {
      display: flex;
      align-items: center;
      overflow-x: auto;
      flex: 1;
      gap: 2px;

      &::-webkit-scrollbar {
        display: none;
      }

      .tab-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #f5f7fa;
        border-radius: 4px 4px 0 0;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
        font-size: 13px;
        color: #606266;

        &:hover {
          background: #ecf5ff;
          color: #409eff;

          .tab-close {
            opacity: 1;
          }
        }

        &.is-active {
          background: #409eff;
          color: #fff;

          .tab-close {
            opacity: 1;
          }
        }

        .tab-name {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tab-close {
          opacity: 0;
          font-size: 12px;
          transition: opacity 0.2s;
          margin-left: 4px;

          &:hover {
            color: #f56c6c;
          }
        }
      }
    }

    .tabs-actions {
      flex-shrink: 0;
      margin-left: 12px;
    }
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
