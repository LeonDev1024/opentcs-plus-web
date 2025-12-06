<template>
  <div class="map-editor">
    <!-- 顶部菜单栏 -->
    <div class="menu-bar">
      <div class="menu-left">
        <span class="editor-title">
          地图编辑器 - {{ mapEditorStore.mapData?.mapInfo?.name || '未命名地图' }}
          <el-tag v-if="mapEditorStore.mapData" size="small" type="info" style="margin-left: 8px;">
            v{{ mapEditorStore.mapData.mapInfo.mapVersion || '1.0' }}
          </el-tag>
        </span>
      </div>
      <div class="menu-right">
        <el-button type="success" size="small" icon="Document" @click="handleSave" :loading="loading">
          保存
        </el-button>
        <el-button size="small" icon="Close" @click="handleClose">关闭</el-button>
      </div>
    </div>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-tooltip content="选择工具" :show-after="50" placement="bottom">
            <el-button
              :type="currentTool === 'select' ? 'primary' : 'default'"
              size="small"
              icon="Pointer"
              @click="setTool(ToolMode.SELECT)"
            />
          </el-tooltip>
          <el-tooltip content="平移工具" :show-after="50" placement="bottom">
            <el-button
              :type="currentTool === 'pan' ? 'primary' : 'default'"
              size="small"
              icon="Rank"
              @click="setTool(ToolMode.PAN)"
            />
          </el-tooltip>
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button-group class="creation-tool-group">
          <div class="point-tool-wrapper toolbar-tool toolbar-tool-point">
            <el-tooltip content="绘制点" :show-after="50" placement="bottom">
              <el-button
                :type="currentTool === 'point' ? 'primary' : 'default'"
                size="small"
                @click="setTool(ToolMode.POINT)"
                class="point-tool-main"
              >
                <template #icon>
                  <SvgIcon :icon-class="getPointTypeIconClass(mapEditorStore.pointType)" class="point-type-svg-icon" />
                </template>
              </el-button>
            </el-tooltip>
            <el-dropdown 
              @command="handlePointTypeChange"
              trigger="click"
              placement="bottom"
              @visible-change="handlePointDropdownVisible"
            >
              <el-button
                :type="currentTool === 'point' ? 'primary' : 'default'"
                size="small"
                class="point-tool-dropdown"
                @click.stop
              >
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    command="Halt point"
                    :class="{ 'is-selected': mapEditorStore.pointType === 'Halt point' }"
                  >
                    <div class="point-type-option">
                      <SvgIcon icon-class="halt-point" class="point-type-svg-icon" />
                  <span>临时停车 (Halt point)</span>
                    </div>
                  </el-dropdown-item>
                  <el-dropdown-item 
                    command="Park point"
                    :class="{ 'is-selected': mapEditorStore.pointType === 'Park point' }"
                  >
                    <div class="point-type-option">
                      <SvgIcon icon-class="park-point" class="point-type-svg-icon" />
                    <span>长时间停车 (Park point)</span>
                    </div>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="path-tool-wrapper toolbar-tool toolbar-tool-path">
            <el-tooltip content="创建连线" :show-after="50" placement="bottom">
              <el-button
                :type="currentTool === 'path' ? 'primary' : 'default'"
                size="small"
                @click="setTool(ToolMode.PATH)"
                class="path-tool-main"
              >
                <template #icon>
                  <PathTypeIcon :type="mapEditorStore.pathConnectionType" :active="currentTool === 'path'" />
                </template>
              </el-button>
            </el-tooltip>
            <el-dropdown 
              @command="handlePathTypeChange"
              trigger="click"
              placement="bottom"
              @visible-change="handlePathDropdownVisible"
            >
              <el-button
                :type="currentTool === 'path' ? 'primary' : 'default'"
                size="small"
                class="path-tool-dropdown"
                @click.stop
              >
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="option in pathTypeOptions"
                    :key="option.value"
                    :command="option.value"
                    :class="{ 'is-selected': mapEditorStore.pathConnectionType === option.value }"
                  >
                    <PathTypeIcon
                      class="path-type-icon"
                      :type="option.value"
                      :active="mapEditorStore.pathConnectionType === option.value"
                    />
                    <span>{{ option.label }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <el-tooltip content="绘制位置" :show-after="50" placement="bottom">
            <el-button
              class="toolbar-tool toolbar-tool-location"
              :type="currentTool === 'location' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.LOCATION)"
            >
              <template #icon>
                <LocationTypeIcon :active="currentTool === 'location'" symbol="L" />
              </template>
            </el-button>
          </el-tooltip>
          <el-tooltip content="虚线路径（点↔业务位置）" :show-after="50" placement="bottom">
            <el-button
              class="toolbar-tool toolbar-tool-dashed"
              :type="currentTool === 'dashedLink' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.DASHED_LINK)"
            >
              <template #icon>
                <svg-icon icon-class="dashed-link" style="font-size: 16px;" />
              </template>
            </el-button>
          </el-tooltip>
          <el-tooltip content="规则区域" :show-after="50" placement="bottom">
            <el-button
              class="toolbar-tool toolbar-tool-rule"
              :type="currentTool === 'ruleRegion' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.RULE_REGION)"
            >
              <template #icon>
                <svg-icon icon-class="rule-region" style="font-size: 18px;" />
              </template>
            </el-button>
          </el-tooltip>
          
        </el-button-group>
        <el-divider direction="vertical" />
        
        <el-button-group>
          <el-tooltip content="撤销 (Ctrl+Z)" :show-after="50" placement="bottom">
            <el-button
              size="small"
              icon="RefreshLeft"
              :disabled="!canUndo"
              @click="undo"
            />
          </el-tooltip>
          <el-tooltip content="重做 (Ctrl+Shift+Z)" :show-after="50" placement="bottom">
            <el-button
              size="small"
              icon="RefreshRight"
              :disabled="!canRedo"
              @click="redo"
            />
          </el-tooltip>
        </el-button-group>
        <el-divider direction="vertical" />
        <span class="zoom-level">{{ Math.round(canvasState.scale * 100) }}%</span>
        <el-button-group size="small">
          <el-tooltip content="放大" :show-after="50" placement="bottom">
            <el-button icon="ZoomIn" @click="zoomIn" :circle="true" />
          </el-tooltip>
          <el-tooltip content="缩小" :show-after="50" placement="bottom">
            <el-button icon="ZoomOut" @click="zoomOut" :circle="true" />
          </el-tooltip>
          <el-tooltip content="重置缩放" :show-after="50" placement="bottom">
            <el-button icon="FullScreen" @click="resetZoom" :circle="true" />
          </el-tooltip>
        </el-button-group>
        <el-tooltip content="显示/隐藏网格" :show-after="50" placement="bottom">
          <el-button 
            :type="showGrid ? 'primary' : 'default'"
            size="small"
            icon="Grid"
            @click="toggleGrid"
            :circle="true"
          />
        </el-tooltip>
        <el-tooltip content="显示/隐藏标签" :show-after="50" placement="bottom">
          <el-button 
            :type="showLabels ? 'primary' : 'default'"
            size="small"
            icon="PriceTag"
            @click="toggleLabels"
            :circle="true"
          />
        </el-tooltip>
        <el-tooltip content="显示/隐藏Block" :show-after="50" placement="bottom">
          <el-button 
            :type="showBlocks ? 'primary' : 'default'"
            size="small"
            icon="Box"
            @click="toggleBlocks"
            :circle="true"
          />
        </el-tooltip>
      </div>
      <div class="toolbar-right">
        <el-tooltip :content="isLeftPanelCollapsed ? '展开侧边栏' : '收起侧边栏'" :show-after="50" placement="bottom">
          <el-button
            class="collapse-toggle"
            size="small"
            @click="toggleLeftPanelCollapse"
          >
            <el-icon>
              <component :is="isLeftPanelCollapsed ? 'CaretRight' : 'CaretLeft'" />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="isHeaderCollapsed ? '展开导航栏' : '折叠导航栏'" :show-after="50" placement="bottom">
          <el-button
            class="collapse-toggle"
            size="small"
            @click="toggleHeaderCollapse"
          >
            <el-icon>
              <component :is="isHeaderCollapsed ? 'CaretBottom' : 'CaretTop'" />
            </el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    
    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧面板：视图、属性、图层 -->
      <div 
        v-show="!isLeftPanelCollapsed"
        class="left-panels" 
        :style="{ width: leftPanelWidth + 'px' }"
      >
        <!-- 视图面板 -->
        <div class="panel-container">
          <div class="panel-header">
            <span class="canval-title">视图</span>
          </div>
          <div class="panel-content">
            <ComponentsPanel />
          </div>
        </div>
        
        <!-- 图层面板 -->
        <div class="panel-container">
          <div class="panel-header" @click="toggleLayerPanelCollapse">
            <span class="canvas-title">图层</span>
            <el-icon class="collapse-icon" :class="{ 'collapsed': isLayerPanelCollapsed }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="!isLayerPanelCollapsed" class="panel-content">
            <LayerPanel />
          </div>
        </div>
      </div>
      
      <!-- 可拖拽的分隔条 -->
      <div 
        v-show="!isLeftPanelCollapsed"
        class="panel-resizer" 
        @mousedown="handleResizeStart"
        :class="{ 'resizing': isResizing }"
      ></div>
      
      <!-- 中间：画布区域 -->
      <div class="canvas-area">
        <div class="canvas-wrapper">
          <MapCanvas ref="mapCanvasRef" @point-double-click="handlePointDoubleClick" />
        </div>
      </div>
    </div>
    
    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-right">
        <span class="coordinates">
          X: {{ mousePosition.x.toFixed(2) }}, 
          Y: {{ mousePosition.y.toFixed(2) }}
        </span>
      </div>
    </div>
    
    <!-- 点编辑对话框 -->
    <PointEditDialog 
      v-model="showPointEditDialog" 
      :point="currentEditPoint"
      @updated="handlePointUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import MapCanvas from './components/MapCanvas.vue';
import LayerPanel from './components/LayerPanel.vue';
import ComponentsPanel from './components/ComponentsPanel.vue';
import PointEditDialog from './components/PointEditDialog.vue';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import { ToolMode } from '@/types/mapEditor';
import type { MapPoint } from '@/types/mapEditor';
import PathTypeIcon from './components/icons/PathTypeIcon.vue';
import LocationTypeIcon from './components/icons/LocationTypeIcon.vue';
import SvgIcon from '@/components/SvgIcon/index.vue';

const route = useRoute();
const router = useRouter();
const mapEditorStore = useMapEditorStore();
const mapCanvasRef = ref<InstanceType<typeof MapCanvas>>();

// 网格显示状态
const showGrid = ref(true);

// 标签显示状态
const showLabels = ref(true);

// Block显示状态
const showBlocks = ref(true);

// 鼠标位置（从画布组件获取）
const mousePosition = ref({ x: 0, y: 0 });

// 点编辑对话框
const showPointEditDialog = ref(false);
const currentEditPoint = ref<MapPoint | null>(null);

// 顶部导航折叠状态
const isHeaderCollapsed = ref(false);

// 左侧面板收起状态
const isLeftPanelCollapsed = ref(false);

// 图层面板折叠状态
const isLayerPanelCollapsed = ref(false);

// 左侧面板宽度
const LEFT_PANEL_MIN_WIDTH = 200;
const LEFT_PANEL_MAX_WIDTH = 600;
const LEFT_PANEL_DEFAULT_WIDTH = 280;
const LEFT_PANEL_WIDTH_KEY = 'map-editor-left-panel-width';

const leftPanelWidth = ref(LEFT_PANEL_DEFAULT_WIDTH);
const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);

