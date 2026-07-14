<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h1 class="page-title">总览</h1>
        <p class="page-desc">{{ greeting }}，{{ username }}。当前 {{ currentTime }}</p>
      </div>
    </div>

    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon" :style="{ background: stat.iconBg }">
          <el-icon><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-body">
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-label">{{ stat.label }}</p>
        </div>
        <div class="stat-trend" :class="stat.trendType">
          <el-icon><component :is="stat.trendIcon" /></el-icon>
          <span>{{ stat.trend }}</span>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">任务完成率</h3>
            <p class="card-desc">按创建日期统计最近 7 日任务</p>
          </div>
          <div class="chart-tabs">
            <button
              v-for="tab in chartTabs"
              :key="tab.value"
              type="button"
              class="chart-tab"
              :class="{ active: activeTab === tab.value }"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <div class="chart-area">
          <div v-if="chartData.length" class="mini-bar-chart">
            <div v-for="(bar, i) in chartData" :key="i" class="bar-col">
              <div class="bar-wrap">
                <div class="bar-fill" :style="{ height: bar.pct + '%' }"></div>
              </div>
              <span class="bar-label">{{ bar.day }}</span>
            </div>
          </div>
          <div v-else class="chart-empty">暂无任务数据</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">机器人状态</h3>
            <p class="card-desc">实时在线状态分布</p>
          </div>
        </div>
        <div class="status-list">
          <div v-for="item in robotStatus" :key="item.label" class="status-item">
            <div class="status-left">
              <span class="status-dot" :style="{ background: item.color }"></span>
              <span class="status-label">{{ item.label }}</span>
            </div>
            <div class="status-right">
              <div class="status-bar-bg">
                <div class="status-bar-fill" :style="{ width: item.pct + '%', background: item.color }"></div>
              </div>
              <span class="status-count">{{ item.count }}</span>
              <span class="status-pct">{{ item.pct }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">最近运输订单</h3>
          <p class="card-desc">最新创建的调度任务</p>
        </div>
        <router-link to="/task/operation" class="view-all-link">
          查看全部
          <el-icon><ArrowRight /></el-icon>
        </router-link>
      </div>
      <el-table v-loading="loading" :data="recentOrders" class="clean-table" empty-text="暂无订单数据">
        <el-table-column prop="orderNo" label="订单编号" min-width="160" show-overflow-tooltip />
        <el-table-column label="起止位置" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatRoute(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="vehicleName" label="执行车辆" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.vehicleName || '未分配' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <span class="result-chip" :class="orderStatusClass(row.status)">
              {{ orderStatusLabel(row.status) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Van, Cpu, Check, WarningFilled, ArrowRight, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import { monitorApi, type VehicleRuntimeVO, type AmrStats, type TaskStats } from '@/api/ops/monitor';
import { listOrder } from '@/api/ops/order';
import type { OrderVO } from '@/api/ops/order/types';
import { useUserStore } from '@/store/modules/user';

const userStore = useUserStore();
const loading = ref(false);
const currentTime = ref('');
let timer: number | undefined;

const vehicles = ref<VehicleRuntimeVO[]>([]);
const orders = ref<OrderVO[]>([]);
const amrStats = ref<AmrStats | null>(null);
const taskStats = ref<TaskStats | null>(null);

const username = computed(() => userStore.nickname || userStore.name || '管理员');

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
});

const updateTime = () => {
  const now = new Date();
  currentTime.value =
    now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) +
    ' ' +
    now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const unwrapStats = <T>(res: unknown): T | null => {
  if (!res || typeof res !== 'object') return null;
  const body = res as Record<string, unknown>;
  if (body.data && typeof body.data === 'object') return body.data as T;
  return body as T;
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [vehicleStatsRes, orderStatsRes, vehiclesRes, ordersRes] = await Promise.all([
      monitorApi.getVehicleStatistics(),
      monitorApi.getOrderStatistics(),
      monitorApi.listVehicleRuntime(),
      listOrder({ pageNum: 1, pageSize: 200 })
    ]);

    amrStats.value = unwrapStats<AmrStats>(vehicleStatsRes);
    taskStats.value = unwrapStats<TaskStats>(orderStatsRes);

    const vehicleBody = vehiclesRes as { data?: VehicleRuntimeVO[] };
    vehicles.value = Array.isArray(vehicleBody?.data) ? vehicleBody.data : [];

    const orderRows = (ordersRes as { rows?: OrderVO[] })?.rows;
    orders.value = Array.isArray(orderRows) ? orderRows : [];
  } catch {
    vehicles.value = [];
    orders.value = [];
    amrStats.value = null;
    taskStats.value = null;
  } finally {
    loading.value = false;
  }
};

const totalVehicles = computed(() => amrStats.value?.totalVehicles ?? vehicles.value.length);
const onlineVehicles = computed(() => {
  if (amrStats.value) {
    const offline = amrStats.value.offlineVehicles ?? 0;
    return Math.max(0, amrStats.value.totalVehicles - offline);
  }
  return vehicles.value.filter((v) => v.state !== 'UNAVAILABLE' && v.state !== 'UNKNOWN').length;
});
const activeTasks = computed(() => {
  if (taskStats.value) return taskStats.value.activeOrders ?? 0;
  return orders.value.filter((o) => o.status === '2').length;
});
const waitingTasks = computed(() => {
  if (taskStats.value) return taskStats.value.waitingOrders ?? 0;
  return orders.value.filter((o) => o.status === '0' || o.status === '1').length;
});
const completedTasks = computed(() => {
  if (taskStats.value) return taskStats.value.finishedOrders ?? 0;
  return orders.value.filter((o) => o.status === '3').length;
});
const terminalTasks = computed(() => {
  if (taskStats.value) {
    return (
      (taskStats.value.finishedOrders ?? 0) +
      (taskStats.value.cancelledOrders ?? 0) +
      (taskStats.value.failedOrders ?? 0)
    );
  }
  return orders.value.filter((o) => ['3', '4'].includes(o.status)).length;
});
const completionRate = computed(() =>
  terminalTasks.value ? Math.round((completedTasks.value / terminalTasks.value) * 100) : 0
);
const faultRobots = computed(
  () => amrStats.value?.errorVehicles ?? vehicles.value.filter((v) => v.state === 'ERROR').length
);
const alertCount = computed(
  () => faultRobots.value + (taskStats.value?.failedOrders ?? 0)
);

const stats = computed(() => [
  {
    label: '在线车辆',
    value: onlineVehicles.value,
    icon: Van,
    iconBg: 'var(--primary-50)',
    trend: `${totalVehicles.value} 台注册`,
    trendType: 'neutral',
    trendIcon: ArrowUp
  },
  {
    label: '执行中任务',
    value: activeTasks.value,
    icon: Cpu,
    iconBg: 'var(--success-50)',
    trend: `${waitingTasks.value} 个等待`,
    trendType: 'up',
    trendIcon: ArrowUp
  },
  {
    label: '任务完成率',
    value: `${completionRate.value}%`,
    icon: Check,
    iconBg: 'var(--warning-50)',
    trend: `${completedTasks.value} 单已完成`,
    trendType: 'neutral',
    trendIcon: ArrowUp
  },
  {
    label: '异常告警',
    value: alertCount.value,
    icon: WarningFilled,
    iconBg: 'var(--danger-50)',
    trend: `${faultRobots.value} 台故障`,
    trendType: alertCount.value ? 'down' : 'up',
    trendIcon: alertCount.value ? ArrowDown : ArrowUp
  }
]);

const activeTab = ref<'all' | 'success' | 'fail'>('all');
const chartTabs = [
  { label: '全部', value: 'all' as const },
  { label: '成功', value: 'success' as const },
  { label: '失败', value: 'fail' as const }
];

const chartData = computed(() => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, day: `${date.getMonth() + 1}/${date.getDate()}`, total: 0, hit: 0 };
  });

  orders.value.forEach((order) => {
    const key = order.createTime?.slice(0, 10);
    const item = days.find((day) => day.key === key);
    if (!item) return;
    item.total += 1;
    if (activeTab.value === 'all' && order.status === '3') item.hit += 1;
    if (activeTab.value === 'success' && order.status === '3') item.hit += 1;
    if (activeTab.value === 'fail' && order.status === '4') item.hit += 1;
  });

  return days.map((day) => {
    const ratio = day.total ? day.hit / day.total : 0;
    const pct =
      activeTab.value === 'all'
        ? Math.max(8, Math.round(ratio * 100))
        : Math.max(day.hit > 0 ? 12 : 4, Math.round(ratio * 100) || day.hit * 18);
    return { day: day.day, pct };
  });
});

