<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoPlay, VideoPause, CircleClose, Plus, MapLocation } from '@element-plus/icons-vue';
import { simulationApi, type SimSnapshot, type SimVehicle, type OrderSimState, type SimNavMap } from '@/api/ops/simulation';

// ─── 状态 ──────────────────────────────────────────────────────

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

// 地图
const availableMaps = ref<SimNavMap[]>([]);
const selectedMapId = ref<number | null>(null);
const mapSettingLoading = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── 计算属性 ──────────────────────────────────────────────────

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

// ─── 地图画布 ──────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// 栅格地图图片（有真实地图时使用）
let rasterImage: HTMLImageElement | null = null;

/** 根据当前快照的 mapInfo 是否有效栅格 */
const hasRasterMap = computed(() =>
  !!(snapshot.value.mapInfo?.rasterUrl && snapshot.value.mapInfo?.rasterResolution)
);

/** 随机模式的仿真空间大小 m */
const RANDOM_SPACE = 70;

const vehicleColors: Record<string, string> = {
  IDLE:     '#67C23A',
  MOVING:   '#409EFF',
  CHARGING: '#E6A23C',
  ERROR:    '#F56C6C',
  STOPPED:  '#909399'
};

function renderCanvas(vehicles: SimVehicle[]) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  if (hasRasterMap.value && rasterImage && rasterImage.complete && rasterImage.naturalWidth > 0) {
    renderRasterCanvas(ctx, W, H, vehicles);
  } else {
    renderGridCanvas(ctx, W, H, vehicles);
  }
}

/** 真实地图模式：栅格底图 + 车辆叠加 */
function renderRasterCanvas(ctx: CanvasRenderingContext2D, W: number, H: number, vehicles: SimVehicle[]) {
  const mapInfo = snapshot.value.mapInfo!;
  const rw = mapInfo.rasterWidth ?? rasterImage!.naturalWidth;
  const rh = mapInfo.rasterHeight ?? rasterImage!.naturalHeight;
  const res = mapInfo.rasterResolution!; // m/px

  // 缩放比例：让栅格图铺满画布
  const scale = Math.min(W / rw, H / rh);
  const drawW = rw * scale;
  const drawH = rh * scale;
  const offsetX = (W - drawW) / 2;
  const offsetY = (H - drawH) / 2;

  // 绘制底图（Y 轴翻转：地图 Y 向上，raster 图片 Y 向下）
  ctx.save();
  ctx.translate(offsetX, offsetY + drawH);
  ctx.scale(scale, -scale);
  ctx.drawImage(rasterImage!, 0, 0, rw, rh);
  ctx.restore();

  if (!vehicles.length) return;

  // 将仿真坐标（m）转为画布像素
  // vehicleX(m) / res(m/px) = px in raster, then * scale + offsetX
  vehicles.forEach(v => {
    const px = v.x / res * scale + offsetX;
    const py = H - (v.y / res * scale + offsetY); // Y 翻转
    const tpx = v.targetX / res * scale + offsetX;
    const tpy = H - (v.targetY / res * scale + offsetY);
    drawVehicle(ctx, v, px, py, tpx, tpy, v.name === activeVehicleId.value);
  });
}

