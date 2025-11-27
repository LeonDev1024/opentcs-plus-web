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
      
      <!-- 中心标记层 -->
      <v-layer :config="{ name: 'center-marker', listening: false }">
        <v-line
          v-if="showGrid"
          :config="centerLineConfig.horizontal"
        />
        <v-line
          v-if="showGrid"
          :config="centerLineConfig.vertical"
        />
        <v-circle
          :config="centerPointConfig"
        />
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
        <template v-for="point in visiblePoints" :key="point.id">
          <v-circle
            :config="getPointConfig(point)"
            @click="handlePointClick(point, $event)"
            @dragstart="handlePointDragStart(point)"
            @dragmove="handlePointDragMove(point, $event)"
            @dragend="handlePointDragEnd(point)"
          />
          <v-text
            v-if="shouldRenderPointGlyph(point)"
            :key="`${point.id}-glyph`"
            :config="getPointGlyphConfig(point)"
          />
        </template>
      </v-layer>
      
      <!-- 路径层 -->
      <v-layer ref="pathLayerRef" :config="{ name: 'path' }">
        <template v-for="path in visiblePaths" :key="path.id">
          <v-line
            :config="getPathConfig(path)"
            @click="handlePathClick(path, $event)"
          />
          <v-arrow
            v-if="shouldShowPathArrow(path)"
            :config="getPathArrowConfig(path)"
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
          <!-- 业务位置：显示为中心点的小正方形方框；规则区域仍显示为多边形 -->
          <v-rect
            v-if="!isRuleRegionLocation(location)"
            :config="getLocationRectConfig(location)"
            @click="handleLocationClick(location, $event)"
            @mouseover="setStageCursor('move')"
            @mouseout="setStageCursor('default')"
          />
          <v-line
            v-else
            :config="getLocationConfig(location)"
            @click="handleLocationClick(location, $event)"
          />
          <!-- 位置中心 symbol 文本（例如业务位置类型的图标），默认不显示，只有设置了 label 才显示 -->
          <v-text
            v-if="location.editorProps?.label"
            :key="`${location.id}-symbol`"
            :config="getLocationSymbolConfig(location)"
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
          v-if="tempLocation"
          :config="tempLocation"
        />
        <template v-if="tempPathPreview && pathDragState.startPoint">
          <v-line :key="`preview-line-${pathDragState.startPoint.id}`" :config="tempPathPreview.line" />
          <v-arrow :key="`preview-arrow-${pathDragState.startPoint.id}`" :config="tempPathPreview.arrow" />
          <v-circle :key="`preview-start-${pathDragState.startPoint.id}`" :config="tempPathPreview.startMarker" />
          <v-circle :key="`preview-end-${pathDragState.startPoint.id}`" :config="tempPathPreview.endMarker" />
        </template>
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import { ToolMode } from '@/types/mapEditor';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';
import { AddPointCommand, MovePointCommand } from '@/utils/mapEditor/command';
import { snapPoint } from '@/utils/mapEditor/snap';

// 注册 vue-konva 组件（如果全局注册不工作，则在组件内注册）
// 注意：vue-konva 3.x 使用 v-stage, v-layer 等组件名

const mapEditorStore = useMapEditorStore();

type PathConnectionType = 'direct' | 'orthogonal' | 'curve';

// Refs
const containerRef = ref<HTMLDivElement>();
const stageRef = ref<any>();
const backgroundLayerRef = ref<any>();
const gridLayerRef = ref<any>();
const pointLayerRef = ref<any>();
const pathLayerRef = ref<any>();
const locationLayerRef = ref<any>();
const tempLayerRef = ref<any>();

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

const centerPointConfig = computed(() => {
  const width = canvasState.value.width || 1920;
  const height = canvasState.value.height || 1080;
  const centerX = Math.round(width / 2 / (gridSize.value || 20)) * (gridSize.value || 20);
  const centerY = Math.round(height / 2 / (gridSize.value || 20)) * (gridSize.value || 20);
  return {
    x: centerX,
    y: centerY,
    radius: 6,
    stroke: '#ff4d4f',
    strokeWidth: 2,
    fill: '#ffffff',
    listening: false
  };
});

