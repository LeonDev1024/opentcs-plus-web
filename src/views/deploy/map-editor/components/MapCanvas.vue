<template>
  <div class="map-canvas-container" ref="containerRef">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
      @contextmenu.prevent
    >
      <!-- 栅格底图层（导航地图）：始终在所有可见图层的最底部，仅内容按 config 显示 -->
      <v-layer
        ref="rasterLayerRef"
        :config="{ name: 'raster-background', listening: false }"
      >
        <v-image
          v-if="rasterBackgroundConfig && layerVisibility.raster"
          :config="rasterBackgroundConfig"
        />
      </v-layer>

      <!-- 空白区域层：仅用于接收"点击空白处"的 mousedown（框选/添加点等），不拦截点与位置上的拖拽 -->
      <v-layer :config="{ name: 'stage-area', listening: true }">
        <v-rect
          :config="stageAreaRectConfig"
          @mousedown="handleStageAreaMouseDown"
        />
      </v-layer>

      <!-- 路径层：先画全部连线，再画全部箭头（避免反向两条线叠在一起时后画的线盖住先画路径的箭头），最后画控制点 -->
      <v-layer ref="pathLayerRef" :config="{ name: 'path' }">
        <template v-for="path in visiblePaths" :key="`path-line-${path.id}`">
          <v-line
            :config="getPathConfig(path)"
            @click="handlePathClick(path, $event)"
            @contextmenu.prevent="handlePathContextMenu(path, $event)"
          />
        </template>
        <!-- 连线预览：放在路径层、点位层之下，避免盖住点标签；勿用粗虚线+圆端帽（Konva 会叠成「圆斑扇贝纹」） -->
        <template v-if="tempPathPreview && pathDragState.startPoint">
          <v-line
            :key="`preview-line-${pathDragState.startPoint.id}`"
            :config="tempPathPreview.line"
          />
        </template>
        <!-- 禁止 v-if 与 v-for 写在同一节点上（Vue3 优先级会导致箭头不渲染） -->
        <template v-for="path in visiblePaths" :key="`path-arrows-${path.id}`">
          <template
            v-if="layerVisibility.pathDirection && shouldShowPathArrow(path)"
          >
            <v-line
              v-for="(arrowCfg, ai) in getPathArrowConfigs(path)"
              :key="`${path.id}-arrow-${ai}`"
              :config="arrowCfg"
              @click="handlePathClick(path, $event)"
              @contextmenu.prevent="handlePathContextMenu(path, $event)"
            />
          </template>
        </template>
        <template v-for="path in visiblePaths" :key="`path-cp-${path.id}`">
          <template v-if="mapEditorStore.selection.selectedIds.has(path.id)">
            <v-circle
              v-for="(cp, index) in path.geometry.controlPoints"
              :key="`${path.id}-cp-${index}`"
              :config="getPathControlPointConfig(path, cp, index)"
              @click.stop="handlePathControlPointClick(path, cp, index, $event)"
              @dragstart="handlePathControlPointDragStart(path, cp, index)"
              @dragmove="
                handlePathControlPointDragMove(path, cp, index, $event)
              "
              @dragend="handlePathControlPointDragEnd(path, cp, index)"
            />
          </template>
        </template>
      </v-layer>

      <!-- 位置层 -->
      <v-layer ref="locationLayerRef" :config="{ name: 'location' }">
        <template v-for="location in visibleLocationsLayer" :key="location.id">
          <!-- 业务位置：显示为双层圆圈（与导航点一致）；规则区域仍显示为多边形 -->
          <template v-if="!isRuleRegionLocation(location)">
            <!-- 外圈：白色填充+绿色边框（先渲染） -->
            <v-circle :config="getLocationOuterConfig(location)" />
            <!-- 内圈：绿色实心（后渲染，显示在外圈上方） -->
            <v-circle :config="getLocationInnerConfig(location)" />
            <!-- 中心白点（与导航点一致） -->
            <v-circle :config="getLocationCenterDotConfig(location)" />
            <!-- 碰撞检测层（透明，接收点击事件） -->
            <v-circle
              :config="getLocationRectConfig(location)"
              @click="handleLocationClick(location, $event)"
              @contextmenu.prevent="handleLocationContextMenu(location, $event)"
              @mouseover="handleLocationMouseOver(location)"
              @mouseout="handleLocationMouseOut(location, $event)"
            />
          </template>
          <v-line
            v-else
            :config="getLocationConfig(location)"
            __use-strict-mode
            @click="handleLocationClick(location, $event)"
            @contextmenu.prevent="handleLocationContextMenu(location, $event)"
            @mouseover="handleLocationMouseOver(location)"
            @mouseout="handleLocationMouseOut(location, $event)"
            @dragstart="handleLocationDragStart"
            @dragend="handleLocationLineDragEnd(location, $event)"
          />
          <!-- 位置点图标（来自位置类型 symbol 属性） -->
          <v-image
            v-if="!isRuleRegionLocation(location) && getLocationIconConfig(location)"
            :key="`${location.id}-icon`"
            :config="getLocationIconConfig(location)"
          />
          <!-- 位置名称标签（固定在点位上方，唯一渲染） -->
          <v-text
            v-if="shouldShowLocationLabel(location)"
            :key="`${location.id}-label`"
            :config="getLocationLabelConfig(location)"
          />
          <!-- 业务位置透明拖拽层：盖在最上层，便于点击拖拽 -->
          <v-rect
            v-if="
              !isRuleRegionLocation(location) &&
              getLocationDragOverlayConfig(location)
            "
            :key="`${location.id}-overlay`"
            :config="getLocationDragOverlayConfig(location)"
            __use-strict-mode
            @mouseover="handleLocationMouseOver(location)"
            @mouseout="handleLocationMouseOut(location, $event)"
            @dragstart="handleLocationDragStart"
            @dragend="handleLocationOverlayDragEnd(location, $event)"
          />
          <!-- 位置中心点（虚线链接工具模式下，悬停或选中时显示） -->
          <v-circle
            v-if="
              currentTool === ToolMode.DASHED_LINK &&
              (hoveredLocationId === location.id ||
                dashedLinkDragState.startLocation?.id === location.id)
            "
            :key="`${location.id}-center`"
            :config="getLocationCenterPointConfig(location)"
            @click="handleLocationCenterClick(location, $event)"
            @mousedown="handleLocationCenterMouseDown(location, $event)"
            @mouseup="handleLocationCenterMouseUp(location, $event)"
            @mouseover="handleLocationCenterMouseOver(location)"
            @mouseout="handleLocationCenterMouseOut"
          />
          <!-- 位置顶点（已隐藏，不再显示） -->
        </template>
      </v-layer>

      <!-- 点位层：置于路径/位置之上，便于画线后仍易选中点 -->
      <v-layer ref="pointLayerRef" :config="{ name: 'point' }">
        <template
          v-for="point in visiblePoints"
          :key="`${point.id}-${currentTool}`"
        >
          <!-- 路网点靶心（外白蓝边 → 类型色实心 → 中心白点），上层透明圆负责命中 -->
          <v-circle
            :config="getPointBullseyeOuterConfig(point)"
            __use-strict-mode
          />
          <v-circle
            :config="getPointBullseyeCoreConfig(point)"
            __use-strict-mode
          />
          <v-circle
            v-if="getPointBullseyeDotVisible(point)"
            :config="getPointBullseyeDotConfig(point)"
            __use-strict-mode
          />
          <v-circle
            :config="getPointHitConfig(point)"
            __use-strict-mode
            @click="handlePointClick(point, $event)"
            @dblclick="handlePointDoubleClick(point, $event)"
            @dragstart="handlePointDragStart(point)"
            @dragmove="handlePointDragMove(point, $event)"
            @dragend="handlePointDragEnd(point)"
            @mouseenter="handlePointMouseEnter"
            @mouseout="handlePointMouseOut"
            @contextmenu.prevent="handlePointContextMenu(point, $event)"
          />
          <!-- 点标签 -->
          <v-text
            v-if="shouldShowPointLabel(point)"
            :key="`${point.id}-label`"
            :config="getPointLabelConfig(point)"
          />
          <!-- 点 Glyph（例如 P 表示停车点） -->
          <v-text
            v-if="shouldRenderPointGlyph(point)"
            :key="`${point.id}-glyph`"
            :config="getPointGlyphConfig(point)"
          />
        </template>
      </v-layer>

      <!-- 临时绘制层（用于预览） -->
      <v-layer ref="tempLayerRef" :config="{ name: 'temp' }">
        <!-- 仿真车辆 -->
        <v-rect
          v-if="simulationVehicleConfig"
          :config="simulationVehicleConfig"
        />
        <template v-if="simulationVehicleConfig">
          <!-- 仿真车辆头部指示（Konva 无 Polygon 节点，用 closed Line） -->
          <v-line
            :config="{
              points: [
                simulationVehicleConfig.x +
                  12 *
                    Math.cos(
                      ((simulationVehicleConfig.rotation - 90) * Math.PI) / 180,
                    ),
                simulationVehicleConfig.y +
                  12 *
                    Math.sin(
                      ((simulationVehicleConfig.rotation - 90) * Math.PI) / 180,
                    ),
                simulationVehicleConfig.x +
                  6 *
                    Math.cos(
                      ((simulationVehicleConfig.rotation + 150) * Math.PI) /
                        180,
                    ),
                simulationVehicleConfig.y +
                  6 *
                    Math.sin(
                      ((simulationVehicleConfig.rotation + 150) * Math.PI) /
                        180,
                    ),
                simulationVehicleConfig.x +
                  6 *
                    Math.cos(
                      ((simulationVehicleConfig.rotation + 210) * Math.PI) /
                        180,
                    ),
                simulationVehicleConfig.y +
                  6 *
                    Math.sin(
                      ((simulationVehicleConfig.rotation + 210) * Math.PI) /
                        180,
                    ),
              ],
              fill: '#529B2E',
              closed: true,
            }"
          />
        </template>
        <v-line v-if="tempLocation" :config="tempLocation" />
        <!-- 虚线链接预览 -->
        <v-line
          v-if="tempDashedLinkPreview && dashedLinkDragState.startLocation"
          :key="`dashed-link-preview-${dashedLinkDragState.startLocation.id}`"
          :config="tempDashedLinkPreview"
        />
        <!-- 框选矩形 -->
        <v-rect v-if="isBoxSelecting" :config="boxSelectConfig" />
        <!-- 操作手柄 -->
        <template v-for="handle in resizeHandles" :key="handle.id">
          <v-circle
            :config="getHandleConfig(handle)"
            @mousedown="handleResizeStart(handle, $event)"
          />
        </template>
        <!-- 地图问题标记 -->
        <template v-for="marker in mapIssueMarkers" :key="marker.id">
          <v-circle v-if="marker" :config="marker.circle" />
          <v-text v-if="marker" :config="marker.icon" />
          <v-text v-if="marker" :config="marker.label" />
        </template>
      </v-layer>

      <!-- 坐标轴层（只读展示，地图原点编辑在管理控制台进行） -->
      <v-layer :config="{ name: 'axes', listening: false }">
        <!-- 地图/导航原点（虚线） -->
        <v-line :config="mapOriginXLineConfig" />
        <v-line :config="mapOriginYLineConfig" />
        <v-line :config="mapOriginXArrowConfig" />
        <v-line :config="mapOriginYArrowConfig" />

        <!-- 场景/工厂原点 O(0,0)（实线） -->
        <v-line :config="axisXLineConfig" />
        <v-line :config="axisYLineConfig" />
        <v-line :config="axisXArrowConfig" />
        <v-line :config="axisYArrowConfig" />
      </v-layer>
    </v-stage>

    <!-- Location 编辑对话框 -->
    <LocationEditDialog
      v-model:visible="locationEditDialogVisible"
      :location-id="editingLocationId"
      @save="handleLocationEditSave"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  withDefaults,
} from "vue";
import { useThrottleFn } from "@vueuse/core";
import { useMapEditorStore } from "@/store/modules/mapEditor";
import {
  ToolMode,
  LayerType,
  defaultMapLayerVisibility,
} from "@/types/mapEditor";
import type {
  MapPoint,
  MapPath,
  MapLocation,
  MapLayerVisibility,
} from "@/types/mapEditor";
import { AddPointCommand, MovePointCommand } from "@/utils/mapEditor/command";
import { snapPoint } from "@/utils/mapEditor/snap";
import {
  PATH_RIBBON_STROKE_WIDTH,
  DASHED_LINK_STROKE_WIDTH,
  DASHED_LINK_DASH_PATTERN,
  DEFAULT_POINT_OUTER_RADIUS,
  POINT_TYPE_RADIUS,
} from "@/utils/mapEditor/mapVisualTokens";
import { POINT_TYPE, getPointVisualMeta } from "@/utils/mapEditor/pointStyle";
import type { LocationVO } from "@/api/deploy/factory/location-type/types";
import LocationEditDialog from "./LocationEditDialog.vue";
import {
  useLocationTypes,
  useCanvasAxis,
  useCanvasViewport,
  getKonvaNode,
  usePointRendering,
  usePathRendering,
  PATH_ARROW,
  PATH_PREVIEW_STROKE,
  useLocationRendering,
  BUSINESS_LOCATION_BOX_SIZE,
  AXIS_ARM,
} from "../composables";

