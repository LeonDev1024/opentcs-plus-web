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

// 画布缩放与平移（轻量 pan/zoom）
const canvasScale = ref(1);
const canvasPan = ref({ x: 40, y: 30 }); // 初始偏移让坐标原点不贴边
let isPanning = false;
let lastMouse = { x: 0, y: 0 };

function onCanvasWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  canvasScale.value = Math.min(Math.max(canvasScale.value * delta, 0.2), 8);
  renderCanvas(snapshot.value.vehicles);
}
function onCanvasMouseDown(e: MouseEvent) {
  isPanning = true;
  lastMouse = { x: e.clientX, y: e.clientY };
}
function onCanvasMouseMove(e: MouseEvent) {
  if (!isPanning) return;
  canvasPan.value.x += e.clientX - lastMouse.x;
  canvasPan.value.y += e.clientY - lastMouse.y;
  lastMouse = { x: e.clientX, y: e.clientY };
  renderCanvas(snapshot.value.vehicles);
}
function onCanvasMouseUp() { isPanning = false; }

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

  // 白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 缩放比例：让栅格图铺满画布（加 pan/zoom）
  const baseScale = Math.min(W / rw, H / rh) * canvasScale.value;
  const drawW = rw * baseScale;
  const drawH = rh * baseScale;
  const offsetX = (W - drawW) / 2 + canvasPan.value.x;
  const offsetY = (H - drawH) / 2 + canvasPan.value.y;

  // 绘制底图（Y 轴翻转：地图 Y 向上，raster 图片 Y 向下）
  ctx.save();
  ctx.translate(offsetX, offsetY + drawH);
  ctx.scale(baseScale, -baseScale);
  ctx.drawImage(rasterImage!, 0, 0, rw, rh);
  ctx.restore();

  if (!vehicles.length) return;

  // 将仿真坐标（m）转为画布像素
  vehicles.forEach(v => {
    const px = v.x / res * baseScale + offsetX;
    const py = H - (v.y / res * baseScale + offsetY);
    const tpx = v.targetX / res * baseScale + offsetX;
    const tpy = H - (v.targetY / res * baseScale + offsetY);
    drawVehicle(ctx, v, px, py, tpx, tpy, v.name === activeVehicleId.value);
  });
}

