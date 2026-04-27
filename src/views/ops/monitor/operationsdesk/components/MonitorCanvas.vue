<script setup lang="ts">
/**
 * 监控画布：把工厂下所有地图按各自的 mapOrigin 摆到同一张语义画布
 *
 * 架构（对齐 deploy/factory/map 的「原点编辑」多图模式）：
 *
 *   stage-canvas（背景网格 + 鼠标平移/缩放）
 *   └─ canvas-map-layer（CSS transform: translate + scale，统一 pan/zoom）
 *      ├─ 工厂坐标原点 O(0,0) 实线 X/Y 轴
 *      ├─ 每张地图：MapRenderer + 该地图的 mapOrigin 虚线轴
 *      │    位置：left = ox - clip.x, top = -oy - clip.y
 *      │    内部：MapRenderer 用「scale=1, autoCenter=false」直出
 *      └─ 车辆 SVG（按车辆在工厂坐标系下的位置渲染）
 *
 * 关键约定：
 *   • 工厂坐标系 Y 向上为正；CSS / Konva 内部 Y 向下为正 → 通过 top: -oy 翻转
 *   • mapOrigin 来自后端 `mapOrigin` / `map_origin` 字段（[ox, oy, θ]）
 *   • 1px = 1mm（项目默认）
 */
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { Monitor, View, Hide } from '@element-plus/icons-vue';
import { loadMapEditorData } from '@/api/deploy/map-editor';
import { listMapsByFactory } from '@/api/deploy/factory/map';
import MapRenderer from '@/components/map/MapRenderer.vue';
import MonitorRuler from './MonitorRuler.vue';
import {
  normalizeMapEditorPayload,
  computeClipForElements,
  computeMaxExtentForElements,
  unwrapAjaxMapPayload
} from '../utils/mapElementNormalize';
import { parseNavigationMapOrigin } from '@/utils/mapEditor/navigationMapOrigin';
import layerIconUrl from '@/assets/icons/svg/layer.svg?url';
import type { VehicleRuntimeVO } from '@/api/ops/monitor';

// ============================================================================
// 类型
// ============================================================================
/** 单张地图在工厂场景内的渲染单元 */
interface FactoryMapLayer {
  mapId: string;
  name: string;
  /** 该地图原点在工厂坐标系下的位置（mm） */
  originX: number;
  originY: number;
  rotation: number;
  /** 归一化后的点位/路径/库位（map-local 坐标） */
  points: any[];
  paths: any[];
  locations: any[];
  /** 负坐标补偿与 Konva 画布尺寸 */
  clip: { x: number; y: number };
  canvasW: number;
  canvasH: number;
  /** map-local 元素包围盒（含 clip 后） */
  localBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** 整张工厂语义画布的数据 */
interface FactoryMapData {
  layers: FactoryMapLayer[];
  /** 工厂坐标系 CSS（Y-down）下的整体包围盒 */
  layerBoundsCss: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
}

// ============================================================================
// Props / Emits
// ============================================================================
const props = defineProps<{
  factoryId?: number;
  vehicles: VehicleRuntimeVO[];
  activeVehicleId?: string;
}>();

const emit = defineEmits<{
  (e: 'vehicle-click', vehicle: VehicleRuntimeVO): void;
}>();

// ============================================================================
// 数据 / 视图状态
// ============================================================================
const mapData = ref<FactoryMapData | null>(null);
const loading = ref(false);

const SCALE = 1; // 1 模型单位 = 1 mm
const SCALE_MIN = 0.05;
const SCALE_MAX = 20;
const SCALE_STEP = 1.1;

const canvasRef = ref<HTMLElement | null>(null);
/** 工厂原点 O(0,0) 在画布内容区的屏幕像素位置（参考左下角） */
const viewOffset = reactive({ x: 150, y: 150 });
const canvasScale = ref(1);
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const viewStart = reactive({ x: 0, y: 0 });

const clampScale = (s: number) => Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));

/** 画布内容区尺寸（响应式） */
const canvasSize = reactive({ w: 800, h: 600 });