// 节流标志 - 拖拽时设为 true 禁用节流
const isDraggingState = ref(false);

// 鼠标位置更新节流（使用 requestAnimationFrame）
let lastMouseUpdate = 0;
const MOUSE_UPDATE_INTERVAL = 16; // 约 60fps

const updateMousePosition = (x: number, y: number) => {
  const now = performance.now();
  if (now - lastMouseUpdate >= MOUSE_UPDATE_INTERVAL) {
    mousePosition.value = { x, y };
    lastMouseUpdate = now;
  }
};

// 注册 vue-konva 组件（如果全局注册不工作，则在组件内注册）
// 注意：vue-konva 3.x 使用 v-stage, v-layer 等组件名

const mapEditorStore = useMapEditorStore();

// 定义属性
const props = withDefaults(
  defineProps<{
    layerVisibility?: MapLayerVisibility;
    autoSwitchTool?: boolean;
    isSimulating?: boolean;
    simulationPathId?: string | null;
    simulationProgress?: number;
    mapIssues?: Array<{
      id: string;
      type: "disconnected" | "intersection" | "radius" | "overlap";
      severity: "warning" | "error";
      message: string;
      elementIds: string[];
      position?: { x: number; y: number };
    }>;
  }>(),
  {
    layerVisibility: () => defaultMapLayerVisibility(),
  },
);

// 定义事件
const emit = defineEmits<{
  "point-double-click": [point: MapPoint];
  "path-context-menu": [path: MapPath, x: number, y: number];
}>();

// 获取自动切换工具的状态（默认不自动切换）
const shouldAutoSwitchTool = computed(() => props.autoSwitchTool ?? false);

type PathConnectionType = "direct" | "orthogonal" | "curve";

// Refs
const containerRef = ref<HTMLDivElement>();
const stageRef = ref<any>();
const gridLayerRef = ref<any>();
const rasterLayerRef = ref<any>();
const pointLayerRef = ref<any>();
const pathLayerRef = ref<any>();
const locationLayerRef = ref<any>();
const tempLayerRef = ref<any>();

// 导出画布为图片
const exportAsImage = async (format: "png" | "svg"): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const stage = getKonvaNode(stageRef.value);
      if (!stage) {
        reject(new Error("画布未就绪"));
        return;
      }

      // 临时隐藏UI元素（框选矩形、问题标记等）
      const originalBoxSelecting = isBoxSelecting.value;
      isBoxSelecting.value = false;

      if (format === "png") {
        // 导出为PNG
        const dataUrl = stage.toDataURL({
          pixelRatio: 2, // 2倍分辨率
          mimeType: "image/png",
        });
        isBoxSelecting.value = originalBoxSelecting;
        resolve(dataUrl);
      } else {
        // 导出为SVG
        // Konva不直接支持SVG导出，需要手动构建
        const points = mapEditorStore.points;
        const paths = mapEditorStore.paths;
        const locations = mapEditorStore.locations;

        // 计算画布范围
        let minX = 0,
          maxX = 1000,
          minY = 0,
          maxY = 1000;
        const allElements = [
          ...points,
          ...paths.flatMap((p) => p.geometry.controlPoints || []),
          ...locations.flatMap((l) => l.geometry.vertices || []),
        ];
        if (allElements.length > 0) {
          const xs = allElements.map((e) => e.x).filter((x) => x !== undefined);
          const ys = allElements.map((e) => e.y).filter((y) => y !== undefined);
          if (xs.length > 0) {
            minX = Math.min(...xs) - 50;
            maxX = Math.max(...xs) + 50;
            minY = Math.min(...ys) - 50;
            maxY = Math.max(...ys) + 50;
          }
        }

        const width = maxX - minX;
        const height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;

        // 添加样式
        svg += `<style>
          .point { fill: #409EFF; stroke: #fff; }
          .point-selected { fill: #ff4d4f; }
          .path { stroke: #73c0ff; stroke-width: 2; fill: none; }
          .path-selected { stroke: #ff4d4f; }
          .location { fill: #B37FEB; stroke: #909399; stroke-width: 2; }
        </style>`;

        // 绘制路径
        paths.forEach((path) => {
          const isSelected = mapEditorStore.selection.selectedIds.has(path.id);
          const pointsStr = path.geometry.controlPoints
            .map((cp: any) => `${cp.x},${cp.y}`)
            .join(" ");
          svg += `<polyline points="${pointsStr}" class="path ${isSelected ? "path-selected" : ""}" />`;
        });

        // 绘制位置区域
        locations.forEach((location) => {
          const isSelected = mapEditorStore.selection.selectedIds.has(
            location.id,
          );
          const vertices = location.geometry.vertices || [];
          if (vertices.length > 0) {
            const pointsStr = vertices
              .map((v: any) => `${v.x},${v.y}`)
              .join(" ");
            svg += `<polygon points="${pointsStr}" class="location ${isSelected ? "path-selected" : ""}" />`;
          }
        });

        // 绘制点位
        points.forEach((point) => {
          const isSelected = mapEditorStore.selection.selectedIds.has(point.id);
          svg += `<circle cx="${point.x}" cy="${point.y}" r="${point.editorProps?.radius || DEFAULT_POINT_OUTER_RADIUS}" class="point ${isSelected ? "point-selected" : ""}" />`;
        });

        svg += "</svg>";

        isBoxSelecting.value = originalBoxSelecting;

        // 转换为data URL
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
        resolve(dataUrl);
      }
    } catch (error) {
      reject(error);
    }
  });
};

const currentTool = computed(() => mapEditorStore.currentTool);

/**
 * 指针 → 模型坐标。Konva 的 getPointerPosition() 在 vue-konva 的 mousemove 里经常为 null（内部未同步），
 * 必须用 clientX/clientY 相对 stage 容器换算，否则连线预览永远不更新。
 */
const pointerToModelFromStageEvent = (
  stage: any,
  e: any,
): { x: number; y: number } | null => {
  if (!stage?.container) return null;
  const cs = mapEditorStore.canvasState;
  const ox = cs.offsetX;
  const oy = cs.offsetY;
  const s = cs.scale || 1;

  const pp = stage.getPointerPosition?.();
  let px: number;
  let py: number;
  if (
    pp != null &&
    typeof pp.x === "number" &&
    typeof pp.y === "number" &&
    !Number.isNaN(pp.x) &&
    !Number.isNaN(pp.y)
  ) {
    px = pp.x;
    py = pp.y;
  } else {
    const ev = e?.evt ?? e?.nativeEvent ?? e;
    const cx = ev?.clientX;
    const cy = ev?.clientY;
    if (cx == null || cy == null) return null;
    const rect = stage.container().getBoundingClientRect();
    px = cx - rect.left;
    py = cy - rect.top;
  }
  return {
    x: (px - ox) / s,
    y: (py - oy) / s,
  };
};

/** 选择指针：元素选中/拖拽 */
const isSelectInteractionTool = computed(
  () => currentTool.value === ToolMode.SELECT,
);
/** 漫游：仅画布拖拽 */
const isPanInteractionTool = computed(() => currentTool.value === ToolMode.PAN);



// ==================== 仿真功能 ====================

// 计算仿真车辆在路径上的位置
const simulationVehiclePosition = computed(() => {
  if (!props.isSimulating || !props.simulationPathId) {
    return null;
  }

  const path = mapEditorStore.paths.find(
    (p) => p.id === props.simulationPathId,
  );
  if (
    !path ||
    !path.geometry.controlPoints ||
    path.geometry.controlPoints.length < 2
  ) {
    return null;
  }

  const controlPoints = path.geometry.controlPoints;
  const progress = (props.simulationProgress || 0) / 100;

  // 计算路径总长度
  let totalLength = 0;
  const segments: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    length: number;
  }[] = [];

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const start = controlPoints[i];
    const end = controlPoints[i + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    segments.push({ start, end, length });
    totalLength += length;
  }

  if (totalLength === 0) return null;

  // 根据进度计算当前位置
  const targetLength = totalLength * progress;
  let accumulatedLength = 0;

  for (const segment of segments) {
    if (accumulatedLength + segment.length >= targetLength) {
      const segmentProgress =
        (targetLength - accumulatedLength) / segment.length;
      return {
        x:
          segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
        y:
          segment.start.y + (segment.end.y - segment.start.y) * segmentProgress,
        angle:
          (Math.atan2(
            segment.end.y - segment.start.y,
            segment.end.x - segment.start.x,
          ) *
            180) /
          Math.PI,
      };
    }
    accumulatedLength += segment.length;
  }

  // 如果到达终点，返回终点位置
  const lastSegment = segments[segments.length - 1];
  return {
    x: lastSegment.end.x,
    y: lastSegment.end.y,
    angle:
      (Math.atan2(
        lastSegment.end.y - lastSegment.start.y,
        lastSegment.end.x - lastSegment.start.x,
      ) *
        180) /
      Math.PI,
  };
});

// 仿真车辆配置
const simulationVehicleConfig = computed(() => {
  const pos = simulationVehiclePosition.value;
  if (!pos) return null;

  return {
    x: pos.x,
    y: pos.y,
    rotation: pos.angle,
    width: 24,
    height: 16,
    fill: "#67C23A",
    stroke: "#529B2E",
    strokeWidth: 2,
    cornerRadius: 4,
    shadowColor: "#000",
    shadowBlur: 8,
    shadowOpacity: 0.3,
    shadowOffset: { x: 2, y: 2 },
  };
});

// 地图问题标记配置
const mapIssueMarkers = computed(() => {
  if (!props.mapIssues || props.mapIssues.length === 0) return [];

  return props.mapIssues
    .map((issue) => {
      if (!issue.position) return null;

      const isWarning = issue.severity === "warning";

      return {
        id: issue.id,
        // 警示圈
        circle: {
          x: issue.position.x,
          y: issue.position.y,
          radius: isWarning ? 14 : 16,
          stroke: isWarning ? "#E6A23C" : "#F56C6C",
          strokeWidth: 2,
          dash: isWarning ? [4, 2] : undefined,
          fill: "transparent",
        },
        // 警示图标
        icon: {
          x: issue.position.x,
          y: issue.position.y,
          text: isWarning ? "⚠" : "✕",
          fontSize: 14,
          fill: isWarning ? "#E6A23C" : "#F56C6C",
          align: "center",
          verticalAlign: "middle",
        },
        // 标签
        label: {
          x: issue.position.x,
          y: issue.position.y + 22,
          text:
            issue.message.length > 15
              ? issue.message.substring(0, 15) + "..."
              : issue.message,
          fontSize: 10,
          fill: isWarning ? "#E6A23C" : "#F56C6C",
          align: "center",
        },
      };
    })
    .filter(Boolean);
});


