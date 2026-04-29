<script setup lang="ts">
/**
 * 机器人面板（左侧）
 *
 * 结构：
 *   ┌────────────────────────┐
 *   │ 车辆状态                │
 *   │ 🔍 搜索框               │
 *   │ ┌─机器人卡片─┐          │
 *   │ │ ...        │          │
 *   │ └────────────┘          │
 *   └────────────────────────┘
 */
import { ref, computed } from 'vue';
import RobotCard from './RobotCard.vue';
import type { RobotCardVO, VehicleState, AmrStats } from '@/api/ops/monitor';

const activeTab = ref<'robot' | 'order'>('robot');

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
    <!-- 头部：Tab 切换 -->
    <div class="panel-head">
      <div class="panel-tabs">
        <button
          class="tab-item"
          :class="{ active: activeTab === 'robot' }"
          @click="activeTab = 'robot'"
        >
          机器人
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === 'order' }"
          @click="activeTab = 'order'"
        >
          订单
        </button>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="search-wrapper">
      <el-input
        v-model="search"
        :placeholder="activeTab === 'robot' ? '搜索机器人...' : '搜索订单...'"
        prefix-icon="Search"
        size="small"
        clearable
        class="search-input"
      />
    </div>

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
  overflow: hidden;
}

.panel-head {
  padding: 12px 12px 0;
  flex-shrink: 0;
}

.panel-tabs {
  display: flex;
  gap: 4px;
}

.tab-item {
  padding: 4px 16px;
  font-size: 13px;
  border: none;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.tab-item:hover {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.tab-item.active {
  background: var(--el-color-primary);
  color: #fff;
  font-weight: 500;
}

.search-wrapper {
  padding: 10px 12px;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
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