// 从 store 获取状态
const currentTool = computed(() => mapEditorStore.currentTool);
const canUndo = computed(() => mapEditorStore.canUndo);
const canRedo = computed(() => mapEditorStore.canRedo);
const loading = computed(() => mapEditorStore.loading);
const isDirty = computed(() => mapEditorStore.isDirty);
const canvasState = computed(() => mapEditorStore.canvasState);

type PathConnectionType = 'direct' | 'orthogonal' | 'curve';

const pathTypeOptions: Array<{ value: PathConnectionType; label: string }> = [
  { value: 'direct', label: '直接连线' },
  { value: 'orthogonal', label: '直角连线' },
  { value: 'curve', label: '圆角连线' }
];

const pathTypeLabels: Record<PathConnectionType, string> = {
  direct: '直接连线',
  orthogonal: '直角连线',
  curve: '圆角连线'
};

// 工具切换
const setTool = (tool: ToolMode) => {
  mapEditorStore.setTool(tool);
  
  // 显示中文提示
  const toolNames: Partial<Record<ToolMode, string>> = {
    [ToolMode.SELECT]: '选择工具',
    [ToolMode.PAN]: '平移工具',
    [ToolMode.POINT]: '绘制点',
    [ToolMode.PATH]: '绘制路径',
    [ToolMode.LOCATION]: '绘制位置',
    [ToolMode.ZOOM]: '缩放工具',
    [ToolMode.DASHED_LINK]: '虚线链接',
    [ToolMode.RULE_REGION]: '规则区域'
  };
  
  ElMessage.success(`已切换到${toolNames[tool]}`);
};

