<script setup lang="ts">
/**
 * 仿真测试页面
 *
 * 画布实现与 MonitorCanvas 完全对齐：
 *   • MapRenderer (Konva.js) 渲染真实地图拓扑（点位/路径/库位）
 *   • SVG 叠加层渲染仿真车辆标记（与监控一致：圆角矩形+方向点）
 *   • SVG 附加层渲染路径规划线（仿真专属：当前位置→目标点）
 *   • CSS transform 统一 pan/zoom（与 MonitorCanvas 相同逻辑）
 *   • 随机坐标模式下退化为纯网格背景
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoPlay, VideoPause, CircleClose, Plus, MapLocation, View, Hide } from '@element-plus/icons-vue';
import {
  simulationApi,
  type SimSnapshot,
  type OrderSimState
} from '@/api/ops/simulation';
import type { MapVO } from '@/api/deploy/map-editor/types';
import { loadMapEditorData, listMap } from '@/api/deploy/map-editor';
import MapRenderer from '@/components/map/MapRenderer.vue';
import {
  normalizeMapEditorPayload,
  computeClipForElements,
  computeMaxExtentForElements,
  unwrapAjaxMapPayload
} from '@/views/ops/monitor/operationsdesk/utils/mapElementNormalize';
import { getLayoutScaleMm } from '@/utils/mapEditor/rasterAlignment';
import layerIconUrl from '@/assets/icons/svg/layer.svg?url';

// ─── 快照 ────────────────────────────────────────────────────────────────────

const snapshot = ref<SimSnapshot>({
  success: false,
  engineStatus: 'STOPPED',
  tick: 0,
  vehicles: [],
  orderStats: {},
  orderTotal: 0
});

const loading = ref(false);
const addingVehicles = ref(false);
const activeVehicleId = ref<string | null>(null);

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── 计算属性 ────────────────────────────────────────────────────────────────

const isRunning = computed(() => snapshot.value.engineStatus === 'RUNNING');
const isPaused = computed(() => snapshot.value.engineStatus === 'PAUSED');

const statusLabel = computed(() => {
  switch (snapshot.value.engineStatus) {
    case 'RUNNING': return '运行中';
    case 'PAUSED':  return '已暂停';
    default:        return '已停止';
  }
});

const statusType = computed((): 'success' | 'warning' | 'info' => {
  switch (snapshot.value.engineStatus) {
    case 'RUNNING': return 'success';
    case 'PAUSED':  return 'warning';
    default:        return 'info';
  }
});

const orderStateCfg: Record<string, { label: string; color: string }> = {
  CREATED:      { label: '待分配', color: '#909399' },
  ASSIGNED:     { label: '已分配', color: '#409EFF' },
  IN_EXECUTION: { label: '执行中', color: '#E6A23C' },
  COMPLETED:    { label: '已完成', color: '#67C23A' },
  TIMED_OUT:    { label: '已超时', color: '#F56C6C' },
};

const orderedStats = computed(() =>
  (['CREATED', 'ASSIGNED', 'IN_EXECUTION', 'COMPLETED', 'TIMED_OUT'] as OrderSimState[]).map((s) => ({
    state: s,
    count: snapshot.value.orderStats[s] ?? 0,
    ...orderStateCfg[s]
  }))
);

const vehicleStateLabel: Record<string, string> = {
  IDLE: '空闲', MOVING: '移动中', ERROR: '错误', STOPPED: '停止', CHARGING: '充电中'
};
const vehicleStateType: Record<string, string> = {
  IDLE: 'success', MOVING: '', ERROR: 'danger', STOPPED: 'info', CHARGING: 'warning'
};

// ─── 地图选择 ─────────────────────────────────────────────────────────────────

/** 使用通用地图列表 API，返回所有用户有权限的地图 */
const availableMaps = ref<MapVO[]>([]);
const selectedMapId = ref<number | null>(null);
const mapSettingLoading = ref(false);

async function fetchAvailableMaps() {
  try {
    const res = await listMap() as any;
    // listMap 返回 {rows: MapVO[], total: number} 或直接 MapVO[]
    const list: MapVO[] = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? []);
    availableMaps.value = list;
  } catch { /* 静默 */ }
}

