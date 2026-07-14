<script setup lang="ts">
/**
 * AMR 统计 KPI 条
 *
 * 双重职责：
 *   1. 顶栏指标展示（大屏 / 管理者扫视）
 *   2. 筛选触发器：点击某个分类 → 右侧机器人列表过滤到该状态
 *      再次点击 / 点「总数」→ 重置筛选
 *
 * 这样就不必在右侧再放一份重复的状态 Tab。
 */
import { computed } from 'vue';
import { Box, Check, Loading, Lightning, WarningFilled, Close } from '@element-plus/icons-vue';
import type { AmrStats } from '@/api/ops/monitor';

/** 与右侧机器人列表筛选 key 对齐 */
export type AmrFilterKey =
  | 'all'
  | 'IDLE'
  | 'WORKING'
  | 'CHARGING'
  | 'ERROR'
  | 'OFFLINE';

const props = defineProps<{
  stats: AmrStats;
  /** 当前选中筛选项；默认 'all' */
  modelValue?: AmrFilterKey;
  /**
   * 布局：
   *   horizontal（默认）— 顶栏横向条
   *   grid           — 3 列 × 2 行紧凑栅格，适合塞进右侧面板
   */
  layout?: 'horizontal' | 'grid';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: AmrFilterKey): void;
}>();

const active = computed<AmrFilterKey>(() => props.modelValue ?? 'all');

interface Item {
  key: AmrFilterKey;
  label: string;
  value: number;
  color: string;
  icon: any;
}

const items = computed<Item[]>(() => [
  { key: 'all',      label: '总数',   value: props.stats.totalVehicles,                        color: '#409EFF', icon: Box },
  { key: 'IDLE',     label: '空闲',   value: props.stats.idleVehicles,                         color: '#67C23A', icon: Check },
  { key: 'WORKING',  label: '任务中', value: props.stats.executingVehicles,                    color: '#409EFF', icon: Loading },
  { key: 'CHARGING', label: '充电中', value: props.stats.chargingVehicles,                     color: '#E6A23C', icon: Lightning },
  { key: 'ERROR',    label: '异常',   value: props.stats.errorVehicles,                        color: '#F56C6C', icon: WarningFilled },
  { key: 'OFFLINE',  label: '离线',   value: props.stats.offlineVehicles ?? 0,                 color: '#909399', icon: Close }
]);

function handleClick(key: AmrFilterKey) {
  // 再次点击同一项 → 取消筛选回到「全部」
  if (key === active.value && key !== 'all') {
    emit('update:modelValue', 'all');
  } else {
    emit('update:modelValue', key);
  }
}
</script>

<template>
  <div class="amr-stats-bar" :class="`layout-${layout || 'horizontal'}`">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="stat-item"
      :class="{ active: active === item.key }"
      :style="{ '--stat-color': item.color }"
      :title="`点击筛选「${item.label}」车辆`"
      @click="handleClick(item.key)"
    >
      <el-icon class="stat-icon"><component :is="item.icon" /></el-icon>
      <div class="stat-info">
        <span class="stat-value">{{ item.value }}</span>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </button>
  </div>
</template>

<style scoped>
/* —— 横向布局（顶栏使用） —— */
.amr-stats-bar.layout-horizontal {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* —— 紧凑栅格布局（右侧面板使用） —— */
.amr-stats-bar.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.amr-stats-bar.layout-grid .stat-item {
  padding: 6px 8px;
  gap: 6px;
}

.amr-stats-bar.layout-grid .stat-icon {
  font-size: 14px;
}

.amr-stats-bar.layout-grid .stat-value {
  font-size: 15px;
}

.amr-stats-bar.layout-grid .stat-label {
  font-size: 11px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  transition: all 0.15s ease;
  cursor: pointer;
  user-select: none;
  font: inherit;
  color: inherit;
}

.stat-item:hover {
  border-color: var(--stat-color);
  background: color-mix(in srgb, var(--stat-color) 6%, var(--el-fill-color-light));
}

.stat-item.active {
  border-color: var(--stat-color);
  background: color-mix(in srgb, var(--stat-color) 12%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--stat-color) 25%, transparent);
}

.stat-icon {
  font-size: 18px;
  color: var(--stat-color);
}

.stat-info {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  text-align: left;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--stat-color);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