/** 随机坐标模式：浅色网格 */
function renderGridCanvas(ctx: CanvasRenderingContext2D, W: number, H: number, vehicles: SimVehicle[]) {
  const baseScale = W / RANDOM_SPACE;
  const s = baseScale * canvasScale.value;
  const ox = canvasPan.value.x;
  const oy = canvasPan.value.y;

  // 浅色背景
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  // 主网格（每 10m）
  const step = s * 10;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  const startX = ((ox % step) + step) % step;
  const startY = ((oy % step) + step) % step;
  for (let x = startX; x <= W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = startY; y <= H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // 细网格（每 5m，缩放较大时才显示）
  if (s * 5 > 20) {
    const step5 = s * 5;
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    const sx5 = ((ox % step5) + step5) % step5;
    const sy5 = ((oy % step5) + step5) % step5;
    for (let x = sx5; x <= W; x += step5) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = sy5; y <= H; y += step5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // 坐标轴
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H - oy); ctx.lineTo(W, H - oy); ctx.stroke();

  // 轴标签
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  for (let i = 0; i * 10 * s <= W + Math.abs(ox); i++) {
    const lx = i * step + ox;
    if (lx >= 0 && lx <= W) ctx.fillText(String(i * 10), lx + 2, H - oy - 4);
  }
  for (let i = 0; i * 10 * s <= H + Math.abs(oy); i++) {
    const ly = H - oy - i * step;
    if (ly >= 0 && ly <= H) ctx.fillText(String(i * 10), ox + 4, ly - 2);
  }

  if (!vehicles.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无仿真车辆', W / 2, H / 2);
    ctx.textAlign = 'left';
    return;
  }

  vehicles.forEach(v => {
    const px = v.x * s + ox;
    const py = H - (v.y * s + oy);
    const tpx = v.targetX * s + ox;
    const tpy = H - (v.targetY * s + oy);
    drawVehicle(ctx, v, px, py, tpx, tpy, v.name === activeVehicleId.value);
  });
}

function drawArrow(ctx: CanvasRenderingContext2D, fx: number, fy: number, tx: number, ty: number, color: string) {
  const angle = Math.atan2(ty - fy, tx - fx);
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size * Math.cos(angle - 0.4), ty - size * Math.sin(angle - 0.4));
  ctx.lineTo(tx - size * Math.cos(angle + 0.4), ty - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: SimVehicle,
  px: number, py: number,
  tpx: number, tpy: number,
  isActive: boolean
) {
  const color = vehicleColors[v.state] ?? '#909399';
  const radius = 10;
  const dist = Math.hypot(tpx - px, tpy - py);

  // ── 路径规划线（移动中才绘制）──
  if (v.state === 'MOVING' && dist > 2) {
    // 路径线：渐变（出发点实线 → 终点半透明）
    const grad = ctx.createLinearGradient(px, py, tpx, tpy);
    grad.addColorStop(0, color + 'ff');
    grad.addColorStop(0.6, color + 'bb');
    grad.addColorStop(1, color + '55');
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tpx, tpy);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.stroke();

    // 中间方向箭头（距离够长时显示）
    if (dist > 40) {
      const mx = (px + tpx) / 2;
      const my = (py + tpy) / 2;
      drawArrow(ctx, px, py, mx, my, color + 'aa');
    }

    // 终点箭头
    const ux = (tpx - px) / dist;
    const uy = (tpy - py) / dist;
    drawArrow(ctx, px, py, tpx - ux * 4, tpy - uy * 4, color);

    // 目标点：菱形标记
    const dm = 8;
    ctx.beginPath();
    ctx.moveTo(tpx, tpy - dm);
    ctx.lineTo(tpx + dm, tpy);
    ctx.lineTo(tpx, tpy + dm);
    ctx.lineTo(tpx - dm, tpy);
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 目标点标签
    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('目标', tpx, tpy - dm - 4);
    ctx.textAlign = 'left';
  }

  // ── 激活高亮环 ──
  if (isActive) {
    ctx.beginPath();
    ctx.arc(px, py, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 车辆圆体（外圈白边 + 内填色）──
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color + 'dd';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── 方向指示器（三角形）──
  const headLen = 13;
  const angle = v.theta;
  const hx = px + Math.cos(angle) * headLen;
  const hy = py - Math.sin(angle) * headLen;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(px + Math.cos(angle + 2.4) * 6, py - Math.sin(angle + 2.4) * 6);
  ctx.lineTo(px + Math.cos(angle - 2.4) * 6, py - Math.sin(angle - 2.4) * 6);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // ── 车辆名称标签 ──
  const labelText = v.name;
  ctx.font = 'bold 11px -apple-system, sans-serif';
  const textW = ctx.measureText(labelText).width;
  const lx = px - textW / 2 - 4;
  const ly = py - radius - 18;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect(lx, ly, textW + 8, 16, 3);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(labelText, px, ly + 11);
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

let resizeObserver: ResizeObserver | null = null;

function syncCanvasSize() {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;
  const { width, height } = container.getBoundingClientRect();
  if (canvas.width !== Math.floor(width) || canvas.height !== Math.floor(height)) {
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    renderCanvas(snapshot.value.vehicles);
  }
}

onMounted(async () => {
  await fetchAvailableMaps();
  startPolling();
  await nextTick();
  syncCanvasSize();
  resizeObserver = new ResizeObserver(syncCanvasSize);
  if (containerRef.value) resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  stopPolling();
  resizeObserver?.disconnect();
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
          @wheel.prevent="onCanvasWheel"
          @mousedown="onCanvasMouseDown"
          @mousemove="onCanvasMouseMove"
          @mouseup="onCanvasMouseUp"
          @mouseleave="onCanvasMouseUp"
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
  align-items: stretch;
  justify-content: stretch;
  background: #f8fafc;
  min-width: 0;
  position: relative;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color-lighter);
}

.sim-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.canvas-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 5px 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--el-text-color-regular);

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