async function handleMapChange(mapId: number | null) {
  mapSettingLoading.value = true;
  try {
    await simulationApi.setMap(mapId);
    if (mapId) {
      await loadMapTopology(mapId);
      ElMessage.success('已切换到真实地图模式');
    } else {
      simMapLayer.value = null;
      mapMmPerUnit.value = RANDOM_MM_PER_UNIT;
      resetZoom();
      ElMessage.success('已切换到随机坐标模式');
    }
  } catch {
    ElMessage.error('地图设置失败');
  } finally {
    mapSettingLoading.value = false;
  }
}

// ─── 地图拓扑（与 MonitorCanvas 对齐）────────────────────────────────────────

/** 1 模型单位 = RANDOM_MM_PER_UNIT mm，即 20 px/m（随机模式下固定） */
const RANDOM_MM_PER_UNIT = 50;

interface SimMapLayer {
  points: any[];
  paths: any[];
  locations: any[];
  clip: { x: number; y: number };
  canvasW: number;
  canvasH: number;
  /** CSS Y-down 工厂坐标系下的包围盒 */
  boundsCss: { minX: number; maxX: number; minY: number; maxY: number } | null;
}

const simMapLayer = ref<SimMapLayer | null>(null);
const mapMmPerUnit = ref(RANDOM_MM_PER_UNIT);
const mapLoading = ref(false);

const metersToModel = computed(() => 1000 / mapMmPerUnit.value);

async function loadMapTopology(mapId: number) {
  mapLoading.value = true;
  simMapLayer.value = null;
  try {
    const raw = await loadMapEditorData(mapId);
    const unwrapped = unwrapAjaxMapPayload(raw);
    mapMmPerUnit.value = getLayoutScaleMm(unwrapped);

    const { points, paths, locations } = normalizeMapEditorPayload(unwrapped);

    const LABEL_PAD = 60;
    const rawClip = computeClipForElements(points, locations, paths);
    const clip = { x: rawClip.x + LABEL_PAD, y: rawClip.y + LABEL_PAD };
    const { maxX, maxY } = computeMaxExtentForElements(points, locations, paths, clip);
    const canvasW = Math.max(1, Math.ceil(maxX) + LABEL_PAD);
    const canvasH = Math.max(1, Math.ceil(maxY) + LABEL_PAD);

    // 加 clip 偏移（与 MonitorCanvas getLayerXxx 一致）
    const shiftedPoints = points.map((p: any) => ({
      ...p, x: Number(p.x ?? 0) + clip.x, y: Number(p.y ?? 0) + clip.y
    }));
    const shiftedPaths = paths.map((path: any) => ({
      ...path,
      geometry: {
        ...(path.geometry || {}),
        controlPoints: (path.geometry?.controlPoints ?? []).map((cp: any) => ({
          ...cp, x: Number(cp.x ?? 0) + clip.x, y: Number(cp.y ?? 0) + clip.y
        }))
      }
    }));
    const shiftedLocations = locations.map((l: any) => ({
      ...l,
      x: Number(l.x ?? 0) + clip.x,
      y: Number(l.y ?? 0) + clip.y,
      geometry: l.geometry
        ? {
            ...l.geometry,
            vertices: Array.isArray(l.geometry.vertices)
              ? l.geometry.vertices.map((v: any) => ({
                  ...v, x: Number(v.x ?? 0) + clip.x, y: Number(v.y ?? 0) + clip.y
                }))
              : l.geometry.vertices
          }
        : l.geometry
    }));

    // 计算 CSS Y-down 包围盒（用于 fitView）
    // 元素坐标是 Konva Y-down，所以 CSS Y 即为元素 Y
    let minXb = Infinity, maxXb = -Infinity, minYb = Infinity, maxYb = -Infinity;
    for (const p of shiftedPoints) {
      minXb = Math.min(minXb, p.x - clip.x);
      maxXb = Math.max(maxXb, p.x - clip.x);
      minYb = Math.min(minYb, -(p.y - clip.y));
      maxYb = Math.max(maxYb, -(p.y - clip.y));
    }

    simMapLayer.value = {
      points: shiftedPoints,
      paths: shiftedPaths,
      locations: shiftedLocations,
      clip,
      canvasW,
      canvasH,
      boundsCss: Number.isFinite(minXb)
        ? { minX: minXb, maxX: maxXb, minY: minYb, maxY: maxYb }
        : null
    };

    requestAnimationFrame(() => fitView());
    setTimeout(() => fitView(), 80);
  } catch (e) {
    console.error('[sim] load map topology failed:', e);
    ElMessage.warning('地图拓扑加载失败，将使用随机坐标模式');
    simMapLayer.value = null;
    mapMmPerUnit.value = RANDOM_MM_PER_UNIT;
  } finally {
    mapLoading.value = false;
  }
}

