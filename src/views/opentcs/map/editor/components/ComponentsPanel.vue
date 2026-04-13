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
                  :class="{ 'is-selected-layout': data.type === 'layout' && isLayoutSelected }"
                  @dblclick="handleNodeDoubleClick(data)"
                  @contextmenu.prevent="handleNodeContextMenu($event, data)"
                >
                  <el-icon v-if="data.type === 'folder'" class="node-icon"><Folder /></el-icon>
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
      
      <el-tab-pane label="区域" name="blocks">
        <div class="blocks-content">
          <!-- 工具栏 -->
          <div class="blocks-toolbar">
            <span class="blocks-count">共 {{ mapEditorStore.blocks.length }} 个规则</span>
            <el-button size="small" type="primary" @click="openAddBlockDialog">
              + 新增
            </el-button>
          </div>

          <!-- 按类型分组展示 -->
          <div class="blocks-list" v-if="mapEditorStore.blocks.length > 0">
            <!-- SINGLE_VEHICLE_ONLY -->
            <div class="block-group" v-if="singleVehicleBlocks.length > 0">
              <div class="block-group-header">
                <span class="block-type-badge single">单车互斥</span>
                <span class="block-group-count">{{ singleVehicleBlocks.length }}</span>
              </div>
              <div
                class="block-item"
                v-for="block in singleVehicleBlocks"
                :key="block.id"
                :class="{ 'is-active': hoveredBlockId === block.id }"
                @mouseenter="hoveredBlockId = block.id"
                @mouseleave="hoveredBlockId = null"
              >
                <span class="block-color-swatch" :style="{ background: block.color }" />
                <span class="block-name">{{ block.name }}</span>
                <span class="block-member-count">{{ block.members.length }}个成员</span>
                <div class="block-actions">
                  <el-button size="small" text @click.stop="openEditBlockDialog(block)">编辑</el-button>
                  <el-button size="small" text type="danger" @click.stop="handleDeleteBlock(block.id)">删除</el-button>
                </div>
              </div>
            </div>

            <!-- SAME_DIRECTION_ONLY -->
            <div class="block-group" v-if="sameDirectionBlocks.length > 0">
              <div class="block-group-header">
                <span class="block-type-badge direction">同向通行</span>
                <span class="block-group-count">{{ sameDirectionBlocks.length }}</span>
              </div>
              <div
                class="block-item"
                v-for="block in sameDirectionBlocks"
                :key="block.id"
                :class="{ 'is-active': hoveredBlockId === block.id }"
                @mouseenter="hoveredBlockId = block.id"
                @mouseleave="hoveredBlockId = null"
              >
                <span class="block-color-swatch" :style="{ background: block.color }" />
                <span class="block-name">{{ block.name }}</span>
                <span class="block-member-count">{{ block.members.length }}个成员</span>
                <div class="block-actions">
                  <el-button size="small" text @click.stop="openEditBlockDialog(block)">编辑</el-button>
                  <el-button size="small" text type="danger" @click.stop="handleDeleteBlock(block.id)">删除</el-button>
                </div>
              </div>
            </div>
          </div>

          <el-empty v-else description="暂无区域规则，点击新增创建" :image-size="80" />
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

    <!-- Block 新增/编辑对话框 -->
    <el-dialog
      v-model="showBlockDialog"
      :title="blockDialogMode === 'add' ? '新增区域规则' : '编辑区域规则'"
      width="520px"
      @closed="resetBlockForm"
    >
      <el-form :model="blockForm" label-width="90px" size="default">
        <el-form-item label="名称" required>
          <el-input v-model="blockForm.name" placeholder="Block 名称（全图唯一）" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="blockForm.type" style="width: 100%">
            <el-option value="SINGLE_VEHICLE_ONLY" label="SINGLE_VEHICLE_ONLY — 单车互斥（路口）" />
            <el-option value="SAME_DIRECTION_ONLY" label="SAME_DIRECTION_ONLY — 同向通行（走廊）" />
          </el-select>
        </el-form-item>
        <el-form-item label="高亮颜色">
          <el-color-picker v-model="blockForm.color" />
          <span style="margin-left:8px;font-size:12px;color:#909399">成员在画布上的高亮颜色</span>
        </el-form-item>
        <el-form-item label="成员资源">
          <el-select
            v-model="blockForm.members"
            multiple
            filterable
            style="width: 100%"
            placeholder="选择 Point / Path / Location（按名称）"
          >
            <el-option-group label="Points">
              <el-option
                v-for="p in mapEditorStore.points"
                :key="p.id"
                :label="p.name"
                :value="p.name"
              />
            </el-option-group>
            <el-option-group label="Paths">
              <el-option
                v-for="p in mapEditorStore.paths"
                :key="p.id"
                :label="p.name"
                :value="p.name"
              />
            </el-option-group>
            <el-option-group label="Locations">
              <el-option
                v-for="l in mapEditorStore.locations"
                :key="l.id"
                :label="l.name"
                :value="l.name"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBlockDialog = false">取消</el-button>
        <el-button type="primary" @click="submitBlockForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Grid, Folder, Edit } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapPath, MapPoint, MapBlock } from '@/types/mapEditor';
