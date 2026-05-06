<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoPlay, VideoPause, CircleClose, Plus } from '@element-plus/icons-vue';
import { simulationApi, type SimSnapshot, type SimVehicle, type OrderSimState } from '@/api/ops/simulation';

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

const statusType = computed(() => {
  switch (snapshot.value.engineStatus) {
    case 'RUNNING': return 'success';
    case 'PAUSED':  return 'warning';
    default:        return 'info';
  }
});

/** 订单状态显示配置 */
const orderStateCfg: Record<string, { label: string; color: string }> = {
  CREATED:      { label: '待分配', color: '#909399' },
  ASSIGNED:     { label: '已分配', color: '#409EFF' },
  IN_EXECUTION: { label: '执行中', color: '#E6A23C' },
  COMPLETED:    { label: '已完成', color: '#67C23A' },
  TIMED_OUT:    { label: '已超时', color: '#F56C6C' },
  CANCELLED:    { label: '已取消', color: '#C0C4CC' }
};

/** 所有订单状态按固定顺序展示 */
const orderedStats = computed(() =>
  (['CREATED', 'ASSIGNED', 'IN_EXECUTION', 'COMPLETED', 'TIMED_OUT'] as OrderSimState[]).map((s) => ({
    state: s,
    count: snapshot.value.orderStats[s] ?? 0,
    ...orderStateCfg[s]
  }))
);

// ─── 画布渲染 ──────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null);

/** 仿真空间范围（m），与 OrderGenerator 保持一致 */
const SPACE = 70; // 留一点余量（地图50 + 边距）

function renderCanvas(vehicles: SimVehicle[]) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const scale = W / SPACE;

  // 清空 + 背景
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // 网格
  ctx.strokeStyle = '#1e2733';
  ctx.lineWidth = 1;
  const step = scale * 10; // 每 10m 一格
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // 轴标签
  ctx.fillStyle = '#4a5568';
  ctx.font = '10px monospace';
  for (let i = 0; i * 10 <= SPACE; i++) {
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

  const colors: Record<string, string> = {
    IDLE:    '#67C23A',
    MOVING:  '#409EFF',
    CHARGING:'#E6A23C',
    ERROR:   '#F56C6C',
    STOPPED: '#909399'
  };

  vehicles.forEach((v) => {
    const cx = v.x * scale;
    const cy = H - v.y * scale; // Y 轴翻转（屏幕向下 vs 坐标向上）
    const tx = v.targetX * scale;
    const ty = H - v.targetY * scale;
    const color = colors[v.state] ?? '#909399';

    // 目标位置（虚线圆）
    if (v.state === 'MOVING') {
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.strokeStyle = color + '66';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 连线
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = color + '44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 车辆圆体
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // 方向指示器
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(v.theta) * 14, cy - Math.sin(v.theta) * 14);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 车辆名称
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(v.name, cx, cy - 14);
    ctx.textAlign = 'left';
  });
}

// 每次 snapshot 更新时重绘
watch(
  () => snapshot.value.vehicles,
  (vehicles) => renderCanvas(vehicles),
  { deep: true }
);

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
    const res = await simulationApi.snapshot();
    if (res?.data) {
      snapshot.value = res.data as unknown as SimSnapshot;
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

onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="sim-monitor">
    <!-- 顶部控制栏 -->
    <div class="sim-header">
      <div class="sim-title">
        <span class="title-text">仿真监控</span>
        <el-tag :type="statusType" size="small" class="status-tag">{{ statusLabel }}</el-tag>
        <span class="tick-label">Tick {{ snapshot.tick }}</span>
      </div>

      <div class="sim-actions">
        <el-button
          type="success"
          :icon="VideoPlay"
          :disabled="isRunning || isPaused"
          :loading="loading"
          @click="handleStart"
        >启动仿真</el-button>

        <el-button
          :type="isPaused ? 'success' : 'warning'"
          :icon="VideoPause"
          :disabled="!isRunning && !isPaused"
          :loading="loading"
          @click="handlePauseResume"
        >{{ isPaused ? '继续' : '暂停' }}</el-button>

        <el-button
          type="danger"
          :icon="CircleClose"
          :disabled="snapshot.engineStatus === 'STOPPED'"
          :loading="loading"
          @click="handleStop"
        >停止仿真</el-button>

        <el-divider direction="vertical" />

        <el-button
          :icon="Plus"
          :disabled="!isRunning"
          :loading="addingVehicles"
          @click="handleAddVehicles"
        >添加测试车辆</el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="sim-body">
      <!-- 左侧：仿真画布 -->
      <div class="canvas-section">
        <div class="section-title">仿真空间（50×50m）</div>
        <canvas ref="canvasRef" width="500" height="500" class="sim-canvas" />

        <!-- 图例 -->
        <div class="canvas-legend">
          <span v-for="(cfg, state) in { IDLE: '#67C23A', MOVING: '#409EFF', ERROR: '#F56C6C' }" :key="state" class="legend-item">
            <i :style="{ background: cfg }"></i>{{ { IDLE: '空闲', MOVING: '移动中', ERROR: '错误' }[state] }}
          </span>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="side-panel">
        <!-- 订单统计 -->
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

        <!-- 车辆列表 -->
        <div class="section-title" style="margin-top: 20px">
          仿真车辆
          <el-tag size="small" style="margin-left: 8px">{{ snapshot.vehicles.length }}</el-tag>
        </div>

        <div class="vehicle-list" v-if="snapshot.vehicles.length">
          <div v-for="v in snapshot.vehicles" :key="v.vehicleId" class="vehicle-item">
            <div class="vehicle-header">
              <span class="vehicle-name">{{ v.name }}</span>
              <el-tag
                size="small"
                :type="{ IDLE: 'success', MOVING: '', ERROR: 'danger', STOPPED: 'info', CHARGING: 'warning' }[v.state] as any"
              >{{ { IDLE: '空闲', MOVING: '移动中', ERROR: '错误', STOPPED: '停止', CHARGING: '充电中' }[v.state] }}</el-tag>
            </div>
            <div class="vehicle-metrics">
              <span>位置 ({{ v.x.toFixed(1) }}, {{ v.y.toFixed(1) }})</span>
              <span>距目标 {{ v.distanceToTarget }}m</span>
              <span>速度 {{ v.currentSpeed }}m/s</span>
              <span>电量 {{ v.currentBattery.toFixed(0) }}%</span>
            </div>
          </div>
        </div>
        <el-empty v-else description="启动仿真后添加测试车辆" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sim-monitor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;
  gap: 12px;
}

.sim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 12px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

.sim-title {
  display: flex;
  align-items: center;
  gap: 10px;

  .title-text {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }

  .tick-label {
    font-size: 12px;
    color: #909399;
    font-family: monospace;
  }
}

.sim-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sim-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.canvas-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  display: flex;
  align-items: center;
}

.sim-canvas {
  border-radius: 8px;
  border: 1px solid #2d3748;
  display: block;
}

.canvas-legend {
  display: flex;
  gap: 14px;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #606266;

    i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
  }
}

.side-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
  overflow-y: auto;
  min-width: 0;
}

.order-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px;
  border: 2px solid;
  border-radius: 8px;
  background: #fafafa;

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label {
    font-size: 11px;
    color: #909399;
    margin-top: 4px;
  }
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.vehicle-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fafafa;
}

.vehicle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.vehicle-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.vehicle-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    font-size: 11px;
    color: #606266;
    background: #f0f2f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }
}
</style>