// 鼠标位置
const mousePosition = ref({ x: 0, y: 0 });

// 临时绘制数据
const tempLocation = ref<any>(null);
const isDrawing = ref(false);
const drawingPoints = ref<Array<{ x: number; y: number }>>([]);
const activeDrawingTool = ref<ToolMode | null>(null);

// 标记绘制点后需要切换工具
const shouldSwitchToSelectAfterPoint = ref(false);
// 标记其他工具绘制后需要切换工具
const shouldSwitchToSelectAfterOther = ref<{ tool: ToolMode } | null>(null);

// 连线状态
const hoveredPointId = ref<string | null>(null);

const pathDragState = reactive<{
  startPoint: MapPoint | null;
  currentPos: { x: number; y: number };
  pathType: PathConnectionType;
}>({
  startPoint: null,
  currentPos: { x: 0, y: 0 },
  pathType: "direct",
});


/** 拖动地图点时，实时同步所有以该点为端点的路径控制点，避免描边透明时只见箭头、线不跟随 */
const syncPathControlPointsForPointMove = (
  pointId: string,
  newX: number,
  newY: number,
) => {
  const pid = String(pointId);
  mapEditorStore.paths.forEach((path) => {
    const cps = path.geometry.controlPoints;
    if (!cps.length) return;
    const startId =
      path.startPointId != null ? String(path.startPointId) : null;
    const endId = path.endPointId != null ? String(path.endPointId) : null;
    let updated: typeof cps | null = null;
    if (startId === pid) {
      updated = [...cps];
      updated[0] = { ...updated[0], x: newX, y: newY };
    }
    if (endId === pid) {
      updated = updated ?? [...cps];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        x: newX,
        y: newY,
      };
    }
    if (updated) {
      mapEditorStore.updatePath(path.id, {
        geometry: { ...path.geometry, controlPoints: updated },
      });
    }
  });
};


const cancelPathDrag = (stage?: any) => {
  // 不要手动 destroy/clear 整个 tempLayer：子节点由 vue-konva 管理，destroy 会导致预览线等无法再次挂载
  Object.assign(pathDragState, {
    startPoint: null,
    currentPos: { x: 0, y: 0 },
    pathType: "direct",
  });
  hoveredPointId.value = null;

  const targetStage = stage || getKonvaNode(stageRef.value);
  if (targetStage && targetStage.container) {
    targetStage.container().style.cursor = "default";
  }

  const stageNode = getKonvaNode(stageRef.value);
  stageNode?.batchDraw?.();
  nextTick(() => {
    getKonvaNode(pathLayerRef.value)?.batchDraw?.();
    getKonvaNode(tempLayerRef.value)?.batchDraw?.();
    getKonvaNode(stageRef.value)?.batchDraw?.();
  });
};

/** vue-konva Stage 上 @mousemove 常收不到或 getPointerPosition 不同步，用 window 监听保证橡皮筋预览 */
let pathPreviewGlobalMove: ((ev: MouseEvent) => void) | null = null;

const stopPathPreviewGlobalMove = () => {
  if (pathPreviewGlobalMove) {
    window.removeEventListener("mousemove", pathPreviewGlobalMove);
    pathPreviewGlobalMove = null;
  }
};

watch(
  () =>
    pathDragState.startPoint != null &&
    mapEditorStore.currentTool === ToolMode.PATH,
  (active) => {
    stopPathPreviewGlobalMove();
    if (!active) return;
    pathPreviewGlobalMove = (ev: MouseEvent) => {
      const stage = getKonvaNode(stageRef.value);
      if (!stage?.container()) return;
      const rect = stage.container().getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const cs = mapEditorStore.canvasState;
      const s = cs.scale || 1;
      pathDragState.currentPos = {
        x: (px - cs.offsetX) / s,
        y: (py - cs.offsetY) / s,
      };
      const hp = findPointAtPosition(
        pathDragState.currentPos.x,
        pathDragState.currentPos.y,
      );
      hoveredPointId.value = hp?.id ?? null;
      getKonvaNode(pathLayerRef.value)?.batchDraw?.();
    };
    window.addEventListener("mousemove", pathPreviewGlobalMove, {
      passive: true,
    });
  },
  { flush: "post" },
);

// 设置画布鼠标样式
const setStageCursor = (cursor: string) => {
  const stage = getKonvaNode(stageRef.value);
  if (stage && stage.container) {
    stage.container().style.cursor = cursor;
  }
};

// 选择工具下，鼠标移入可拖拽元素时显示十字箭头（move）
const handlePointMouseEnter = () => {
  if (isSelectInteractionTool.value && !isDragging.value) {
    setStageCursor("move");
  }
};
const handlePointMouseOut = () => {
  if (!isDragging.value) {
    setStageCursor(isPanInteractionTool.value ? "grab" : "default");
  }
};
// 虚线链接拖拽状态（从 location 连接到 point）
const dashedLinkDragState = reactive<{
  startLocation: MapLocation | null;
  currentPos: { x: number; y: number };
}>({
  startLocation: null,
  currentPos: { x: 0, y: 0 },
});

// 悬停的位置ID（用于显示中心点）
const hoveredLocationId = ref<string | null>(null);

// 拖拽状态
const isDragging = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });
/** 正在拖拽路径控制点时，用于透明路径临时显示描边 */
const pathControlPointDragPathId = ref<string | null>(null);

// 手动拖拽状态：不依赖 Konva 的 draggable，由 Stage mousedown/move/up 驱动
type ManualDragState =
  | {
      kind: "point";
      pointId: string;
      node: any;
      startModelX: number;
      startModelY: number;
    }
  | {
      kind: "location";
      location: MapLocation;
      node: any;
      isOverlay: boolean;
      startModelX: number;
      startModelY: number;
    };
const manualDragState = ref<ManualDragState | null>(null);

// 框选状态
const isBoxSelecting = ref(false);
const boxSelectStart = ref({ x: 0, y: 0 });
const boxSelectEnd = ref({ x: 0, y: 0 });
const boxSelectAppend = ref(false); // 是否为追加模式（Shift+框选）

// 空格键状态
const isSpacePressed = ref(false);

// 操作手柄状态
const resizeHandles = ref<
  Array<{ id: string; x: number; y: number; type: string }>
>([]);
const isResizing = ref(false);
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeElementId = ref<string | null>(null);
const resizeHandleType = ref<string | null>(null);

// 获取默认图层ID
const getDefaultLayerId = (type: "point" | "path" | "location"): string => {
  // 使用激活的图层，如果没有则使用第一个可用图层
  if (
    mapEditorStore.activeLayerId &&
    mapEditorStore.layers.some((l) => l.id === mapEditorStore.activeLayerId)
  ) {
    return mapEditorStore.activeLayerId;
  }

  // 如果没有激活图层，尝试找默认图层
  const defaultLayer = mapEditorStore.layers.find(
    (l) => l.name === "Default layer",
  );
  if (defaultLayer) return defaultLayer.id;

  // 如果都没有，使用第一个可用图层
  if (mapEditorStore.layers.length > 0) {
    return mapEditorStore.layers[0].id;
  }

  // 如果没有任何图层，抛出错误（图层应该由后端创建）
  throw new Error("没有可用的图层，请先在后端创建地图模型");
};

// ========== 组合式函数（渲染逻辑） ==========
const {
  locationTypeList, loadLocationTypes, getSymbolForLocationTypeId, locationIconImageCache,
} = useLocationTypes(mapEditorStore)

const {
  axisXLineConfig, axisYLineConfig, axisXArrowConfig, axisYArrowConfig,
  mapOriginCoord, mapOriginXLineConfig, mapOriginYLineConfig,
  mapOriginXArrowConfig, mapOriginYArrowConfig,
} = useCanvasAxis(mapEditorStore)

const {
  containerSize, canvasState, gridSize, gridColor,
  stageConfig, stageAreaRectConfig, rasterBackgroundConfig,
  gridLines, viewportBounds, visiblePoints, visiblePaths, visibleLocations,
  setGridSize, setGridColor, tryApplyViewportOriginBottomLeft,
} = useCanvasViewport(mapEditorStore, containerRef, rasterLayerRef)

/** 画布漫游：与路径预览相同，Stage 上 @mousemove 常收不到，必须用 window 才能保证平移 */
let canvasPanWindowMove: ((ev: MouseEvent) => void) | null = null;

const stopCanvasPanWindowListeners = () => {
  if (canvasPanWindowMove) {
    window.removeEventListener("mousemove", canvasPanWindowMove);
    canvasPanWindowMove = null;
  }
};

const startCanvasPanWindowListeners = () => {
  stopCanvasPanWindowListeners();
  canvasPanWindowMove = (ev: MouseEvent) => {
    const stage = getKonvaNode(stageRef.value);
    if (!stage?.container()) return;
    const isCanvasPanDrag =
      isDragging.value &&
      !isBoxSelecting.value &&
      !manualDragState.value &&
      (currentTool.value === ToolMode.PAN ||
        isSpacePressed.value ||
        currentTool.value === ToolMode.SELECT);
    if (!isCanvasPanDrag) return;
    const rect = stage.container().getBoundingClientRect();
    const currentPos = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
    const dx = currentPos.x - dragStartPos.value.x;
    const dy = currentPos.y - dragStartPos.value.y;
    mapEditorStore.updateCanvasState({
      offsetX: canvasState.value.offsetX + dx,
      offsetY: canvasState.value.offsetY + dy,
    });
    dragStartPos.value = { x: currentPos.x, y: currentPos.y };
  };
  window.addEventListener("mousemove", canvasPanWindowMove, {
    passive: true,
  });
};

const {
  shouldRenderPointGlyph, shouldShowPointLabel, getPointLabelConfig, getPointGlyphConfig,
  isPointConnected, resolvePointBullseyeStyle,
  getPointBullseyeOuterConfig, getPointBullseyeCoreConfig,
  getPointBullseyeDotVisible, getPointBullseyeDotConfig, getPointHitConfig,
  findPointAtPosition, buildPointEditorProps, createPointPayload,
} = usePointRendering(mapEditorStore, {
  currentTool,
  pathDragState,
  dashedLinkDragState,
  hoveredPointId,
  visiblePoints,
  getDefaultLayerId,
})

const {
  isColorEffectivelyInvisible, getPathArrowFillColor, pathConnectsPointId,
  selectionHasPointId, pathNeedsVisibleStrokeWhileEditing, getPathDisplayStroke,
  getPathConfig, shouldShowPathArrow, buildChevronConfig, getPathArrowConfigs,
  buildConnectionControlPoints, tempPathPreview, createConnectionBetweenPoints,
  getPathControlPointConfig,
} = usePathRendering(mapEditorStore, {
  pathDragState,
  pathControlPointDragPathId,
  manualDragState,
  getDefaultLayerId,
  isSelectInteractionTool,
})

const layerVisibilityRef = computed(() => props.layerVisibility)
const {
  getLocationCentroid, isRuleRegionLocation, visibleLocationsLayer,
  getLocationVisualConfig, getLocationOuterConfig, getLocationInnerConfig, getLocationCenterDotConfig, getLocationRectConfig, getLocationDragOverlayConfig,
  getLocationSymbolConfig, getLocationSymbol, getLocationIconConfig,
  shouldShowLocationLabel, getLocationLabelConfig, findLocationAtPosition,
  tempDashedLinkPreview, boxSelectConfig,
} = useLocationRendering(mapEditorStore, {
  currentTool,
  isSelectInteractionTool,
  isDragging,
  dashedLinkDragState,
  hoveredLocationId,
  visibleLocations,
  isBoxSelecting,
  boxSelectStart,
  boxSelectEnd,
  layerVisibility: layerVisibilityRef,
  getSymbolForLocationTypeId,
  locationIconImageCache,
})

const formatPointLabel = (point: MapPoint) => point.name || point.id;