import PointDetailDialog from './PointDetailDialog.vue';
import PointEditDialog from './PointEditDialog.vue';

const mapEditorStore = useMapEditorStore();

const activeTab = ref('components');
const showDetailDialog = ref(false);
const showEditDialog = ref(false);
const currentPoint = ref<MapPoint | null>(null);

// ==================== Block 状态 ====================
const hoveredBlockId = ref<string | null>(null);
const showBlockDialog = ref(false);
const blockDialogMode = ref<'add' | 'edit'>('add');
const editingBlockId = ref<string | null>(null);

const BLOCK_COLORS = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#FF9800','#795548'];

const blockForm = ref({
  name: '',
  type: 'SINGLE_VEHICLE_ONLY' as 'SINGLE_VEHICLE_ONLY' | 'SAME_DIRECTION_ONLY',
  color: '#F44336',
  members: [] as string[]
});

const singleVehicleBlocks = computed(() =>
  mapEditorStore.blocks.filter(b => b.type === 'SINGLE_VEHICLE_ONLY')
);
const sameDirectionBlocks = computed(() =>
  mapEditorStore.blocks.filter(b => b.type === 'SAME_DIRECTION_ONLY')
);

const openAddBlockDialog = () => {
  blockDialogMode.value = 'add';
  editingBlockId.value = null;
  blockForm.value = {
    name: `Block-${mapEditorStore.blocks.length + 1}`,
    type: 'SINGLE_VEHICLE_ONLY',
    color: BLOCK_COLORS[mapEditorStore.blocks.length % BLOCK_COLORS.length],
    members: []
  };
  showBlockDialog.value = true;
};

const openEditBlockDialog = (block: MapBlock) => {
  blockDialogMode.value = 'edit';
  editingBlockId.value = block.id;
  blockForm.value = {
    name: block.name,
    type: block.type,
    color: block.color,
    members: [...block.members]
  };
  showBlockDialog.value = true;
};

const resetBlockForm = () => {
  editingBlockId.value = null;
};

const submitBlockForm = () => {
  if (!blockForm.value.name.trim()) {
    ElMessage.warning('请填写 Block 名称');
    return;
  }
  if (blockDialogMode.value === 'add') {
    mapEditorStore.addBlock({
      name: blockForm.value.name.trim(),
      type: blockForm.value.type,
      color: blockForm.value.color,
      members: blockForm.value.members
    });
    ElMessage.success('区域规则已创建');
  } else if (editingBlockId.value) {
    mapEditorStore.updateBlock(editingBlockId.value, {
      name: blockForm.value.name.trim(),
      type: blockForm.value.type,
      color: blockForm.value.color,
      members: blockForm.value.members
    });
    ElMessage.success('区域规则已更新');
  }
  showBlockDialog.value = false;
};

const handleDeleteBlock = (id: string) => {
  ElMessageBox.confirm('确定删除该区域规则吗？', '确认删除', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    mapEditorStore.deleteBlock(id);
    ElMessage.success('已删除');
  }).catch(() => {});
};

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
      // 选中该点
      mapEditorStore.selectElement(point.id, 'point', false);
      // 显示右键菜单
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

      &.is-selected-layout {
        background: #ecf5ff;
        color: #409eff;
      }

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
    flex-direction: column;
    overflow: hidden;
    padding: 8px;

    .blocks-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      flex-shrink: 0;

      .blocks-count {
        font-size: 12px;
        color: #909399;
      }
    }

    .blocks-list {
      flex: 1;
      overflow-y: auto;
    }

    .block-group {
      margin-bottom: 12px;

      .block-group-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        padding: 2px 0;

        .block-type-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;

          &.single {
            background: #fef0f0;
            color: #f56c6c;
          }

          &.direction {
            background: #f0f9eb;
            color: #67c23a;
          }
        }

        .block-group-count {
          font-size: 11px;
          color: #c0c4cc;
        }
      }

      .block-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: default;
        transition: background 0.15s;

        &:hover,
        &.is-active {
          background: #f5f7fa;
        }

        .block-color-swatch {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          border: 1px solid rgba(0,0,0,0.1);
        }

        .block-name {
          flex: 1;
          font-size: 13px;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .block-member-count {
          font-size: 11px;
          color: #909399;
          flex-shrink: 0;
        }

        .block-actions {
          display: none;
          gap: 2px;
        }

        &:hover .block-actions {
          display: flex;
        }
      }
    }
  }
}
</style>
