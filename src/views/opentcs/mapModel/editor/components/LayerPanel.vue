<template>
  <div class="layer-panel">
    <el-tabs v-model="activeTab" class="layer-tabs">
      <el-tab-pane label="图层" name="layers">
        <div class="layer-content">
          <div class="layer-toolbar">
            <el-button-group size="small">
              <el-button icon="Plus" @click="handleAddLayer" title="添加图层" />
              <el-button icon="Minus" @click="handleDeleteSelectedLayer" :disabled="!selectedLayerId" title="删除图层" />
              <el-button icon="ArrowUp" @click="handleMoveLayerUp" :disabled="!selectedLayerId" title="上移" />
              <el-button icon="ArrowDown" @click="handleMoveLayerDown" :disabled="!selectedLayerId" title="下移" />
            </el-button-group>
          </div>
          
          <div class="layer-table-wrapper">
            <el-table
              :data="sortedLayers"
              border
              size="small"
              style="width: 100%"
              @row-click="handleRowClick"
              highlight-current-row
            >
              <el-table-column width="60" align="center" label="激活">
                <template #default="{ row }">
                  <el-radio
                    :model-value="mapEditorStore.activeLayerId === row.id"
                    @click.stop
                    @change="setActiveLayer(row.id)"
                  />
                </template>
              </el-table-column>
              
              <el-table-column width="60" align="center" label="可见">
                <template #default="{ row }">
                  <el-checkbox
                    v-model="row.visible"
                    @click.stop
                    @change="handleVisibilityChange(row)"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="name" label="名称" min-width="120" />
              
              <el-table-column prop="layerGroupId" label="图层组" width="120">
                <template #default="{ row }">
                  <el-tag size="small" v-if="getLayerGroupName(row.layerGroupId)">
                    {{ getLayerGroupName(row.layerGroupId) }}
                  </el-tag>
                  <span v-else style="color: #909399; font-size: 12px;">未分组</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="图层组" name="layersgroup">
        <div class="layers-group-content">
          <div class="layer-group-toolbar">
            <el-button-group size="small">
              <el-button icon="Plus" @click="handleAddLayerGroup" title="添加图层组" />
              <el-button icon="Minus" @click="handleDeleteSelectedLayerGroup" :disabled="!selectedLayerGroupId" title="删除图层组" />
            </el-button-group>
          </div>
          
          <div class="layer-group-table-wrapper">
            <el-table
              :data="layerGroups"
              border
              size="small"
              style="width: 100%"
              @row-click="handleLayerGroupRowClick"
              highlight-current-row
            >
              <el-table-column width="60" align="center" label="可见">
                <template #default="{ row }">
                  <el-checkbox
                    v-model="row.visible"
                    @click.stop
                    @change="handleLayerGroupVisibilityChange(row)"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="name" label="名称" min-width="150" />
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapLayer, LayerType, LayerGroup } from '@/types/mapEditor';

const mapEditorStore = useMapEditorStore();

const activeTab = ref('layers');
const selectedLayerId = ref<string | null>(null);
const selectedLayerGroupId = ref<string | null>(null);

const sortedLayers = computed(() => {
  return [...mapEditorStore.layers].sort((a, b) => b.zIndex - a.zIndex);
});

const layerGroups = computed(() => {
  return mapEditorStore.layerGroups;
});

const getTypeLabel = (type: LayerType) => {
  const labels: Record<LayerType, string> = {
    point: 'Point',
    path: 'Path',
    location: 'Location',
    background: 'Background',
    region: 'Region'
  };
  return labels[type] || type;
};

const getLayerGroupName = (layerGroupId?: string) => {
  if (!layerGroupId) return null;
  const group = mapEditorStore.layerGroups.find(g => g.id === layerGroupId);
  return group?.name || null;
};

const selectLayer = (layerId: string) => {
  selectedLayerId.value = layerId;
};

const setActiveLayer = (layerId: string) => {
  mapEditorStore.setActiveLayer(layerId);
  selectedLayerId.value = layerId;
};

const handleRowClick = (row: MapLayer) => {
  selectLayer(row.id);
};

const handleVisibilityChange = (layer: MapLayer) => {
  mapEditorStore.updateLayer(layer.id, { visible: layer.visible });
};

const handleAddLayer = () => {
  ElMessageBox.prompt('请输入图层名称', '添加图层', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '图层名称不能为空'
  }).then(({ value }) => {
    const newLayer = mapEditorStore.addLayer({
      name: value,
      type: 'point',
      visible: true,
      locked: false,
      zIndex: mapEditorStore.layers.length + 1,
      opacity: 1,
      elementIds: [],
      active: true
    });
    // 激活新创建的图层
    setActiveLayer(newLayer.id);
    selectLayer(newLayer.id);
    ElMessage.success('添加成功');
  }).catch(() => {
    // 用户取消
  });
};

const handleDeleteSelectedLayer = async () => {
  if (!selectedLayerId.value) return;
  
  try {
    await ElMessageBox.confirm('确定要删除该图层吗？图层中的所有元素也将被删除。', '提示', {
      type: 'warning'
    });
    
    mapEditorStore.deleteLayer(selectedLayerId.value);
    ElMessage.success('删除成功');
    selectedLayerId.value = null;
  } catch (error) {
    // 用户取消
  }
};

