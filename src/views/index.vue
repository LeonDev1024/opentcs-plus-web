<template>
  <div class="dashboard">
    <!-- KPI 卡片行 -->
    <div class="kpi-row">
      <div
        v-for="(card, idx) in kpiCards"
        :key="card.key"
        class="kpi-card"
        :style="{ '--card-color': card.color, '--card-color-dark': card.colorDark, animationDelay: `${idx * 80}ms` }"
      >
        <div class="kpi-content">
          <div class="kpi-label">{{ card.label }}</div>
          <div class="kpi-value">
            <span class="kpi-number">{{ card.displayValue }}</span>
            <span v-if="card.unit" class="kpi-unit">{{ card.unit }}</span>
          </div>
          <div class="kpi-sub">
            <span
              v-for="sub in card.subs"
              :key="sub.label"
              class="kpi-sub-item"
            >
              <i class="dot" :style="{ background: sub.color }"></i>
              {{ sub.label }} {{ sub.value }}
            </span>
          </div>
        </div>
        <div class="kpi-icon-bg">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
        <!-- 装饰圆圈 -->
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="chart-row">
      <!-- 任务趋势折线图 -->
      <div class="chart-card chart-left">
        <div class="card-header">
          <div class="card-title">任务趋势</div>
          <div class="card-subtitle">近 7 天订单统计</div>
        </div>
        <div ref="trendChartRef" class="chart-body"></div>
      </div>

      <!-- 车辆状态饼图 -->
      <div class="chart-card chart-right">
        <div class="card-header">
          <div class="card-title">车辆状态分布</div>
          <div class="card-subtitle">实时统计</div>
        </div>
        <div ref="vehicleChartRef" class="chart-body"></div>
      </div>
    </div>

    <!-- 列表行 -->
    <div class="list-row">
      <!-- 实时告警 -->
      <div class="list-card">
        <div class="card-header">
          <div class="card-title">
            实时告警
            <span v-if="alarmList.length > 0" class="badge-dot"></span>
          </div>
          <el-button link type="primary" size="small">查看全部</el-button>
        </div>
        <div class="alarm-list">
          <div v-if="alarmList.length === 0" class="empty-state">
            <el-icon class="empty-icon" style="color: var(--success-500)"><CircleCheck /></el-icon>
            <span>系统运行正常，暂无告警</span>
          </div>
          <div
            v-for="alarm in alarmList"
            :key="alarm.id"
            class="alarm-item"
            :class="`alarm-${alarm.level}`"
          >
            <div class="alarm-level-bar"></div>
            <div class="alarm-info">
              <div class="alarm-title">{{ alarm.title }}</div>
              <div class="alarm-meta">
                <span>{{ alarm.vehicle }}</span>
                <span>{{ alarm.time }}</span>
              </div>
            </div>
            <el-tag
              :type="alarm.level === 'critical' ? 'danger' : alarm.level === 'warning' ? 'warning' : 'info'"
              size="small"
              effect="light"
            >{{ alarm.levelText }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 最近订单 -->
      <div class="list-card">
        <div class="card-header">
          <div class="card-title">最近订单</div>
          <el-button link type="primary" size="small" @click="goOrders">查看全部</el-button>
        </div>
        <div class="order-list">
          <div v-if="recentOrders.length === 0" class="empty-state">
            <el-icon class="empty-icon"><Document /></el-icon>
            <span>暂无订单数据</span>
          </div>
          <div
            v-for="order in recentOrders"
            :key="order.id"
            class="order-item"
          >
            <div class="order-no">{{ order.orderNo }}</div>
            <div class="order-route">
              <span class="route-from">{{ order.from }}</span>
              <el-icon class="route-arrow"><Right /></el-icon>
              <span class="route-to">{{ order.to }}</span>
            </div>
            <div class="order-vehicle">{{ order.vehicle || '未分配' }}</div>
            <el-tag
              :type="orderStatusType(order.status)"
              size="small"
              effect="light"
              class="order-status"
            >{{ orderStatusText(order.status) }}</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { useRouter } from 'vue-router';
import {
  Cpu,
  Document,
  Warning,
  CircleCheck,
  Right,
  Van
} from '@element-plus/icons-vue';

const router = useRouter();

// ===================== Mock 数据 =====================

const vehicleData = {
  total: 12,
  idle: 5,
  working: 4,
  charging: 2,
  error: 1
};

const orderData = {
  total: 87,
  pending: 6,
  transporting: 4,
  completed: 74,
  cancelled: 3
};

const completionRate = Math.round((orderData.completed / orderData.total) * 100);

const alarmList = ref([
  {
    id: 1,
    level: 'warning',
    levelText: '警告',
    title: 'AGV-03 电量不足 (18%)',
    vehicle: 'AGV-03',
    time: '3 分钟前'
  },
  {
    id: 2,
    level: 'info',
    levelText: '提示',
    title: 'AGV-07 已完成充电',
    vehicle: 'AGV-07',
    time: '12 分钟前'
  },
  {
    id: 3,
    level: 'info',
    levelText: '提示',
    title: '地图版本 v2.1 已更新',
    vehicle: '系统',
    time: '1 小时前'
  }
]);

const recentOrders = ref([
  { id: 1, orderNo: 'ORD-20260415-001', from: 'A-01', to: 'B-03', vehicle: 'AGV-02', status: '2' },
  { id: 2, orderNo: 'ORD-20260415-002', from: 'C-05', to: 'D-02', vehicle: 'AGV-05', status: '3' },
  { id: 3, orderNo: 'ORD-20260415-003', from: 'A-03', to: 'E-01', vehicle: '', status: '0' },
  { id: 4, orderNo: 'ORD-20260415-004', from: 'B-02', to: 'F-04', vehicle: 'AGV-01', status: '3' },
  { id: 5, orderNo: 'ORD-20260415-005', from: 'D-01', to: 'A-05', vehicle: 'AGV-04', status: '1' },
  { id: 6, orderNo: 'ORD-20260415-006', from: 'E-03', to: 'C-01', vehicle: 'AGV-03', status: '2' },
]);

// ===================== KPI 卡片 =====================

const kpiCards = ref([
  {
    key: 'vehicle',
    label: '车辆在线',
    value: vehicleData.total - vehicleData.error,
    displayValue: '0',
    unit: '台',
    color: '#2563eb',
    colorDark: '#1d4ed8',
    icon: 'Van',
    subs: [
      { label: '空闲', value: vehicleData.idle, color: '#64748b' },
      { label: '作业', value: vehicleData.working, color: '#2563eb' },
      { label: '充电', value: vehicleData.charging, color: '#f59e0b' }
    ]
  },
  {
    key: 'order',
    label: '今日任务',
    value: orderData.total,
    displayValue: '0',
    unit: '单',
    color: '#7c3aed',
    colorDark: '#6d28d9',
    icon: 'Document',
    subs: [
      { label: '待分配', value: orderData.pending, color: '#94a3b8' },
      { label: '运输中', value: orderData.transporting, color: '#7c3aed' },
      { label: '已完成', value: orderData.completed, color: '#16a34a' }
    ]
  },
  {
    key: 'rate',
    label: '完成率',
    value: completionRate,
    displayValue: '0',
    unit: '%',
    color: '#059669',
    colorDark: '#047857',
    icon: 'CircleCheck',
    subs: [
      { label: '已完成', value: orderData.completed, color: '#16a34a' },
      { label: '已取消', value: orderData.cancelled, color: '#ef4444' }
    ]
  },
  {
    key: 'alarm',
    label: '活跃告警',
    value: alarmList.value.length,
    displayValue: '0',
    unit: '条',
    color: alarmList.value.length === 0 ? '#059669' : '#d97706',
    colorDark: alarmList.value.length === 0 ? '#047857' : '#b45309',
    icon: 'Warning',
    subs: [
      { label: '严重', value: alarmList.value.filter(a => a.level === 'critical').length, color: '#ef4444' },
      { label: '警告', value: alarmList.value.filter(a => a.level === 'warning').length, color: '#f59e0b' },
      { label: '提示', value: alarmList.value.filter(a => a.level === 'info').length, color: '#3b82f6' }
    ]
  }
]);

// countUp 动画
const startCountUp = () => {
  const duration = 1200;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);

    kpiCards.value.forEach(card => {
      card.displayValue = Math.round(eased * card.value).toString();
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
};

// ===================== 图表 =====================

const trendChartRef = ref<HTMLElement>();
const vehicleChartRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let vehicleChart: echarts.ECharts | null = null;

const trendDays = ['4/9', '4/10', '4/11', '4/12', '4/13', '4/14', '4/15'];
const trendNew = [14, 19, 12, 23, 18, 25, 87];
const trendDone = [12, 16, 11, 20, 17, 22, 74];

const initTrendChart = () => {
  if (!trendChartRef.value) return;
  trendChart = echarts.init(trendChartRef.value);

  const option: echarts.EChartsOption = {
    grid: { top: 20, right: 16, bottom: 48, left: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--bg-elevated)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 },
      axisPointer: { type: 'cross', lineStyle: { color: 'var(--border-default)' } }
    },
    legend: {
      data: ['新增订单', '完成订单'],
      bottom: 0,
      textStyle: { color: 'var(--text-secondary)', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 6
    },
    xAxis: {
      type: 'category',
      data: trendDays,
      axisLine: { lineStyle: { color: 'var(--border-default)' } },
      axisTick: { show: false },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'var(--border-light)', type: 'dashed' } },
      axisLabel: { color: 'var(--text-tertiary)', fontSize: 11 }
    },
    series: [
      {
        name: '新增订单',
        type: 'line',
        data: trendNew,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#2563eb', width: 2 },
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37,99,235,0.25)' },
            { offset: 1, color: 'rgba(37,99,235,0.02)' }
          ])
        }
      },
      {
        name: '完成订单',
        type: 'line',
        data: trendDone,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#16a34a', width: 2 },
        itemStyle: { color: '#16a34a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22,163,74,0.2)' },
            { offset: 1, color: 'rgba(22,163,74,0.02)' }
          ])
        }
      }
    ]
  };
  trendChart.setOption(option);
};