const robotStatus = computed(() => {
  const list = vehicles.value;
  const total = amrStats.value?.totalVehicles || list.length || 1;
  const rows = [
    {
      label: '执行中',
      count:
        amrStats.value?.executingVehicles ??
        list.filter((v) => v.state === 'WORKING').length,
      color: '#2563eb'
    },
    {
      label: '空闲待命',
      count: amrStats.value?.idleVehicles ?? list.filter((v) => v.state === 'IDLE').length,
      color: '#10b981'
    },
    {
      label: '充电中',
      count:
        amrStats.value?.chargingVehicles ?? list.filter((v) => v.state === 'CHARGING').length,
      color: '#f59e0b'
    },
    {
      label: '故障/离线',
      count: amrStats.value
        ? (amrStats.value.errorVehicles ?? 0) + (amrStats.value.offlineVehicles ?? 0)
        : list.filter((v) => ['ERROR', 'UNKNOWN', 'UNAVAILABLE'].includes(v.state)).length,
      color: '#ef4444'
    }
  ];
  return rows.map((row) => ({
    ...row,
    pct: Math.round((row.count / Math.max(total, 1)) * 100)
  }));
});

const recentOrders = computed(() =>
  [...orders.value]
    .sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''))
    .slice(0, 8)
);

const orderStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    '0': '待分配',
    '1': '已分配',
    '2': '运输中',
    '3': '已完成',
    '4': '已取消'
  };
  return map[status] ?? status;
};

