<template>
  <div class="components-panel">
    <el-tabs v-model="activeTab" class="components-tabs">
      <el-tab-pane label="模型元素" name="components">
        <div class="components-content">
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索元素..."
              size="small"
              clearable
              :prefix-icon="Search"
            />
          </div>
          <div class="elements-list">
            <template v-for="group in flatElementGroups" :key="group.label">
              <div
                class="element-group-header"
                @click="toggleGroup(group.label)"
              >
                <span class="group-arrow" :class="{ collapsed: collapsedGroups.has(group.label) }">▶</span>
                <span class="group-label-text">{{ group.label }}</span>
                <span class="group-count">{{ group.items.length }}</span>
              </div>
              <template v-if="!collapsedGroups.has(group.label)">
                <div
                  v-for="(item, idx) in group.items"
                  :key="item.elementId"
                  class="element-row"
                  :class="{ 'is-selected': isSelected(item.elementId, item.elementType) }"
                  @click="handleElementSelect(item.elementId, item.elementType)"
                  @dblclick="handleElementDblClick(item)"
                  @contextmenu.prevent="handleElementContextMenu($event, item)"
                >
                  <span class="element-index">{{ idx + 1 }}</span>
                  <span class="element-name">{{ item.label }}</span>
                </div>
                <div v-if="group.items.length === 0" class="element-empty">无</div>
              </template>
            </template>
          </div>
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
import { Search } from '@element-plus/icons-vue';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapPath, MapPoint } from '@/types/mapEditor';
import PointDetailDialog from './PointDetailDialog.vue';
import PointEditDialog from './PointEditDialog.vue';

const mapEditorStore = useMapEditorStore();

const activeTab = ref('components');
const searchKeyword = ref('');
const collapsedGroups = ref<Set<string>>(new Set());

const toggleGroup = (label: string) => {
  const next = new Set(collapsedGroups.value)
  if (next.has(label)) next.delete(label)
  else next.add(label)
  collapsedGroups.value = next
};
const showDetailDialog = ref(false);
const showEditDialog = ref(false);
const currentPoint = ref<MapPoint | null>(null);

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
      return path.name || `${startName} --- ${endName}`;
    }
    return path.name || path.id;
  };
  
  const paths = mapEditorStore.paths;
  
  // Paths 文件夹 - 所有路径统一归入 Path
  const pathsFolder = {
    id: 'paths-folder',
    label: 'Paths',
    type: 'folder',
    children: paths.map(path => ({
      id: path.id,
      label: buildPathLabel(path),
      type: 'element',
      elementType: 'path',
      elementId: path.id
    }))
  };
  layoutNode.children.push(pathsFolder);
  
  data.push(layoutNode);
  
  return data;
});

const filteredTreeData = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return treeData.value
  return treeData.value.map(rootNode => ({
    ...rootNode,
    children: (rootNode.children || []).map((folder: any) => ({
      ...folder,
      children: (folder.children || []).filter((item: any) =>
        item.label?.toLowerCase().includes(kw)
      ),
    })).filter((folder: any) => folder.children.length > 0),
  }))
})

// 平铺分组列表（Points / Paths）
const FOLDER_LABELS: Record<string, string> = {
  'points-folder': 'Points',
  'paths-folder': 'Paths',
}

const flatElementGroups = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const rootNode = treeData.value[0]
  if (!rootNode) return []
  return (rootNode.children || []).map((folder: any) => {
    const items = (folder.children || []).filter((item: any) =>
      !kw || item.label?.toLowerCase().includes(kw)
    )
    return { label: FOLDER_LABELS[folder.id] || folder.label, items }
  })
})

const isSelected = (id: string, elementType: string) => {
  return mapEditorStore.selection.selectedIds.has(id) &&
         mapEditorStore.selection.selectedType === elementType;
};

const isLayoutSelected = computed(() => mapEditorStore.selection.selectedType === 'layout');

const handleNodeClick = (data: any) => {
  if (data.type === 'layout') {
    mapEditorStore.selectLayout();
    return;
  }
  if (data.type === 'element') {
    handleElementSelect(data.elementId, data.elementType);
  }
};