// ─── 画布 Pan / Zoom（与 MonitorCanvas 完全一致）────────────────────────────

const canvasRef = ref<HTMLElement | null>(null);
const canvasSize = reactive({ w: 800, h: 600 });
const viewOffset = reactive({ x: 150, y: 150 });
const canvasScale = ref(1);
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const viewStart = reactive({ x: 0, y: 0 });

const SCALE_MIN = 0.05;
const SCALE_MAX = 20;
const SCALE_STEP = 1.1;
const clampScale = (s: number) => Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));

/** 地图层 CSS transform（与 MonitorCanvas mapLayerStyle 一致） */
const mapLayerStyle = computed(() => ({
  transform: `translate(${viewOffset.x}px, ${canvasSize.h - viewOffset.y}px) scale(${canvasScale.value})`
}));

function getCanvasRect() {
  const el = canvasRef.value;
  if (!el) return { w: canvasSize.w || 800, h: canvasSize.h || 600 };
  const rect = el.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

function handleCanvasWheel(e: WheelEvent) {
  const el = canvasRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pointerX = e.clientX - rect.left;
  const pointerY = rect.bottom - e.clientY;
  const oldScale = canvasScale.value;
  const newScale = clampScale(e.deltaY > 0 ? oldScale / SCALE_STEP : oldScale * SCALE_STEP);
  if (newScale === oldScale) return;
  canvasScale.value = newScale;
  const ratio = newScale / oldScale;
  viewOffset.x = pointerX - (pointerX - viewOffset.x) * ratio;
  viewOffset.y = pointerY - (pointerY - viewOffset.y) * ratio;
}

function startPan(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest('.canvas-floating-controls')) return;
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

function fitView() {
  const { w, h } = getCanvasRect();
  if (w <= 0 || h <= 0) return;

  let b = simMapLayer.value?.boundsCss ?? null;
  if (!b) {
    // 随机模式：70m 空间，metersToModel=20，Y 轴朝下（Y 从 0 到 -1400）
    const space = 70 * metersToModel.value;
    b = { minX: 0, maxX: space, minY: -space, maxY: 0 };
  }

  const contentW = Math.max(1, b.maxX - b.minX);
  const contentH = Math.max(1, b.maxY - b.minY);
  const padding = 64;
  const sx = (w - padding * 2) / contentW;
  const sy = (h - padding * 2) / contentH;
  const s = clampScale(Math.min(sx, sy));
  canvasScale.value = s;

  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  viewOffset.x = w / 2 - cx * s;
  viewOffset.y = h / 2 + cy * s;
}

function resetZoom() {
  canvasScale.value = 1;
  const { w, h } = getCanvasRect();
  viewOffset.x = w / 2;
  viewOffset.y = h / 2;
}

// ─── 图层显隐 ────────────────────────────────────────────────────────────────

interface LayerVisibility {
  station: boolean;
  path: boolean;
  grid: boolean;
  vehicle: boolean;
  pathLine: boolean;
}

const layerVisibility = reactive<LayerVisibility>({
  station: true,
  path: true,
  grid: true,
  vehicle: true,
  pathLine: true
});

const layerMenuItems: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'station', label: '站点显隐' },
  { key: 'path',    label: '路径显隐' },
  { key: 'grid',    label: '网格显隐' },
  { key: 'vehicle', label: '车辆显隐' },
  { key: 'pathLine', label: '规划线显隐' }
];

function toggleLayerKey(key: keyof LayerVisibility) {
  layerVisibility[key] = !layerVisibility[key];
}

const layerAllVisible = computed(() =>
  (Object.keys(layerVisibility) as (keyof LayerVisibility)[]).every(k => layerVisibility[k])
);

// ─── 车辆标记（与 MonitorCanvas SVG 设计一致）────────────────────────────────

const VEHICLE_HALF = 14;

const vehicleColorMap: Record<string, string> = {
  IDLE:     '#67C23A',
  MOVING:   '#409EFF',
  CHARGING: '#E6A23C',
  ERROR:    '#F56C6C',
  STOPPED:  '#909399'
};