// 创建从 location 到 point 的虚线链接
const createDashedLinkBetweenLocationAndPoint = (
  location: MapLocation,
  point: MapPoint,
) => {
  // 使用位置的中心点
  const centroid = getLocationCentroid(location);
  const timestamp = Date.now();
  const controlPoints = [
    { id: `dl_${timestamp}_0`, x: centroid.x, y: centroid.y },
    { id: `dl_${timestamp}_1`, x: point.x, y: point.y },
  ];

  // 生成链接名称，格式：Link Location-XXXX --- Point-YYYY
  const locationName = location.name || location.id;
  const pointName = point.name || point.id;
  const linkName = `Link ${locationName} --- ${pointName}`;

  // 使用 Links 图层组下的图层（如果存在），否则使用默认图层
  const linksLayerId = getLinksLayerId();

  mapEditorStore.addPath({
    layerId: linksLayerId,
    name: linkName,
    startPointId: location.id, // 起点是 location
    endPointId: point.id, // 终点是 point
    status: "0",
    type: "direct",
    geometry: {
      controlPoints,
      pathType: "line",
    },
    editorProps: {
      strokeColor: "#909399",
      strokeWidth: DASHED_LINK_STROKE_WIDTH,
      lineStyle: "dashed",
      arrowVisible: false, // 虚线没有方向，不显示箭头
      label: `${locationName} --- ${pointName}`,
      labelVisible: true,
    },
  });
};

// 取消虚线链接拖拽
const cancelDashedLinkDrag = (stage?: any) => {
  Object.assign(dashedLinkDragState, {
    startLocation: null,
    currentPos: { x: 0, y: 0 },
  });

  hoveredLocationId.value = null;

  const targetStage = stage || getKonvaNode(stageRef.value);
  if (targetStage && targetStage.container) {
    targetStage.container().style.cursor = "default";
  }

  const stageNode = getKonvaNode(stageRef.value);
  if (stageNode) {
    stageNode.batchDraw();
  }
};

// 获取位置中心点配置（用于虚线链接）
const getLocationCenterPointConfig = (location: MapLocation) => {
  const centroid = getLocationCentroid(location);
  const isSelected = dashedLinkDragState.startLocation?.id === location.id;

  return {
    x: centroid.x,
    y: centroid.y,
    radius: isSelected ? 8 : 6,
    fill: isSelected ? "#f7ba2a" : "#909399",
    stroke: "#ffffff",
    strokeWidth: 2,
    listening: true,
    opacity: isSelected ? 1 : 0.8,
    hitStrokeWidth: 20, // 增大点击区域，方便点击
    perfectDrawEnabled: false,
  };
};

// 位置中心点鼠标按下
const handleLocationCenterMouseDown = (location: MapLocation, e: any) => {
  e.cancelBubble = true;
  if (e.evt) {
    e.evt.stopPropagation();
  }

  if (currentTool.value === ToolMode.DASHED_LINK) {
    // 开始拖拽连线
    const stage = e.target.getStage();
    if (stage) {
      dashedLinkDragState.startLocation = location;
      const centroid = getLocationCentroid(location);
      dashedLinkDragState.currentPos = { x: centroid.x, y: centroid.y };
      stage.container().style.cursor = "crosshair";
      // 确保工具模式保持为虚线链接
      if (mapEditorStore.currentTool !== ToolMode.DASHED_LINK) {
        mapEditorStore.setTool(ToolMode.DASHED_LINK);
      }
    }
  }
};

// 位置中心点鼠标抬起
const handleLocationCenterMouseUp = (location: MapLocation, e: any) => {
  e.cancelBubble = true;
  if (e.evt) {
    e.evt.stopPropagation();
  }
};

// 位置中心点点击
const handleLocationCenterClick = (location: MapLocation, e: any) => {
  e.cancelBubble = true;
  if (e.evt) {
    e.evt.stopPropagation();
  }

  // 点击事件已经在 mousedown 中处理了，这里不需要重复处理
};

// 位置中心点鼠标悬停
const handleLocationCenterMouseOver = (location: MapLocation) => {
  if (currentTool.value === ToolMode.DASHED_LINK) {
    hoveredLocationId.value = location.id;
    setStageCursor("pointer");
  }
};

// 位置中心点鼠标离开
const handleLocationCenterMouseOut = () => {
  if (currentTool.value === ToolMode.DASHED_LINK) {
    // 如果不在拖拽状态，清除悬停
    if (!dashedLinkDragState.startLocation) {
      hoveredLocationId.value = null;
    }
    setStageCursor("default");
  }
};

// 获取位置的 Konva 配置
const getLocationConfig = (location: MapLocation) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(location.id);
  const points: number[] = [];

  location.geometry.vertices.forEach((vertex) => {
    points.push(vertex.x, vertex.y);
  });

  if (location.geometry.closed && points.length > 0) {
    // 闭合多边形，添加第一个点
    points.push(
      location.geometry.vertices[0].x,
      location.geometry.vertices[0].y,
    );
  }

  return {
    id: location.id,
    points,
    fill: isSelected
      ? "rgba(255, 77, 79, 0.3)"
      : location.editorProps.fillColor || "rgba(24, 144, 255, 0.3)",
    fillOpacity: location.editorProps.fillOpacity || 0.3,
    stroke: isSelected
      ? "#ff4d4f"
      : location.editorProps.strokeColor || "#1890ff",
    strokeWidth: location.editorProps.strokeWidth || 2,
    closed: location.geometry.closed,
    listening: true,
    draggable: false,
  };
};

const getPolygonPreviewStyles = (tool: ToolMode | null) => {
  if (tool === ToolMode.RULE_REGION) {
    return {
      stroke: "#ff7d00",
      fill: "rgba(255, 125, 0, 0.15)",
    };
  }
  return {
    stroke: "#1890ff",
    fill: "rgba(24, 144, 255, 0.1)",
  };
};

const getPolygonPersistStyles = (tool: ToolMode | null) => {
  if (tool === ToolMode.RULE_REGION) {
    return {
      strokeColor: "#ff7d00",
      strokeWidth: 2,
      fillColor: "#ffedd9",
      fillOpacity: 0.35,
    };
  }
  return {
    strokeColor: "#1890ff",
    strokeWidth: 2,
    fillColor: "#1890ff",
    fillOpacity: 0.3,
  };
};