const getPointTypeIconClass = (type: string) => {
  return type === 'Park point' ? 'park-point' : 'halt-point';
};

// 获取点位类型标签
const getPointTypeLabel = (type: string) => {
  const labelMap: Record<string, string> = {
    'Halt point': '临时停车',
    'Park point': '长时间停车'
  };
  return labelMap[type] || '临时停车';
};

// 点位类型切换
const handlePointTypeChange = (type: string) => {
  mapEditorStore.setPointType(type);
  const typeNames: Record<string, string> = {
    'Halt point': '临时停车',
    'Park point': '长时间停车'
  };
  ElMessage.success(`点位类型已切换为：${typeNames[type]}`);
};

// 连线类型切换
const handlePathTypeChange = (type: PathConnectionType) => {
  mapEditorStore.setPathConnectionType(type);
  ElMessage.success(`连线类型已切换为：${pathTypeLabels[type]}`);
};

// 点位类型下拉菜单显示状态
const handlePointDropdownVisible = (visible: boolean) => {
  // 如果下拉菜单打开，确保工具已切换到绘制点
  if (visible && currentTool.value !== ToolMode.POINT) {
    setTool(ToolMode.POINT);
  }
};

// 连线下拉菜单显示状态
const handlePathDropdownVisible = (visible: boolean) => {
  if (visible && currentTool.value !== ToolMode.PATH) {
    setTool(ToolMode.PATH);
  }
};