/** 随机坐标模式：暗色网格 */
function renderGridCanvas(ctx: CanvasRenderingContext2D, W: number, H: number, vehicles: SimVehicle[]) {
  const scale = W / RANDOM_SPACE;

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#1e2733';
  ctx.lineWidth = 1;
  const step = scale * 10;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.fillStyle = '#4a5568';
  ctx.font = '10px monospace';
  for (let i = 0; i * 10 <= RANDOM_SPACE; i++) {
    ctx.fillText(String(i * 10), i * step + 2, 10);
  }

  if (!vehicles.length) {
    ctx.fillStyle = '#4a5568';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无仿真车辆', W / 2, H / 2);
    ctx.textAlign = 'left';
    return;
  }

  vehicles.forEach(v => {
    const px = v.x * scale;
    const py = H - v.y * scale;
    const tpx = v.targetX * scale;
    const tpy = H - v.targetY * scale;
    drawVehicle(ctx, v, px, py, tpx, tpy, v.name === activeVehicleId.value);
  });
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: SimVehicle,
  px: number, py: number,
  tpx: number, tpy: number,
  isActive: boolean
) {
  const color = vehicleColors[v.state] ?? '#909399';
  const radius = 9;

  // 移动时绘制目标位置和连线
  if (v.state === 'MOVING') {
    ctx.beginPath();
    ctx.arc(tpx, tpy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tpx, tpy);
    ctx.strokeStyle = color + '44';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 车辆圆体
  if (isActive) {
    ctx.beginPath();
    ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // 方向指示器
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(v.theta) * 14, py - Math.sin(v.theta) * 14);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 车辆名称
  ctx.fillStyle = hasRasterMap.value ? '#1a1a1a' : '#e2e8f0';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(v.name, px, py - 14);
  ctx.textAlign = 'left';
}

// 加载栅格地图图片
function loadRasterImage(url: string) {
  rasterImage = new Image();
  rasterImage.crossOrigin = 'anonymous';
  rasterImage.onload = () => renderCanvas(snapshot.value.vehicles);
  rasterImage.onerror = () => { rasterImage = null; };
  rasterImage.src = url;
}

// 监听 vehicles 变化 → 重绘
watch(
  () => snapshot.value.vehicles,
  (vehicles) => renderCanvas(vehicles),
  { deep: true, immediate: true }
);

// 监听 mapInfo 变化 → 加载新栅格图
watch(
  () => snapshot.value.mapInfo?.rasterUrl,
  (url, oldUrl) => {
    if (url && url !== oldUrl) {
      loadRasterImage(url);
    } else if (!url) {
      rasterImage = null;
      renderCanvas(snapshot.value.vehicles);
    }
  }
);

// ─── 地图管理 ──────────────────────────────────────────────────

async function fetchAvailableMaps() {
  try {
    const res = await simulationApi.listMaps() as any;
    if (res?.maps) {
      availableMaps.value = res.maps;
    }
  } catch {
    // 无地图数据时静默忽略
  }
}

async function handleMapChange(mapId: number | null) {
  mapSettingLoading.value = true;
  try {
    await simulationApi.setMap(mapId);
    ElMessage.success(mapId ? '已切换到真实地图模式' : '已切换到随机坐标模式');
  } catch {
    ElMessage.error('地图设置失败');
  } finally {
    mapSettingLoading.value = false;
  }
}

// ─── 控制操作 ──────────────────────────────────────────────────

async function handleStart() {
  loading.value = true;
  try {
    await simulationApi.start();
    ElMessage.success('仿真已启动');
    await fetchSnapshot();
  } catch {
    ElMessage.error('启动失败');
  } finally {
    loading.value = false;
  }
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

// ─── 轮询 ──────────────────────────────────────────────────────

async function fetchSnapshot() {
  try {
    const res = await simulationApi.snapshot() as unknown as SimSnapshot;
    if (res?.engineStatus) {
      snapshot.value = res;
    }
  } catch {
    // 忽略轮询中的网络抖动
  }
}

function startPolling() {
  fetchSnapshot();
  pollTimer = setInterval(fetchSnapshot, 1000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

onMounted(async () => {
  await fetchAvailableMaps();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="sim-desk">
    <!-- 顶部控制栏 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="page-title">仿真监控</span>
        <el-tag :type="statusType" size="small">{{ statusLabel }}</el-tag>
        <span class="tick-label">Tick {{ snapshot.tick }}</span>

        <el-divider direction="vertical" />

        <!-- 地图选择 -->
        <el-icon class="map-icon"><MapLocation /></el-icon>
        <el-select
          v-model="selectedMapId"
          placeholder="随机坐标模式"
          clearable
          size="small"
          class="map-select"
          :loading="mapSettingLoading"
          @change="handleMapChange"
        >
          <el-option
            v-for="m in availableMaps"
            :key="m.id"
            :label="m.name"
            :value="m.id"
          />
        </el-select>
        <span class="map-mode-hint">
          {{ snapshot.mapInfo ? `真实地图：${snapshot.mapInfo.name}` : '随机坐标模式' }}
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
        >启动仿真</el-button>

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

    <!-- 主体：画布 + 右侧面板 -->
    <div class="sim-body">
      <!-- 画布区 -->
      <div ref="containerRef" class="canvas-area">
        <canvas
          ref="canvasRef"
          width="900"
          height="700"
          class="sim-canvas"
          :class="{ 'raster-mode': hasRasterMap }"
        />
        <!-- 图例 -->
        <div class="canvas-legend">
          <span v-for="(color, state) in vehicleColors" :key="state" class="legend-item">
            <i :style="{ background: color }"></i>
            {{ vehicleStateLabel[state] }}
          </span>
        </div>
      </div>

      <!-- 右侧面板 -->
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
              :class="{ active: activeVehicleId === v.name }"
              @click="activeVehicleId = activeVehicleId === v.name ? null : v.name"
            >
              <div class="vehicle-header">
                <div class="vehicle-dot" :style="{ background: vehicleColors[v.state] ?? '#909399' }"></div>
                <span class="vehicle-name">{{ v.name }}</span>
                <el-tag size="small" :type="vehicleStateType[v.state] as any" style="margin-left: auto">
                  {{ vehicleStateLabel[v.state] }}
                </el-tag>
              </div>
              <div class="vehicle-metrics">
                <div class="metric">
                  <span class="metric-label">位置</span>
                  <span class="metric-value">({{ v.x.toFixed(1) }}, {{ v.y.toFixed(1) }})</span>
                </div>
                <div class="metric">
                  <span class="metric-label">距目标</span>
                  <span class="metric-value">{{ v.distanceToTarget }}m</span>
                </div>
                <div class="metric">
                  <span class="metric-label">速度</span>
                  <span class="metric-value">{{ v.currentSpeed }}m/s</span>
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
</template>

<style scoped lang="scss">
.sim-desk {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color);
}

/* ─── 顶部控制栏 ─── */
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

.map-select {
  width: 160px;
}

.map-mode-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── 主体 ─── */
.sim-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ─── 画布区 ─── */
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.sim-canvas {
  max-width: 100%;
  max-height: 100%;
  display: block;

  &.raster-mode {
    background: #f8f9fa;
  }
}

.canvas-legend {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 6px;
  padding: 4px 12px;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #e2e8f0;

    i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
  }
}

/* ─── 右侧面板 ─── */
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

  & + & {
    border-top: 1px solid var(--el-border-color-lighter);
  }
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

/* 订单统计 */
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
  cursor: default;

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

/* 车辆列表 */
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

  &:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
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
</style>
