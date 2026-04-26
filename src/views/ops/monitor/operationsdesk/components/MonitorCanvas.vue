<script setup lang="ts">
/**
 * 监控画布：与「部署管理 / 地图管理」控制台保持一致的画布行为
 *
 * 架构（对齐 deploy/factory/map 的多图模式）：
 *   ┌──────────────────────────────── stage-canvas ─────────────────────────────┐
 *   │  CSS 网格底纹 · 滚轮缩放 · 鼠标拖拽平移                                       │
 *   │  ┌──── canvas-map-layer (transform: translate + scale) ────┐               │
 *   │  │   • MapRenderer（合并后的所有地图元素，scale=1，由外层缩放）              │
 *   │  │   • 车辆 SVG 标记（map 坐标系，跟随外层缩放）                             │
 *   │  │   • 工厂坐标原点 O(0,0) 实线 X/Y 轴                                      │
 *   │  └────────────────────────────────────────────────────────────────────────┘ │
 *   └──────────────────────────────────────────────────────────────────────────────┘
 *   叠加层：左上角合并地图徽章 / 左下角图例 / 右下角浮动工具栏 / 顶部+左侧 cm 刻度尺
 *
 * 说明：
 *   • viewOffset 为工厂原点 O(0,0) 在画布内容区的屏幕像素位置（参考左下角）
 *   • canvasScale 与 deploy/factory/map 同名同义，与 MapRenderer 内部 scale 解耦
 *   • 1px = 1mm（项目默认约定）
 */
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { Monitor, View, Hide } from '@element-plus/icons-vue';
import { loadMapEditorData } from '@/api/deploy/map-editor';
import { listMapsByFactory } from '@/api/deploy/factory/map';
import MapRenderer from '@/components/map/MapRenderer.vue';
import MonitorRuler from './MonitorRuler.vue';
import { normalizeMapEditorPayload } from '../utils/mapElementNormalize';
import layerIconUrl from '@/assets/icons/svg/layer.svg?url';
import type { VehicleRuntimeVO } from '@/api/ops/monitor';

interface MergedMapData {
  points: any[];
  paths: any[];
  locations: any[];
  /** 内容包围盒（已含负坐标补偿后的视觉范围） */
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
  /** 参与合并的地图数量 */
  mapCount: number;
}

// 响应解包 + 元素归一化全部抽到 utils/mapElementNormalize.ts

const props = defineProps<{
  factoryId?: number;
  vehicles: VehicleRuntimeVO[];
  activeVehicleId?: string;
}>();

const emit = defineEmits<{
  (e: 'vehicle-click', vehicle: VehicleRuntimeVO): void;
}>();

// ==================== 数据 ====================
const mapData = ref<MergedMapData | null>(null);
const loading = ref(false);

// ==================== 视图状态 ====================
const SCALE = 1; // mm → px
const SCALE_MIN = 0.1;
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

/** 画布内容区尺寸（响应式跟随 ResizeObserver 更新） */
const canvasSize = reactive({ w: 800, h: 600 });