function getCanvasRect() {
  const el = canvasRef.value;
  if (!el) return { w: canvasSize.w || 800, h: canvasSize.h || 600 };
  const rect = el.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

/** 地图层 transform：让工厂原点 O(0,0) 落在画布内 (viewOffset.x, h - viewOffset.y) */
const mapLayerStyle = computed(() => ({
  transform: `translate(${viewOffset.x}px, ${
    canvasSize.h - viewOffset.y
  }px) scale(${canvasScale.value})`
}));

/** 刻度尺：把工厂原点的「自顶向下屏幕 y」喂给它 */
const rulerOffsetY = computed(() => canvasSize.h - viewOffset.y);

// ============================================================================
// 图层显隐（与地图管理控制台 / 编辑器对齐 + 监控专属车辆）
// ============================================================================
interface LayerVisibility {
  station: boolean;
  path: boolean;
  pathDirection: boolean;
  grid: boolean;
  vehicle: boolean;
}

const layerVisibility = reactive<LayerVisibility>({
  station: true,
  path: true,
  pathDirection: true,
  grid: true,
  vehicle: true
});

const layerMenuItems: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'station', label: '站点显隐' },
  { key: 'path', label: '路径显隐' },
  { key: 'pathDirection', label: '方向显隐' },
  { key: 'grid', label: '网格显隐' },
  { key: 'vehicle', label: '车辆显隐' }
];

function toggleLayerKey(key: keyof LayerVisibility) {
  layerVisibility[key] = !layerVisibility[key];
}

const layerAllVisible = computed(() =>
  (Object.keys(layerVisibility) as (keyof LayerVisibility)[]).every(
    (k) => layerVisibility[k]
  )
);

