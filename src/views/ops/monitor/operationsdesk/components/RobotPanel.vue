<script setup lang="ts">
/**
 * 机器人面板（右侧）
 *
 * 结构：
 *   ┌────────────────────────┐
 *   │ 车辆状态                │
 *   │ ┌──────KPI 栅格──────┐ │  ← AmrStatsBar layout="grid"
 *   │ │ 总数 / 空闲 / 忙   │ │     点击 KPI 直接筛选下方列表
 *   │ │ 充电 / 异常 / 离线 │ │
 *   │ └────────────────────┘ │
 *   │ 🔍 搜索框               │
 *   │ ┌─机器人卡片─┐          │
 *   │ │ ...        │          │
 *   │ └────────────┘          │
 *   └────────────────────────┘
 */
import { ref, computed } from 'vue';
import RobotCard from './RobotCard.vue';
import AmrStatsBar, { type AmrFilterKey } from './AmrStatsBar.vue';
import type { RobotCardVO, VehicleState, AmrStats } from '@/api/ops/monitor';

const props = defineProps<{
  robots: RobotCardVO[];
  activeRobotId?: string;
  /** 由父组件 v-model 控制的筛选状态；与 KPI 联动 */
  filter?: AmrFilterKey;
  /** AMR 聚合统计 */
  stats: AmrStats;
}>();

const emit = defineEmits<{
  (e: 'robot-click', robot: RobotCardVO): void;
  (e: 'update:filter', value: AmrFilterKey): void;
}>();

const search = ref('');

function matchesFilter(state: VehicleState, key: AmrFilterKey): boolean {
  if (key === 'all') return true;
  if (key === 'OFFLINE') return state === 'UNKNOWN' || state === 'UNAVAILABLE';
  return state === key;
}

const filteredRobots = computed(() => {
  const kw = search.value.trim().toLowerCase();
  const f = props.filter ?? 'all';
  return props.robots.filter((r) => {
    if (!matchesFilter(r.state, f)) return false;
    if (kw && !r.name.toLowerCase().includes(kw)) return false;
    return true;
  });
});

const emptyText = computed(() => {
  if (search.value) return '没有匹配的机器人';
  switch (props.filter) {
    case 'IDLE':
      return '当前没有空闲车辆';
    case 'WORKING':
      return '当前没有任务中车辆';
    case 'CHARGING':
      return '当前没有充电中车辆';
    case 'ERROR':
      return '当前没有异常车辆';
    case 'OFFLINE':
      return '当前没有离线车辆';
    default:
      return '暂无机器人';
  }
});

const filterModel = computed<AmrFilterKey>({
  get: () => props.filter ?? 'all',
  set: (v) => emit('update:filter', v)
});
</script>

<template>
  <div class="robot-panel">
    <!-- 头部：标题 + KPI 栅格 -->
    <div class="panel-head">
      <span class="panel-title">车辆状态</span>
      <AmrStatsBar
        v-model="filterModel"
        :stats="stats"
        layout="grid"
        class="panel-kpi"
      />
    </div>

    <!-- 搜索 -->
    <el-input
      v-model="search"
      placeholder="搜索机器人..."
      prefix-icon="Search"
      size="small"
      clearable
      class="search-input"
    />

    <!-- 列表 -->
    <div class="robot-list">
      <template v-if="filteredRobots.length > 0">
        <RobotCard
          v-for="robot in filteredRobots"
          :key="robot.vehicleId"
          :robot="robot"
          :active="robot.vehicleId === activeRobotId"
          @click="emit('robot-click', robot)"
        />
      </template>
      <el-empty v-else :description="emptyText" :image-size="60" />
    </div>
  </div>
</template>

<style scoped>
.robot-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
  min-height: 0;
}

.panel-head {
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  letter-spacing: 0.3px;
}

.panel-kpi {
  /* AmrStatsBar layout=grid 自身已是 3×2，这里仅承担布局空间 */
}

.search-input {
  margin: 10px 12px 6px;
  flex-shrink: 0;
}

.robot-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
</style>