// 顶部导航折叠
const applyHeaderCollapseState = () => {
  const appWrapper = document.querySelector('.app-wrapper') || document.body;
  if (!appWrapper) return;
  if (isHeaderCollapsed.value) {
    appWrapper.classList.add('map-editor-header-collapsed');
  } else {
    appWrapper.classList.remove('map-editor-header-collapsed');
  }
};

const toggleHeaderCollapse = () => {
  isHeaderCollapsed.value = !isHeaderCollapsed.value;
  applyHeaderCollapseState();
};

// 左侧面板收起/展开
const toggleLeftPanelCollapse = () => {
  isLeftPanelCollapsed.value = !isLeftPanelCollapsed.value;
};

// 图层面板折叠/展开
const toggleLayerPanelCollapse = () => {
  isLayerPanelCollapsed.value = !isLayerPanelCollapsed.value;
};

watch(isHeaderCollapsed, () => {
  nextTick(() => applyHeaderCollapseState());
});

// 撤销/重做
const undo = () => {
  mapEditorStore.undo();
};

const redo = () => {
  mapEditorStore.redo();
};

// 缩放控制
const zoomIn = () => {
  const currentScale = mapEditorStore.canvasState.scale;
  mapEditorStore.updateCanvasState({
    scale: Math.min(currentScale * 1.2, 10)
  });
};