// ============================================================================
// 加载地图
// ============================================================================
const loadMap = async () => {
  if (!props.factoryId) return;
  loading.value = true;
  mapData.value = null;
  try {
    const listRes: any = await listMapsByFactory(props.factoryId);
    const list: any[] =
      (listRes as any)?.data || (listRes as any)?.rows || [];
    if (list.length === 0) {
      mapData.value = null;
      return;
    }

    const results = await Promise.allSettled(
      list.map((m) => loadMapEditorData(m.mapId))
    );

    const layers: FactoryMapLayer[] = [];
    let cssMinX = Infinity;
    let cssMaxX = -Infinity;
    let cssMinY = Infinity;
    let cssMaxY = -Infinity;

    results.forEach((r, idx) => {
      if (r.status !== 'fulfilled' || !r.value) return;
      const meta = list[idx] || {};
      // 必须先 unwrap 再 normalize（与 deploy/factory/map/index.vue loadMapElements 一致）
      const unwrapped = unwrapAjaxMapPayload(r.value);
      const { points, paths, locations } = normalizeMapEditorPayload(
        unwrapped
      );
      if (
        points.length === 0 &&
        paths.length === 0 &&
        locations.length === 0
      ) {
        return;
      }

      // 解析该地图在工厂场景下的原点
      const origin = parseNavigationMapOrigin(meta as any);

      // 负坐标补偿 & Konva 画布尺寸
      const clip = computeClipForElements(points, locations, paths);
      const { maxX, maxY } = computeMaxExtentForElements(
        points,
        locations,
        paths,
        clip
      );
      const canvasW = Math.max(1, Math.ceil(maxX) + 8);
      const canvasH = Math.max(1, Math.ceil(maxY) + 8);

      // map-local 元素包围盒（不含 clip，用于工厂级 bounds 计算）
      let lMinX = Infinity;
      let lMaxX = -Infinity;
      let lMinY = Infinity;
      let lMaxY = -Infinity;
      const accept = (x: number, y: number) => {
        if (Number.isFinite(x)) {
          lMinX = Math.min(lMinX, x);
          lMaxX = Math.max(lMaxX, x);
        }
        if (Number.isFinite(y)) {
          lMinY = Math.min(lMinY, y);
          lMaxY = Math.max(lMaxY, y);
        }
      };
      for (const p of points) accept(Number(p.x), Number(p.y));
      for (const l of locations) accept(Number(l.x), Number(l.y));
      for (const path of paths) {
        for (const cp of path?.geometry?.controlPoints ?? []) {
          accept(Number(cp?.x), Number(cp?.y));
        }
      }
      // 防御性：空 bounds → 给一个零范围
      if (!Number.isFinite(lMinX)) {
        lMinX = lMaxX = lMinY = lMaxY = 0;
      }

      layers.push({
        mapId: String(meta.mapId ?? meta.id ?? `map-${idx}`),
        name: String(meta.name ?? meta.mapId ?? `map ${idx + 1}`),
        originX: origin.originX,
        originY: origin.originY,
        rotation: origin.rotation,
        points,
        paths,
        locations,
        clip,
        canvasW,
        canvasH,
        localBounds: { minX: lMinX, maxX: lMaxX, minY: lMinY, maxY: lMaxY }
      });

      // 工厂坐标系 CSS Y-down 包围盒：
      //   factoryX = originX + localX
      //   factoryY-CSS = -originY + localY  （Konva 内部 y 向下，工厂 y 向上 → CSS y 翻转）
      const fXmin = origin.originX + lMinX;
      const fXmax = origin.originX + lMaxX;
      const fYmin = -origin.originY + lMinY;
      const fYmax = -origin.originY + lMaxY;
      cssMinX = Math.min(cssMinX, fXmin);
      cssMaxX = Math.max(cssMaxX, fXmax);
      cssMinY = Math.min(cssMinY, fYmin);
      cssMaxY = Math.max(cssMaxY, fYmax);
    });

    if (layers.length === 0) {
      mapData.value = null;
      return;
    }

    mapData.value = {
      layers,
      layerBoundsCss: Number.isFinite(cssMinX)
        ? { minX: cssMinX, maxX: cssMaxX, minY: cssMinY, maxY: cssMaxY }
        : null
    };

    // 加载完成后自动 fit；下一帧等 ResizeObserver 落定再 fit 一次
    requestAnimationFrame(() => fitView());
    setTimeout(() => fitView(), 80);
  } catch (e) {
    console.error('[monitor] load maps error:', e);
    mapData.value = null;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.factoryId,
  (val) => {
    if (val) loadMap();
  },
  { immediate: true }
);

// ============================================================================
// 单张地图的样式
// ============================================================================
function getMapRendererStyle(layer: FactoryMapLayer): Record<string, string> {
  return {
    width: `${layer.canvasW}px`,
    height: `${layer.canvasH}px`,
    left: `${layer.originX * SCALE - layer.clip.x}px`,
    top: `${-layer.originY * SCALE - layer.clip.y}px`
  };
}

/** 该地图原点的虚线 X/Y 轴位置（工厂 CSS Y-down） */
function getMapOriginAxisStyle(
  layer: FactoryMapLayer
): Record<string, string> {
  return {
    left: `${layer.originX * SCALE}px`,
    top: `${-layer.originY * SCALE}px`
  };
}

// ============================================================================
// 车辆标记
// ============================================================================
const VEHICLE_RADIUS = 12;

function vehicleColor(state: string): string {
  const map: Record<string, string> = {
    IDLE: '#67C23A',
    WORKING: '#409EFF',
    CHARGING: '#E6A23C',
    ERROR: '#F56C6C',
    UNKNOWN: '#909399',
    UNAVAILABLE: '#909399'
  };
  return map[state] || '#909399';
}

/** 工厂坐标系 Y-up → CSS Y-down */
const vehicleMarkers = computed(() => {
  return props.vehicles.map((v) => ({
    vehicleId: v.vehicleId,
    name: v.name,
    state: v.state,
    color: vehicleColor(v.state),
    cssX: (v.position?.x ?? 0) * SCALE,
    cssY: -(v.position?.y ?? 0) * SCALE,
    isActive: v.vehicleId === props.activeVehicleId
  }));
});

// ============================================================================
// 缩放与平移
// ============================================================================
function handleCanvasWheel(e: WheelEvent) {
  const el = canvasRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pointerX = e.clientX - rect.left;
  const pointerY = rect.bottom - e.clientY;

  const oldScale = canvasScale.value;
  const newScale = clampScale(
    e.deltaY > 0 ? oldScale / SCALE_STEP : oldScale * SCALE_STEP
  );
  if (newScale === oldScale) return;
  canvasScale.value = newScale;

  const ratio = newScale / oldScale;
  viewOffset.x = pointerX - (pointerX - viewOffset.x) * ratio;
  viewOffset.y = pointerY - (pointerY - viewOffset.y) * ratio;
}

function startPan(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (
    target.closest(
      '.canvas-floating-controls, .map-count-badge, .ruler-info-box'
    )
  ) {
    return;
  }
  if (e.button !== 0) return;

  isDragging.value = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  viewStart.x = viewOffset.x;
  viewStart.y = viewOffset.y;
  document.body.style.cursor = 'grabbing';
  document.addEventListener('mousemove', onPan);
  document.addEventListener('mouseup', endPan);
}

function onPan(e: MouseEvent) {
  if (!isDragging.value) return;
  viewOffset.x = viewStart.x + (e.clientX - dragStart.x);
  viewOffset.y = viewStart.y - (e.clientY - dragStart.y);
}

function endPan() {
  if (isDragging.value) {
    isDragging.value = false;
    document.body.style.cursor = '';
  }
  document.removeEventListener('mousemove', onPan);
  document.removeEventListener('mouseup', endPan);
}

// ============================================================================
// 容器尺寸观察
// ============================================================================
let canvasResizeObs: ResizeObserver | null = null;
onMounted(() => {
  if (!canvasRef.value || typeof ResizeObserver === 'undefined') return;
  canvasResizeObs = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect;
      canvasSize.w = cr.width;
      canvasSize.h = cr.height;
    }
  });
  canvasResizeObs.observe(canvasRef.value);
  const rect = canvasRef.value.getBoundingClientRect();
  canvasSize.w = rect.width;
  canvasSize.h = rect.height;
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPan);
  document.removeEventListener('mouseup', endPan);
  canvasResizeObs?.disconnect();
  canvasResizeObs = null;
});

