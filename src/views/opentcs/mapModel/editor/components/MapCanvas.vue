<template>
  <div class="map-canvas-container" ref="containerRef">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
      @contextmenu.prevent
    >
      <!-- 背景层 -->
      <v-layer ref="backgroundLayerRef" :config="{ name: 'background', listening: false }">
        <v-rect :config="backgroundConfig" />
      </v-layer>
      
      <!-- 网格层（在背景层之上，其他层之下） -->
      <v-layer 
        ref="gridLayerRef" 
        :config="{ 
          name: 'grid', 
          listening: false,
          perfectDrawEnabled: false,
          clearBeforeDraw: true
        }"
      >
        <v-line
          v-for="(line, index) in gridLines"
          :key="`grid-${index}`"
          :config="line"
        />
      </v-layer>
      
      <!-- 点位层 -->
      <v-layer ref="pointLayerRef" :config="{ name: 'point' }">
        <v-circle
          v-for="point in visiblePoints"
          :key="point.id"
          :config="getPointConfig(point)"
          @click="handlePointClick(point, $event)"
          @dragstart="handlePointDragStart(point)"
          @dragmove="handlePointDragMove(point, $event)"
          @dragend="handlePointDragEnd(point)"
        />
      </v-layer>
      
      <!-- 路径层 -->
      <v-layer ref="pathLayerRef" :config="{ name: 'path' }">
        <template v-for="path in visiblePaths" :key="path.id">
          <v-line
            :config="getPathConfig(path)"
            @click="handlePathClick(path, $event)"
          />
          <!-- 路径控制点（仅在选中时显示） -->
          <v-circle
            v-for="(cp, index) in path.geometry.controlPoints"
            :key="`${path.id}-cp-${index}`"
            :config="getPathControlPointConfig(path, cp, index)"
            @click.stop="handlePathControlPointClick(path, cp, index, $event)"
            @dragstart="handlePathControlPointDragStart(path, cp, index)"
            @dragmove="handlePathControlPointDragMove(path, cp, index, $event)"
            @dragend="handlePathControlPointDragEnd(path, cp, index)"
          />
        </template>
      </v-layer>
      
      <!-- 位置层 -->
      <v-layer ref="locationLayerRef" :config="{ name: 'location' }">
        <template v-for="location in visibleLocations" :key="location.id">
          <v-line
            :config="getLocationConfig(location)"
            @click="handleLocationClick(location, $event)"
          />
          <!-- 位置顶点（仅在选中时显示） -->
          <v-circle
            v-for="(vertex, index) in location.geometry.vertices"
            :key="`${location.id}-v-${index}`"
            :config="getLocationVertexConfig(location, vertex, index)"
            @click.stop="handleLocationVertexClick(location, vertex, index, $event)"
            @dragstart="handleLocationVertexDragStart(location, vertex, index)"
            @dragmove="handleLocationVertexDragMove(location, vertex, index, $event)"
            @dragend="handleLocationVertexDragEnd(location, vertex, index)"
          />
        </template>
      </v-layer>
      
      <!-- 临时绘制层（用于预览） -->
      <v-layer ref="tempLayerRef" :config="{ name: 'temp' }">
        <v-line
          v-if="tempPath"
          :config="tempPath"
        />
        <v-line
          v-if="tempLocation"
          :config="tempLocation"
        />
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Stage, Layer, Line, Circle, Rect } from 'vue-konva';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import { ToolMode } from '@/types/mapEditor';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';
import { AddPointCommand, MovePointCommand } from '@/utils/mapEditor/command';
import { snapPoint } from '@/utils/mapEditor/snap';

// 注册 vue-konva 组件（如果全局注册不工作，则在组件内注册）
// 注意：vue-konva 3.x 使用 v-stage, v-layer 等组件名

const mapEditorStore = useMapEditorStore();

// Refs
const containerRef = ref<HTMLDivElement>();
const stageRef = ref<InstanceType<typeof Stage>>();
const backgroundLayerRef = ref<InstanceType<typeof Layer>>();
const gridLayerRef = ref<InstanceType<typeof Layer>>();
const pointLayerRef = ref<InstanceType<typeof Layer>>();
const pathLayerRef = ref<InstanceType<typeof Layer>>();
const locationLayerRef = ref<InstanceType<typeof Layer>>();
const tempLayerRef = ref<InstanceType<typeof Layer>>();