const zoomOut = () => {
  const currentScale = mapEditorStore.canvasState.scale;
  mapEditorStore.updateCanvasState({
    scale: Math.max(currentScale / 1.2, 0.1)
  });
};

const resetZoom = () => {
  mapEditorStore.updateCanvasState({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
};

// 切换网格显示
const toggleGrid = () => {
  showGrid.value = !showGrid.value;
  // 通过 ref 调用子组件的方法
  if (mapCanvasRef.value) {
    (mapCanvasRef.value as any).setGridVisible(showGrid.value);
  }
};

// 切换标签显示
const toggleLabels = () => {
  showLabels.value = !showLabels.value;
  // 更新所有元素的标签可见性
  if (mapCanvasRef.value) {
    (mapCanvasRef.value as any).setLabelsVisible?.(showLabels.value);
  }
  // 更新store中所有元素的labelVisible
  mapEditorStore.points.forEach(point => {
    mapEditorStore.updatePoint(point.id, {
      editorProps: {
        ...point.editorProps,
        labelVisible: showLabels.value
      }
    });
  });
  mapEditorStore.paths.forEach(path => {
    mapEditorStore.updatePath(path.id, {
      editorProps: {
        ...path.editorProps,
        labelVisible: showLabels.value
      }
    });
  });
  mapEditorStore.locations.forEach(location => {
    mapEditorStore.updateLocation(location.id, {
      editorProps: {
        ...location.editorProps,
        labelVisible: showLabels.value
      }
    });
  });
};

// 切换Block显示
const toggleBlocks = () => {
  showBlocks.value = !showBlocks.value;
  // 通过 ref 调用子组件的方法
  if (mapCanvasRef.value) {
    (mapCanvasRef.value as any).setBlocksVisible?.(showBlocks.value);
  }
};

// 监听画布的鼠标位置变化
watch(() => mapCanvasRef.value, (canvas) => {
  if (canvas) {
    // 定期更新鼠标位置
    const updateMousePosition = () => {
      try {
        const pos = (canvas as any).getMousePosition?.();
        if (pos) {
          mousePosition.value = pos;
        }
      } catch (e) {
        // 忽略错误
      }
    };
    
    // 使用 requestAnimationFrame 更新
    let rafId: number;
    const update = () => {
      updateMousePosition();
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    
    onUnmounted(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    });
  }
}, { immediate: true });

// 拖拽调整面板宽度
const handleResizeStart = (e: MouseEvent) => {
  isResizing.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = leftPanelWidth.value;
  
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  
  e.preventDefault();
};

const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return;
  
  const deltaX = e.clientX - resizeStartX.value;
  const newWidth = resizeStartWidth.value + deltaX;
  
  // 限制宽度范围
  leftPanelWidth.value = Math.max(
    LEFT_PANEL_MIN_WIDTH,
    Math.min(LEFT_PANEL_MAX_WIDTH, newWidth)
  );
};

const handleResizeEnd = () => {
  if (!isResizing.value) return;
  
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  // 保存宽度到 localStorage
  localStorage.setItem(LEFT_PANEL_WIDTH_KEY, leftPanelWidth.value.toString());
};

// 初始化网格大小为20（固定值）
onMounted(async () => {
  // 从 localStorage 加载面板宽度
  const savedWidth = localStorage.getItem(LEFT_PANEL_WIDTH_KEY);
  if (savedWidth) {
    const width = parseInt(savedWidth, 10);
    if (width >= LEFT_PANEL_MIN_WIDTH && width <= LEFT_PANEL_MAX_WIDTH) {
      leftPanelWidth.value = width;
    }
  }
  
  // 加载地图数据（从 query 参数获取）
  const mapId = route.query.id as string;
  if (mapId) {
    try {
      await mapEditorStore.loadMap(mapId);
      ElMessage.success('地图加载成功');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.msg || error?.message || '加载失败';
      ElMessage.error('加载地图失败：' + errorMessage);
      console.error('加载错误详情:', error);
    }
  } else {
    ElMessage.warning('未指定地图ID，将创建新地图');
    // 可以创建一个新地图
    const newMapId = 'new_' + Date.now();
    try {
      await mapEditorStore.loadMap(newMapId);
    } catch (error) {
      console.error('创建新地图失败:', error);
    }
  }
  
  // 注册键盘事件
  window.addEventListener('keydown', handleKeyDown);
  applyHeaderCollapseState();
  
  // 确保网格大小为20（MapCanvas组件默认就是20，这里确保一下）
  nextTick(() => {
    if (mapCanvasRef.value) {
      (mapCanvasRef.value as any).setGridSize(20);
    }
  });
});

// 保存
const handleSave = async () => {
  try {
    await mapEditorStore.saveMap();
    ElMessage.success('保存成功');
  } catch (error: any) {
    const errorMessage = error?.response?.data?.msg || error?.message || '保存失败';
    ElMessage.error('保存失败：' + errorMessage);
    console.error('保存错误详情:', error);
  }
};

// 关闭编辑器
const handleClose = async () => {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm('有未保存的更改，是否保存？', '提示', {
        confirmButtonText: '保存',
        cancelButtonText: '不保存',
        distinguishCancelAndClose: true,
        type: 'warning'
      });
      await handleSave();
    } catch (error) {
      // 用户取消或选择不保存
    }
  }
  
  router.back();
};