// ============================================================================
// 工具栏动作
// ============================================================================
/** 适应窗口：根据工厂 CSS Y-down 包围盒计算合适缩放并居中 */
function fitView() {
  const b = mapData.value?.layerBoundsCss;
  const { w, h } = getCanvasRect();
  if (!b || w <= 0 || h <= 0) {
    resetZoom();
    return;
  }
  const contentW = Math.max(1, b.maxX - b.minX);
  const contentH = Math.max(1, b.maxY - b.minY);
  const padding = 64;
  const sx = (w - padding * 2) / contentW;
  const sy = (h - padding * 2) / contentH;
  const s = clampScale(Math.min(sx, sy));
  canvasScale.value = s;

  // 内容中心（工厂 CSS Y-down）
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;

  // mapLayer transform: translate(viewOffset.x, h - viewOffset.y) scale(s)
  // 一个点 (px, py) 在 CSS Y-down 工厂坐标下，最终屏幕位置：
  //   sx = viewOffset.x + px * s
  //   sy = (h - viewOffset.y) + py * s
  // 让 (cx, cy) 落到画布中心 (w/2, h/2)：
  viewOffset.x = w / 2 - cx * s;
  viewOffset.y = h / 2 + cy * s;
}

/** 1:1 还原 */
function resetZoom() {
  canvasScale.value = 1;
  const { w, h } = getCanvasRect();
  viewOffset.x = w / 2;
  viewOffset.y = h / 2;
}
</script>