// 辅助函数：获取 Konva 节点（兼容不同的 vue-konva 版本）
const getKonvaNode = (ref: any) => {
  if (!ref) return null;
  // 尝试多种方式获取节点
  if (ref.getNode && typeof ref.getNode === 'function') {
    return ref.getNode();
  }
  if (ref.$konva) {
    return ref.$konva;
  }
  if (ref.getStage && typeof ref.getStage === 'function') {
    return ref.getStage();
  }
  // 如果 ref 本身就是节点
  if (ref.findOne) {
    return ref;
  }
  return null;
};

// 画布配置
const canvasState = computed(() => mapEditorStore.canvasState);
const currentTool = computed(() => mapEditorStore.currentTool);

const stageConfig = computed(() => {
  // 获取容器尺寸
  const containerWidth = containerRef.value?.clientWidth || 1920;
  const containerHeight = containerRef.value?.clientHeight || 1080;
  
  return {
    width: containerWidth,
    height: containerHeight,
    scaleX: canvasState.value.scale,
    scaleY: canvasState.value.scale,
    x: canvasState.value.offsetX,
    y: canvasState.value.offsetY,
    draggable: false // Stage 本身不可拖拽，通过平移工具控制
  };
});

// 背景配置
const backgroundConfig = computed(() => ({
  x: 0,
  y: 0,
  width: canvasState.value.width || 1920,
  height: canvasState.value.height || 1080,
  fill: '#ffffff',
  listening: false
}));

// 网格配置
const gridSize = ref(20); // 基础网格大小（画布坐标），固定为20px
const showGrid = ref(true);

const gridLines = computed(() => {
  if (!showGrid.value) {
    return [];
  }
  
  const lines: any[] = [];
  // 使用固定的画布尺寸
  const width = canvasState.value.width || 1920;
  const height = canvasState.value.height || 1080;
  const size = gridSize.value;
  
  // 计算需要绘制的网格线范围
  // 扩展一些区域以支持平移和缩放
  const padding = size * 20; // 扩展更多区域
  const startX = Math.floor(-padding / size) * size;
  const endX = Math.ceil((width + padding) / size) * size;
  const startY = Math.floor(-padding / size) * size;
  const endY = Math.ceil((height + padding) / size) * size;
  
  // 垂直线
  for (let x = startX; x <= endX; x += size) {
    lines.push({
      points: [x, startY, x, endY],
      stroke: '#cccccc',
      strokeWidth: 1,
      listening: false,
      perfectDrawEnabled: false,
      hitStrokeWidth: 0
    });
  }
  
  // 水平线
  for (let y = startY; y <= endY; y += size) {
    lines.push({
      points: [startX, y, endX, y],
      stroke: '#cccccc',
      strokeWidth: 1,
      listening: false,
      perfectDrawEnabled: false,
      hitStrokeWidth: 0
    });
  }
  
  return lines;
});

// 可见元素（根据图层可见性过滤）
const visiblePoints = computed(() => {
  return mapEditorStore.points.filter(point => {
    const layer = mapEditorStore.layers.find(l => l.id === point.layerId);
    return layer?.visible !== false;
  });
});

const visiblePaths = computed(() => {
  return mapEditorStore.paths.filter(path => {
    const layer = mapEditorStore.layers.find(l => l.id === path.layerId);
    return layer?.visible !== false;
  });
});

const visibleLocations = computed(() => {
  return mapEditorStore.locations.filter(location => {
    const layer = mapEditorStore.layers.find(l => l.id === location.layerId);
    return layer?.visible !== false;
  });
});

// 鼠标位置
const mousePosition = ref({ x: 0, y: 0 });

// 临时绘制数据
const tempPath = ref<any>(null);
const tempLocation = ref<any>(null);
const isDrawing = ref(false);
const drawingPoints = ref<Array<{ x: number; y: number }>>([]);

// 拖拽状态
const isDragging = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });

// 获取点的 Konva 配置
const getPointConfig = (point: MapPoint) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(point.id);
  return {
    id: point.id,
    x: point.x,
    y: point.y,
    radius: point.editorProps.radius || 5,
    fill: isSelected ? '#ff4d4f' : (point.editorProps.color || '#1890ff'),
    stroke: isSelected ? '#ff7875' : '#ffffff',
    strokeWidth: isSelected ? 2 : 1,
    draggable: currentTool.value === ToolMode.SELECT && !isDragging.value,
    listening: true
  };
};

// 获取路径的 Konva 配置
const getPathConfig = (path: MapPath) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(path.id);
  const points: number[] = [];
  
  path.geometry.controlPoints.forEach(cp => {
    points.push(cp.x, cp.y);
  });
  
  return {
    id: path.id,
    points,
    stroke: isSelected ? '#ff4d4f' : (path.editorProps.strokeColor || '#52c41a'),
    strokeWidth: path.editorProps.strokeWidth || 2,
    lineCap: 'round',
    lineJoin: 'round',
    dash: path.editorProps.lineStyle === 'dashed' ? [5, 5] : undefined,
    listening: true
  };
};

// 获取位置的 Konva 配置
const getLocationConfig = (location: MapLocation) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(location.id);
  const points: number[] = [];
  
  location.geometry.vertices.forEach(vertex => {
    points.push(vertex.x, vertex.y);
  });
  
  if (location.geometry.closed && points.length > 0) {
    // 闭合多边形，添加第一个点
    points.push(location.geometry.vertices[0].x, location.geometry.vertices[0].y);
  }
  
  return {
    id: location.id,
    points,
    fill: isSelected ? 'rgba(255, 77, 79, 0.3)' : (location.editorProps.fillColor || 'rgba(24, 144, 255, 0.3)'),
    fillOpacity: location.editorProps.fillOpacity || 0.3,
    stroke: isSelected ? '#ff4d4f' : (location.editorProps.strokeColor || '#1890ff'),
    strokeWidth: location.editorProps.strokeWidth || 2,
    closed: location.geometry.closed,
    listening: true
  };
};

