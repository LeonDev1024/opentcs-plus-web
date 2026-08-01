<script setup lang="ts">
/**
 * 运营控制台（运维管理监控大屏）
 * 入口：/operationsdesk
 *
 * 顶栏布局：
 *   [工厂下拉选择] [AMR KPI 6 卡（点击筛选）]  ── flex 撑开 ──  [连接状态] [告警] [全屏]
 *
 * 设计要点：
 * - 工厂下拉选择，默认第一个工厂
 * - KPI 卡承担「指标展示 + 筛选触发器」双重职责；左侧机器人面板按 KPI 选中态过滤。
 * - 订单 / 告警是独立页面，本页只承担「空间态势感知 + 跳转」。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFullscreen } from '@vueuse/core';
import { Bell, DArrowLeft, DArrowRight, FullScreen } from '@element-plus/icons-vue';
import { useMonitorStats } from './composables/useMonitorStats';
import { useRealtimeData } from './composables/useRealtimeData';
import MonitorCanvas from './components/MonitorCanvas.vue';
import AmrStatsBar from './components/AmrStatsBar.vue';
import RobotPanel from './components/RobotPanel.vue';
import VehicleDetailPanel from './components/VehicleDetailPanel.vue';
import type { AmrFilterKey } from './components/AmrStatsBar.vue';
import type { RobotCardVO, VehicleRuntimeVO } from '@/api/ops/monitor';
import { listMonitorAlarms } from '@/api/ops/monitor';

const router = useRouter();

const {
  vehicles,
  amrStats,
  factoryList,
  loading,
  fetchStats,
  init,
  currentFactoryId
} = useMonitorStats();

const { lastUpdated, isActive, start: startPolling, stop: stopPolling, updateFactoryId } =
  useRealtimeData(500);

// 当前选中的车辆
const activeVehicleId = ref<string | undefined>(undefined);
const detailVisible = ref(false);

const selectedVehicle = computed<VehicleRuntimeVO | undefined>(() =>
  vehicles.value.find((vehicle) => vehicle.vehicleId === activeVehicleId.value)
);

// KPI 联动的筛选 key（顶栏 KPI ↔ 右侧机器人列表）
const robotFilter = ref<AmrFilterKey>('all');

// 监控场景优先让画布获得空间，左侧车辆面板支持快速收起
const sidePanelCollapsed = ref(false);

// 全屏：作用于整个 operations-desk 容器
const operationsDeskRef = ref<HTMLElement | null>(null);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(operationsDeskRef);

// 机器人面板数据
const robotCards = computed<RobotCardVO[]>(() =>
  vehicles.value.map((v) => ({
    vehicleId: v.vehicleId,
    name: v.name,
    state: v.state,
    currentOrderId: v.currentOrderId,
    orderNo: v.currentOrderId,
    position: v.position,
    energyLevel: v.energyLevel,
    velocity: v.velocity,
    estimatedFinishMinutes: v.estimatedFinishMinutes,
    taskDescription: v.taskDescription
  }))
);

/** 连接状态 */
const connectionState = computed<'live' | 'stale' | 'offline'>(() => {
  if (!isActive.value) return 'offline';
  if (!lastUpdated.value) return 'stale';
  return 'live';
});

const connectionLabel = computed(() => {
  switch (connectionState.value) {
    case 'live':
      return '已连接';
    case 'stale':
      return '数据延迟';
    case 'offline':
    default:
      return '未连接';
  }
});

/** 顶栏「告警」角标 */
const alarmCount = ref(0);

async function refreshAlarmCount() {
  try {
    const res: any = await listMonitorAlarms();
    const list = res?.data || res || [];
    alarmCount.value = Array.isArray(list)
      ? list.filter((a: any) => !a.acked).length
      : (amrStats.value.errorVehicles ?? 0);
  } catch {
    alarmCount.value = amrStats.value.errorVehicles ?? 0;
  }
}

// 工厂切换
function handleFactoryChange(id: number) {
  if (!id) return;
  robotFilter.value = 'all'; // 切工厂时重置筛选
  activeVehicleId.value = undefined;
  detailVisible.value = false;
  updateFactoryId(id);
  fetchStats(id);
  refreshAlarmCount();
}

// 机器人面板点击 → 画布定位
function handleRobotClick(robot: RobotCardVO) {
  activeVehicleId.value = robot.vehicleId;
  detailVisible.value = true;
}

// 画布机器人点击 → 高亮机器人面板
function handleVehicleClick(vehicle: any) {
  activeVehicleId.value = vehicle.vehicleId;
  detailVisible.value = true;
}

// 手动刷新
async function handleRefresh() {
  if (!currentFactoryId.value) return;
  await fetchStats(currentFactoryId.value, true);
  lastUpdated.value = Date.now();
  refreshAlarmCount();
}

// 告警角标点击：跳转告警中心
function handleAlarmClick() {
  router.push({ path: '/monitoring/alarm' });
}