const centerLineConfig = computed(() => {
  const width = canvasState.value.width || 1920;
  const height = canvasState.value.height || 1080;
  const grid = gridSize.value || 20;
  const centerX = Math.round(width / 2 / grid) * grid;
  const centerY = Math.round(height / 2 / grid) * grid;
  return {
    horizontal: {
      points: [0, centerY, width, centerY],
      stroke: '#ff7875',
      strokeWidth: 1.5,
      dash: [8, 6],
      listening: false
    },
    vertical: {
      points: [centerX, 0, centerX, height],
      stroke: '#ff7875',
      strokeWidth: 1.5,
      dash: [8, 6],
      listening: false
    }
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

const POINT_TYPE = {
  HALT: 'Halt point',
  PARK: 'Park point'
} as const;

type PointVisualMeta = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  glyph?: string;
  glyphColor: string;
};

const getPointVisualMeta = (point: MapPoint): PointVisualMeta => {
  const base: PointVisualMeta = {
    fill: point.editorProps.color || '#1890ff',
    stroke: point.editorProps.strokeColor || '#ffffff',
    strokeWidth: 1.2,
    radius: point.editorProps.radius || 5,
    glyph: undefined,
    glyphColor: point.editorProps.textColor || '#606266'
  };
  
  if (point.type === POINT_TYPE.PARK) {
    base.fill = point.editorProps.color || '#409eff';
    base.stroke = point.editorProps.strokeColor || '#1d6fd6';
    base.strokeWidth = 1.6;
    base.radius = point.editorProps.radius || 7;
    base.glyph = 'P';
    base.glyphColor = point.editorProps.textColor || '#ffffff';
  } else if (point.type === POINT_TYPE.HALT) {
    base.fill = point.editorProps.color || '#8c8c8c';
    base.stroke = point.editorProps.strokeColor || '#d9d9d9';
    base.radius = point.editorProps.radius || 5;
    base.strokeWidth = 1.4;
  }
  
  return base;
};

const shouldRenderPointGlyph = (point: MapPoint) => Boolean(getPointVisualMeta(point).glyph);

const getPointGlyphConfig = (point: MapPoint) => {
  const visual = getPointVisualMeta(point);
  if (!visual.glyph) {
    return {};
  }
  const isSelected = mapEditorStore.selection.selectedIds.has(point.id);
  const isDashedLinkSource = currentTool.value === ToolMode.DASHED_LINK && pendingDashedLinkStartPoint.value?.id === point.id;
  const isPathStart = currentTool.value === ToolMode.PATH && pathDragState.startPoint?.id === point.id;
  const highlighted = isSelected || isPathStart || isDashedLinkSource;
  
  return {
    x: point.x,
    y: point.y,
    text: visual.glyph,
    fontSize: Math.max(10, visual.radius * 1.8),
    fontStyle: 'bold',
    fill: highlighted ? '#ffffff' : visual.glyphColor,
    align: 'center',
    verticalAlign: 'middle',
    width: visual.radius * 2,
    height: visual.radius * 2,
    offsetX: visual.radius,
    offsetY: visual.radius,
    listening: false
  };
};

const buildPointEditorProps = (type: string): MapPoint['editorProps'] => {
  if (type === POINT_TYPE.PARK) {
    return {
      radius: 7,
      color: '#409eff',
      strokeColor: '#1d6fd6',
      textColor: '#ffffff',
      labelVisible: true
    };
  }
  return {
    radius: 5,
    color: '#8c8c8c',
    strokeColor: '#d9d9d9',
    textColor: '#595959',
    labelVisible: true
  };
};

const createPointPayload = (x: number, y: number): Omit<MapPoint, 'id'> => {
  const nextName = typeof mapEditorStore.generatePointName === 'function'
    ? mapEditorStore.generatePointName()
    : `Point-${Date.now()}`;
    
  return {
    layerId: getDefaultLayerId('point'),
    name: nextName,
    x,
    y,
    status: '0',
    type: mapEditorStore.pointType,
    editorProps: buildPointEditorProps(mapEditorStore.pointType)
  };
};

// 鼠标位置
const mousePosition = ref({ x: 0, y: 0 });

// 临时绘制数据
const tempLocation = ref<any>(null);
const isDrawing = ref(false);
const drawingPoints = ref<Array<{ x: number; y: number }>>([]);
const activeDrawingTool = ref<ToolMode | null>(null);

// 连线状态
const hoveredPointId = ref<string | null>(null);

const pathDragState = reactive<{
  startPoint: MapPoint | null;
  currentPos: { x: number; y: number };
  pathType: PathConnectionType;
}>({
  startPoint: null,
  currentPos: { x: 0, y: 0 },
  pathType: 'direct'
});

const PATH_ARROW = {
  radius: 6,
  color: '#409eff'
};

const tempPathPreview = computed(() => {
  if (!pathDragState.startPoint) return null;
  const start = pathDragState.startPoint;
  const end = { x: pathDragState.currentPos.x, y: pathDragState.currentPos.y };
  const controlPoints = buildConnectionControlPoints(
    start,
    end,
    pathDragState.pathType
  );
  const points: number[] = [];
  controlPoints.forEach(cp => {
    points.push(cp.x, cp.y);
  });
  const line = {
    points,
    stroke: '#409eff',
    strokeWidth: 2,
    lineCap: 'round',
    lineJoin: 'round',
    dash: [8, 8]
  };
  const arrow = {
    points: [
      controlPoints[controlPoints.length - 2].x,
      controlPoints[controlPoints.length - 2].y,
      end.x,
      end.y
    ],
    pointerLength: PATH_ARROW.radius * 2.5,
    pointerWidth: PATH_ARROW.radius * 1.6,
    fill: PATH_ARROW.color,
    stroke: PATH_ARROW.color,
    strokeWidth: 2
  };
  const startMarker = {
    x: start.x,
    y: start.y,
    radius: PATH_ARROW.radius,
    stroke: '#73c0ff',
    strokeWidth: 2,
    fill: 'rgba(64, 158, 255, 0.15)'
  };
  const endMarker = {
    x: end.x,
    y: end.y,
    radius: PATH_ARROW.radius,
    stroke: '#409eff',
    strokeWidth: 2,
    fill: 'rgba(94, 200, 255, 0.2)'
  };
  return { line, arrow, startMarker, endMarker };
});

const findPointAtPosition = (x: number, y: number, toleranceMultiplier = 1.6) => {
  for (const point of visiblePoints.value) {
    const radius = point.editorProps.radius || 5;
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= radius * toleranceMultiplier) {
      return point;
    }
  }
  return null;
};

const cancelPathDrag = (stage?: any) => {
  // 先清除临时图层的所有内容
  const tempLayer = getKonvaNode(tempLayerRef.value);
  if (tempLayer) {
    // 获取所有子节点并销毁它们
    const children = tempLayer.getChildren();
    children.forEach((child: any) => {
      child.destroy();
    });
    tempLayer.clear();
  }
  
  // 使用 Object.assign 重置整个对象，触发更强的响应式更新
  Object.assign(pathDragState, {
    startPoint: null,
    currentPos: { x: 0, y: 0 },
    pathType: 'direct'
  });
  hoveredPointId.value = null;
  
  const targetStage = stage || getKonvaNode(stageRef.value);
  if (targetStage && targetStage.container) {
    targetStage.container().style.cursor = 'default';
  }
  
  // 立即强制重绘整个舞台
  const stageNode = getKonvaNode(stageRef.value);
  if (stageNode) {
    stageNode.batchDraw();
  }
  
  // 使用 nextTick 等待 Vue 响应式更新完成后再次确认
  nextTick(() => {
    const layer = getKonvaNode(tempLayerRef.value);
    const stage = getKonvaNode(stageRef.value);
    
    if (layer) {
      // 再次确保清除所有子节点
      const children = layer.getChildren();
      children.forEach((child: any) => {
        child.destroy();
      });
      layer.clear();
      layer.batchDraw();
    }
    
    if (stage) {
      stage.batchDraw();
    }
  });
};

// 设置画布鼠标样式
const setStageCursor = (cursor: string) => {
  const stage = getKonvaNode(stageRef.value);
  if (stage && stage.container) {
    stage.container().style.cursor = cursor;
  }
};
const pendingDashedLinkStartPoint = ref<MapPoint | null>(null);

// 拖拽状态
const isDragging = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });

