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
                <div 
                  class="tree-node"
                  @dblclick="handleNodeDoubleClick(data)"
                  @contextmenu.prevent="handleNodeContextMenu($event, data)"
                >
                  <el-icon v-if="data.type === 'layout'" class="node-icon"><Grid /></el-icon>
                  <el-icon v-else-if="data.type === 'folder'" class="node-icon"><Folder /></el-icon>
                  <span
                    v-else-if="data.type === 'element' && data.elementType === 'path'"
                    class="tree-element-icon path-icon"
                  >
                    <svg viewBox="0 0 24 24">
                      <line x1="4" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      <polygon points="18,8 22,12 18,16" fill="currentColor" />
                    </svg>
                  </span>
                  <el-radio
                    v-if="data.type === 'element'"
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
    
    <!-- 属性详情弹窗 -->
    <PointDetailDialog 
      v-model="showDetailDialog" 
      :point="currentPoint"
    />
    
    <!-- 编辑对话框 -->
    <PointEditDialog 
      v-model="showEditDialog" 
      :point="currentPoint"
      @updated="handlePointUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Grid, Folder, Edit } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapPath, MapPoint } from '@/types/mapEditor';
import PointDetailDialog from './PointDetailDialog.vue';
import PointEditDialog from './PointEditDialog.vue';

const mapEditorStore = useMapEditorStore();

const activeTab = ref('components');
const showDetailDialog = ref(false);
const showEditDialog = ref(false);
const currentPoint = ref<MapPoint | null>(null);

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
      label: point.name || point.id,
      type: 'element',
      elementType: 'point',
      elementId: point.id
    }))
  };
  layoutNode.children.push(pointsFolder);

  const getPointDisplayName = (pointId?: string | number) => {
    if (pointId === undefined || pointId === null) return '';
    const normalizedId = String(pointId);
    const target = mapEditorStore.points.find(p => String(p.id) === normalizedId);
    if (target) {
      return target.name || target.id;
    }
    return normalizedId;
  };

  const buildPathLabel = (path: MapPath) => {
    const startName = getPointDisplayName(path.startPointId);
    const endName = getPointDisplayName(path.endPointId);
    if (startName && endName) {
      return path.name || `Path ${startName} --- ${endName}`;
    }
    return path.name || path.id;
  };
  
  const paths = mapEditorStore.paths;
  
  // 查找 Links 图层组
  const linksGroup = mapEditorStore.layerGroups.find(g => g.name === 'Links');
  const linksGroupId = linksGroup?.id;
  
  // 分离 Links 路径和普通路径
  // 判断标准：1. 路径名称以 "Link" 开头，或 2. 路径所属图层在 Links 图层组下
  const linksPaths: typeof paths = [];
  const normalPaths: typeof paths = [];
  
  paths.forEach(path => {
    const isLink = path.name?.startsWith('Link') || path.name?.startsWith('link');
    const layer = mapEditorStore.layers.find(l => l.id === path.layerId);
    const isInLinksGroup = layer && layer.layerGroupId === linksGroupId;
    
    if (isLink || isInLinksGroup) {
      linksPaths.push(path);
    } else {
      normalPaths.push(path);
    }
  });
  
  // Paths 文件夹 - 显示非 Links 的路径
  const pathsFolder = {
    id: 'paths-folder',
    label: 'Paths',
    type: 'folder',
    children: normalPaths.map(path => ({
      id: path.id,
      label: buildPathLabel(path),
      type: 'element',
      elementType: 'path',
      elementId: path.id
    }))
  };
  layoutNode.children.push(pathsFolder);
  
  // Locations 文件夹 - 始终显示
  const locations = mapEditorStore.locations;
  const locationsFolder = {
    id: 'locations-folder',
    label: 'Locations',
    type: 'folder',
    children: locations.map(location => ({
      id: location.id,
      label: location.name || location.id,
      type: 'element',
      elementType: 'location',
      elementId: location.id
    }))
  };
  layoutNode.children.push(locationsFolder);
  
  // Links 文件夹 - 显示属于 Links 图层组的路径
  const linksFolder = {
    id: 'links-folder',
    label: 'Links',
    type: 'folder',
    children: linksPaths.map(path => ({
      id: path.id,
      label: buildPathLabel(path),
      type: 'element',
      elementType: 'path',
      elementId: path.id
    }))
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

// 双击节点事件
const handleNodeDoubleClick = (data: any) => {
  if (data.type === 'element' && data.elementType === 'point') {
    const point = mapEditorStore.points.find(p => p.id === data.elementId);
    if (point) {
      currentPoint.value = point;
      showDetailDialog.value = true;
    }
  }
};

// 右键菜单事件
const handleNodeContextMenu = (event: MouseEvent, data: any) => {
  if (data.type === 'element' && data.elementType === 'point') {
    const point = mapEditorStore.points.find(p => p.id === data.elementId);
    if (point) {
      // 移除已存在的菜单
      const existingMenu = document.querySelector('.point-context-menu');
      if (existingMenu) {
        document.body.removeChild(existingMenu);
      }
      
      // 创建右键菜单
      const menu = document.createElement('div');
      menu.className = 'point-context-menu';
      menu.innerHTML = '<div class="menu-item">编辑</div>';
      menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #fff;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        min-width: 120px;
        padding: 4px 0;
      `;
      
      const menuItem = menu.querySelector('.menu-item') as HTMLElement;
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        color: #606266;
        transition: background-color 0.2s;
      `;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f5f7fa';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      menuItem.addEventListener('click', () => {
        currentPoint.value = point;
        showEditDialog.value = true;
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', closeMenu);
        document.removeEventListener('contextmenu', closeMenu);
      });
      
      document.body.appendChild(menu);
      
      // 点击其他地方或右键关闭菜单
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
          document.removeEventListener('click', closeMenu);
          document.removeEventListener('contextmenu', closeMenu);
        }
      };
      
      // 使用 nextTick 确保菜单已渲染
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('contextmenu', closeMenu);
      }, 0);
    }
  }
};

// 点更新后的回调
const handlePointUpdated = () => {
  // 刷新视图树数据
  // treeData 是 computed，会自动更新
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
    overflow: auto;
    
    :deep(.el-tree-node__content) {
      min-width: max-content;
    }
    
    .tree-node {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      flex-wrap: nowrap;
      flex: 1;
      white-space: nowrap;
      
      .node-icon {
        font-size: 16px;
        color: #606266;
      }
      
      .node-label {
        font-size: 13px;
        text-align: left;
      }
      
      .tree-element-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        color: #409eff;
        flex-shrink: 0;
        
        svg {
          width: 100%;
          height: 100%;
        }
      }
      
      .element-radio {
        width: auto;
        margin: 0;
        flex-shrink: 0;
        
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