// Stage 全局 mousedown：在选择工具下识别点/位置并开始手动拖拽（不依赖 Konva draggable）
const handleStageMouseDown = (e: any) => {
  const stage = e.target?.getStage?.();
  if (!stage) return;
  const target = e.target;
  // 透明底未命中时事件会落在 Stage，需与空白层一致处理（漫游/选框/绘制点等）
  if (target === stage) {
    handleStageAreaMouseDown(e);
    return;
  }
  if (!isSelectInteractionTool.value || isDragging.value) return;
  const layer = target.getLayer?.();
  if (!layer) return;
  const layerName = (layer.getAttr?.("name") ?? layer.name?.()) || "";
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;
  const modelX =
    (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
  const modelY =
    (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
  const className = target.getClassName?.() ?? "";

  // 点：点位层上的 Circle 且 id 属于当前点列表
  if (layerName === "point" && className === "Circle") {
    const id = target.id?.();
    if (id && visiblePoints.value.some((p) => String(p.id) === String(id))) {
      manualDragState.value = {
        kind: "point",
        pointId: String(id),
        node: target,
        startModelX: modelX,
        startModelY: modelY,
      };
      isDragging.value = true;
      stage.container().style.cursor = "move";
      if (e.evt) e.evt.preventDefault();
      return;
    }
  }
  // 位置：透明 overlay、圆形碰撞层 或规则区域 Line
  if (layerName === "location") {
    const id = target.id?.();
    // 业务位置：-drag-overlay 或 -circle（碰撞层）
    if (typeof id === "string" && (id.endsWith("-drag-overlay") || id.endsWith("-circle"))) {
      const locationId = id.replace(/-drag-overlay$|-circle$/, "");
      const location = visibleLocations.value.find(
        (l) => String(l.id) === locationId,
      );
      if (location && !isRuleRegionLocation(location)) {
        manualDragState.value = {
          kind: "location",
          location,
          node: target,
          isOverlay: true,
          startModelX: modelX,
          startModelY: modelY,
        };
        isDragging.value = true;
        stage.container().style.cursor = "move";
        if (e.evt) e.evt.preventDefault();
        return;
      }
    }
    if (className === "Line") {
      const lineId = target.id?.();
      const location = lineId
        ? visibleLocations.value.find((l) => String(l.id) === String(lineId))
        : null;
      if (location && isRuleRegionLocation(location)) {
        manualDragState.value = {
          kind: "location",
          location,
          node: target,
          isOverlay: false,
          startModelX: modelX,
          startModelY: modelY,
        };
        isDragging.value = true;
        stage.container().style.cursor = "move";
        if (e.evt) e.evt.preventDefault();
        return;
      }
    }
  }
};

// 仅当点击在"空白区域层"时调用（点/位置在上层，会先收到事件，可正常拖拽）
const handleStageAreaMouseDown = (e: any) => {
  const stage = e.target.getStage();
  if (!stage) return;
  let pointerPos = stage.getPointerPosition();
  if (!pointerPos) {
    const evt = e.evt ?? e.nativeEvent ?? e;
    if (evt?.clientX != null && stage.container()) {
      const rect = stage.container().getBoundingClientRect();
      pointerPos = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }
  }
  if (!pointerPos) return;
  const x =
    (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
  const y =
    (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
  mousePosition.value = { x, y };

  // 兼容 Konva 事件对象确保有 evt
  const evt = e.evt || e;

  if (currentTool.value === ToolMode.PAN || isSpacePressed.value) {
    isDragging.value = true;
    dragStartPos.value = { x: pointerPos.x, y: pointerPos.y };
    stage.container().style.cursor = "grabbing";
    evt.preventDefault?.();
    startCanvasPanWindowListeners();
  } else if (currentTool.value === ToolMode.SELECT) {
    // 选择工具：直接拖拽为框选；Shift+拖拽为追加框选（保留已有选中）
    isBoxSelecting.value = true;
    boxSelectAppend.value = evt.shiftKey;
    if (!evt.shiftKey) mapEditorStore.clearSelection();
    boxSelectStart.value = { x, y };
    boxSelectEnd.value = { x, y };
    stage.container().style.cursor = "crosshair";
    evt.preventDefault?.();
  } else if (currentTool.value === ToolMode.POINT) {
    // 绘制点
    const pointPayload = createPointPayload(x, y);

    // 记录到历史
    const command = new AddPointCommand(
      pointPayload,
      (p) => mapEditorStore.addPoint(p),
      (id) => mapEditorStore.deletePoint(id),
    );
    mapEditorStore.executeCommand(command);

    // 标记需要在鼠标松开时切换工具（双重保险）
    shouldSwitchToSelectAfterPoint.value = true;

    // 绘制完成后切换回选择工具
    // 使用双重延迟确保切换生效：先 requestAnimationFrame，再 setTimeout
    requestAnimationFrame(() => {
      setTimeout(() => {
        // 再次检查工具状态，确保仍然是绘制点模式
        if (
          mapEditorStore.currentTool === ToolMode.POINT &&
          shouldAutoSwitchTool.value
        ) {
          mapEditorStore.setTool(ToolMode.SELECT);
        }
      }, 50);
    });

    e.evt.preventDefault();
    e.evt.stopPropagation();
  } else if (currentTool.value === ToolMode.LOCATION) {
    // 业务位置：单击直接创建一个小正方形方框
    const size = BUSINESS_LOCATION_BOX_SIZE;
    const half = size / 2;
    const timestamp = Date.now();
    const vertices = [
      { id: `loc_${timestamp}_v1`, x: x - half, y: y - half },
      { id: `loc_${timestamp}_v2`, x: x + half, y: y - half },
      { id: `loc_${timestamp}_v3`, x: x + half, y: y + half },
      { id: `loc_${timestamp}_v4`, x: x - half, y: y + half },
    ];

    const nextLocationName =
      typeof mapEditorStore.generateLocationName === "function"
        ? mapEditorStore.generateLocationName()
        : `Location-${Date.now()}`;

    mapEditorStore.addLocation({
      layerId: getDefaultLayerId("location"),
      name: nextLocationName,
      status: "0",
      geometry: {
        vertices,
        closed: true,
      },
      editorProps: {
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeColor: "#000000",
        strokeWidth: 2,
        labelVisible: true,
        labelOffset: { x: -30, y: -30 },
      },
    });

    // 标记需要在鼠标松开时切换工具（双重保险）
    shouldSwitchToSelectAfterOther.value = { tool: ToolMode.LOCATION };

    // 绘制完成后切换回选择工具（使用和绘制点完全相同的逻辑）
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (
          mapEditorStore.currentTool === ToolMode.LOCATION &&
          shouldAutoSwitchTool.value
        ) {
          mapEditorStore.setTool(ToolMode.SELECT);
        }
      }, 50);
    });

    e.evt.preventDefault();
    e.evt.stopPropagation();
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
  } else if (currentTool.value === ToolMode.DASHED_LINK) {
    // 虚线链接模式：点击空白处，取消拖拽
    if (e.target === stage) {
      cancelDashedLinkDrag(stage);
    }
  } else if (currentTool.value === ToolMode.PATH) {
    const clickedPoint = findPointAtPosition(x, y);
    if (clickedPoint) {
      pathDragState.startPoint = clickedPoint;
      pathDragState.currentPos = { x: clickedPoint.x, y: clickedPoint.y };
      pathDragState.pathType = mapEditorStore.pathConnectionType;
      stage.container().style.cursor = "crosshair";
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
  const stage = getKonvaNode(stageRef.value) ?? e.target?.getStage?.();
  if (!stage) return;

  const model = pointerToModelFromStageEvent(stage, e);

  // 手动拖拽：实时更新节点位置（依赖模型坐标）
  const drag = manualDragState.value;
  if (drag) {
    if (!model) return;
    const { x, y } = model;
    updateMousePosition(x, y);
    if (drag.kind === "point") {
      const snapped = snapPoint(
        { x, y },
        {
          snapToGrid: true,
          gridSize: gridSize.value,
          snapToPoint: true,
          targetPoints: [],
        },
      );
      drag.node.x(snapped.x);
      drag.node.y(snapped.y);
      syncPathControlPointsForPointMove(drag.pointId, snapped.x, snapped.y);
    } else if (drag.kind === "location") {
      if (drag.isOverlay) {
        drag.node.x(x - BUSINESS_LOCATION_OVERLAY_HALF);
        drag.node.y(y - BUSINESS_LOCATION_OVERLAY_HALF);
      } else {
        drag.node.x(x - drag.startModelX);
        drag.node.y(y - drag.startModelY);
      }
    }
    const layer = drag.node.getLayer?.();
    if (layer) layer.batchDraw?.();
    return;
  }

  // 画布漫游由 window mousemove（startCanvasPanWindowListeners）驱动，此处不再依赖 Stage 的 mousemove

  if (!model) return;
  const { x, y } = model;

  // 使用节流更新鼠标位置
  updateMousePosition(x, y);

  // 框选模式
  if (isBoxSelecting.value) {
    boxSelectEnd.value = { x, y };
  }

  // 绘制位置预览
  if (
    isDrawing.value &&
    drawingPoints.value.length > 0 &&
    (activeDrawingTool.value === ToolMode.LOCATION ||
      activeDrawingTool.value === ToolMode.RULE_REGION)
  ) {
    const points: number[] = [];
    drawingPoints.value.forEach((p) => {
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
      dash: [5, 5],
    };
  }

  if (currentTool.value === ToolMode.PATH) {
    const hoveredPoint = findPointAtPosition(x, y);
    hoveredPointId.value = hoveredPoint?.id || null;
    if (pathDragState.startPoint) {
      pathDragState.currentPos = { x, y };
      getKonvaNode(pathLayerRef.value)?.batchDraw?.();
    }
  } else if (currentTool.value === ToolMode.DASHED_LINK) {
    // 虚线链接模式：更新拖拽位置
    if (dashedLinkDragState.startLocation) {
      dashedLinkDragState.currentPos = { x, y };
    }
    // 检查是否悬停在点上
    const hoveredPoint = findPointAtPosition(x, y);
    hoveredPointId.value = hoveredPoint?.id || null;
  } else {
    // 如果不在路径工具模式，清除悬停状态
    hoveredPointId.value = null;
    // 如果还有残留的路径拖拽状态，清除它
    if (pathDragState.startPoint) {
      cancelPathDrag();
    }
    // 如果还有残留的虚线链接拖拽状态，清除它
    if (dashedLinkDragState.startLocation) {
      cancelDashedLinkDrag();
    }
  }
};

// 判断点是否在框选区域内
const isPointInBox = (
  point: { x: number; y: number },
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
) => {
  const minX = Math.min(boxStart.x, boxEnd.x);
  const maxX = Math.max(boxStart.x, boxEnd.x);
  const minY = Math.min(boxStart.y, boxEnd.y);
  const maxY = Math.max(boxStart.y, boxEnd.y);

  return (
    point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  );
};

// 判断位置是否在框选区域内
const isLocationInBox = (
  location: MapLocation,
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
) => {
  const centroid = getLocationCentroid(location);
  return isPointInBox(centroid, boxStart, boxEnd);
};

// 判断路径是否在框选区域内
const isPathInBox = (
  path: MapPath,
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
) => {
  // 检查路径的所有控制点
  for (const cp of path.geometry.controlPoints) {
    if (isPointInBox(cp, boxStart, boxEnd)) {
      return true;
    }
  }
  return false;
};

const handleMouseUp = (e: any) => {
  const stage = e.target?.getStage();

  // 手动拖拽结束：写回 store 并清理
  const drag = manualDragState.value;
  if (drag) {
    if (drag.kind === "point") {
      const newX = drag.node.x();
      const newY = drag.node.y();
      mapEditorStore.updatePoint(drag.pointId, { x: newX, y: newY });
      syncPathControlPointsForPointMove(drag.pointId, newX, newY);
    } else if (drag.kind === "location") {
      if (drag.isOverlay) {
        const newCentroid = {
          x: drag.node.x() + BUSINESS_LOCATION_OVERLAY_HALF,
          y: drag.node.y() + BUSINESS_LOCATION_OVERLAY_HALF,
        };
        const oldCentroid = getLocationCentroid(drag.location);
        const deltaX = newCentroid.x - oldCentroid.x;
        const deltaY = newCentroid.y - oldCentroid.y;
        const vertices = (drag.location.geometry.vertices || []).map((v) => ({
          ...v,
          x: v.x + deltaX,
          y: v.y + deltaY,
        }));
        mapEditorStore.updateLocation(drag.location.id, {
          geometry: { ...drag.location.geometry, vertices },
        });
        syncDashedLinksFromLocation(String(drag.location.id), newCentroid);
      } else {
        const dx = drag.node.x();
        const dy = drag.node.y();
        drag.node.x(0);
        drag.node.y(0);
        const vertices = (drag.location.geometry.vertices || []).map((v) => ({
          ...v,
          x: v.x + dx,
          y: v.y + dy,
        }));
        mapEditorStore.updateLocation(drag.location.id, {
          geometry: { ...drag.location.geometry, vertices },
        });
        const newCentroid = getCentroidFromVertices(vertices);
        syncDashedLinksFromLocation(String(drag.location.id), newCentroid);
      }
    }
    manualDragState.value = null;
    isDragging.value = false;
    if (stage) {
      stage.container().style.cursor = isPanInteractionTool.value
        ? "grab"
        : "default";
    }
    return;
  }

  // 绘制点后切换回选择工具（备用方案）
  if (shouldSwitchToSelectAfterPoint.value) {
    shouldSwitchToSelectAfterPoint.value = false;
    if (mapEditorStore.currentTool === ToolMode.POINT) {
      mapEditorStore.setTool(ToolMode.SELECT);
    }
  }

  // 其他工具绘制后切换回选择工具（备用方案）
  if (shouldSwitchToSelectAfterOther.value) {
    const toolToSwitch = shouldSwitchToSelectAfterOther.value.tool;
    shouldSwitchToSelectAfterOther.value = null;
    if (mapEditorStore.currentTool === toolToSwitch) {
      mapEditorStore.setTool(ToolMode.SELECT);
    }
  }

  // 如果工具仍然是绘制点模式，也尝试切换（仅作为绘制点完成后的备用，不主动在每次 mouseup 后强切）
  if (
    currentTool.value === ToolMode.POINT &&
    !shouldSwitchToSelectAfterPoint.value
  ) {
    setTimeout(() => {
      if (mapEditorStore.currentTool === ToolMode.POINT) {
        mapEditorStore.setTool(ToolMode.SELECT);
      }
    }, 100);
  }

  // 不再在 PATH/LOCATION/DASHED_LINK/RULE_REGION 下因"未设置 shouldSwitchToSelectAfterOther"就 100ms 后强切回选择工具，
  // 否则点击工具栏切换到连线后，任意 mouseup 都会很快把工具切回选择，导致点对点连线无法使用。

  // 平移模式结束（漫游 / 空格 / 选择工具空白拖拽）
  if (
    isDragging.value &&
    !isBoxSelecting.value &&
    (currentTool.value === ToolMode.PAN ||
      isSpacePressed.value ||
      currentTool.value === ToolMode.SELECT)
  ) {
    stopCanvasPanWindowListeners();
    isDragging.value = false;
    if (stage) {
      stage.container().style.cursor =
        currentTool.value === ToolMode.PAN ? "grab" : "default";
    }
  }

  // 框选模式结束
  if (isBoxSelecting.value) {
    isBoxSelecting.value = false;

    // 计算框选区域
    const boxStart = boxSelectStart.value;
    const boxEnd = boxSelectEnd.value;

    // 计算框选区域的大小
    const width = Math.abs(boxEnd.x - boxStart.x);
    const height = Math.abs(boxEnd.y - boxStart.y);

    // 如果框选区域太小，不进行选择
    if (width > 5 && height > 5) {
      // 收集框选区域内的所有元素ID
      const selectedPointIds: string[] = [];
      const selectedPathIds: string[] = [];
      const selectedLocationIds: string[] = [];

      for (const point of visiblePoints.value) {
        if (isPointInBox(point, boxStart, boxEnd)) {
          selectedPointIds.push(point.id);
        }
      }

      for (const location of visibleLocations.value) {
        if (isLocationInBox(location, boxStart, boxEnd)) {
          selectedLocationIds.push(location.id);
        }
      }

      for (const path of visiblePaths.value) {
        if (isPathInBox(path, boxStart, boxEnd)) {
          selectedPathIds.push(path.id);
        }
      }

      // 非追加模式先整体清空一次，然后三次调用全部追加，避免后调用覆盖前调用
      if (!boxSelectAppend.value) {
        mapEditorStore.clearSelection();
      }

      // 优先级：location > point > path，用于确定 selectedType
      // 三次调用均使用 append=true，保证所有命中元素都留在 selectedIds 中
      if (selectedLocationIds.length > 0) {
        mapEditorStore.selectElements(selectedLocationIds, "location", true);
      }
      if (selectedPointIds.length > 0) {
        mapEditorStore.selectElements(selectedPointIds, "point", true);
      }
      if (selectedPathIds.length > 0) {
        mapEditorStore.selectElements(selectedPathIds, "path", true);
      }

      // selectElements 会把 selectedType 设为最后一次调用的类型；
      // 按优先级重置为最重要的类型，确保对齐等功能判断正确
      if (selectedLocationIds.length > 0) {
        mapEditorStore.selectElements([], "location", true);
      } else if (selectedPointIds.length > 0) {
        mapEditorStore.selectElements([], "point", true);
      }
    }

    // 重置追加模式状态
    boxSelectAppend.value = false;

    if (stage) {
      stage.container().style.cursor = "default";
    }
  }

  // 处理路径工具模式 - 鼠标松开时处理路径创建
  if (pathDragState.startPoint) {
    const startPoint = pathDragState.startPoint; // 保存引用，因为后面会清除
    let pathCreated = false;
    let createdEndPoint: MapPoint | null = null;

    if (currentTool.value === ToolMode.PATH && stage && e.evt.button === 0) {
      // 左键松开时处理路径创建
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const x =
          (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
        const y =
          (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
        const endPoint = findPointAtPosition(x, y);
        if (endPoint && endPoint.id !== startPoint.id) {
          createConnectionBetweenPoints(startPoint, endPoint);
          pathCreated = true;
          createdEndPoint = endPoint;
        } else if (endPoint && endPoint.id === startPoint.id) {
          // 同一点松手：不弹 Toast
        } else {
          ElMessage.warning("请拖拽到另一个点以创建连线");
        }
      }
    }

    // 连续画线：创建成功后更新起点为终点并保留预览
    if (pathCreated && createdEndPoint) {
      pathDragState.startPoint = createdEndPoint;
      pathDragState.currentPos = {
        x: createdEndPoint.x,
        y: createdEndPoint.y,
      };
      pathDragState.pathType = mapEditorStore.pathConnectionType;
      hoveredPointId.value = String(createdEndPoint.id);
      stage.container().style.cursor = "crosshair";
    } else {
      // 失败则清空路径预览
      cancelPathDrag(stage);
    }
  } else if (
    currentTool.value === ToolMode.PATH &&
    stage &&
    e.evt.button === 0
  ) {
    // 点击空白处清除残留的预览线
    cancelPathDrag(stage);
  }

  // 处理虚线链接工具模式 - 鼠标松开时处理虚线链接创建
  if (
    dashedLinkDragState.startLocation &&
    currentTool.value === ToolMode.DASHED_LINK &&
    stage &&
    e.evt.button === 0
  ) {
    const startLocation = dashedLinkDragState.startLocation; // 保存引用
    const pointerPos = stage.getPointerPosition();
    if (pointerPos) {
      const x =
        (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
      const y =
        (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
      const endPoint = findPointAtPosition(x, y);

      if (endPoint) {
        createDashedLinkBetweenLocationAndPoint(startLocation, endPoint);
        cancelDashedLinkDrag(stage);

        // 标记需要在鼠标松开时切换工具（双重保险）
        shouldSwitchToSelectAfterOther.value = { tool: ToolMode.DASHED_LINK };

        // 绘制完成后切换回选择工具（使用和绘制点完全相同的逻辑）
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (
              mapEditorStore.currentTool === ToolMode.DASHED_LINK &&
              shouldAutoSwitchTool.value
            ) {
              mapEditorStore.setTool(ToolMode.SELECT);
            }
          }, 50);
        });
      } else {
        // 没有拖拽到点，取消拖拽
        cancelDashedLinkDrag(stage);
      }
    }
  }

  // 右键完成绘制
  if (e.evt.button === 2) {
    if (
      isDrawing.value &&
      (activeDrawingTool.value === ToolMode.LOCATION ||
        activeDrawingTool.value === ToolMode.RULE_REGION) &&
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

// 获取操作手柄配置
const getHandleConfig = (handle: { x: number; y: number; type: string }) => {
  return {
    x: handle.x,
    y: handle.y,
    radius: 6,
    fill: "#409eff",
    stroke: "#ffffff",
    strokeWidth: 2,
    draggable: false,
    listening: true,
    hitStrokeWidth: 10,
  };
};

// 更新操作手柄
const updateResizeHandles = () => {
  const selectedIds = mapEditorStore.selection.selectedIds;
  const selectedType = mapEditorStore.selection.selectedType;

  // 清除现有手柄
  resizeHandles.value = [];

  // 只处理单个选中元素
  if (selectedIds.size !== 1) {
    return;
  }

  const id = Array.from(selectedIds)[0];

  // 点和位置点均为圆形，不显示角点控制柄
  if (selectedType === "point" || selectedType === "location") {
    return;
  }
};

// 处理调整大小开始
const handleResizeStart = (handle: { id: string; type: string }, e: any) => {
  const stage = e.target.getStage();
  if (!stage) return;

  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  resizeStartPos.value = { x: pointerPos.x, y: pointerPos.y };
  resizeElementId.value = handle.id.split("_")[0];
  resizeHandleType.value = handle.type;
  isResizing.value = true;

  // 阻止事件冒泡
  e.evt.preventDefault();
  e.evt.stopPropagation();

  // 添加鼠标移动和抬起事件监听
  document.addEventListener("mousemove", handleResizeMove);
  document.addEventListener("mouseup", handleResizeEnd);
};

// 处理调整大小移动
const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing.value || !resizeElementId.value || !resizeHandleType.value) {
    return;
  }

  const stage = getKonvaNode(stageRef.value);
  if (!stage) return;

  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const dx = pointerPos.x - resizeStartPos.value.x;
  const dy = pointerPos.y - resizeStartPos.value.y;

  // 根据元素类型和手柄类型进行调整
  const selectedType = mapEditorStore.selection.selectedType;

  if (selectedType === "location") {
    const location = mapEditorStore.locations.find(
      (l) => l.id === resizeElementId.value,
    );
    if (location) {
      const centroid = getLocationCentroid(location);
      const newVertices = [...location.geometry.vertices];

      // 根据手柄类型调整大小
      switch (resizeHandleType.value) {
        case "nw":
          // 调整左上角
          newVertices[0] = {
            ...newVertices[0],
            x: centroid.x - (centroid.x - newVertices[0].x) - dx,
            y: centroid.y - (centroid.y - newVertices[0].y) - dy,
          };
          newVertices[3] = {
            ...newVertices[3],
            x: centroid.x - (centroid.x - newVertices[3].x) - dx,
            y: centroid.y + (newVertices[3].y - centroid.y) + dy,
          };
          newVertices[1] = {
            ...newVertices[1],
            x: centroid.x + (newVertices[1].x - centroid.x) + dx,
            y: centroid.y - (centroid.y - newVertices[1].y) - dy,
          };
          newVertices[2] = {
            ...newVertices[2],
            x: centroid.x + (newVertices[2].x - centroid.x) + dx,
            y: centroid.y + (newVertices[2].y - centroid.y) + dy,
          };
          break;
        case "ne":
          // 调整右上角
          newVertices[0] = {
            ...newVertices[0],
            x: centroid.x - (centroid.x - newVertices[0].x) + dx,
            y: centroid.y - (centroid.y - newVertices[0].y) - dy,
          };
          newVertices[3] = {
            ...newVertices[3],
            x: centroid.x - (centroid.x - newVertices[3].x) + dx,
            y: centroid.y + (newVertices[3].y - centroid.y) + dy,
          };
          newVertices[1] = {
            ...newVertices[1],
            x: centroid.x + (newVertices[1].x - centroid.x) - dx,
            y: centroid.y - (centroid.y - newVertices[1].y) - dy,
          };
          newVertices[2] = {
            ...newVertices[2],
            x: centroid.x + (newVertices[2].x - centroid.x) - dx,
            y: centroid.y + (newVertices[2].y - centroid.y) + dy,
          };
          break;
        case "sw":
          // 调整左下角
          newVertices[0] = {
            ...newVertices[0],
            x: centroid.x - (centroid.x - newVertices[0].x) - dx,
            y: centroid.y - (centroid.y - newVertices[0].y) + dy,
          };
          newVertices[3] = {
            ...newVertices[3],
            x: centroid.x - (centroid.x - newVertices[3].x) - dx,
            y: centroid.y + (newVertices[3].y - centroid.y) - dy,
          };
          newVertices[1] = {
            ...newVertices[1],
            x: centroid.x + (newVertices[1].x - centroid.x) + dx,
            y: centroid.y - (centroid.y - newVertices[1].y) + dy,
          };
          newVertices[2] = {
            ...newVertices[2],
            x: centroid.x + (newVertices[2].x - centroid.x) + dx,
            y: centroid.y + (newVertices[2].y - centroid.y) - dy,
          };
          break;
        case "se":
          // 调整右下角
          newVertices[0] = {
            ...newVertices[0],
            x: centroid.x - (centroid.x - newVertices[0].x) + dx,
            y: centroid.y - (centroid.y - newVertices[0].y) + dy,
          };
          newVertices[3] = {
            ...newVertices[3],
            x: centroid.x - (centroid.x - newVertices[3].x) + dx,
            y: centroid.y + (newVertices[3].y - centroid.y) - dy,
          };
          newVertices[1] = {
            ...newVertices[1],
            x: centroid.x + (newVertices[1].x - centroid.x) - dx,
            y: centroid.y - (centroid.y - newVertices[1].y) + dy,
          };
          newVertices[2] = {
            ...newVertices[2],
            x: centroid.x + (newVertices[2].x - centroid.x) - dx,
            y: centroid.y + (newVertices[2].y - centroid.y) - dy,
          };
          break;
      }

      // 更新位置
      mapEditorStore.updateLocation(resizeElementId.value, {
        geometry: {
          ...location.geometry,
          vertices: newVertices,
        },
      });

      // 更新操作手柄
      updateResizeHandles();

      // 更新起始位置
      resizeStartPos.value = { x: pointerPos.x, y: pointerPos.y };
    }
  }
};

// 处理调整大小结束
const handleResizeEnd = () => {
  isResizing.value = false;
  resizeElementId.value = null;
  resizeHandleType.value = null;

  // 移除事件监听
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
};

// 监听选择变化，更新操作手柄
watch(
  () => mapEditorStore.selection,
  () => {
    updateResizeHandles();
  },
  { deep: true },
);

// 完成位置绘制
const completeLocationDrawing = () => {
  if (drawingPoints.value.length < 3) {
    ElMessage.warning("位置至少需要3个顶点");
    return;
  }

  const drawingTool = activeDrawingTool.value || ToolMode.LOCATION;
  const isRuleRegion = drawingTool === ToolMode.RULE_REGION;
  const polygonStyle = getPolygonPersistStyles(drawingTool);

  // 对于普通 Location 使用递增命名，规则区域保持原逻辑
  const nextLocationName = isRuleRegion
    ? `规则区域_${Date.now()}`
    : typeof mapEditorStore.generateLocationName === "function"
      ? mapEditorStore.generateLocationName()
      : `Location-${Date.now()}`;

  const location = mapEditorStore.addLocation({
    layerId: getDefaultLayerId("location"),
    name: nextLocationName,
    status: "0",
    geometry: {
      vertices: drawingPoints.value.map((p, index) => ({
        id: `v_${Date.now()}_${index}`,
        x: p.x,
        y: p.y,
      })),
      closed: true,
    },
    editorProps: {
      fillColor: polygonStyle.fillColor,
      fillOpacity: polygonStyle.fillOpacity,
      strokeColor: polygonStyle.strokeColor,
      strokeWidth: polygonStyle.strokeWidth,
      labelVisible: true,
      labelOffset: { x: -30, y: -30 },
    },
  });

  // 绘制完成后切换回选择工具（如果是规则区域，使用和绘制点完全相同的逻辑）
  if (isRuleRegion) {
    // 标记需要在鼠标松开时切换工具（双重保险）
    shouldSwitchToSelectAfterOther.value = { tool: ToolMode.RULE_REGION };

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (
          mapEditorStore.currentTool === ToolMode.RULE_REGION &&
          shouldAutoSwitchTool.value
        ) {
          mapEditorStore.setTool(ToolMode.SELECT);
        }
      }, 50);
    });
  }

  isDrawing.value = false;
  drawingPoints.value = [];
  tempLocation.value = null;
  activeDrawingTool.value = null;
};