/**
 * 车辆坐标转换：
 *   cssX = v.x(m) × metersToModel
 *   cssY = -(v.y(m) × metersToModel)           // Y 轴翻转（世界 Y-up → CSS Y-down）
 *
 * 方向角换算（theta 为标准数学角，CCW from East，rad）：
 *   车辆 SVG 默认前向 = 上方 (North)，对应 SVG rotate(0°)
 *   需旋转 (90° - theta_deg) 才能对齐：
 *     theta=0   (East)  → svgAngle=90°  → rotate CW 90° → 前向右 (East)  ✓
 *     theta=π/2 (North) → svgAngle=0°   → 不旋转        → 前向上 (North) ✓
 *     theta=π   (West)  → svgAngle=-90° → rotate CCW 90°→ 前向左 (West)  ✓
 */
const vehicleMarkers = computed(() => {
  const m2m = metersToModel.value;
  return snapshot.value.vehicles.map(v => {
    const cssX = v.x * m2m;
    const cssY = -(v.y * m2m);
    const tCssX = v.targetX * m2m;
    const tCssY = -(v.targetY * m2m);
    return {
      vehicleId: v.vehicleId,
      name: v.name,
      state: v.state,
      currentBattery: v.currentBattery,
      currentSpeed: v.currentSpeed,
      color: vehicleColorMap[v.state] ?? '#909399',
      cssX, cssY, tCssX, tCssY,
      svgAngle: 90 - (v.theta * 180 / Math.PI),
      isActive: v.vehicleId === activeVehicleId.value || v.name === activeVehicleId.value,
      dist: Math.hypot(tCssX - cssX, tCssY - cssY)
    };
  });
});

// ─── 地图层在 CSS 画布中的位置（仿真只有单张地图，origin=0,0）────────────────

const mapRendererStyle = computed((): Record<string, string> => {
  const layer = simMapLayer.value;
  if (!layer) return {};
  return {
    width: `${layer.canvasW}px`,
    height: `${layer.canvasH}px`,
    left: `${-layer.clip.x}px`,
    top: `${-layer.clip.y}px`
  };
});

// ─── 启动配置对话框 ───────────────────────────────────────────────────────────

const startDialogVisible = ref(false);
const startConfig = reactive({
  mapId: null as number | null,
  vehicleCount: 4,
  maxSpeed: 2.0
});

function openStartDialog() {
  // 同步当前已选地图
  startConfig.mapId = selectedMapId.value;
  startDialogVisible.value = true;
}

async function confirmStart() {
  loading.value = true;
  startDialogVisible.value = false;
  try {
    // 1. 切换地图（如有变化）
    if (startConfig.mapId !== selectedMapId.value) {
      await simulationApi.setMap(startConfig.mapId);
      selectedMapId.value = startConfig.mapId;
      if (startConfig.mapId) {
        await loadMapTopology(startConfig.mapId);
      } else {
        simMapLayer.value = null;
        mapMmPerUnit.value = RANDOM_MM_PER_UNIT;
      }
    }
    // 2. 启动引擎
    await simulationApi.start();
    // 3. 批量添加车辆
    if (startConfig.vehicleCount > 0) {
      await simulationApi.batchAddVehicles(startConfig.vehicleCount, startConfig.maxSpeed);
    }
    ElMessage.success(`仿真已启动，已添加 ${startConfig.vehicleCount} 辆车辆`);
    await fetchSnapshot();
  } catch {
    ElMessage.error('启动失败');
  } finally {
    loading.value = false;
  }
}

// ─── 控制操作 ────────────────────────────────────────────────────────────────

async function handleStart() {
  openStartDialog();
}

async function handleStop() {
  loading.value = true;
  try {
    await simulationApi.stop();
    ElMessage.success('仿真已停止');
    await fetchSnapshot();
  } catch {
    ElMessage.error('停止失败');
  } finally {
    loading.value = false;
  }
}

async function handlePauseResume() {
  loading.value = true;
  try {
    if (isPaused.value) {
      await simulationApi.resume();
      ElMessage.success('仿真已继续');
    } else {
      await simulationApi.pause();
      ElMessage.success('仿真已暂停');
    }
    await fetchSnapshot();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    loading.value = false;
  }
}

async function handleAddVehicles() {
  addingVehicles.value = true;
  try {
    await simulationApi.batchAddVehicles(2);
    ElMessage.success('已添加 2 辆测试车辆');
  } catch {
    ElMessage.error('添加车辆失败');
  } finally {
    addingVehicles.value = false;
  }
}

function handleVehicleClick(vehicleId: string) {
  activeVehicleId.value = activeVehicleId.value === vehicleId ? null : vehicleId;
}

