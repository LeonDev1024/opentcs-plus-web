<template>
  <div class="components-panel">
    <el-tabs v-model="activeTab" class="components-tabs">
      <el-tab-pane label="模型元素" name="components">
        <div class="components-content">
          <div class="components-tree">
            <el-tree
              :data="treeData"
              :props="treeProps"
              node-key="id"
              :default-expand-all="true"
              :highlight-current="true"
              @node-click="handleNodeClick"
            >
              <template #default="{ node, data }">
                <div class="tree-node">
                  <el-icon v-if="data.type === 'layout'" class="node-icon"><Grid /></el-icon>
                  <el-icon v-else-if="data.type === 'folder'" class="node-icon"><Folder /></el-icon>
                  <el-radio
                    v-else-if="data.type === 'element'"
                    :model-value="isSelected(data.elementId, data.elementType)"
                    @click.stop
                    @change="handleElementSelect(data.elementId, data.elementType)"
                    class="element-radio"
                  />
                  <span class="node-label">{{ node.label }}</span>
                </div>
              </template>
            </el-tree>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="区域规则" name="blocks">
        <div class="blocks-content">
          <el-empty description="区域规则功能待实现" :image-size="100" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Grid, Folder } from '@element-plus/icons-vue';
import { useMapEditorStore } from '@/store/modules/mapEditor';

const mapEditorStore = useMapEditorStore();

const activeTab = ref('components');

const treeProps = {
  children: 'children',
  label: 'label'
};

const treeData = computed(() => {
  const data: any[] = [];
  
  // Layout 节点名称 - 使用 visualLayout.name，如果没有则使用默认值
  const layoutName = mapEditorStore.mapData?.visualLayout?.name || 
                     mapEditorStore.mapData?.mapInfo?.name || 
                     'Layout VLayout-01';
  
  // Layout 节点
  const layoutNode = {
    id: 'layout',
    label: layoutName,
    type: 'layout',
    children: []
  };
  
  // Points 文件夹 - 始终显示
  const points = mapEditorStore.points;
  const pointsFolder = {
    id: 'points-folder',
    label: 'Points',
    type: 'folder',
    children: points.map(point => ({
      id: point.id,
      label: `Point ${point.name || point.id}`,
      type: 'element',
      elementType: 'point',
      elementId: point.id
    }))
  };
  layoutNode.children.push(pointsFolder);
  
  // Locations 文件夹 - 始终显示
  const locations = mapEditorStore.locations;
  const locationsFolder = {
    id: 'locations-folder',
    label: 'Locations',
    type: 'folder',
    children: locations.map(location => ({
      id: location.id,
      label: `Location ${location.name || location.id}`,
      type: 'element',
      elementType: 'location',
      elementId: location.id
    }))
  };
  layoutNode.children.push(locationsFolder);
  
  // Location types 文件夹 - 始终显示（空文件夹）
  const locationTypesFolder = {
    id: 'location-types-folder',
    label: 'Location types',
    type: 'folder',
    children: []
  };
  layoutNode.children.push(locationTypesFolder);
  
  // Links 文件夹 - 始终显示（空文件夹）
  const linksFolder = {
    id: 'links-folder',
    label: 'Links',
    type: 'folder',
    children: []
  };
  layoutNode.children.push(linksFolder);
  
  data.push(layoutNode);
  
  return data;
});

const isSelected = (id: string, elementType: string) => {
  return mapEditorStore.selection.selectedIds.has(id) && 
         mapEditorStore.selection.selectedType === elementType;
};

const handleNodeClick = (data: any) => {
  if (data.type === 'element') {
    handleElementSelect(data.elementId, data.elementType);
  }
};

const handleElementSelect = (id: string, elementType: 'point' | 'path' | 'location') => {
  mapEditorStore.selectElement(id, elementType, false);
};
</script>

<style scoped lang="scss">
.components-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .components-tabs {
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
  
  .components-content {
    flex: 1;
    overflow: hidden;
    padding: 8px;
  }
  
  .components-tree {
    height: 100%;
    overflow-y: auto;
    
    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      
      .node-icon {
        font-size: 16px;
        color: #606266;
      }
      
      .node-label {
        font-size: 13px;
      }
      
      .element-radio {
        width: 100%;
        margin: 0;
        
        :deep(.el-radio__label) {
          padding-left: 4px;
        }
      }
    }
  }
  
  .blocks-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