// 取消位置绘制
const cancelLocationDrawing = () => {
  isDrawing.value = false;
  drawingPoints.value = [];
  tempLocation.value = null;
  activeDrawingTool.value = null;
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
    y: pointerPos.y,
  };

  // 计算鼠标在画布坐标系中的位置（考虑当前的缩放和平移）
  const mousePointTo = {
    x: (pointer.x - canvasState.value.offsetX) / oldScale,
    y: (pointer.y - canvasState.value.offsetY) / oldScale,
  };

  // 计算新的偏移量，使鼠标指向的点在缩放后位置不变
  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  };

  mapEditorStore.updateCanvasState({
    scale: clampedScale,
    offsetX: newPos.x,
    offsetY: newPos.y,
  });
};

// 点点击延迟处理（用于区分单击和双击）
let clickTimer: ReturnType<typeof setTimeout> | null = null;
const CLICK_DELAY = 250; // 250ms 内的第二次点击视为双击

// 点点击
const handlePointClick = (point: MapPoint, e: any) => {
  e.cancelBubble = true;

  if (currentTool.value === ToolMode.DASHED_LINK) {
    // 虚线链接模式：如果已经有起点位置，点击点完成连接
    if (dashedLinkDragState.startLocation) {
      createDashedLinkBetweenLocationAndPoint(
        dashedLinkDragState.startLocation,
        point,
      );
      cancelDashedLinkDrag(e.target.getStage());

      // 绘制完成后切换回选择工具（使用和绘制点相同的逻辑）
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (mapEditorStore.currentTool === ToolMode.DASHED_LINK) {
            mapEditorStore.setTool(ToolMode.SELECT);
          }
        }, 50);
      });

      return;
    }
  }

  // 如果不是 PATH 工具模式，清除路径预览状态（避免残留的预览点显示）
  if (currentTool.value !== ToolMode.PATH) {
    cancelPathDrag(e.target.getStage());
  }

  // 连线模式：点击第一个点设起点，点击第二个点创建连线
  if (currentTool.value === ToolMode.PATH) {
    const stage = e.target?.getStage?.();
    if (!stage) return;
    if (!pathDragState.startPoint) {
      pathDragState.startPoint = point;
      pathDragState.currentPos = { x: point.x, y: point.y };
      pathDragState.pathType = mapEditorStore.pathConnectionType;
      stage.container().style.cursor = "crosshair";
      return;
    }
    if (pathDragState.startPoint.id === point.id) {
      return;
    }
    createConnectionBetweenPoints(pathDragState.startPoint, point);
    // 连续画线：创建完成后直接把起点切到终点，保持 PATH 不退出
    pathDragState.startPoint = point;
    pathDragState.currentPos = { x: point.x, y: point.y };
    pathDragState.pathType = mapEditorStore.pathConnectionType;
    hoveredPointId.value = String(point.id);
    stage.container().style.cursor = "crosshair";
    return;
  }

  // 选择：在 SELECT 下允许编辑拖拽；在 PAN 下仅允许选中（用于查看属性）
  if (currentTool.value !== ToolMode.SELECT && currentTool.value !== ToolMode.PAN) {
    return;
  }

  // 延迟处理单击，如果 250ms 内有双击则取消单击
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    // 第二次点击在延迟时间内，视为双击，不处理单击
    return;
  }

  clickTimer = setTimeout(() => {
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
    const shiftSelect = e.evt.shiftKey;
    mapEditorStore.selectElement(point.id, "point", multiSelect, shiftSelect);
    clickTimer = null;
  }, CLICK_DELAY);
};

