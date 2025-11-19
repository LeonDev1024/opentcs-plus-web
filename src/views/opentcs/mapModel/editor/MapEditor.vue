<template>
  <div class="map-editor">
    <!-- 顶部菜单栏 -->
    <div class="menu-bar">
      <div class="menu-left">
        <span class="editor-title">
          地图编辑器 - {{ mapEditorStore.mapData?.mapInfo?.name || '未命名地图' }}
          <el-tag v-if="mapEditorStore.mapData" size="small" type="info" style="margin-left: 8px;">
            v{{ mapEditorStore.mapData.mapInfo.version || '1.0' }}
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
          <el-button
            :type="currentTool === 'select' ? 'primary' : 'default'"
            size="small"
            icon="Pointer"
            @click="setTool(ToolMode.SELECT)"
            title="选择工具"
          />
          <el-button
            :type="currentTool === 'pan' ? 'primary' : 'default'"
            size="small"
            icon="Rank"
            @click="setTool(ToolMode.PAN)"
            title="平移工具"
          />

          <div class="point-tool-wrapper">
            <el-button
              :type="currentTool === 'point' ? 'primary' : 'default'"
              size="small"
              :icon="getPointTypeIcon(mapEditorStore.pointType)"
              @click="setTool(ToolMode.POINT)"
              title="绘制点"
              class="point-tool-main"
            />
            <el-dropdown 
              @command="handlePointTypeChange"
              trigger="click"
              placement="bottom"
              @visible-change="handleDropdownVisible"
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
                  <el-icon style="margin-right: 8px;"><VideoPause /></el-icon>
                  <span>临时停车 (Halt point)</span>
                  </el-dropdown-item>
                  <el-dropdown-item 
                    command="Park point"
                    :class="{ 'is-selected': mapEditorStore.pointType === 'Park point' }"
                  >
                    <el-icon style="margin-right: 8px;"><Location /></el-icon>
                    <span>长时间停车 (Park point)</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <el-button
            :type="currentTool === 'path' ? 'primary' : 'default'"
            size="small"
            icon="Connection"
            @click="setTool(ToolMode.PATH)"
            title="绘制路径"
          />
          <el-button
            :type="currentTool === 'location' ? 'primary' : 'default'"
            size="small"
            icon="Position"
            @click="setTool(ToolMode.LOCATION)"
            title="绘制位置"
          />
          
        </el-button-group>
        
        <el-divider direction="vertical" />
        
        <el-button-group>
          <el-button
            size="small"
            icon="RefreshLeft"
            :disabled="!canUndo"
            @click="undo"
            title="撤销 (Ctrl+Z)"
          />
          <el-button
            size="small"
            icon="RefreshRight"
            :disabled="!canRedo"
            @click="redo"
            title="重做 (Ctrl+Shift+Z)"
          />
        </el-button-group>
      </div>
      
    </div>
    
    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧面板：组件、属性、图层 -->
      <div class="left-panels">
        <!-- 组件面板 -->
        <div class="panel-container">
          <div class="panel-header">
            <span class="canval-title">组件</span>
          </div>
          <div class="panel-content">
            <ComponentsPanel />
          </div>
        </div>
        
        <!-- 属性面板 -->
        <div class="panel-container">
          <div class="panel-header">
            <span class="canvas-title">属性</span>
          </div>
          <div class="panel-content">
            <PropertyPanel />
          </div>
        </div>
        
        <!-- 图层面板 -->
        <div class="panel-container">
          <div class="panel-header">
            <span class="canvas-title">图层</span>
          </div>
          <div class="panel-content">
            <LayerPanel />
          </div>
        </div>
      </div>
      
      <!-- 中间：画布区域 -->
      <div class="canvas-area">
        <div class="canvas-header">
          <span class="canvas-title">建模视图</span>
          <div class="canvas-toolbar">
            <span class="zoom-level">{{ Math.round(canvasState.scale * 100) }}%</span>
            <el-button-group size="small">
              <el-button icon="ZoomIn" @click="zoomIn" title="放大" :circle="true" />
              <el-button icon="ZoomOut" @click="zoomOut" title="缩小" :circle="true" />
              <el-button icon="FullScreen" @click="resetZoom" title="重置缩放" :circle="true" />
            </el-button-group>
            <el-button 
              :type="showGrid ? 'primary' : 'default'"
              size="small"
              icon="Grid"
              @click="toggleGrid"
              title="显示/隐藏网格"
              :circle="true"
            />
            <el-button 
              :type="showLabels ? 'primary' : 'default'"
              size="small"
              icon="PriceTag"
              @click="toggleLabels"
              title="显示/隐藏标签"
              :circle="true"
            />
            <el-button 
              :type="showBlocks ? 'primary' : 'default'"
              size="small"
              icon="Box"
              @click="toggleBlocks"
              title="显示/隐藏Block"
              :circle="true"
            />
          </div>
        </div>
        <div class="canvas-wrapper">
          <MapCanvas ref="mapCanvasRef" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import MapCanvas from './components/MapCanvas.vue';