// 初始化
onMounted(async () => {
  await init();
  startPolling((id) => fetchStats(id, true), currentFactoryId.value);
  refreshAlarmCount();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div ref="operationsDeskRef" class="operations-desk" v-loading="loading">
    <!-- 整个页面放在单个卡片中 -->
    <el-card class="main-card" body-class="main-card-body">
      <!-- 顶部栏：工厂下拉 + KPI + 状态/告警/全屏 -->
      <div class="top-bar">
        <div class="top-bar-left">
          <!-- 工厂下拉选择，默认第一个 -->
          <span class="factory-label">场景监控：</span>
          <el-select
            v-model="currentFactoryId"
            placeholder="请选择工厂"
            class="factory-select"
            @change="handleFactoryChange"
          >
            <el-option
              v-for="factory in factoryList"
              :key="factory.id"
              :label="factory.name"
              :value="factory.id"
            />
          </el-select>

          <!-- KPI 统计 -->
          <AmrStatsBar
            v-model="robotFilter"
            :stats="amrStats"
            layout="horizontal"
            class="top-kpi"
          />
        </div>

        <div class="top-bar-right">
          <div
            class="conn-indicator"
            :class="`conn-${connectionState}`"
            title="点击刷新数据"
            @click="handleRefresh"
          >
            <span class="conn-dot"></span>
            <span class="conn-label">{{ connectionLabel }}</span>
          </div>

          <el-badge
            :value="alarmCount"
            :hidden="alarmCount <= 0"
            :max="99"
            type="danger"
          >
            <button
              class="icon-btn"
              :class="{ 'icon-btn-danger': alarmCount > 0 }"
              title="告警中心"
              @click="handleAlarmClick"
            >
              <el-icon><Bell /></el-icon>
            </button>
          </el-badge>

          <button
            class="icon-btn"
            :title="isFullscreen ? '退出全屏' : '全屏'"
            @click="toggleFullscreen"
          >
            <el-icon><FullScreen /></el-icon>
          </button>
        </div>
      </div>

      <!-- 主内容区：左侧机器人面板 + 画布 -->
      <div class="monitor-body">
        <div class="panel-area" :class="{ 'is-collapsed': sidePanelCollapsed }">
          <button
            class="panel-toggle"
            :title="sidePanelCollapsed ? '展开车辆面板' : '收起车辆面板'"
            @click="sidePanelCollapsed = !sidePanelCollapsed"
          >
            <el-icon>
              <DArrowRight v-if="sidePanelCollapsed" />
              <DArrowLeft v-else />
            </el-icon>
          </button>
          <RobotPanel
            v-show="!sidePanelCollapsed"
            v-model:filter="robotFilter"
            :robots="robotCards"
            :active-robot-id="activeVehicleId"
            :stats="amrStats"
            @robot-click="handleRobotClick"
          />
        </div>
        <div class="canvas-area">
          <MonitorCanvas
            :factory-id="currentFactoryId"
            :vehicles="vehicles"
            :active-vehicle-id="activeVehicleId"
            @vehicle-click="handleVehicleClick"
          />
          <VehicleDetailPanel
            v-if="detailVisible && selectedVehicle"
            :vehicle="selectedVehicle"
            :last-updated="lastUpdated"
            @close="detailVisible = false"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.operations-desk {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
}

/* —— 主卡片 —— */
.main-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* —— 顶栏 —— */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 12px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* —— 工厂下拉选择 —— */
.factory-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.factory-select {
  width: 140px;
}

.factory-select :deep(.el-select__wrapper) {
  border-radius: 6px;
  padding: 0 8px;
}

/* —— 顶部 KPI 统计条 —— */
.top-kpi {
  margin-left: 16px;
}

.top-kpi :deep(.amr-stats-bar.layout-horizontal) {
  gap: 0;
}

.top-kpi :deep(.stat-item) {
  padding: 2px 12px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: default;
  position: relative;
}

.top-kpi :deep(.stat-item + .stat-item::before) {
  content: '|';
  position: absolute;
  left: -2px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--el-border-color);
  font-size: 12px;
}

.top-kpi :deep(.stat-item:hover),
.top-kpi :deep(.stat-item.active) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.top-kpi :deep(.stat-icon) {
  display: none;
}

.top-kpi :deep(.stat-info) {
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.top-kpi :deep(.stat-value) {
  font-size: 14px;
  font-weight: 600;
}

.top-kpi :deep(.stat-label) {
  font-size: 11px;
  white-space: nowrap;
}

.kpi-bar {
  min-width: 0;
  overflow-x: auto;
  flex-shrink: 1;
}

/* —— 连接状态指示器 —— */
.conn-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-regular);
  transition: background 0.15s;
}

.conn-indicator:hover {
  background: var(--el-fill-color-light);
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.conn-live .conn-dot {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.18);
  animation: conn-pulse 2s ease-in-out infinite;
}

.conn-stale .conn-dot {
  background: #e6a23c;
}

.conn-offline .conn-dot {
  background: #909399;
}

.conn-label {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.conn-time {
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

@keyframes conn-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.18);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0.06);
  }
}

/* —— 图标按钮 —— */
.icon-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  font-size: 14px;
  transition: all 0.15s;
  padding: 0;
}

.icon-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.icon-btn-danger {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.icon-btn-danger:hover {
  color: #fff;
  background: var(--el-color-danger);
  border-color: var(--el-color-danger);
}

/* —— 主内容 —— */
.monitor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.panel-area {
  position: relative;
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color);
  overflow: visible;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.08);
  transition: width 0.2s ease;
}

.panel-area.is-collapsed {
  width: 22px;
  min-width: 22px;
  max-width: 22px;
  border-right: none;
  background: var(--el-bg-color);
  box-shadow: none;
}

.panel-toggle {
  position: absolute;
  top: 50%;
  right: -9px;
  transform: translateY(-50%);
  z-index: 20;
  width: 18px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 0 6px 6px 0;
  background: #fff;
  color: #606266;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.panel-area.is-collapsed .panel-toggle {
  right: 2px;
  width: 18px;
  height: 48px;
  border-radius: 6px;
  display: inline-flex;
}

.panel-toggle:hover {
  color: #409eff;
  border-color: #409eff;
  background: #ecf5ff;
}

.panel-toggle .el-icon {
  font-size: 13px;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  z-index: 1;
}
</style>