// 点双击
const handlePointDoubleClick = (point: MapPoint, e: any) => {
  e.cancelBubble = true;

  // 取消单击事件
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }

  // 只有在选择工具模式下才允许双击编辑
  if (isSelectInteractionTool.value) {
    // 触发编辑事件，由父组件处理
    emit("point-double-click", point);
  }
};

// 点拖拽
const handlePointDragStart = (point: MapPoint) => {
  isDragging.value = true;
};

const handlePointDragMove = (point: MapPoint, e: any) => {
  const node = e.target;
  const x = node.x();
  const y = node.y();
  const snapped = snapPoint(
    { x, y },
    {
      snapToGrid: true,
      gridSize: gridSize.value,
      snapToPoint: true,
      targetPoints: mapEditorStore.points
        .filter((p) => p.id !== point.id)
        .map((p) => ({ x: p.x, y: p.y })),
    },
  );
  node.x(snapped.x);
  node.y(snapped.y);
};

const syncPathControlPoints = (pointId: string, x: number, y: number) => {
  mapEditorStore.paths.forEach((path) => {
    const cps = path.geometry.controlPoints;
    if (!cps.length) return;
    const startId = path.startPointId != null ? String(path.startPointId) : null;
    const endId = path.endPointId != null ? String(path.endPointId) : null;
    const pid = String(pointId);
    let updated: typeof cps | null = null;
    if (startId === pid) {
      updated = [...cps];
      updated[0] = { ...updated[0], x, y };
    }
    if (endId === pid) {
      updated = updated ?? [...cps];
      updated[updated.length - 1] = { ...updated[updated.length - 1], x, y };
    }
    if (updated) {
      mapEditorStore.updatePath(path.id, {
        geometry: { ...path.geometry, controlPoints: updated },
      });
    }
  });
};

const handlePointDragEnd = (point: MapPoint) => {
  isDragging.value = false;
  const layer = getKonvaNode(pointLayerRef.value);
  if (!layer) return;
  const node = layer.findOne(`#${point.id}`);
  if (!node) return;
  const newX = node.x();
  const newY = node.y();

  // 位置未变化时不记录命令
  if (newX === point.x && newY === point.y) return;

  const command = new MovePointCommand(
    point.id,
    { x: point.x, y: point.y },
    { x: newX, y: newY },
    (id, pos) => {
      mapEditorStore.updatePoint(id, { x: pos.x, y: pos.y });
      syncPathControlPoints(id, pos.x, pos.y);
    },
    '移动点'
  );
  mapEditorStore.executeCommand(command);
};

// 路径点击
const handlePathClick = (path: MapPath, e: any) => {
  e.cancelBubble = true;
  // 选择：在 SELECT 下允许编辑拖拽；在 PAN 下仅允许选中（用于查看属性）
  if (currentTool.value !== ToolMode.SELECT && currentTool.value !== ToolMode.PAN) return;
  const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
  const shiftSelect = e.evt.shiftKey;
  mapEditorStore.selectElement(path.id, "path", multiSelect, shiftSelect);
};

const handlePathContextMenu = (path: MapPath, e: any) => {
  e.cancelBubble = true;
  if (e.evt) e.evt.preventDefault();
  // 选中路径
  mapEditorStore.selectElement(path.id, "path", false);
  // 获取鼠标在页面中的位置，传给父组件显示菜单
  const clientX = e.evt?.clientX ?? 0;
  const clientY = e.evt?.clientY ?? 0;
  emit("path-context-menu", path, clientX, clientY);
};

// 位置点击
const handleLocationClick = (location: MapLocation, e: any) => {
  e.cancelBubble = true;

  // 虚线链接模式下，点击位置本身不处理，由中心点处理
  if (currentTool.value === ToolMode.DASHED_LINK) {
    // 检查是否点击在中心点区域
    const centroid = getLocationCentroid(location);
    const pointerPos = e.target.getStage()?.getPointerPosition();
    if (pointerPos) {
      const x =
        (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
      const y =
        (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
      const distance = Math.hypot(x - centroid.x, y - centroid.y);
      // 如果点击在中心点附近（半径 10 像素内），不处理，让中心点处理
      if (distance <= 10) {
        return;
      }
    }
    return;
  }

  // 如果不是 PATH 工具模式，清除路径预览状态（避免残留的预览点显示）
  if (currentTool.value !== ToolMode.PATH) {
    cancelPathDrag(e.target.getStage());
  }

  // 选择：在 SELECT 下允许编辑拖拽；在 PAN 下仅允许选中（用于查看属性）
  if (currentTool.value === ToolMode.SELECT || currentTool.value === ToolMode.PAN) {
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
    const shiftSelect = e.evt.shiftKey;
    mapEditorStore.selectElement(
      location.id,
      "location",
      multiSelect,
      shiftSelect,
    );
  }
};

// 位置鼠标悬停：选择工具下显示十字箭头，虚线链接模式下显示 pointer
const handleLocationMouseOver = (location: MapLocation) => {
  if (
    currentTool.value === ToolMode.DASHED_LINK &&
    !isRuleRegionLocation(location)
  ) {
    hoveredLocationId.value = location.id;
    setStageCursor("pointer");
  } else if (isSelectInteractionTool.value && !isDragging.value) {
    setStageCursor("move");
  }
};

// 位置鼠标离开
const handleLocationMouseOut = (location: MapLocation, e: any) => {
  if (currentTool.value === ToolMode.DASHED_LINK) {
    // 检查鼠标是否移动到了中心点区域
    const stage = e.target.getStage();
    if (stage) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const x =
          (pointerPos.x - canvasState.value.offsetX) / canvasState.value.scale;
        const y =
          (pointerPos.y - canvasState.value.offsetY) / canvasState.value.scale;
        const centroid = getLocationCentroid(location);
        const distance = Math.hypot(x - centroid.x, y - centroid.y);
        // 如果鼠标在中心点附近（半径 25 像素内），不清除悬停，让中心点处理
        if (distance <= 25) {
          return;
        }
      }
    }
    // 如果不在拖拽状态，清除悬停
    if (!dashedLinkDragState.startLocation) {
      hoveredLocationId.value = null;
    }
  }
  if (!isDragging.value) {
    setStageCursor(isPanInteractionTool.value ? "grab" : "default");
  }
};

// 位置整体拖拽：开始
const handleLocationDragStart = () => {
  isDragging.value = true;
};

const getCentroidFromVertices = (vertices: { x: number; y: number }[]) => {
  if (!vertices.length) return { x: 0, y: 0 };
  const sum = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / vertices.length, y: sum.y / vertices.length };
};

// 位置移动后，同步以该位置为起点的虚线链接（startPointId 为 location 的 path 首控制点改为新中心）
const syncDashedLinksFromLocation = (
  locationId: string,
  newCentroid: { x: number; y: number },
) => {
  mapEditorStore.paths.forEach((path) => {
    const startId =
      path.startPointId != null ? String(path.startPointId) : null;
    if (startId !== locationId) return;
    const cps = path.geometry.controlPoints;
    if (!cps.length) return;
    const updated = [...cps];
    updated[0] = { ...updated[0], x: newCentroid.x, y: newCentroid.y };
    mapEditorStore.updatePath(path.id, {
      geometry: { ...path.geometry, controlPoints: updated },
    });
  });
};

// 位置整体拖拽：业务位置透明 overlay 松开时
const handleLocationOverlayDragEnd = (location: MapLocation, e: any) => {
  isDragging.value = false;
  const node = e.target;
  const overlayHalf = BUSINESS_LOCATION_OVERLAY_HALF;
  const oldCentroid = getLocationCentroid(location);
  const newCentroid = { x: node.x() + overlayHalf, y: node.y() + overlayHalf };
  const deltaX = newCentroid.x - oldCentroid.x;
  const deltaY = newCentroid.y - oldCentroid.y;
  const vertices = location.geometry.vertices || [];
  const updatedVertices = vertices.map((v) => ({
    ...v,
    x: v.x + deltaX,
    y: v.y + deltaY,
  }));
  mapEditorStore.updateLocation(location.id, {
    geometry: { ...location.geometry, vertices: updatedVertices },
  });
  syncDashedLinksFromLocation(String(location.id), newCentroid);
};