const orderStatusClass = (status: string) => {
  if (status === '3') return 'success';
  if (status === '4') return 'fail';
  if (status === '2') return 'running';
  return 'pending';
};

const formatRoute = (row: OrderVO) => {
  const from = row.startLocationName || row.startLocationId || '-';
  const to = row.targetLocationName || row.targetLocationId || '-';
  return `${from} → ${to}`;
};

onMounted(() => {
  updateTime();
  loadDashboard();
  timer = window.setInterval(() => {
    updateTime();
    loadDashboard();
  }, 30000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped lang="scss">
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  min-height: 100%;
  background: var(--bg-secondary);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: var(--leading-tight);
  margin: 0 0 4px;
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: box-shadow var(--duration-200) var(--ease-out);
  box-shadow: var(--shadow-card);

  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .el-icon {
    font-size: 20px;
    color: var(--primary-500);
  }
}

.stat-body {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1;
  margin: 0 0 4px;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: var(--font-size-xs);
  white-space: nowrap;

  &.up {
    color: var(--success-600);
  }

  &.down {
    color: var(--danger-500);
  }

  &.neutral {
    color: var(--text-tertiary);
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
}

.card-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 2px;
}

.card-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin: 0;
}

.chart-tabs {
  display: flex;
  gap: 4px;
  background: var(--gray-100);
  border-radius: var(--radius-md);
  padding: 3px;
  flex-shrink: 0;
}

.chart-tab {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: 4px 12px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-150) var(--ease-out);

  &.active {
    background: var(--bg-primary);
    color: var(--text-primary);
    box-shadow: var(--shadow-xs);
  }
}

.chart-area {
  padding: 20px;
}

.chart-empty {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.mini-bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 140px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.bar-wrap {
  flex: 1;
  width: 100%;
  background: var(--gray-100);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  background: var(--primary-500);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  opacity: 0.85;
  transition: height var(--duration-300) var(--ease-out);
  min-height: 4px;
}

.bar-col:hover .bar-fill {
  opacity: 1;
}

.bar-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
}

.status-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 88px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.status-bar-bg {
  flex: 1;
  height: 6px;
  background: var(--gray-100);
  border-radius: 999px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width var(--duration-300) var(--ease-out);
}

.status-count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  width: 28px;
  text-align: right;
}

.status-pct {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  width: 32px;
  text-align: right;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--primary-500);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: opacity var(--duration-150) var(--ease-out);
  flex-shrink: 0;

  &:hover {
    opacity: 0.75;
  }
}

.clean-table {
  padding: 0 4px 4px;
}

.clean-table :deep(.el-table__header-wrapper) {
  border-radius: 0;
}

.result-chip {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}

.result-chip.success {
  background: var(--success-100);
  color: var(--success-800);
}

.result-chip.fail {
  background: var(--danger-100);
  color: var(--danger-800);
}

.result-chip.running {
  background: var(--warning-100);
  color: var(--warning-800);
}

.result-chip.pending {
  background: var(--gray-100);
  color: var(--gray-600);
}
</style>