const handleElementSelect = (id: string, elementType: 'point' | 'path') => {
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

// 平铺列表双击
const handleElementDblClick = (item: any) => {
  if (item.elementType === 'point') {
    const point = mapEditorStore.points.find(p => p.id === item.elementId);
    if (point) { currentPoint.value = point; showDetailDialog.value = true; }
  }
};

// 右键菜单事件
const handleNodeContextMenu = (event: MouseEvent, data: any) => {
  if (data.type === 'element' && data.elementType === 'point') {
    const point = mapEditorStore.points.find(p => p.id === data.elementId);
    if (point) {
      mapEditorStore.selectElement(point.id, 'point', false);
      showPointContextMenu(event, point);
    }
  }
};

// 平铺列表右键
const handleElementContextMenu = (event: MouseEvent, item: any) => {
  if (item.elementType === 'point') {
    const point = mapEditorStore.points.find(p => p.id === item.elementId);
    if (point) {
      mapEditorStore.selectElement(point.id, 'point', false);
      showPointContextMenu(event, point);
    }
  }
};

// 显示点的右键菜单
const showPointContextMenu = (event: MouseEvent, point: MapPoint) => {
  // 移除已存在的菜单
  const existingMenu = document.querySelector('.element-context-menu');
  if (existingMenu) {
    document.body.removeChild(existingMenu);
  }

  // 创建右键菜单
  const menu = document.createElement('div');
  menu.className = 'element-context-menu';
  menu.innerHTML = `
    <div class="menu-item" data-action="edit">
      <span class="menu-icon">✏️</span>
      <span>编辑</span>
      <span class="menu-shortcut">Enter</span>
    </div>
    <div class="menu-item" data-action="copy">
      <span class="menu-icon">📋</span>
      <span>复制</span>
      <span class="menu-shortcut">Ctrl+C</span>
    </div>
    <div class="menu-item" data-action="paste">
      <span class="menu-icon">📝</span>
      <span>粘贴</span>
      <span class="menu-shortcut">Ctrl+V</span>
    </div>
    <div class="menu-divider"></div>
    <div class="menu-item" data-action="delete">
      <span class="menu-icon">🗑️</span>
      <span>删除</span>
      <span class="menu-shortcut">Delete</span>
    </div>
  `;
  menu.style.cssText = `
    position: fixed;
    left: ${event.clientX}px;
    top: ${event.clientY}px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    min-width: 160px;
    padding: 4px 0;
  `;

  // 菜单项样式
  const menuItems = menu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    (item as HTMLElement).style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #606266;
      transition: background-color 0.2s;
    `;
  });

  // 菜单图标样式
  const menuIcons = menu.querySelectorAll('.menu-icon');
  menuIcons.forEach(icon => {
    (icon as HTMLElement).style.cssText = `
      margin-right: 8px;
      font-style: normal;
    `;
  });

  // 菜单快捷键样式
  const shortcuts = menu.querySelectorAll('.menu-shortcut');
  shortcuts.forEach(shortcut => {
    (shortcut as HTMLElement).style.cssText = `
      margin-left: auto;
      font-size: 12px;
      color: #909399;
    `;
  });

  // 分割线样式
  const dividers = menu.querySelectorAll('.menu-divider');
  dividers.forEach(divider => {
    (divider as HTMLElement).style.cssText = `
      height: 1px;
      background: #e4e7ed;
      margin: 4px 0;
    `;
  });

  // 菜单项事件
  menuItems.forEach(item => {
    const menuItem = item as HTMLElement;
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f5f7fa';
    });

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    menuItem.addEventListener('click', () => {
      const action = menuItem.dataset.action;
      switch (action) {
        case 'edit':
          currentPoint.value = point;
          showEditDialog.value = true;
          break;
        case 'copy':
          mapEditorStore.copySelected();
          break;
        case 'paste':
          mapEditorStore.paste(20, 20);
          break;
        case 'delete':
          mapEditorStore.deletePoint(point.id);
          break;
      }
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    });
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
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .search-box {
    flex-shrink: 0;
  }

  .elements-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .element-group-header {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 600;
    color: #606266;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #f0f0f0;
    margin-top: 2px;
    background: #f5f7fa;
    cursor: pointer;
    user-select: none;

    &:first-child {
      margin-top: 0;
    }

    &:hover {
      background: #ecf5ff;
      color: #409eff;
    }

    .group-arrow {
      font-size: 9px;
      color: #c0c4cc;
      transition: transform 0.15s;
      transform: rotate(90deg);

      &.collapsed {
        transform: rotate(0deg);
      }
    }

    .group-label-text {
      flex: 1;
    }

    .group-count {
      font-size: 11px;
      color: #c0c4cc;
      font-weight: normal;
    }
  }

  .element-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.1s;

    &:hover {
      background: #f5f7fa;
    }

    &.is-selected {
      background: #ecf5ff;
      color: #409eff;

      .element-index {
        color: #409eff;
      }

      .element-name {
        color: #409eff;
        font-weight: 500;
      }
    }
  }

  .element-index {
    flex-shrink: 0;
    width: 22px;
    font-size: 11px;
    color: #c0c4cc;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .element-name {
    flex: 1;
    font-size: 13px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .element-empty {
    padding: 4px 8px;
    font-size: 12px;
    color: #c0c4cc;
    font-style: italic;
  }
}
</style>