const handleMoveLayerUp = () => {
  if (!selectedLayerId.value) return;
  
  const layer = mapEditorStore.layers.find(l => l.id === selectedLayerId.value);
  if (!layer) return;
  
  const currentIndex = sortedLayers.value.findIndex(l => l.id === layer.id);
  if (currentIndex > 0) {
    const prevLayer = sortedLayers.value[currentIndex - 1];
    const tempZIndex = layer.zIndex;
    mapEditorStore.updateLayer(layer.id, { zIndex: prevLayer.zIndex });
    mapEditorStore.updateLayer(prevLayer.id, { zIndex: tempZIndex });
  }
};

const handleMoveLayerDown = () => {
  if (!selectedLayerId.value) return;
  
  const layer = mapEditorStore.layers.find(l => l.id === selectedLayerId.value);
  if (!layer) return;
  
  const currentIndex = sortedLayers.value.findIndex(l => l.id === layer.id);
  if (currentIndex < sortedLayers.value.length - 1) {
    const nextLayer = sortedLayers.value[currentIndex + 1];
    const tempZIndex = layer.zIndex;
    mapEditorStore.updateLayer(layer.id, { zIndex: nextLayer.zIndex });
    mapEditorStore.updateLayer(nextLayer.id, { zIndex: tempZIndex });
  }
};

// 图层组相关方法
const handleLayerGroupRowClick = (row: LayerGroup) => {
  selectedLayerGroupId.value = row.id;
};

const handleLayerGroupVisibilityChange = (group: LayerGroup) => {
  mapEditorStore.updateLayerGroup(group.id, { visible: group.visible });
};

const handleAddLayerGroup = () => {
  ElMessageBox.prompt('请输入图层组名称', '添加图层组', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '图层组名称不能为空'
  }).then(({ value }) => {
    const newGroup = mapEditorStore.addLayerGroup({
      name: value,
      visible: true
    });
    selectedLayerGroupId.value = newGroup.id;
    ElMessage.success('添加成功');
  }).catch(() => {
    // 用户取消
  });
};

const handleDeleteSelectedLayerGroup = async () => {
  if (!selectedLayerGroupId.value) return;
  
  try {
    await ElMessageBox.confirm('确定要删除该图层组吗？', '提示', {
      type: 'warning'
    });
    
    mapEditorStore.deleteLayerGroup(selectedLayerGroupId.value);
    ElMessage.success('删除成功');
    selectedLayerGroupId.value = null;
  } catch (error: any) {
    if (error && error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};
</script>

<style scoped lang="scss">
.layer-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .layer-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    :deep(.el-tabs__header) {
      margin: 0;
      padding: 0 8px;
      border-bottom: 1px solid #e4e7ed;
      background: #fff;
    }
    
    :deep(.el-tabs__nav-wrap) {
      &::after {
        display: none;
      }
    }
    
    :deep(.el-tabs__item) {
      padding: 8px 12px;
      font-size: 12px;
      height: 32px;
      line-height: 16px;
      
      &.is-active {
        color: #409eff;
        font-weight: 500;
      }
    }
    
    :deep(.el-tabs__active-bar) {
      background-color: #409eff;
    }
    
    :deep(.el-tabs__content) {
      flex: 1;
      overflow: hidden;
    }
    
    :deep(.el-tab-pane) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  }
  
  .layer-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .layer-toolbar {
    padding: 6px 8px;
    border-bottom: 1px solid #e4e7ed;
    background: #fafafa;
    
    :deep(.el-button-group) {
      .el-button {
        padding: 4px 8px;
        font-size: 12px;
      }
    }
  }
  
  .layer-table-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    
    :deep(.el-table) {
      font-size: 12px;
      
      .el-table__header {
        th {
          background: #f5f7fa;
          color: #606266;
          font-weight: 500;
          padding: 8px 0;
        }
      }
      
      .el-table__body {
        tr {
          cursor: pointer;
          
          &:hover {
            background: #f5f7fa;
          }
          
          &.current-row {
            background: #ecf5ff;
          }
        }
        
        td {
          padding: 6px 0;
        }
      }
    }
  }
  
  .layers-group-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .layer-group-toolbar {
    padding: 6px 8px;
    border-bottom: 1px solid #e4e7ed;
    background: #fafafa;
    
    :deep(.el-button-group) {
      .el-button {
        padding: 4px 8px;
        font-size: 12px;
      }
    }
  }
  
  .layer-group-table-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    
    :deep(.el-table) {
      font-size: 12px;
      
      .el-table__header {
        th {
          background: #f5f7fa;
          color: #606266;
          font-weight: 500;
          padding: 8px 0;
        }
      }
      
      .el-table__body {
        tr {
          cursor: pointer;
          
          &:hover {
            background: #f5f7fa;
          }
          
          &.current-row {
            background: #ecf5ff;
          }
        }
        
        td {
          padding: 6px 0;
        }
      }
    }
  }
}
</style>