// ─── 轮询 ────────────────────────────────────────────────────────────────────

async function fetchSnapshot() {
  try {
    const res = await simulationApi.snapshot() as unknown as SimSnapshot;
    if (res?.engineStatus) snapshot.value = res;
  } catch { /* 忽略网络抖动 */ }
}

function startPolling() {
  fetchSnapshot();
  pollTimer = setInterval(fetchSnapshot, 1000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ─── 容器尺寸响应 ─────────────────────────────────────────────────────────────

let canvasResizeObs: ResizeObserver | null = null;

onMounted(async () => {
  await fetchAvailableMaps();
  startPolling();
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
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
  }
  // 随机模式初始视角
  setTimeout(() => fitView(), 100);
});

onBeforeUnmount(() => {
  stopPolling();
  document.removeEventListener('mousemove', onPan);
  document.removeEventListener('mouseup', endPan);
  canvasResizeObs?.disconnect();
  canvasResizeObs = null;
});

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/** 计算中途方向箭头的 SVG polygon points */
function arrowPoints(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 7;
  const p1 = `${mx + size * Math.cos(angle)},${my + size * Math.sin(angle)}`;
  const p2 = `${mx + size * Math.cos(angle + 2.4)},${my + size * Math.sin(angle + 2.4)}`;
  const p3 = `${mx + size * Math.cos(angle - 2.4)},${my + size * Math.sin(angle - 2.4)}`;
  return `${p1} ${p2} ${p3}`;
}
</script>

<template>
  <div class="sim-desk">
    <!-- ─── 顶部控制栏 ─────────────────────────────────────────────────────── -->
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="page-title">仿真测试</span>
        <el-tag :type="statusType" size="small">{{ statusLabel }}</el-tag>
        <span class="tick-label">Tick {{ snapshot.tick }}</span>

        <el-divider direction="vertical" />

        <el-icon class="map-icon"><MapLocation /></el-icon>
        <el-select
          v-model="selectedMapId"
          placeholder="随机坐标模式"
          clearable
          size="small"
          class="map-select"
          :loading="mapSettingLoading"
          @change="(v: number | null) => handleMapChange(v)"
        >
          <el-option
            v-for="m in availableMaps"
            :key="String(m.id)"
            :label="m.name"
            :value="Number(m.id)"
          />
        </el-select>
        <span class="map-mode-hint">
          {{ simMapLayer ? `真实地图` : '随机坐标模式' }}
        </span>
      </div>

      <div class="top-bar-right">
        <el-button
          type="success"
          :icon="VideoPlay"
          :disabled="isRunning || isPaused"
          :loading="loading"
          size="small"
          @click="handleStart"
        >配置并启动</el-button>

        <el-button
          :type="isPaused ? 'success' : 'warning'"
          :icon="VideoPause"
          :disabled="!isRunning && !isPaused"
          :loading="loading"
          size="small"
          @click="handlePauseResume"
        >{{ isPaused ? '继续' : '暂停' }}</el-button>

        <el-button
          type="danger"
          :icon="CircleClose"
          :disabled="snapshot.engineStatus === 'STOPPED'"
          :loading="loading"
          size="small"
          @click="handleStop"
        >停止</el-button>

        <el-divider direction="vertical" />

        <el-button
          :icon="Plus"
          :disabled="!isRunning"
          :loading="addingVehicles"
          size="small"
          @click="handleAddVehicles"
        >添加测试车辆</el-button>
      </div>
    </div>

    <!-- ─── 主体 ──────────────────────────────────────────────────────────── -->
    <div class="sim-body">
      <!-- 画布区（与 MonitorCanvas 结构完全对齐） -->
      <div
        ref="canvasRef"
        class="stage-canvas"
        :class="{ 'no-grid': !layerVisibility.grid }"
        v-loading="mapLoading"
        @mousedown="startPan"
        @wheel.prevent="handleCanvasWheel"
      >
        <!-- 地图层：CSS transform 统一 pan/zoom -->
        <div class="canvas-map-layer" :style="mapLayerStyle">
          <!-- 工厂坐标原点 O(0,0) 坐标轴 -->
          <div class="layer-axis">
            <div class="axis-line axis-x" />
            <div class="axis-line axis-y" />
            <div class="axis-origin">O(0,0)</div>
          </div>

          <!-- 真实地图拓扑（与 MonitorCanvas MapRenderer 配置一致） -->
          <MapRenderer
            v-if="simMapLayer"
            class="preview-konva-layer"
            :style="mapRendererStyle"
            :points="layerVisibility.station ? simMapLayer.points : []"
            :paths="layerVisibility.path ? simMapLayer.paths : []"
            :locations="layerVisibility.station ? simMapLayer.locations : []"
            :width="simMapLayer.canvasW"
            :height="simMapLayer.canvasH"
            :scale="1"
            :offset-x="0"
            :offset-y="0"
            :auto-center="false"
            :flip-y="false"
            :center-labels-above="true"
            readonly
          />

          <!-- 车辆 SVG 叠加（与 MonitorCanvas 完全相同的设计） -->
          <svg
            v-if="layerVisibility.vehicle"
            class="vehicle-svg"
            width="1"
            height="1"
            overflow="visible"
          >
            <!-- 路径规划线（仿真专属，在车辆下层） -->
            <template v-if="layerVisibility.pathLine">
              <g
                v-for="v in vehicleMarkers.filter(m => m.state === 'MOVING' && m.dist > 2)"
                :key="`path-${v.vehicleId}`"
              >
                <!-- 主路径线 -->
                <line
                  :x1="v.cssX" :y1="v.cssY"
                  :x2="v.tCssX" :y2="v.tCssY"
                  :stroke="v.color"
                  stroke-opacity="0.55"
                  stroke-width="2"
                  stroke-dasharray="6 4"
                />
                <!-- 目标点菱形 -->
                <polygon
                  :points="`${v.tCssX},${v.tCssY - 9} ${v.tCssX + 9},${v.tCssY} ${v.tCssX},${v.tCssY + 9} ${v.tCssX - 9},${v.tCssY}`"
                  :fill="`${v.color}33`"
                  :stroke="v.color"
                  stroke-width="1.5"
                />
                <!-- 中途方向箭头（距离足够长时） -->
                <polygon
                  v-if="v.dist > 30"
                  :points="arrowPoints(v.cssX, v.cssY, v.tCssX, v.tCssY)"
                  :fill="v.color"
                  fill-opacity="0.7"
                />
              </g>
            </template>

            <!-- 车辆标记（与 MonitorCanvas 完全一致的圆角矩形设计） -->
            <g
              v-for="v in vehicleMarkers"
              :key="v.vehicleId"
              :transform="`translate(${v.cssX}, ${v.cssY})`"
              class="vehicle-node"
              :class="{ 'vehicle-active': v.isActive }"
              @click="handleVehicleClick(v.vehicleId)"
            >
              <!-- 激活光晕 -->
              <circle
                v-if="v.isActive"
                cx="0" cy="0"
                :r="VEHICLE_HALF + 7"
                :fill="`${v.color}33`"
                stroke="none"
              />

              <!-- 旋转车体 -->
              <g :transform="`rotate(${v.svgAngle})`">
                <!-- 圆角矩形车体（与 MonitorCanvas 完全一致） -->
                <rect
                  :x="-VEHICLE_HALF" :y="-VEHICLE_HALF"
                  :width="VEHICLE_HALF * 2" :height="VEHICLE_HALF * 2"
                  rx="4" ry="4"
                  :fill="v.color"
                  :stroke="v.isActive ? '#ffffff' : 'rgba(255,255,255,0.55)'"
                  :stroke-width="v.isActive ? 2.5 : 1.5"
                />
                <!-- 内部十字线（潜伏式AGV托举机构） -->
                <line x1="-8" y1="0" x2="8" y2="0" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <line x1="0" y1="-8" x2="0" y2="8" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <!-- 前向指示点（车头方向，正上方 = SVG 0° = 北方） -->
                <circle cx="0" :cy="-VEHICLE_HALF + 5" r="3" fill="rgba(255,255,255,0.92)"/>
              </g>

              <!-- 车辆名称（不随车体旋转，正上方 30px，与监控对齐） -->
              <text
                x="0" y="-30"
                text-anchor="middle"
                dominant-baseline="auto"
                font-size="11"
                font-family="Arial, sans-serif"
                fill="#303133"
                style="pointer-events:none;user-select:none;"
              >{{ v.name }}</text>
            </g>
          </svg>
        </div>

        <!-- 右下角浮动控件（与 MonitorCanvas 完全一致） -->
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
                  <img class="floating-layer-icon" :src="layerIconUrl" alt="图层" />
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
                  <span class="layer-visibility-menu__text">{{ item.label }}</span>
                </li>
              </ul>
            </el-popover>
          </div>
          <div class="floating-slot">
            <el-button class="floating-btn mono-btn" size="small" title="适应窗口" @click="fitView">
              ⊡
            </el-button>
          </div>
          <div class="floating-slot">
            <el-button class="floating-btn mono-btn" size="small" title="还原 1:1" @click="resetZoom">
              1:1
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-if="!snapshot.vehicles.length && snapshot.engineStatus === 'STOPPED'"
          class="empty-canvas"
        >
          <p>启动仿真后添加测试车辆</p>
        </div>
      </div>

      <!-- ─── 右侧面板 ──────────────────────────────────────────────────── -->
      <div class="side-panel">
        <!-- 订单统计 -->
        <div class="panel-section">
          <div class="section-title">订单统计</div>
          <div class="order-stats">
            <div
              v-for="item in orderedStats"
              :key="item.state"
              class="stat-card"
              :style="{ borderColor: item.color }"
            >
              <div class="stat-value" :style="{ color: item.color }">{{ item.count }}</div>
              <div class="stat-label">{{ item.label }}</div>
            </div>
          </div>
          <div class="stat-total">共 {{ snapshot.orderTotal }} 个订单</div>
        </div>

        <!-- 车辆列表 -->
        <div class="panel-section vehicle-section">
          <div class="section-title">
            仿真车辆
            <el-tag size="small" style="margin-left: 6px">{{ snapshot.vehicles.length }}</el-tag>
          </div>

          <div class="vehicle-list" v-if="snapshot.vehicles.length">
            <div
              v-for="v in snapshot.vehicles"
              :key="v.vehicleId"
              class="vehicle-card"
              :class="{ active: activeVehicleId === v.vehicleId || activeVehicleId === v.name }"
              @click="handleVehicleClick(v.vehicleId)"
            >
              <div class="vehicle-header">
                <div class="vehicle-dot" :style="{ background: vehicleColorMap[v.state] ?? '#909399' }"></div>
                <span class="vehicle-name">{{ v.name }}</span>
                <el-tag size="small" :type="vehicleStateType[v.state] as any" style="margin-left: auto">
                  {{ vehicleStateLabel[v.state] }}
                </el-tag>
              </div>
              <div class="vehicle-metrics">
                <div class="metric">
                  <span class="metric-label">位置</span>
                  <span class="metric-value">({{ v.x.toFixed(1) }},{{ v.y.toFixed(1) }})</span>
                </div>
                <div class="metric">
                  <span class="metric-label">距目标</span>
                  <span class="metric-value">{{ v.distanceToTarget }}m</span>
                </div>
                <div class="metric">
                  <span class="metric-label">速度</span>
                  <span class="metric-value">{{ v.currentSpeed.toFixed(2) }}m/s</span>
                </div>
                <div class="metric">
                  <span class="metric-label">电量</span>
                  <el-progress
                    :percentage="Math.round(v.currentBattery)"
                    :color="v.currentBattery < 20 ? '#F56C6C' : v.currentBattery < 50 ? '#E6A23C' : '#67C23A'"
                    :stroke-width="5"
                    style="width: 80px"
                  />
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="启动仿真后添加测试车辆" :image-size="72" />
        </div>
      </div>
    </div>
  </div>

  <!-- ─── 仿真配置对话框 ─────────────────────────────────────────────────── -->
  <el-dialog
    v-model="startDialogVisible"
    title="配置仿真场景"
    width="420px"
    :close-on-click-modal="false"
    align-center
  >
    <el-form label-width="90px" class="start-form">
      <el-form-item label="地图场景">
        <el-select
          v-model="startConfig.mapId"
          placeholder="随机坐标模式（不加载地图）"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="m in availableMaps"
            :key="String(m.id)"
            :label="m.name"
            :value="Number(m.id)"
          />
        </el-select>
        <div class="form-hint">选择真实地图可在实际拓扑上仿真车辆运行</div>
      </el-form-item>

      <el-form-item label="车辆数量">
        <el-input-number
          v-model="startConfig.vehicleCount"
          :min="0"
          :max="50"
          :step="2"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="最大速度">
        <el-slider
          v-model="startConfig.maxSpeed"
          :min="0.5"
          :max="10"
          :step="0.5"
          show-input
          style="padding-right: 16px"
        />
        <div class="form-hint">单位：m/s</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="startDialogVisible = false">取消</el-button>
      <el-button type="success" :icon="VideoPlay" @click="confirmStart">
        开始仿真
      </el-button>
    </template>
  </el-dialog>
</template>


<style scoped lang="scss">
// ─── 整体布局 ─────────────────────────────────────────────────────────────────
.sim-desk {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color);
}