// 鼠标事件处理
const handleMouseDown = (e: any) => {
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  
  // 转换到画布坐标
  const x = (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
  const y = (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
  
  mousePosition.value = { x, y };
  
  // 根据工具模式处理
  if (currentTool.value === ToolMode.PAN) {
    isDragging.value = true;
    dragStartPos.value = { x: pointerPos.x, y: pointerPos.y };
    stage.container().style.cursor = 'grabbing';
    e.evt.preventDefault();
  } else if (currentTool.value === ToolMode.POINT) {
    // 绘制点
    const point = mapEditorStore.addPoint({
      layerId: getDefaultLayerId('point'),
      name: `点_${Date.now()}`,
      x,
      y,
      status: '0',
      editorProps: {
        radius: 5,
        color: '#1890ff',
        labelVisible: true
      }
    });
    
    // 记录到历史
    const command = new AddPointCommand(
      point,
      (p) => mapEditorStore.addPoint(p),
      (id) => mapEditorStore.deletePoint(id)
    );
    mapEditorStore.executeCommand(command);
  } else if (currentTool.value === ToolMode.PATH) {
    // 开始绘制路径或添加控制点
    if (!isDrawing.value) {
      // 开始新的路径
      isDrawing.value = true;
      drawingPoints.value = [{ x, y }];
    } else {
      // 添加控制点
      drawingPoints.value.push({ x, y });
    }
  } else if (currentTool.value === ToolMode.LOCATION) {
    // 开始绘制位置（多边形）或添加顶点
    if (!isDrawing.value) {
      // 开始新的多边形
      isDrawing.value = true;
      drawingPoints.value = [{ x, y }];
    } else {
      // 添加顶点
      drawingPoints.value.push({ x, y });
    }
  }
};

const handleMouseMove = (e: any) => {
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  
  // 计算画布坐标（考虑缩放和平移）
  const x = (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
  const y = (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
  
  mousePosition.value = { x, y };
  
  // 平移模式
  if (currentTool.value === ToolMode.PAN && isDragging.value) {
    const currentPos = stage.getPointerPosition();
    if (!currentPos) return;
    
    // 计算鼠标移动的距离
    const dx = currentPos.x - dragStartPos.value.x;
    const dy = currentPos.y - dragStartPos.value.y;
    
    // 更新画布偏移
    mapEditorStore.updateCanvasState({
      offsetX: canvasState.value.offsetX + dx,
      offsetY: canvasState.value.offsetY + dy
    });
    
    // 更新起始位置
    dragStartPos.value = { x: currentPos.x, y: currentPos.y };
  }
  
  // 绘制路径预览
  if (currentTool.value === ToolMode.PATH && isDrawing.value && drawingPoints.value.length > 0) {
    const points: number[] = [];
    drawingPoints.value.forEach(p => {
      points.push(p.x, p.y);
    });
    // 添加当前鼠标位置作为预览
    points.push(x, y);
    
    tempPath.value = {
      points,
      stroke: '#52c41a',
      strokeWidth: 2,
      dash: [5, 5],
      lineCap: 'round',
      lineJoin: 'round'
    };
  }
  
  // 绘制位置预览
  if (currentTool.value === ToolMode.LOCATION && isDrawing.value && drawingPoints.value.length > 0) {
    const points: number[] = [];
    drawingPoints.value.forEach(p => {
      points.push(p.x, p.y);
    });
    // 添加当前鼠标位置
    points.push(x, y);
    // 如果至少有两个点，闭合预览
    if (drawingPoints.value.length >= 2) {
      points.push(drawingPoints.value[0].x, drawingPoints.value[0].y);
    }
    
    tempLocation.value = {
      points,
      stroke: '#1890ff',
      strokeWidth: 2,
      fill: 'rgba(24, 144, 255, 0.1)',
      closed: drawingPoints.value.length >= 2,
      dash: [5, 5]
    };
  }
};

const handleMouseUp = (e: any) => {
  // 平移模式结束
  if (currentTool.value === ToolMode.PAN && isDragging.value) {
    isDragging.value = false;
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
    return;
  }
  
  // 右键完成绘制
  if (e.evt.button === 2) {
    if (currentTool.value === ToolMode.PATH && isDrawing.value && drawingPoints.value.length >= 2) {
      // 完成路径绘制
      completePathDrawing();
    } else if (currentTool.value === ToolMode.LOCATION && isDrawing.value && drawingPoints.value.length >= 3) {
      // 完成位置绘制
      completeLocationDrawing();
    } else if (isDrawing.value) {
      // 取消绘制
      cancelDrawing();
    }
  }
};

// 完成路径绘制
const completePathDrawing = () => {
  if (drawingPoints.value.length < 2) {
    ElMessage.warning('路径至少需要2个控制点');
    return;
  }
  
  const path = mapEditorStore.addPath({
    layerId: getDefaultLayerId('path'),
    name: `路径_${Date.now()}`,
    status: '0',
    geometry: {
      controlPoints: drawingPoints.value.map((p, index) => ({
        id: `cp_${Date.now()}_${index}`,
        x: p.x,
        y: p.y
      })),
      pathType: 'line'
    },
    editorProps: {
      strokeColor: '#52c41a',
      strokeWidth: 2,
      lineStyle: 'solid',
      arrowVisible: false,
      labelVisible: true
    }
  });
  
  isDrawing.value = false;
  drawingPoints.value = [];
  tempPath.value = null;
  
  ElMessage.success('路径绘制完成');
};

// 完成位置绘制
const completeLocationDrawing = () => {
  if (drawingPoints.value.length < 3) {
    ElMessage.warning('位置至少需要3个顶点');
    return;
  }
  
  const location = mapEditorStore.addLocation({
    layerId: getDefaultLayerId('location'),
    name: `位置_${Date.now()}`,
    status: '0',
    geometry: {
      vertices: drawingPoints.value.map((p, index) => ({
        id: `v_${Date.now()}_${index}`,
        x: p.x,
        y: p.y
      })),
      closed: true
    },
    editorProps: {
      fillColor: '#1890ff',
      fillOpacity: 0.3,
      strokeColor: '#1890ff',
      strokeWidth: 2,
      labelVisible: true
    }
  });
  
  isDrawing.value = false;
  drawingPoints.value = [];
  tempLocation.value = null;
  
  ElMessage.success('位置绘制完成');
};

// 取消绘制
const cancelDrawing = () => {
  isDrawing.value = false;
  drawingPoints.value = [];
  tempPath.value = null;
  tempLocation.value = null;
  ElMessage.info('已取消绘制');
};

// 滚轮缩放
const handleWheel = (e: any) => {
  e.evt.preventDefault();
  e.evt.stopPropagation();
  
  const stage = e.target.getStage();
  if (!stage) return;
  
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  
  const oldScale = canvasState.value.scale;
  const scaleBy = 1.1;
  const delta = e.evt.deltaY;
  const newScale = delta > 0 ? oldScale / scaleBy : oldScale * scaleBy;
  
  // 限制缩放范围
  const clampedScale = Math.max(0.1, Math.min(10, newScale));
  
  // 获取 Stage 在页面中的位置
  const stageBox = stage.container().getBoundingClientRect();
  
  // 鼠标相对于 Stage 容器的位置
  const pointer = {
    x: pointerPos.x,
    y: pointerPos.y
  };
  
  // 计算鼠标在画布坐标系中的位置（考虑当前的缩放和平移）
  const mousePointTo = {
    x: (pointer.x - canvasState.value.offsetX) / oldScale,
    y: (pointer.y - canvasState.value.offsetY) / oldScale
  };
  
  // 计算新的偏移量，使鼠标指向的点在缩放后位置不变
  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale
  };
  
  mapEditorStore.updateCanvasState({
    scale: clampedScale,
    offsetX: newPos.x,
    offsetY: newPos.y
  });
};

// 点点击
const handlePointClick = (point: MapPoint, e: any) => {
  e.cancelBubble = true;
  const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
  mapEditorStore.selectElement(point.id, 'point', multiSelect);
};

// 点拖拽
const handlePointDragStart = (point: MapPoint) => {
  isDragging.value = true;
};

const handlePointDragMove = (point: MapPoint, e: any) => {
  const node = e.target;
  const x = node.x();
  const y = node.y();
  
  // 应用吸附
  const snapped = snapPoint(
    { x, y },
    {
      snapToGrid: true,
      gridSize: gridSize,
      snapToPoint: true,
      targetPoints: mapEditorStore.points
        .filter(p => p.id !== point.id)
        .map(p => ({ x: p.x, y: p.y }))
    }
  );
  
  node.x(snapped.x);
  node.y(snapped.y);
};

const handlePointDragEnd = (point: MapPoint) => {
  isDragging.value = false;
  const layer = getKonvaNode(pointLayerRef.value);
  if (layer) {
    const node = layer.findOne(`#${point.id}`);
    if (node) {
      const newX = node.x();
      const newY = node.y();
      
      // 更新点位置
      mapEditorStore.updatePoint(point.id, { x: newX, y: newY });
    }
  }
};

// 路径点击
const handlePathClick = (path: MapPath, e: any) => {
  e.cancelBubble = true;
  const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
  mapEditorStore.selectElement(path.id, 'path', multiSelect);
};

// 位置点击
const handleLocationClick = (location: MapLocation, e: any) => {
  e.cancelBubble = true;
  const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
  mapEditorStore.selectElement(location.id, 'location', multiSelect);
};

// ==================== 路径控制点编辑 ====================

// 获取路径控制点配置
const getPathControlPointConfig = (path: MapPath, cp: any, index: number) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(path.id);
  return {
    id: `${path.id}-cp-${index}`,
    x: cp.x,
    y: cp.y,
    radius: isSelected ? 6 : 4,
    fill: isSelected ? '#ff4d4f' : '#52c41a',
    stroke: '#ffffff',
    strokeWidth: 1,
    draggable: isSelected && currentTool.value === ToolMode.SELECT,
    listening: true,
    opacity: isSelected ? 1 : 0.7
  };
};

// 路径控制点点击
const handlePathControlPointClick = (path: MapPath, cp: any, index: number, e: any) => {
  e.cancelBubble = true;
  // 选中路径
  mapEditorStore.selectElement(path.id, 'path', false);
};

// 路径控制点拖拽
const handlePathControlPointDragStart = (path: MapPath, cp: any, index: number) => {
  isDragging.value = true;
};

const handlePathControlPointDragMove = (path: MapPath, cp: any, index: number, e: any) => {
  const node = e.target;
  const x = node.x();
  const y = node.y();
  
  // 应用吸附
  const snapped = snapPoint(
    { x, y },
    {
      snapToGrid: true,
      gridSize: gridSize,
      snapToPoint: true,
      targetPoints: mapEditorStore.points.map(p => ({ x: p.x, y: p.y }))
    }
  );
  
  node.x(snapped.x);
  node.y(snapped.y);
};

const handlePathControlPointDragEnd = (path: MapPath, cp: any, index: number) => {
  isDragging.value = false;
  const layer = getKonvaNode(pathLayerRef.value);
  if (layer) {
    const node = layer.findOne(`#${path.id}-cp-${index}`);
    if (node) {
      const newX = node.x();
      const newY = node.y();
      
      // 更新控制点位置
      const updatedControlPoints = [...path.geometry.controlPoints];
      updatedControlPoints[index] = { ...updatedControlPoints[index], x: newX, y: newY };
      
      mapEditorStore.updatePath(path.id, {
        geometry: {
          ...path.geometry,
          controlPoints: updatedControlPoints
        }
      });
    }
  }
};

// ==================== 位置顶点编辑 ====================

// 获取位置顶点配置
const getLocationVertexConfig = (location: MapLocation, vertex: any, index: number) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(location.id);
  return {
    id: `${location.id}-v-${index}`,
    x: vertex.x,
    y: vertex.y,
    radius: isSelected ? 6 : 4,
    fill: isSelected ? '#ff4d4f' : '#1890ff',
    stroke: '#ffffff',
    strokeWidth: 1,
    draggable: isSelected && currentTool.value === ToolMode.SELECT,
    listening: true,
    opacity: isSelected ? 1 : 0.7
  };
};

// 位置顶点点击
const handleLocationVertexClick = (location: MapLocation, vertex: any, index: number, e: any) => {
  e.cancelBubble = true;
  // 选中位置
  mapEditorStore.selectElement(location.id, 'location', false);
};

// 位置顶点拖拽
const handleLocationVertexDragStart = (location: MapLocation, vertex: any, index: number) => {
  isDragging.value = true;
};

const handleLocationVertexDragMove = (location: MapLocation, vertex: any, index: number, e: any) => {
  const node = e.target;
  const x = node.x();
  const y = node.y();
  
  // 应用吸附
  const snapped = snapPoint(
    { x, y },
    {
      snapToGrid: true,
      gridSize: gridSize,
      snapToPoint: true,
      targetPoints: mapEditorStore.points.map(p => ({ x: p.x, y: p.y }))
    }
  );
  
  node.x(snapped.x);
  node.y(snapped.y);
};

const handleLocationVertexDragEnd = (location: MapLocation, vertex: any, index: number) => {
  isDragging.value = false;
  const layer = getKonvaNode(locationLayerRef.value);
  if (layer) {
    const node = layer.findOne(`#${location.id}-v-${index}`);
    if (node) {
      const newX = node.x();
      const newY = node.y();
      
      // 更新顶点位置
      const updatedVertices = [...location.geometry.vertices];
      updatedVertices[index] = { ...updatedVertices[index], x: newX, y: newY };
      
      mapEditorStore.updateLocation(location.id, {
        geometry: {
          ...location.geometry,
          vertices: updatedVertices
        }
      });
    }
  }
};

// 获取默认图层ID
const getDefaultLayerId = (type: 'point' | 'path' | 'location'): string => {
  const layer = mapEditorStore.layers.find(l => l.type === type);
  if (layer) return layer.id;
  
  // 如果没有找到，创建默认图层
  const newLayer = mapEditorStore.addLayer({
    name: `${type}图层`,
    type: type as any,
    visible: true,
    locked: false,
    zIndex: 1,
    opacity: 1,
    elementIds: []
  });
  
  return newLayer.id;
};

// 设置网格可见性（供父组件调用）
const setGridVisible = (visible: boolean) => {
  showGrid.value = visible;
  nextTick(() => {
    const layer = getKonvaNode(gridLayerRef.value);
    if (layer) {
      layer.draw();
    }
  });
};

// 设置网格大小（供父组件调用）
const setGridSize = (size: number) => {
  gridSize.value = Math.max(5, Math.min(100, size)); // 限制在 5-100 之间
  nextTick(() => {
    const layer = getKonvaNode(gridLayerRef.value);
    if (layer) {
      layer.draw();
    }
  });
};

// 标签显示状态
const showLabels = ref(true);

// Block显示状态
const showBlocks = ref(true);

// 设置标签可见性（供父组件调用）
const setLabelsVisible = (visible: boolean) => {
  showLabels.value = visible;
  // 标签的显示由元素的labelVisible属性控制，这里只是存储状态
  // 实际的标签渲染会在后续实现
  nextTick(() => {
    // 强制重绘所有图层以更新标签显示
    [pointLayerRef.value, pathLayerRef.value, locationLayerRef.value].forEach(layerRef => {
      const layer = getKonvaNode(layerRef);
      if (layer) {
        layer.batchDraw();
      }
    });
  });
};

// 设置Block可见性（供父组件调用）
const setBlocksVisible = (visible: boolean) => {
  showBlocks.value = visible;
  // Block的显示逻辑会在后续实现
  nextTick(() => {
    // 强制重绘位置层（因为block通常与location相关）
    const layer = getKonvaNode(locationLayerRef.value);
    if (layer) {
      layer.batchDraw();
    }
  });
};

// 监听画布状态变化，更新网格
watch(
  () => [canvasState.value.scale, canvasState.value.offsetX, canvasState.value.offsetY, canvasState.value.width, canvasState.value.height, showGrid.value, gridSize.value],
  () => {
    // 网格线会自动通过 computed 更新，但需要强制重绘
    nextTick(() => {
      const layer = getKonvaNode(gridLayerRef.value);
      if (layer) {
        layer.batchDraw();
      }
    });
  },
  { deep: true, immediate: true }
);

// 监听网格线变化
watch(
  () => gridLines.value.length,
  () => {
    nextTick(() => {
      const layer = getKonvaNode(gridLayerRef.value);
      if (layer) {
        layer.batchDraw();
      }
    });
  }
);

// 暴露方法供父组件调用
defineExpose({
  setGridVisible,
  setGridSize,
  setLabelsVisible,
  setBlocksVisible,
  gridSize,
  showGrid,
  showLabels,
  showBlocks,
  getMousePosition: () => mousePosition.value
});

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  // ESC 取消绘制
  if (e.key === 'Escape' && isDrawing.value) {
    cancelDrawing();
  }
};