const initVehicleChart = () => {
  if (!vehicleChartRef.value) return;
  vehicleChart = echarts.init(vehicleChartRef.value);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 台 ({d}%)',
      backgroundColor: 'var(--bg-elevated)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 }
    },
    legend: {
      orient: 'vertical',
      right: 16,
      top: 'center',
      textStyle: { color: 'var(--text-secondary)', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${vehicleData.total}}\n{label|台}`,
          rich: {
            total: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 32 },
            label: { fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 18 }
          }
        },
        emphasis: {
          label: { show: true },
          scaleSize: 4
        },
        labelLine: { show: false },
        data: [
          { value: vehicleData.idle, name: '空闲', itemStyle: { color: '#64748b' } },
          { value: vehicleData.working, name: '作业中', itemStyle: { color: '#2563eb' } },
          { value: vehicleData.charging, name: '充电中', itemStyle: { color: '#f59e0b' } },
          { value: vehicleData.error, name: '故障', itemStyle: { color: '#ef4444' } }
        ]
      }
    ]
  };
  vehicleChart.setOption(option);
};

const handleResize = () => {
  trendChart?.resize();
  vehicleChart?.resize();
};

// ===================== 工具函数 =====================

const orderStatusType = (status: string) => {
  const map: Record<string, string> = { '0': 'info', '1': 'primary', '2': 'warning', '3': 'success', '4': 'danger' };
  return (map[status] ?? 'info') as any;
};

const orderStatusText = (status: string) => {
  const map: Record<string, string> = { '0': '待分配', '1': '已分配', '2': '运输中', '3': '已完成', '4': '已取消' };
  return map[status] ?? '-';
};

const goOrders = () => {
  router.push('/ops/order');
};

// ===================== 生命周期 =====================

onMounted(async () => {
  await nextTick();
  startCountUp();
  initTrendChart();
  initVehicleChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  trendChart?.dispose();
  vehicleChart?.dispose();
  window.removeEventListener('resize', handleResize);
});
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  background: var(--bg-secondary);
}

// ===================== KPI 卡片 =====================

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpi-card {
  position: relative;
  border-radius: var(--radius-xl);
  padding: 20px;
  overflow: hidden;
  cursor: default;
  animation: slideUp 0.4s var(--ease-out) both;
  background: linear-gradient(135deg, var(--card-color) 0%, var(--card-color-dark) 100%);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.2);
  transition: transform var(--duration-200) var(--ease-out),
              box-shadow var(--duration-200) var(--ease-out);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 28px -4px rgba(0, 0, 0, 0.3);
  }
}

.kpi-content {
  position: relative;
  z-index: 1;
  color: #fff;
}

.kpi-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  opacity: 0.85;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

.kpi-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 14px;

  .kpi-number {
    font-size: 36px;
    font-weight: var(--font-weight-bold);
    line-height: 1;
    letter-spacing: var(--letter-spacing-tight);
  }

  .kpi-unit {
    font-size: var(--font-size-base);
    opacity: 0.75;
    font-weight: var(--font-weight-medium);
  }
}

.kpi-sub {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  .kpi-sub-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    opacity: 0.85;
    background: rgba(255, 255, 255, 0.15);
    padding: 2px 8px;
    border-radius: var(--radius-full);

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.8);
      flex-shrink: 0;
    }
  }
}

.kpi-icon-bg {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.12;

  .el-icon {
    font-size: 72px;
    color: #fff;
  }
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  pointer-events: none;

  &.deco-1 {
    width: 100px;
    height: 100px;
    top: -30px;
    right: 30px;
  }

  &.deco-2 {
    width: 60px;
    height: 60px;
    top: 10px;
    right: 110px;
  }
}

// ===================== 图表 =====================

.chart-row {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  padding: 20px;
  animation: slideUp 0.4s var(--ease-out) 0.2s both;

  .chart-body {
    height: 220px;
    margin-top: 12px;
  }
}

// ===================== 列表 =====================

.list-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  animation: slideUp 0.4s var(--ease-out) 0.32s both;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.list-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

// ===================== 通用卡片头 =====================

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;

    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--danger-500);
      animation: pulse 1.5s infinite;
    }
  }

  .card-subtitle {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
  }
}

// ===================== 告警列表 =====================

.alarm-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.alarm-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  transition: var(--transition-all);

  &:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-xs);
  }

  .alarm-level-bar {
    width: 3px;
    height: 32px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  &.alarm-critical .alarm-level-bar { background: var(--danger-500); }
  &.alarm-warning .alarm-level-bar { background: var(--warning-500); }
  &.alarm-info .alarm-level-bar { background: var(--info-500); }

  .alarm-info {
    flex: 1;
    min-width: 0;

    .alarm-title {
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .alarm-meta {
      display: flex;
      gap: 10px;
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
  }
}

// ===================== 订单列表 =====================

.order-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.order-item {
  display: grid;
  grid-template-columns: 1.8fr 1.6fr 0.8fr auto;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-lg);
  transition: var(--transition-all);
  border: 1px solid transparent;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-light);
  }

  .order-no {
    font-size: 12px;
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    font-family: var(--font-family-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .order-route {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);

    .route-from, .route-to {
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
    }

    .route-arrow {
      color: var(--text-tertiary);
      font-size: 11px;
    }
  }

  .order-vehicle {
    font-size: 11px;
    color: var(--text-tertiary);
    white-space: nowrap;
  }

  .order-status {
    font-size: 11px;
  }
}

// ===================== 空状态 =====================

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);

  .empty-icon {
    font-size: 32px;
  }
}

// ===================== 动画 =====================

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}
</style>