// 处理点双击事件
const handlePointDoubleClick = (point: MapPoint) => {
  currentEditPoint.value = point;
  showPointEditDialog.value = true;
};

// 点更新后的回调
const handlePointUpdated = () => {
  // 刷新视图
};

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+Z 撤销
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  
  // Ctrl+Shift+Z 重做
  if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
    e.preventDefault();
    redo();
  }
  
  // Ctrl+S 保存
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
};


onUnmounted(() => {
  // 移除键盘事件
  window.removeEventListener('keydown', handleKeyDown);
  
  // 清理拖拽事件
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  const appWrapper = document.querySelector('.app-wrapper');
  appWrapper?.classList.remove('map-editor-header-collapsed');
  
  // 重置编辑器
  mapEditorStore.reset();
});
</script>

<style scoped lang="scss">
.map-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
  
  // 顶部菜单栏
  .menu-bar {
    height: 40px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    
    .menu-left {
      .editor-title {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
      }
    }
    
    .menu-right {
      display: flex;
      gap: 8px;
    }
  }
  
  // 工具栏
  .toolbar {
    height: 50px;
    background: linear-gradient(0deg, #fafbfc 0%, #fff 100%);
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: nowrap;
      
      :deep(.el-divider--vertical) {
        height: 24px;
        margin: 0 6px;
        border-left-color: #e0e3eb;
      }
      
      .el-button-group.creation-tool-group {
        display: inline-flex;
        gap: 6px;
      }
      
      // 确保 tooltip 不影响按钮布局
      :deep(.el-tooltip) {
        display: inline-block;
      }
      
      :deep(.el-tooltip__trigger) {
        display: inline-block;
      }
      
      .zoom-level {
        font-size: 12px;
        color: #606266;
        font-weight: 500;
        padding: 2px 8px;
        background: #f5f7fa;
        border-radius: 4px;
        min-width: 50px;
        text-align: center;
        margin: 0 4px;
      }
      
      .el-button {
        width: 32px;
        height: 32px;
        padding: 4px;
        border: none;
        background: transparent;
        color: #4c4c4c;
        font-weight: 500;
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(64, 158, 255, 0.08);
          color: #1f2d3d;
        }
        
        &.el-button--primary {
          background: rgba(64, 158, 255, 0.14);
          color: #1f2d3d;
          border: 1px solid rgba(64, 158, 255, 0.3);
        }

        :deep(.el-icon) {
          font-size: 20px;
        }

        :deep(.svg-icon),
        :deep(svg) {
          width: 20px;
          height: 20px;
        }
      }
      
      .el-button-group {
        .el-button {
          width: 32px;
          height: 32px;
          padding: 4px;
        }
      }
      
      // 分段按钮样式
      .point-tool-wrapper,
      .path-tool-wrapper {
        display: inline-flex;
        align-items: center;
          height: 32px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        background: #fff;
        
        .point-tool-main,
        .path-tool-main {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          border-right: none;
          width: 32px;
          height: 32px;
          padding: 4px;
        }
        
        .point-tool-dropdown,
        .path-tool-dropdown {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          padding: 0 2px;
          min-width: auto;
          width: auto;
          height: 32px;
          
          .el-icon {
            font-size: 10px;
          }
        }
        
        .path-type-icon {
          margin-right: 8px;
        }

        :deep(.point-type-option) {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 160px;
          
          span {
            font-size: 12px;
            color: #303133;
          }
        }

        .point-type-svg-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
        }
      }

      .creation-tool-group .toolbar-tool {
        order: 0;
      }
      
      .creation-tool-group .toolbar-tool-point {
        order: 0;
      }
      
      .creation-tool-group .toolbar-tool-location {
        order: 1;
      }
      
      .creation-tool-group .toolbar-tool-path {
        order: 2;
      }
      
      .creation-tool-group .toolbar-tool-dashed {
        order: 3;
      }
      
      .creation-tool-group .toolbar-tool-rule {
        order: 4;
      }
    }
    
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .collapse-toggle {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid #e0e6ef;
        background: #fff;
        color: #4c4c4c;
        padding: 0;
        transition: all 0.2s ease;
        
        &:hover {
          border-color: #409eff;
          color: #409eff;
          box-shadow: 0 1px 3px rgba(64, 158, 255, 0.2);
        }
      }
    }
  }
  
  // 主内容区
  .editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    
    // 左侧面板组
    .left-panels {
      background: #fff;
      border-right: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
      
      .panel-container {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid #e4e7ed;
        min-height: 0;
        
        // 视图面板始终占据剩余空间
        &:first-child {
          flex: 1;
        }
        
        // 图层面板根据内容自适应
        &:last-child {
          border-bottom: none;
          flex-shrink: 0;
        }
        
        .panel-header {
          height: 30px;
          padding: 0 12px;
          background: #fff;
          border-bottom: 1px solid #e4e7ed;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
          
          &:hover {
            background: #f5f7fa;
          }
          
          .panel-title,
          .canval-title,
          .canvas-title {
            font-size: 12px;
            color: #606266;
            line-height: 1;
            font-weight: 500;
          }
          
          .collapse-icon {
            font-size: 14px;
            color: #909399;
            transition: transform 0.3s ease;
            
            &.collapsed {
              transform: rotate(-90deg);
            }
          }
        }
        
        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
      }
    }
    
    // 可拖拽的分隔条
    .panel-resizer {
      width: 4px;
      background: transparent;
      cursor: col-resize;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
      transition: background-color 0.2s;
      
      &:hover {
        background: #409eff;
      }
      
      &.resizing {
        background: #409eff;
      }
      
      &::before {
        content: '';
        position: absolute;
        left: -2px;
        right: -2px;
        top: 0;
        bottom: 0;
        cursor: col-resize;
      }
    }
    
    // 画布区域
    .canvas-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #f0f0f0;
      overflow: hidden;
      min-width: 0;
      position: relative;
      
      .canvas-wrapper {
        flex: 1;
        position: relative;
        min-height: 0;
        
        // 确保 MapCanvas 占满剩余空间
        :deep(.map-canvas-container) {
          width: 100%;
          height: 100%;
        }
      }
    }
  }
  
  // 底部状态栏
  .status-bar {
    height: 30px;
    background: #fff;
    border-top: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 16px;
    font-size: 12px;
    
    .status-right {
      .coordinates {
        color: #909399;
      }
    }
  }
}

:global(.map-editor-header-collapsed .fixed-header),
:global(.map-editor-header-collapsed .navbar),
:global(.map-editor-header-collapsed .tags-view-container) {
  display: none;
}

:global(.map-editor-header-collapsed .fixed-header + .app-main) {
  padding-top: 0 !important;
}

:global(.map-editor-header-collapsed .app-main) {
  min-height: 100vh;
}
</style>