// ─── 顶部控制栏 ──────────────────────────────────────────────────────────────
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
  background: var(--el-bg-color);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.tick-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.map-icon {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.map-select { width: 160px; }

.map-mode-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

// ─── 主体 ─────────────────────────────────────────────────────────────────────
.sim-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

// ─── 画布（与 MonitorCanvas .stage-canvas 完全一致）──────────────────────────
.stage-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
  background-image:
    linear-gradient(#eef0f4 1px, transparent 1px),
    linear-gradient(90deg, #eef0f4 1px, transparent 1px);
  background-size: 18px 18px;
  cursor: grab;
  min-width: 0;

  &:active { cursor: grabbing; }

  &.no-grid { background-image: none; }
}

// ─── 地图层（与 MonitorCanvas .canvas-map-layer 完全一致）───────────────────
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

// ─── 车辆 SVG（与 MonitorCanvas 完全一致）────────────────────────────────────
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
  transition: transform 0.15s;

  &:hover { filter: brightness(1.15) drop-shadow(0 0 4px rgba(255,255,255,0.5)); }
}

.vehicle-active {
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
}

// ─── 坐标轴（与 MonitorCanvas 完全一致）─────────────────────────────────────
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

  &::before {
    content: '';
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    border-left: 8px solid #2563eb;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }

  &::after {
    content: 'X';
    position: absolute;
    right: 0;
    bottom: calc(100% + 2px);
    font-size: 11px;
    font-weight: bold;
    color: #2563eb;
  }
}

.axis-y {
  position: absolute;
  left: 0;
  top: -120px;
  width: 2px;
  height: 120px;
  background: #ef4444;
  transform: translateX(-50%);

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-bottom: 8px solid #ef4444;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
  }

  &::after {
    content: 'Y';
    position: absolute;
    left: 8px;
    top: 0;
    font-size: 11px;
    font-weight: bold;
    color: #ef4444;
  }
}