// 位置整体拖拽：业务位置小方框松开时（保留供兼容，当前由 overlay 负责）
const handleLocationRectDragEnd = (location: MapLocation, e: any) => {
  isDragging.value = false;
  const node = e.target;
  const size = BUSINESS_LOCATION_BOX_SIZE;
  const half = size / 2;
  const oldCentroid = getLocationCentroid(location);
  const newCentroid = { x: node.x() + half, y: node.y() + half };
  const deltaX = newCentroid.x - oldCentroid.x;
  const deltaY = newCentroid.y - oldCentroid.y;
  const vertices = location.geometry.vertices || [];
  const updatedVertices = vertices.map((v) => ({
    ...v,
    x: v.x + deltaX,
    y: v.y + deltaY,
  }));
  mapEditorStore.updateLocation(location.id, {
    geometry: { ...location.geometry, vertices: updatedVertices },
  });
  syncDashedLinksFromLocation(String(location.id), newCentroid);
};

// 位置整体拖拽：规则区域多边形松开时，按偏移更新所有顶点，并同步虚线
const handleLocationLineDragEnd = (location: MapLocation, e: any) => {
  isDragging.value = false;
  const node = e.target;
  const deltaX = node.x();
  const deltaY = node.y();
  node.x(0);
  node.y(0);
  const vertices = location.geometry.vertices || [];
  const updatedVertices = vertices.map((v) => ({
    ...v,
    x: v.x + deltaX,
    y: v.y + deltaY,
  }));
  mapEditorStore.updateLocation(location.id, {
    geometry: { ...location.geometry, vertices: updatedVertices },
  });
  const newCentroid = getCentroidFromVertices(updatedVertices);
  syncDashedLinksFromLocation(String(location.id), newCentroid);
};

// Location 编辑对话框相关
const locationEditDialogVisible = ref(false);
const editingLocationId = ref<string>("");

// 处理位置右键菜单
const handleLocationContextMenu = (location: MapLocation, e: any) => {
  e.cancelBubble = true;

  // 阻止浏览器默认右键菜单
  if (e.evt) {
    e.evt.preventDefault();
  }

  // 选中该位置
  const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
  mapEditorStore.selectElement(location.id, "location", multiSelect);

  // 打开编辑对话框
  editingLocationId.value = location.id;
  locationEditDialogVisible.value = true;
};

// 处理位置编辑保存
const handleLocationEditSave = (location: MapLocation) => {
  // 保存成功后可以添加一些后续处理，比如刷新画布
};

// 处理点右键菜单（预留功能）
const handlePointContextMenu = (point: MapPoint, e: any) => {
  e.cancelBubble = true;

  // 阻止浏览器默认右键菜单
  if (e.evt) {
    e.evt.preventDefault();
  }

  // 选中该点
  const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
  mapEditorStore.selectElement(point.id, "point", multiSelect);

  // 预留：未来可以打开点的编辑对话框
  // editingPointId.value = point.id;
  // pointEditDialogVisible.value = true;
};

// ==================== 路径控制点编辑 ====================

// 路径控制点点击
const handlePathControlPointClick = (
  path: MapPath,
  cp: any,
  index: number,
  e: any,
) => {
  e.cancelBubble = true;
  // 选中路径
  mapEditorStore.selectElement(path.id, "path", false);
};

// 路径控制点拖拽
const handlePathControlPointDragStart = (
  path: MapPath,
  cp: any,
  index: number,
) => {
  isDragging.value = true;
  pathControlPointDragPathId.value = path.id;
};

const handlePathControlPointDragMove = (
  path: MapPath,
  cp: any,
  index: number,
  e: any,
) => {
  const node = e.target;
  const x = node.x();
  const y = node.y();
  const snapped = snapPoint(
    { x, y },
    {
      snapToGrid: true,
      gridSize: gridSize.value,
      snapToPoint: true,
      targetPoints: mapEditorStore.points.map((p) => ({ x: p.x, y: p.y })),
    },
  );
  node.x(snapped.x);
  node.y(snapped.y);
};

const handlePathControlPointDragEnd = (
  path: MapPath,
  cp: any,
  index: number,
) => {
  isDragging.value = false;
  pathControlPointDragPathId.value = null;
  const layer = getKonvaNode(pathLayerRef.value);
  if (!layer) return;
  const node = layer.findOne(`#${path.id}-cp-${index}`);
  if (!node) return;
  const newX = node.x();
  const newY = node.y();
  const cps = path.geometry.controlPoints;
  const isFirst = index === 0;
  const isLast = index === cps.length - 1;
  const pointIds = new Set(mapEditorStore.points.map((p) => String(p.id)));

  // 更新本路径的控制点
  const updatedControlPoints = [...cps];
  updatedControlPoints[index] = {
    ...updatedControlPoints[index],
    x: newX,
    y: newY,
  };
  mapEditorStore.updatePath(path.id, {
    geometry: { ...path.geometry, controlPoints: updatedControlPoints },
  });

  // 若拖的是端点且该端点绑定了"点"，则同步更新点的坐标，避免红点（路径端点）与蓝点（地图点）分离
  const syncPointId = isFirst
    ? path.startPointId != null
      ? String(path.startPointId)
      : null
    : isLast
      ? path.endPointId != null
        ? String(path.endPointId)
        : null
      : null;
  if (syncPointId && pointIds.has(syncPointId)) {
    mapEditorStore.updatePoint(syncPointId, { x: newX, y: newY });
    mapEditorStore.paths.forEach((p) => {
      const pts = p.geometry.controlPoints;
      if (!pts.length) return;
      const startId = p.startPointId != null ? String(p.startPointId) : null;
      const endId = p.endPointId != null ? String(p.endPointId) : null;
      let next: typeof pts | null = null;
      if (startId === syncPointId) {
        next = [...pts];
        next[0] = { ...next[0], x: newX, y: newY };
      }
      if (endId === syncPointId) {
        next = next ?? [...pts];
        next[next.length - 1] = { ...next[next.length - 1], x: newX, y: newY };
      }
      if (next)
        mapEditorStore.updatePath(p.id, {
          geometry: { ...p.geometry, controlPoints: next },
        });
    });
  }
};

// ==================== 位置顶点编辑 ====================

// 获取位置顶点配置
const getLocationVertexConfig = (
  location: MapLocation,
  vertex: any,
  index: number,
) => {
  const isSelected = mapEditorStore.selection.selectedIds.has(location.id);
  return {
    id: `${location.id}-v-${index}`,
    x: vertex.x,
    y: vertex.y,
    radius: isSelected ? 6 : 4,
    fill: isSelected ? "#ff4d4f" : "#1890ff",
    stroke: "#ffffff",
    strokeWidth: 1,
    draggable: isSelected && isSelectInteractionTool.value,
    listening: true,
    opacity: isSelected ? 1 : 0.7,
  };
};

// 位置顶点点击
const handleLocationVertexClick = (
  location: MapLocation,
  vertex: any,
  index: number,
  e: any,
) => {
  e.cancelBubble = true;
  // 选中位置
  mapEditorStore.selectElement(location.id, "location", false);
};

// 位置顶点拖拽
const handleLocationVertexDragStart = (
  location: MapLocation,
  vertex: any,
  index: number,
) => {
  isDragging.value = true;
};

const handleLocationVertexDragMove = (
  location: MapLocation,
  vertex: any,
  index: number,
  e: any,
) => {
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
      targetPoints: mapEditorStore.points.map((p) => ({ x: p.x, y: p.y })),
    },
  );

  node.x(snapped.x);
  node.y(snapped.y);
  // 拖动时实时更新 store
  const updatedVertices = [...location.geometry.vertices];
  updatedVertices[index] = {
    ...updatedVertices[index],
    x: snapped.x,
    y: snapped.y,
  };
  mapEditorStore.updateLocation(location.id, {
    geometry: { ...location.geometry, vertices: updatedVertices },
  });
};

const handleLocationVertexDragEnd = (
  location: MapLocation,
  vertex: any,
  index: number,
) => {
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
          vertices: updatedVertices,
        },
      });
    }
  }
};

// 获取 Links 图层组下的图层ID
const getLinksLayerId = (): string => {
  // 查找 Links 图层组
  const linksGroup = mapEditorStore.layerGroups.find((g) => g.name === "Links");

  if (linksGroup) {
    // 查找 Links 图层组下的图层
    const linksLayer = mapEditorStore.layers.find(
      (l) => l.layerGroupId === linksGroup.id,
    );

    if (linksLayer) {
      return linksLayer.id;
    }
  }

  // 如果找不到 Links 图层组或图层，使用默认图层（不创建新图层）
  return getDefaultLayerId("path");
};

// 监听画布状态变化，更新网格
watch(currentTool, (tool) => {
  if (tool !== ToolMode.PATH) {
    cancelPathDrag();
  }
  if (tool !== ToolMode.DASHED_LINK) {
    cancelDashedLinkDrag();
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
  setGridSize,
  setGridColor,
  gridSize,
  getMousePosition: () => mousePosition.value,
  exportAsImage,
});

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    if (
      (currentTool.value === ToolMode.LOCATION ||
        currentTool.value === ToolMode.RULE_REGION) &&
      isDrawing.value
    ) {
      cancelLocationDrawing();
    } else if (
      currentTool.value === ToolMode.PATH &&
      pathDragState.startPoint
    ) {
      cancelPathDrag();
    } else if (
      currentTool.value === ToolMode.DASHED_LINK &&
      dashedLinkDragState.startLocation
    ) {
      cancelDashedLinkDrag();
    }
  } else if (e.code === "Space") {
    isSpacePressed.value = true;
    const stage = getKonvaNode(stageRef.value);
    if (stage && stage.container) {
      stage.container().style.cursor = "grab";
    }
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    isSpacePressed.value = false;
    const stage = getKonvaNode(stageRef.value);
    if (stage && stage.container) {
      stage.container().style.cursor = "default";
    }
  }
};

// 容器尺寸监听器
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  loadLocationTypes();
  nextTick(() => {
    const stage = getKonvaNode(stageRef.value);
    if (stage && typeof stage.on === "function") {
      stage.on("mousedown", handleStageMouseDown);
    }
    if (stage?.container) {
      const t = mapEditorStore.currentTool;
      stage.container().style.cursor = t === ToolMode.PAN ? "grab" : "default";
    }
  });
  // 初始化容器视口尺寸（不修改 store 中的逻辑画布宽高，避免覆盖地图模型尺寸导致点位偏移）
  nextTick(() => {
    if (containerRef.value) {
      containerSize.value = {
        width: containerRef.value.clientWidth || 1920,
        height: containerRef.value.clientHeight || 1080,
      };
      tryApplyViewportOriginBottomLeft();

      // 监听容器尺寸变化：只更新视口尺寸，不覆盖 canvasState.width/height（模型空间）
      resizeObserver = new ResizeObserver(() => {
        if (containerRef.value) {
          containerSize.value = {
            width: containerRef.value.clientWidth || 1920,
            height: containerRef.value.clientHeight || 1080,
          };
          tryApplyViewportOriginBottomLeft();
          const stage = getKonvaNode(stageRef.value);
          if (stage) stage.batchDraw();
        }
      });

      resizeObserver.observe(containerRef.value);
    }
  });

  // 使用 load 接口返回的图层，不创建新的默认图层
  // 如果没有激活图层，选择第一个图层作为激活图层
  if (
    !mapEditorStore.activeLayerId ||
    !mapEditorStore.layers.some((l) => l.id === mapEditorStore.activeLayerId)
  ) {
    const fallbackLayer =
      mapEditorStore.layers.find((l) => l.name === "Default layer") ||
      mapEditorStore.layers[0];
    if (fallbackLayer) {
      mapEditorStore.setActiveLayer(fallbackLayer.id);
    }
  }

  // 注册键盘事件
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
});

onUnmounted(() => {
  stopPathPreviewGlobalMove();
  stopCanvasPanWindowListeners();
  const stage = getKonvaNode(stageRef.value);
  if (stage && typeof stage.off === "function") {
    stage.off("mousedown", handleStageMouseDown);
  }
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
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
  background-color: #f7f8fa;

  // 确保 Konva Stage 占满容器
  :deep(canvas) {
    display: block;
  }
}

/* 旧 CSS 坐标轴已迁移到 Konva axes 层，样式已清理 */
</style>