// 获取点的 Konva 配置
const getPointConfig = (point: MapPoint) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(point.id);
  const isDashedLinkSource = currentTool.value === ToolMode.DASHED_LINK && pendingDashedLinkStartPoint.value?.id === point.id;
  const isPathStart = currentTool.value === ToolMode.PATH && pathDragState.startPoint?.id === point.id;
  const isPathHovered = currentTool.value === ToolMode.PATH && hoveredPointId.value === point.id && !isPathStart;
  const visual = getPointVisualMeta(point);
  
  let fill = visual.fill;
  let stroke = visual.stroke;
  let strokeWidth = visual.strokeWidth;
  
  if (isSelected) {
    fill = '#ff4d4f';
    stroke = '#ff7875';
    strokeWidth = Math.max(2, strokeWidth);
  } else if (isPathStart) {
    fill = '#409eff';
    stroke = '#73c0ff';
    strokeWidth = Math.max(2.2, strokeWidth);
  } else if (isPathHovered) {
    stroke = '#73c0ff';
    strokeWidth = Math.max(2, strokeWidth);
  } else if (isDashedLinkSource) {
    fill = '#f7ba2a';
    stroke = '#f5d48f';
    strokeWidth = Math.max(2, strokeWidth);
  }
  
  return {
    id: point.id,
    x: point.x,
    y: point.y,
    radius: visual.radius,
    fill,
    stroke,
    strokeWidth,
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
  
  const connectionType = path.type as 'direct' | 'orthogonal' | 'curve' | undefined;
  const isCurve = path.geometry.pathType === 'curve' || connectionType === 'curve';
  const isOrthogonal = connectionType === 'orthogonal';
  
  return {
    id: path.id,
    points,
    stroke: isSelected ? '#ff4d4f' : (path.editorProps.strokeColor || '#52c41a'),
    strokeWidth: path.editorProps.strokeWidth || 2,
    lineCap: 'round',
    lineJoin: isOrthogonal ? 'miter' : 'round',
    tension: isCurve ? 0.5 : 0,
    dash: path.editorProps.lineStyle === 'dashed' ? [5, 5] : undefined,
    listening: true
  };
};