// ─── 右下角浮动控件（与 MonitorCanvas 完全一致）─────────────────────────────
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
  background: rgba(255,255,255,0.95);
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);

  &.is-active { border-color: #3388ff; color: #3388ff; }
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

// ─── 空状态 ──────────────────────────────────────────────────────────────────
.empty-canvas {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  gap: 12px;
  pointer-events: none;
}

// ─── 右侧面板 ─────────────────────────────────────────────────────────────────
.side-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  overflow: hidden;
}

.panel-section {
  padding: 12px 14px;

  & + & { border-top: 1px solid var(--el-border-color-lighter); }
}

.vehicle-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.order-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 2px;
  border: 2px solid;
  border-radius: 6px;
  background: var(--el-fill-color-extra-light);

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    margin-top: 3px;
  }
}

.stat-total {
  margin-top: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-align: right;
}

.vehicle-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vehicle-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--el-fill-color-extra-light);
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: var(--el-color-primary-light-5); background: var(--el-color-primary-light-9); }
  &.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
}

.vehicle-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.vehicle-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vehicle-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
}

.vehicle-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 4px;

  .metric-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  .metric-value {
    font-size: 11px;
    color: var(--el-text-color-primary);
    font-family: monospace;
  }
}

// ─── 启动配置对话框 ────────────────────────────────────────────────────────────
.start-form {
  padding: 8px 0;

  .form-hint {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
    line-height: 1.4;
  }
}
</style>

<style>
/* 图层菜单（el-popover 内层，不能 scoped；与 MonitorCanvas 同源） */
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

  &:hover { background: #f5f7fa; }
}

.layer-visibility-menu__icon { font-size: 16px; flex-shrink: 0; }

.layer-visibility-menu__item:not(.is-off) .layer-visibility-menu__icon,
.layer-visibility-menu__item:not(.is-off) .layer-visibility-menu__text { color: #3388ff; }

.layer-visibility-menu__item.is-off .layer-visibility-menu__icon,
.layer-visibility-menu__item.is-off .layer-visibility-menu__text { color: #a0a0a0; }

.layer-visibility-menu__item.is-off .layer-visibility-menu__text { text-decoration: line-through; }

.layer-visibility-menu__text { line-height: 1.35; }
</style>