<template>
  <div class="monitor-canvas" v-loading="loading">
    <MonitorRuler
      :scale="canvasScale"
      :offset-x="viewOffset.x"
      :offset-y="rulerOffsetY"
      :mm-per-unit="SCALE"
      class="ruler-wrap"
    >
      <!-- 画布主体：CSS 网格 + 鼠标平移/缩放 -->
      <div
        ref="canvasRef"
        class="stage-canvas"
        :class="{ 'no-grid': !layerVisibility.grid }"
        @mousedown="startPan"
        @wheel.prevent="handleCanvasWheel"
      >
        <!-- 地图层（工厂坐标系 CSS Y-down，由 transform 统一 pan/zoom） -->
        <div class="canvas-map-layer" :style="mapLayerStyle">
          <!-- 工厂坐标原点 O(0,0) 实线坐标轴 -->
          <div class="layer-axis">
            <div class="axis-line axis-x" />
            <div class="axis-line axis-y" />
            <div class="axis-origin">O(0,0)</div>
          </div>

          <!-- 各地图：MapRenderer + 该地图原点虚线轴 -->
          <template v-for="layer in mapData?.layers || []" :key="layer.mapId">
            <MapRenderer
              class="preview-konva-layer"
              :style="getMapRendererStyle(layer)"
              :points="layerVisibility.station ? layer.points : []"
              :paths="layerVisibility.path ? layer.paths : []"
              :locations="layerVisibility.station ? layer.locations : []"
              :width="layer.canvasW"
              :height="layer.canvasH"
              :scale="1"
              :offset-x="0"
              :offset-y="0"
              :auto-center="false"
              :flip-y="false"
              readonly
            />
            <div
              class="layer-axis map-origin-axis"
              :style="getMapOriginAxisStyle(layer)"
            >
              <div class="axis-line axis-x" />
              <div class="axis-line axis-y" />
            </div>
          </template>

          <!-- 车辆标记（工厂坐标系，单一 SVG） -->
          <svg
            v-if="layerVisibility.vehicle"
            class="vehicle-svg"
            width="1"
            height="1"
            overflow="visible"
          >
            <g v-for="v in vehicleMarkers" :key="v.vehicleId">
              <circle
                :cx="v.cssX"
                :cy="v.cssY"
                :r="VEHICLE_RADIUS"
                :fill="v.color"
                :stroke="v.isActive ? '#fff' : 'rgba(255,255,255,0.6)'"
                :stroke-width="v.isActive ? 3 : 2"
                :class="{ 'vehicle-active': v.isActive }"
                class="vehicle-node"
                @click="emit('vehicle-click', props.vehicles.find(p => p.vehicleId === v.vehicleId)!)"
              />
              <text
                :x="v.cssX"
                :y="v.cssY - VEHICLE_RADIUS - 4"
                text-anchor="middle"
                font-size="10"
                font-weight="600"
                :fill="v.color"
              >{{ v.name }}</text>
            </g>
          </svg>
        </div>

        <!-- 左上角：合并地图数量徽章 -->
        <div
          v-if="mapData && mapData.layers.length > 1"
          class="map-count-badge"
        >
          已合并 {{ mapData.layers.length }} 张地图
        </div>

        <!-- 右下角浮动控件（与地图管理控制台 / 编辑器一致：图层 + 1:1） -->
        <div class="canvas-floating-controls">
          <div class="floating-slot">
            <el-popover placement="left" trigger="click" :width="200">
              <template #reference>
                <el-button
                  class="floating-btn floating-btn--layer"
                  :class="{ 'is-active': !layerAllVisible }"
                  size="small"
                  title="图层显隐"
                >
                  <img
                    class="floating-layer-icon"
                    :src="layerIconUrl"
                    alt="图层"
                  />
                </el-button>
              </template>
              <ul class="layer-visibility-menu" @click.stop>
                <li
                  v-for="item in layerMenuItems"
                  :key="item.key"
                  class="layer-visibility-menu__item"
                  :class="{ 'is-off': !layerVisibility[item.key] }"
                  @click="toggleLayerKey(item.key)"
                >
                  <el-icon class="layer-visibility-menu__icon">
                    <View v-if="layerVisibility[item.key]" />
                    <Hide v-else />
                  </el-icon>
                  <span class="layer-visibility-menu__text">
                    {{ item.label }}
                  </span>
                </li>
              </ul>
            </el-popover>
          </div>
          <div class="floating-slot">
            <el-button
              class="floating-btn mono-btn"
              size="small"
              title="还原 1:1 缩放"
              @click="resetZoom"
            >
              1:1
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <template v-if="!loading && !mapData">
          <div class="empty-canvas">
            <el-icon :size="48"><Monitor /></el-icon>
            <p>选择工厂以加载地图</p>
          </div>
        </template>
      </div>
    </MonitorRuler>
  </div>
</template>

<style scoped>
.monitor-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
}

.ruler-wrap {
  position: absolute;
  inset: 0;
}