import LayerPanel from './components/LayerPanel.vue';
import PropertyPanel from './components/PropertyPanel.vue';
import ComponentsPanel from './components/ComponentsPanel.vue';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import { ToolMode } from '@/types/mapEditor';

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


// 从 store 获取状态
const currentTool = computed(() => mapEditorStore.currentTool);
const canUndo = computed(() => mapEditorStore.canUndo);
const canRedo = computed(() => mapEditorStore.canRedo);
const loading = computed(() => mapEditorStore.loading);
const isDirty = computed(() => mapEditorStore.isDirty);
const canvasState = computed(() => mapEditorStore.canvasState);

// 工具切换
const setTool = (tool: ToolMode) => {
  mapEditorStore.setTool(tool);
  
  // 显示中文提示
  const toolNames: Record<ToolMode, string> = {
    [ToolMode.SELECT]: '选择工具',
    [ToolMode.PAN]: '平移工具',
    [ToolMode.POINT]: '绘制点',
    [ToolMode.PATH]: '绘制路径',
    [ToolMode.LOCATION]: '绘制位置',
    [ToolMode.ZOOM]: '缩放工具'
  };
  
  ElMessage.success(`已切换到${toolNames[tool]}`);
};

// 获取点位类型图标
const getPointTypeIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    'Halt point': 'VideoPause',
    'Park point': 'Location'
  };
  return iconMap[type] || 'VideoPause';
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

// 下拉菜单显示状态变化
const handleDropdownVisible = (visible: boolean) => {
  // 如果下拉菜单打开，确保工具已切换到绘制点
  if (visible && currentTool.value !== ToolMode.POINT) {
    setTool(ToolMode.POINT);
  }
};

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

// 初始化网格大小为20（固定值）
onMounted(async () => {
  // 加载地图数据（从 query 参数获取）
  const mapModelId = route.query.id as string;
  if (mapModelId) {
    try {
      await mapEditorStore.loadMap(mapModelId);
      ElMessage.success('地图加载成功');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.msg || error?.message || '加载失败';
      ElMessage.error('加载地图失败：' + errorMessage);
      console.error('加载错误详情:', error);
    }
  } else {
    ElMessage.warning('未指定地图模型ID，将创建新地图');
    // 可以创建一个新地图
    const newMapModelId = 'new_' + Date.now();
    try {
      await mapEditorStore.loadMap(newMapModelId);
    } catch (error) {
      console.error('创建新地图失败:', error);
    }
  }
  
  // 注册键盘事件
  window.addEventListener('keydown', handleKeyDown);
  
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
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 16px;
    
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-button-group {
        .el-button {
          width: 24px;
          height: 24px;
          padding: 0;
        }
      }
      
      .el-button {
        width: 24px;
        height: 24px;
        padding: 0;
      }
      
      // 绘制点工具按钮样式
      .point-tool-wrapper {
        display: inline-flex;
        align-items: center;
        height: 24px;
        
        .point-tool-main {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          border-right: none;
          width: 24px;
          height: 24px;
          padding: 0;
        }
        
        .point-tool-dropdown {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          padding: 0 2px;
          min-width: auto;
          width: auto;
          height: 24px;
          
          .el-icon {
            font-size: 10px;
          }
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
      width: 280px;
      background: #fff;
      border-right: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      
      .panel-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid #e4e7ed;
        min-height: 0;
        
        &:last-child {
          border-bottom: none;
        }
        
        .panel-header {
          height: 30px;
          padding: 0 12px;
          background: #fff;
          border-bottom: 1px solid #e4e7ed;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          
          .panel-title {
            font-size: 12px;
            color: #606266;
            line-height: 1;
            font-weight: 500;
          }
        }
        
        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
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
      
      .canvas-header {
        height: 30px;
        background: #fff;
        border-bottom: 1px solid #e4e7ed;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        
        .canvas-title {
          font-size: 12px;
          color: #606266;
          line-height: 1;
        }
        
        .canvas-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          
          .zoom-level {
            font-size: 12px;
            color: #606266;
            font-weight: 500;
            padding: 2px 8px;
            background: #f5f7fa;
            border-radius: 4px;
            min-width: 50px;
            text-align: center;
            margin-right: 4px;
          }
          
          .el-button-group {
            .el-button {
              width: 24px;
              height: 24px;
              padding: 0;
            }
          }
          
          .el-button {
            width: 24px;
            height: 24px;
            padding: 0;
          }
          
          // 绘制点工具按钮样式
          .point-tool-wrapper {
            display: inline-flex;
            align-items: center;
            height: 24px;
            
            .point-tool-main {
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              border-right: none;
              width: 24px;
              height: 24px;
              padding: 0;
            }
            
            .point-tool-dropdown {
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
              padding: 0 2px;
              min-width: auto;
              width: auto;
              height: 24px;
              
              .el-icon {
                font-size: 10px;
              }
            }
          }
        }
      }
      
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
</style>

