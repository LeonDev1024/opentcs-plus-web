<script setup lang="ts">
/**
 * 运营控制台（运维管理监控大屏）
 * 入口：/operationsdesk
 *
 * 顶栏布局：
 *   [工厂 Tab 组]  [AMR KPI 6 卡（点击筛选）]  ── flex 撑开 ──  [连接状态] [告警] [全屏]
 *
 * 设计要点：
 * - 工厂 Tab 与 deploy/factory/map 控制台样式保持一致，跨页面体验统一。
 * - KPI 卡承担「指标展示 + 筛选触发器」双重职责；右侧机器人面板按 KPI 选中态过滤。
 * - 订单 / 告警是独立页面，本页只承担「空间态势感知 + 跳转」。
 */
import { ref, computed, onMounted } from 'vue';
import { useFullscreen } from '@vueuse/core';
import { Bell, FullScreen } from '@element-plus/icons-vue';
import { useMonitorStats } from './composables/useMonitorStats';
import { useRealtimeData, POLL_INTERVAL } from './composables/useRealtimeData';
import MonitorCanvas from './components/MonitorCanvas.vue';
import RobotPanel from './components/RobotPanel.vue';
import type { AmrFilterKey } from './components/AmrStatsBar.vue';
import type { RobotCardVO } from '@/api/ops/monitor';

const {
  vehicles,
  amrStats,
  factoryList,
  loading,
  fetchStats,
  init,
  currentFactoryId
} = useMonitorStats();

const { lastUpdated, isActive, start: startPolling, updateFactoryId } =
  useRealtimeData();

// 当前选中的车辆
const activeVehicleId = ref<string | undefined>(undefined);

// KPI 联动的筛选 key（顶栏 KPI ↔ 右侧机器人列表）
const robotFilter = ref<AmrFilterKey>('all');

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

/** 顶栏「告警」角标：当前以异常车辆数兜底，PR2 后接告警中心实际值 */
const alarmCount = computed(() => amrStats.value.errorVehicles ?? 0);

/** 最后刷新文本（HH:mm:ss） */
const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return '—';
  const d = new Date(lastUpdated.value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
});

/** 连接状态：基于 isActive 与最近一次刷新距今的时长 */
const connectionState = computed<'live' | 'stale' | 'offline'>(() => {
  if (!isActive.value) return 'offline';
  if (!lastUpdated.value) return 'stale';
  const gap = Date.now() - lastUpdated.value;
  if (gap > POLL_INTERVAL * 2) return 'stale';
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

// 工厂切换
function selectFactory(id: number) {
  if (id === currentFactoryId.value) return;
  currentFactoryId.value = id;
  robotFilter.value = 'all'; // 切工厂时重置筛选
  updateFactoryId(id);
  fetchStats(id);
}

// 机器人面板点击 → 画布定位
function handleRobotClick(robot: RobotCardVO) {
  activeVehicleId.value = robot.vehicleId;
}

// 画布机器人点击 → 高亮机器人面板
function handleVehicleClick(vehicle: any) {
  activeVehicleId.value = vehicle.vehicleId;
}

// 手动刷新
function handleRefresh() {
  if (currentFactoryId.value) fetchStats(currentFactoryId.value);
}

// 告警角标点击：PR2 接告警中心路由
function handleAlarmClick() {
  // TODO(PR2): router.push({ path: '/ops/alarm', query: { factoryId } })
  console.info('[operationsdesk] 跳转告警中心（PR2 接入）');
}

// 初始化
onMounted(async () => {
  await init();
  startPolling(fetchStats, currentFactoryId.value);
});
</script>

<template>
  <div ref="operationsDeskRef" class="operations-desk" v-loading="loading">
    <!-- 顶部栏：工厂 Tab + KPI + 状态/告警/全屏 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <!-- 工厂 Tab：与 deploy/factory/map 控制台一致 -->
        <div class="factory-tabs">
          <template v-if="factoryList.length > 0">
            <button
              v-for="factory in factoryList"
              :key="factory.id"
              type="button"
              class="factory-tab"
              :class="{ active: factory.id === currentFactoryId }"
              @click="selectFactory(factory.id)"
            >
              {{ factory.name }}
            </button>
          </template>
          <span v-else class="factory-empty">暂无工厂场景</span>
        </div>
      </div>

      <div class="top-bar-right">
        <div
          class="conn-indicator"
          :class="`conn-${connectionState}`"
          :title="`轮询每 ${POLL_INTERVAL / 1000}s · 点击立即刷新`"
          @click="handleRefresh"
        >
          <span class="conn-dot"></span>
          <span class="conn-label">{{ connectionLabel }}</span>
          <span class="conn-time">· 上次刷新 {{ lastUpdatedText }}</span>
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

    <!-- 主内容区 -->
    <div class="monitor-body">
      <div class="canvas-area">
        <MonitorCanvas
          :factory-id="currentFactoryId"
          :vehicles="vehicles"
          :active-vehicle-id="activeVehicleId"
          @vehicle-click="handleVehicleClick"
        />
      </div>

      <div class="panel-area">
        <RobotPanel
          v-model:filter="robotFilter"
          :robots="robotCards"
          :active-robot-id="activeVehicleId"
          :stats="amrStats"
          @robot-click="handleRobotClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.operations-desk {
  display: flex;
  flex-direction: column;
  /* 父级 .app-main 用 flex:1 提供确定高度，这里直接 100% 即可 */
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
}

/* —— 顶栏 —— */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* —— 工厂 Tab：复刻地图管理控制台 —— */
.factory-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.factory-tab {
  padding: 7px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  cursor: pointer;
  font-size: 13px;
  color: var(--el-text-color-primary);
  transition: all 0.15s ease;
  font-family: inherit;
  line-height: 1.2;
}

.factory-tab:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.factory-tab.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  color: var(--el-color-primary);
  font-weight: 500;
}

.factory-empty {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  padding: 7px 0;
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
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
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
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  font-size: 16px;
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

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.panel-area {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid var(--el-border-color);
  overflow: hidden;
}
</style>