// 容器尺寸监听器
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  // 初始化画布尺寸
  nextTick(() => {
    if (containerRef.value) {
      const containerWidth = containerRef.value.clientWidth || 1920;
      const containerHeight = containerRef.value.clientHeight || 1080;
      
      mapEditorStore.updateCanvasState({
        width: containerWidth,
        height: containerHeight
      });
      
      // 监听容器尺寸变化
      resizeObserver = new ResizeObserver(() => {
        if (containerRef.value) {
          const containerWidth = containerRef.value.clientWidth || 1920;
          const containerHeight = containerRef.value.clientHeight || 1080;
          
          mapEditorStore.updateCanvasState({
            width: containerWidth,
            height: containerHeight
          });
        }
      });
      
      resizeObserver.observe(containerRef.value);
      
      // 强制绘制网格层
      setTimeout(() => {
        const layer = getKonvaNode(gridLayerRef.value);
        if (layer) {
          layer.batchDraw();
          // 再次强制绘制，确保渲染
          setTimeout(() => {
            layer.batchDraw();
          }, 50);
        }
      }, 100);
    }
  });
  
  // 初始化默认图层
  if (mapEditorStore.layers.length === 0) {
    mapEditorStore.addLayer({
      name: '点位层',
      type: 'point' as any,
      visible: true,
      locked: false,
      zIndex: 1,
      opacity: 1,
      elementIds: []
    });
    
    mapEditorStore.addLayer({
      name: '路径层',
      type: 'path' as any,
      visible: true,
      locked: false,
      zIndex: 2,
      opacity: 1,
      elementIds: []
    });
    
    mapEditorStore.addLayer({
      name: '位置层',
      type: 'location' as any,
      visible: true,
      locked: false,
      zIndex: 3,
      opacity: 1,
      elementIds: []
    });
  }
  
  // 注册键盘事件
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  // 移除键盘事件
  window.removeEventListener('keydown', handleKeyDown);
  
  // 断开尺寸监听
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped lang="scss">
.map-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
  
  // 确保 Konva Stage 占满容器
  :deep(canvas) {
    display: block;
  }
}
</style>