const shouldShowPathArrow = (path: MapPath) => {
  return path.editorProps.arrowVisible !== false;
};

const getPathArrowConfig = (path: MapPath) => {
  const controlPoints = path.geometry.controlPoints;
  if (!controlPoints || controlPoints.length < 2) {
    return null;
  }
  const end = controlPoints[controlPoints.length - 1];
  const prev = controlPoints[controlPoints.length - 2];
  const isSelected = mapEditorStore.selection.selectedIds.has(path.id);
  const stroke = isSelected ? '#ff4d4f' : (path.editorProps.strokeColor || '#52c41a');
  return {
    points: [prev.x, prev.y, end.x, end.y],
    pointerLength: PATH_ARROW.radius * 2.2,
    pointerWidth: PATH_ARROW.radius * 1.5,
    fill: stroke,
    stroke,
    strokeWidth: path.editorProps.strokeWidth || 2
  };
};

type PointLike = { x: number; y: number };

const buildConnectionControlPoints = (start: PointLike, end: PointLike, type: PathConnectionType) => {
  const timestamp = Date.now();
  let index = 0;
  const createControlPoint = (x: number, y: number) => ({
    id: `cp_${timestamp}_${index++}`,
    x,
    y
  });
  
  const points = [createControlPoint(start.x, start.y)];
  
  if (type === 'orthogonal' && start.x !== end.x && start.y !== end.y) {
    points.push(createControlPoint(start.x, end.y));
  } else if (type === 'curve') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const offset = Math.min(80, length / 3);
    const midX = (start.x + end.x) / 2 + normalX * offset;
    const midY = (start.y + end.y) / 2 + normalY * offset;
    points.push(createControlPoint(midX, midY));
  }
  
  points.push(createControlPoint(end.x, end.y));
  return points;
};