/* —— 画布主体（背景网格，可关） —— */
.stage-canvas {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(#eef0f4 1px, transparent 1px),
    linear-gradient(90deg, #eef0f4 1px, transparent 1px);
  background-size: 18px 18px;
  overflow: hidden;
  cursor: grab;
}

.stage-canvas.no-grid {
  background-image: none;
}

.stage-canvas:active {
  cursor: grabbing;
}

/* —— 地图层：CSS transform 平移 + 缩放 —— */
.canvas-map-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  pointer-events: none;
}

.preview-konva-layer {
  position: absolute;
  overflow: visible;
  pointer-events: none;
}

.vehicle-svg {
  position: absolute;
  left: 0;
  top: 0;
  overflow: visible;
  pointer-events: none;
}

.vehicle-node {
  cursor: pointer;
  pointer-events: all;
  transition: r 0.2s;
}

.vehicle-node:hover {
  r: 16;
}

.vehicle-active {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* —— 工厂坐标轴 O(0,0)（实线）+ 各地图原点（虚线） —— */
.layer-axis {
  position: absolute;
  left: 0;
  top: 0;
}

.layer-axis.map-origin-axis .axis-x {
  background: rgba(37, 99, 235, 0.45);
  /* 虚线感：用 dashed border 模拟 */
}

.layer-axis.map-origin-axis .axis-x::before,
.layer-axis.map-origin-axis .axis-y::before,
.layer-axis.map-origin-axis .axis-x::after,
.layer-axis.map-origin-axis .axis-y::after {
  display: none;
}

.layer-axis.map-origin-axis .axis-x,
.layer-axis.map-origin-axis .axis-y {
  background: transparent;
  border-top: 1px dashed rgba(37, 99, 235, 0.5);
  height: 0;
  width: 60px;
}

.layer-axis.map-origin-axis .axis-y {
  border-top: none;
  border-left: 1px dashed rgba(239, 68, 68, 0.5);
  width: 0;
  height: 60px;
  top: -60px;
}

.axis-origin {
  position: absolute;
  left: 6px;
  top: -18px;
  font-size: 10px;
  color: #6b7280;
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
}

.axis-line {
  position: absolute;
  left: 0;
  top: 0;
}

.axis-x {
  height: 2px;
  width: 120px;
  background: #2563eb;
  transform: translateY(-50%);
}

.axis-x::before {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-left: 8px solid #2563eb;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.axis-x::after {
  content: 'X';
  position: absolute;
  right: 0;
  bottom: calc(100% + 2px);
  font-size: 11px;
  font-weight: bold;
  color: #2563eb;
}

.axis-y {
  position: absolute;
  left: 0;
  top: -120px;
  width: 2px;
  height: 120px;
  background: #ef4444;
  transform: translateX(-50%);
}

.axis-y::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom: 8px solid #ef4444;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.axis-y::after {
  content: 'Y';
  position: absolute;
  left: 8px;
  top: 0;
  font-size: 11px;
  font-weight: bold;
  color: #ef4444;
}

.empty-canvas {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  gap: 12px;
}

/* —— 合并地图数量徽章 —— */
.map-count-badge {
  position: absolute;
  left: 16px;
  top: 16px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--el-color-primary);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  user-select: none;
  pointer-events: none;
  font-weight: 500;
  z-index: 10;
}

/* —— 右下角浮动控件（与 deploy/factory/map 同源） —— */
.canvas-floating-controls {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 11;
}

.floating-slot {
  width: 36px;
  display: flex;
  justify-content: center;
}

.floating-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.floating-btn.is-active {
  border-color: #3388ff;
  color: #3388ff;
}

.floating-btn--layer {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.floating-layer-icon {
  width: 18px;
  height: 18px;
  display: block;
  object-fit: contain;
}

.mono-btn {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
</style>

<style>
/* —— 图层菜单（el-popover 内层，不能 scoped；与 deploy/factory/map 同源） —— */
.layer-visibility-menu {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  min-width: 200px;
}

.layer-visibility-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  transition: background 0.15s ease;
}

.layer-visibility-menu__item:hover {
  background: #f5f7fa;
}

.layer-visibility-menu__icon {
  font-size: 16px;
  flex-shrink: 0;
}

.layer-visibility-menu__item:not(.is-off) .layer-visibility-menu__icon,
.layer-visibility-menu__item:not(.is-off) .layer-visibility-menu__text {
  color: #3388ff;
}

.layer-visibility-menu__item.is-off .layer-visibility-menu__icon,
.layer-visibility-menu__item.is-off .layer-visibility-menu__text {
  color: #a0a0a0;
}

.layer-visibility-menu__item.is-off .layer-visibility-menu__text {
  text-decoration: line-through;
}

.layer-visibility-menu__text {
  line-height: 1.35;
}
</style>