function getCanvasRect() {
  const el = canvasRef.value;
  if (!el) return { w: canvasSize.w || 800, h: canvasSize.h || 600 };
  const rect = el.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

/** 地图层 transform：把工厂原点 O(0,0) 落在画布内容区的指定位置 */
const mapLayerStyle = computed(() => {
  return {
    transform: `translate(${viewOffset.x}px, ${
      canvasSize.h - viewOffset.y
    }px) scale(${canvasScale.value})`
  };
});

/** 刻度尺需要：工厂原点 O(0,0) 在画布内容区的「屏幕 y 像素位置（自顶向下）」 */
const rulerOffsetY = computed(() => canvasSize.h - viewOffset.y);

// ==================== 图层显隐 ====================
/**
 * 图层菜单项与地图管理控制台 / 编辑器对齐：
 *   站点 / 路径 / 方向 / 网格
 * 监控模式补充：车辆显隐
 */
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

// ==================== 加载地图 ====================
/** 监控模式：合并工厂下所有地图的 points/paths/locations */
const loadMap = async () => {
  if (!props.factoryId) return;
  loading.value = true;
  mapData.value = null;
  try {
    const listRes: any = await listMapsByFactory(props.factoryId);
    const list: any[] = (listRes as any)?.data || (listRes as any)?.rows || [];
    if (list.length === 0) {
      mapData.value = null;
      return;
    }

    const results = await Promise.allSettled(
      list.map((m) => loadMapEditorData(m.mapId))
    );

    const merged: MergedMapData = {
      points: [],
      paths: [],
      locations: [],
      bounds: null,
      mapCount: 0
    };

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      // 与地图管理控制台同源：解包 + 归一化（x/y 兜底、layout/properties 解析）
      const { points, paths, locations } = normalizeMapEditorPayload(r.value);
      if (
        points.length === 0 &&
        paths.length === 0 &&
        locations.length === 0
      ) {
        continue;
      }
      merged.points.push(...points);
      merged.paths.push(...paths);
      merged.locations.push(...locations);
      merged.mapCount++;

      // 累积包围盒（用于 fitView）—— 归一化后 x/y 总是数字
      for (const p of points) {
        const x = Number(p.x);
        const y = Number(p.y);
        if (Number.isFinite(x)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
        if (Number.isFinite(y)) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      for (const l of locations) {
        const x = Number(l.x);
        const y = Number(l.y);
        if (Number.isFinite(x)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
        if (Number.isFinite(y)) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      // 路径控制点也参与包围盒
      for (const path of paths) {
        const cps = path?.geometry?.controlPoints ?? [];
        for (const cp of cps) {
          const x = Number(cp?.x);
          const y = Number(cp?.y);
          if (Number.isFinite(x)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
          }
          if (Number.isFinite(y)) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
    }

    if (Number.isFinite(minX)) {
      merged.bounds = { minX, maxX, minY, maxY };
    }

    mapData.value = merged.mapCount > 0 ? merged : null;

    // 加载完成后自动适应窗口
    if (mapData.value) {
      requestAnimationFrame(() => fitView());
    }
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

// ==================== MapRenderer 容器尺寸 ====================
/**
 * MapRenderer 的画布尺寸：覆盖到内容包围盒最远边
 * - 内容坐标可能为负（被 Konva 自动裁切），所以左上角 (0,0) 不一定可视
 * - 这里给一个相对宽松的画布，让所有内容都能在 (0,0)~(W,H) 内被绘制到
 */
const rendererSize = computed(() => {
  const b = mapData.value?.bounds;
  if (!b) return { w: 1, h: 1 };
  // 外扩 200mm 防止被 Konva 默认裁切
  const w = Math.max(1, Math.ceil(b.maxX) + 200);
  const h = Math.max(1, Math.ceil(b.maxY) + 200);
  return { w, h };
});

// ==================== 车辆标记 ====================
const VEHICLE_RADIUS = 12;

const vehicleColor = (state: string): string => {
  const map: Record<string, string> = {
    IDLE: '#67C23A',
    WORKING: '#409EFF',
    CHARGING: '#E6A23C',
    ERROR: '#F56C6C',
    UNKNOWN: '#909399',
    UNAVAILABLE: '#909399'
  };
  return map[state] || '#909399';
};

/** 车辆在 map 坐标系下的位置（mm），由 .canvas-map-layer 的 transform 自动缩放 */
const vehicleMarkers = computed(() => {
  if (!mapData.value) return [];
  return props.vehicles.map((v) => ({
    vehicleId: v.vehicleId,
    name: v.name,
    state: v.state,
    color: vehicleColor(v.state),
    // 与 useCanvasAxis 一致：屏幕 y 向下 = 模型 -y
    x: v.position?.x ?? 0,
    y: v.position?.y ?? 0,
    isActive: v.vehicleId === props.activeVehicleId
  }));
});

// ==================== 图例 ====================
const legend = [
  { label: '空闲', color: '#67C23A' },
  { label: '任务中', color: '#409EFF' },
  { label: '充电中', color: '#E6A23C' },
  { label: '异常', color: '#F56C6C' },
  { label: '离线', color: '#909399' }
];

// ==================== 缩放与平移 ====================
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
  // 点到工具栏 / 浮层时不触发拖拽
  const target = e.target as HTMLElement;
  if (target.closest('.map-toolbar, .map-legend, .map-count-badge')) return;
  // 仅左键
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

// 跟踪画布内容区尺寸，让 mapLayerStyle 与刻度尺响应窗口/侧栏变化
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
  // 初始读一次，避免首帧 (800,600) 默认值
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

// ==================== 工具栏动作 ====================
// 放大/缩小由滚轮承担（与地图管理控制台一致），右下角浮动控件仅保留：图层 + 1:1
// fitView 仅在地图加载完成时内部调用，用于自动聚焦内容

/** 适应窗口：根据内容包围盒计算合适缩放，并居中 */
function fitView() {
  const b = mapData.value?.bounds;
  const { w, h } = getCanvasRect();
  if (!b || w <= 0 || h <= 0) {
    resetZoom();
    return;
  }
  const contentW = Math.max(1, b.maxX - b.minX);
  const contentH = Math.max(1, b.maxY - b.minY);
  const padding = 80;
  const sx = (w - padding * 2) / contentW;
  const sy = (h - padding * 2) / contentH;
  const s = clampScale(Math.min(sx, sy));
  canvasScale.value = s;

  // 内容中心点（map 坐标系）
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  // 让内容中心落在画布中心：viewOffset 是工厂原点 O(0,0) 的位置
  // map 坐标 (cx, cy) 在屏幕上的位置 = viewOffset.x + cx*s, h - (h - viewOffset.y + cy*s)
  // 要让 (cx, cy) 居中：
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
        <!-- 地图层（CSS transform 实现 pan + zoom） -->
        <div class="canvas-map-layer" :style="mapLayerStyle">
          <!-- 合并后的地图元素：scale=1，由外层 transform 缩放 -->
          <MapRenderer
            v-if="mapData"
            class="preview-konva-layer"
            :points="layerVisibility.station ? (mapData.points || []) : []"
            :paths="layerVisibility.path ? (mapData.paths || []) : []"
            :locations="layerVisibility.station ? (mapData.locations || []) : []"
            :width="rendererSize.w"
            :height="rendererSize.h"
            :scale="1"
            :offset-x="0"
            :offset-y="0"
            :auto-center="false"
            :flip-y="false"
            readonly
          />

          <!-- 车辆标记（map 坐标系）—— 跟随外层缩放 -->
          <svg
            v-if="mapData && layerVisibility.vehicle"
            class="vehicle-svg"
            :width="rendererSize.w"
            :height="rendererSize.h"
            :viewBox="`0 0 ${rendererSize.w} ${rendererSize.h}`"
          >
            <g v-for="v in vehicleMarkers" :key="v.vehicleId">
              <circle
                :cx="v.x"
                :cy="v.y"
                :r="VEHICLE_RADIUS"
                :fill="v.color"
                :stroke="v.isActive ? '#fff' : 'rgba(255,255,255,0.6)'"
                :stroke-width="v.isActive ? 3 : 2"
                :class="{ 'vehicle-active': v.isActive }"
                class="vehicle-node"
                @click="emit('vehicle-click', props.vehicles.find(p => p.vehicleId === v.vehicleId)!)"
              />
              <text
                :x="v.x"
                :y="v.y - VEHICLE_RADIUS - 4"
                text-anchor="middle"
                font-size="10"
                font-weight="600"
                :fill="v.color"
              >{{ v.name }}</text>
            </g>
          </svg>

          <!-- 工厂坐标原点 O(0,0) 实线坐标轴 -->
          <div class="layer-axis">
            <div class="axis-line axis-x" />
            <div class="axis-line axis-y" />
            <div class="axis-origin">O(0,0)</div>
          </div>
        </div>

        <!-- 左上角：合并地图数量徽章 -->
        <div v-if="mapData && mapData.mapCount > 1" class="map-count-badge">
          已合并 {{ mapData.mapCount }} 张地图
        </div>

        <!-- 左下角图例 -->
        <div v-if="mapData" class="map-legend">
          <div class="legend-title">车辆状态</div>
          <div class="legend-items">
            <div v-for="item in legend" :key="item.label" class="legend-item">
              <span class="legend-dot" :style="{ background: item.color }"></span>
              <span class="legend-label">{{ item.label }}</span>
            </div>
          </div>
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
  left: 0;
  top: 0;
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

/* —— 工厂坐标轴 O(0,0)（与地图管理控制台样式同源） —— */
.layer-axis {
  position: absolute;
  left: 0;
  top: 0;
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

/* —— 图例 —— */
.map-legend {
  position: absolute;
  left: 16px;
  bottom: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  pointer-events: none;
  user-select: none;
  z-index: 10;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.legend-items {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 4px 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.legend-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
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