const formatPointLabel = (point: MapPoint) => point.name || point.id;

const createConnectionBetweenPoints = (start: MapPoint, end: MapPoint) => {
  const connectionType = mapEditorStore.pathConnectionType;
  const controlPoints = buildConnectionControlPoints(start, end, connectionType);
  const startLabel = formatPointLabel(start);
  const endLabel = formatPointLabel(end);
  const pathName = `Path ${startLabel} --- ${endLabel}`;
  
  mapEditorStore.addPath({
    layerId: getDefaultLayerId('path'),
    name: pathName,
    startPointId: start.id,
    endPointId: end.id,
    status: '0',
    type: connectionType,
    geometry: {
      controlPoints,
      pathType: connectionType === 'curve' ? 'curve' : 'line'
    },
    editorProps: {
      strokeColor: '#52c41a',
      strokeWidth: 2,
      lineStyle: 'solid',
      arrowVisible: true,
      labelVisible: true
    }
  });
  
  ElMessage.success('连线创建成功');
};

const getLocationCentroid = (location: MapLocation) => {
  const vertices = location.geometry.vertices || [];
  if (!vertices.length) {
    return {
      x: location.x ?? 0,
      y: location.y ?? 0
    };
  }
  const sum = vertices.reduce(
    (acc, vertex) => {
      acc.x += vertex.x;
      acc.y += vertex.y;
      return acc;
    },
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / vertices.length,
    y: sum.y / vertices.length
  };
};

// 判断该 Location 是否为规则区域（使用规则区域的颜色样式）
const isRuleRegionLocation = (location: MapLocation) => {
  const stroke = location.editorProps?.strokeColor;
  const fill = location.editorProps?.fillColor;
  return stroke === '#ff7d00' || fill === '#ffedd9';
};

// 获取业务位置的小正方形方框配置
const getLocationRectConfig = (location: MapLocation) => {
  const centroid = getLocationCentroid(location);
  const isSelected = mapEditorStore.selection.selectedIds.has(location.id);
  const size = 40; // 业务位置小方框尺寸
  const half = size / 2;

  return {
    x: centroid.x - half,
    y: centroid.y - half,
    width: size,
    height: size,
    stroke: isSelected ? '#409eff' : '#000000',
    strokeWidth: 2,
    fill: '#ffffff',
    listening: true
  };
};

// 获取位置中心 symbol 文本的配置
const getLocationSymbolConfig = (location: MapLocation) => {
  const centroid = getLocationCentroid(location);
  const isSelected = mapEditorStore.selection.selectedIds.has(location.id);
  const text = location.editorProps?.label || '';

  return {
    x: centroid.x,
    y: centroid.y,
    text,
    fontSize: 16,
    fontStyle: 'bold',
    fill: isSelected ? '#ff4d4f' : '#000000',
    align: 'center',
    verticalAlign: 'middle',
    listening: false
  };
};

const createDashedLinkBetweenPointAndLocation = (point: MapPoint, location: MapLocation) => {
  const centroid = getLocationCentroid(location);
  const timestamp = Date.now();
  const controlPoints = [
    { id: `dl_${timestamp}_0`, x: point.x, y: point.y },
    { id: `dl_${timestamp}_1`, x: centroid.x, y: centroid.y }
  ];
  
  mapEditorStore.addPath({
    layerId: getDefaultLayerId('path'),
    name: `Link ${point.name || point.id} -> ${location.name || location.id}`,
    startPointId: point.id,
    endPointId: location.id,
    status: '0',
    type: 'direct',
    geometry: {
      controlPoints,
      pathType: 'line'
    },
    editorProps: {
      strokeColor: '#909399',
      strokeWidth: 1.5,
      lineStyle: 'dashed',
      arrowVisible: false,
      label: `${point.name || point.id}→${location.name || location.id}`,
      labelVisible: true
    }
  });
  
  ElMessage.success('虚线链接已创建');
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

const getPolygonPreviewStyles = (tool: ToolMode | null) => {
  if (tool === ToolMode.RULE_REGION) {
    return {
      stroke: '#ff7d00',
      fill: 'rgba(255, 125, 0, 0.15)'
    };
  }
  return {
    stroke: '#1890ff',
    fill: 'rgba(24, 144, 255, 0.1)'
  };
};

const getPolygonPersistStyles = (tool: ToolMode | null) => {
  if (tool === ToolMode.RULE_REGION) {
    return {
      strokeColor: '#ff7d00',
      strokeWidth: 2,
      fillColor: '#ffedd9',
      fillOpacity: 0.35
    };
  }
  return {
    strokeColor: '#1890ff',
    strokeWidth: 2,
    fillColor: '#1890ff',
    fillOpacity: 0.3
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
    const pointPayload = createPointPayload(x, y);
    
    // 记录到历史
    const command = new AddPointCommand(
      pointPayload,
      (p) => mapEditorStore.addPoint(p),
      (id) => mapEditorStore.deletePoint(id)
    );
    mapEditorStore.executeCommand(command);
  } else if (currentTool.value === ToolMode.LOCATION) {
    // 业务位置：单击直接创建一个小正方形方框
    const size = 40;
    const half = size / 2;
    const timestamp = Date.now();
    const vertices = [
      { id: `loc_${timestamp}_v1`, x: x - half, y: y - half },
      { id: `loc_${timestamp}_v2`, x: x + half, y: y - half },
      { id: `loc_${timestamp}_v3`, x: x + half, y: y + half },
      { id: `loc_${timestamp}_v4`, x: x - half, y: y + half }
    ];
    
    mapEditorStore.addLocation({
      layerId: getDefaultLayerId('location'),
      name: `Location-${Date.now()}`,
      status: '0',
      geometry: {
        vertices,
        closed: true
      },
      editorProps: {
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: '#000000',
        strokeWidth: 2,
        labelVisible: true
      }
    });
  } else if (currentTool.value === ToolMode.RULE_REGION) {
    // 开始绘制位置（多边形）或添加顶点
    if (!isDrawing.value) {
      // 开始新的多边形
      isDrawing.value = true;
      activeDrawingTool.value = currentTool.value;
      drawingPoints.value = [{ x, y }];
    } else {
      // 添加顶点
      drawingPoints.value.push({ x, y });
    }
  } else if (currentTool.value === ToolMode.DASHED_LINK && e.target === stage) {
    if (pendingDashedLinkStartPoint.value) {
      pendingDashedLinkStartPoint.value = null;
      ElMessage.info('已取消虚线起点');
    }
  } else if (currentTool.value === ToolMode.PATH) {
    const clickedPoint = findPointAtPosition(x, y);
    if (clickedPoint) {
      pathDragState.startPoint = clickedPoint;
      pathDragState.currentPos = { x: clickedPoint.x, y: clickedPoint.y };
      pathDragState.pathType = mapEditorStore.pathConnectionType;
      stage.container().style.cursor = 'crosshair';
    } else {
      // 点击空白处，清除预览
      cancelPathDrag(stage);
    }
  } else if (e.target === stage) {
    // 点击空白处且不在路径工具模式，如果有残留预览也清除
    if (pathDragState.startPoint) {
      cancelPathDrag(stage);
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
  
  // 绘制位置预览
  if (isDrawing.value && drawingPoints.value.length > 0 && 
      (activeDrawingTool.value === ToolMode.LOCATION || activeDrawingTool.value === ToolMode.RULE_REGION)) {
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
    
    const previewStyle = getPolygonPreviewStyles(activeDrawingTool.value);
    tempLocation.value = {
      points,
      stroke: previewStyle.stroke,
      strokeWidth: 2,
      fill: previewStyle.fill,
      closed: drawingPoints.value.length >= 2,
      dash: [5, 5]
    };
  }

  if (currentTool.value === ToolMode.PATH) {
    const hoveredPoint = findPointAtPosition(x, y);
    hoveredPointId.value = hoveredPoint?.id || null;
    // 只有当 startPoint 存在时才更新预览位置
    if (pathDragState.startPoint) {
      pathDragState.currentPos = { x, y };
    }
  } else {
    // 如果不在路径工具模式，清除悬停状态
    hoveredPointId.value = null;
    // 如果还有残留的路径拖拽状态，清除它
    if (pathDragState.startPoint) {
      cancelPathDrag();
    }
  }
};

const handleMouseUp = (e: any) => {
  const stage = e.target?.getStage();
  
  // 平移模式结束
  if (currentTool.value === ToolMode.PAN && isDragging.value) {
    isDragging.value = false;
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }

  // 处理路径工具模式 - 鼠标松开时处理路径创建
  if (pathDragState.startPoint) {
    const startPoint = pathDragState.startPoint; // 保存引用，因为后面会清除
    let pathCreated = false;
    
    if (currentTool.value === ToolMode.PATH && stage && e.evt.button === 0) {
      // 左键松开时处理路径创建
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const x = (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
        const y = (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
        const endPoint = findPointAtPosition(x, y);
        if (endPoint && endPoint.id !== startPoint.id) {
          createConnectionBetweenPoints(startPoint, endPoint);
          pathCreated = true;
        } else if (endPoint && endPoint.id === startPoint.id) {
          ElMessage.info('请选择不同的终点');
        } else {
          ElMessage.warning('请拖拽到另一个点以创建连线');
        }
      }
    }
    
    // 无论是否创建成功，都清除路径拖拽状态和预览
    cancelPathDrag(stage);
    
    // 如果路径创建成功，切换回选择模式
    if (pathCreated) {
      mapEditorStore.setTool(ToolMode.SELECT);
    }
  } else if (currentTool.value === ToolMode.PATH && stage && e.evt.button === 0) {
    // 点击空白处清除残留的预览线
    cancelPathDrag(stage);
  }
  
  // 右键完成绘制
  if (e.evt.button === 2) {
  if (
    isDrawing.value &&
    (activeDrawingTool.value === ToolMode.LOCATION || activeDrawingTool.value === ToolMode.RULE_REGION) &&
    drawingPoints.value.length >= 3
  ) {
      // 完成位置绘制
      completeLocationDrawing();
    } else if (isDrawing.value) {
      // 取消绘制
      cancelLocationDrawing();
    }
  }
};

// 完成位置绘制
const completeLocationDrawing = () => {
  if (drawingPoints.value.length < 3) {
    ElMessage.warning('位置至少需要3个顶点');
    return;
  }
  
  const drawingTool = activeDrawingTool.value || ToolMode.LOCATION;
  const isRuleRegion = drawingTool === ToolMode.RULE_REGION;
  const polygonStyle = getPolygonPersistStyles(drawingTool);
  const location = mapEditorStore.addLocation({
    layerId: getDefaultLayerId('location'),
    name: `${isRuleRegion ? '规则区域' : '位置'}_${Date.now()}`,
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
      fillColor: polygonStyle.fillColor,
      fillOpacity: polygonStyle.fillOpacity,
      strokeColor: polygonStyle.strokeColor,
      strokeWidth: polygonStyle.strokeWidth,
      labelVisible: true
    }
  });
  
  isDrawing.value = false;
  drawingPoints.value = [];
  tempLocation.value = null;
  activeDrawingTool.value = null;
  
  ElMessage.success(isRuleRegion ? '规则区域绘制完成' : '位置绘制完成');
};

// 取消位置绘制
const cancelLocationDrawing = () => {
  isDrawing.value = false;
  drawingPoints.value = [];
  tempLocation.value = null;
  activeDrawingTool.value = null;
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
  
  if (currentTool.value === ToolMode.DASHED_LINK) {
    pendingDashedLinkStartPoint.value = point;
    ElMessage.info(`已选择点位：${point.name || point.id}，请点击业务位置完成虚线链接`);
    return;
  }
  
  if (currentTool.value === ToolMode.PATH) {
    return;
  }
  
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
      gridSize: gridSize.value,
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
  
  if (currentTool.value === ToolMode.DASHED_LINK) {
    if (!pendingDashedLinkStartPoint.value) {
      ElMessage.warning('请先选择需要连接的点位');
      return;
    }
    createDashedLinkBetweenPointAndLocation(pendingDashedLinkStartPoint.value, location);
    pendingDashedLinkStartPoint.value = null;
    return;
  }
  
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
      gridSize: gridSize.value,
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
      gridSize: gridSize.value,
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
  // 使用激活的图层，如果没有则使用第一个可用图层
  if (mapEditorStore.activeLayerId && mapEditorStore.layers.some(l => l.id === mapEditorStore.activeLayerId)) {
    return mapEditorStore.activeLayerId;
  }
  
  // 如果没有激活图层，尝试找默认图层
  const defaultLayer = mapEditorStore.layers.find(l => l.name === 'Default layer');
  if (defaultLayer) return defaultLayer.id;
  
  // 如果都没有，使用第一个可用图层
  if (mapEditorStore.layers.length > 0) {
    return mapEditorStore.layers[0].id;
  }
  
  // 如果没有任何图层，抛出错误（图层应该由后端创建）
  throw new Error('没有可用的图层，请先在后端创建地图模型');
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

watch(currentTool, (tool) => {
  if (tool !== ToolMode.PATH) {
    cancelPathDrag();
  }
  if (tool !== ToolMode.DASHED_LINK) {
    pendingDashedLinkStartPoint.value = null;
  }
  if (
    ![ToolMode.LOCATION, ToolMode.RULE_REGION].includes(tool) &&
    isDrawing.value
  ) {
    cancelLocationDrawing();
  }
});

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
  if (e.key === 'Escape') {
    if (
      (currentTool.value === ToolMode.LOCATION || currentTool.value === ToolMode.RULE_REGION) &&
      isDrawing.value
    ) {
      cancelLocationDrawing();
    } else if (currentTool.value === ToolMode.PATH && pathDragState.startPoint) {
      cancelPathDrag();
      ElMessage.info('已取消连线起点');
    } else if (currentTool.value === ToolMode.DASHED_LINK && pendingDashedLinkStartPoint.value) {
      pendingDashedLinkStartPoint.value = null;
      ElMessage.info('已取消虚线起点');
    }
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
  
  // 使用 load 接口返回的图层，不创建新的默认图层
  // 如果没有激活图层，选择第一个图层作为激活图层
  if (!mapEditorStore.activeLayerId || !mapEditorStore.layers.some(l => l.id === mapEditorStore.activeLayerId)) {
    const fallbackLayer = mapEditorStore.layers.find(l => l.name === 'Default layer') || mapEditorStore.layers[0];
    if (fallbackLayer) {
      mapEditorStore.setActiveLayer(fallbackLayer.id);
    }
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

