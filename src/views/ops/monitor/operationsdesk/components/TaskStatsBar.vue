<script setup lang="ts">
import { computed } from 'vue';
import { Document, Clock, Loading, CircleCheck, CloseBold, WarningFilled } from '@element-plus/icons-vue';
import type { TaskStats } from '@/api/ops/monitor';

const props = defineProps<{
  stats: TaskStats;
}>();

const items = computed(() => [
  { label: '总数', value: props.stats.totalOrders, color: '#409EFF', icon: Document },
  { label: '待执行', value: props.stats.waitingOrders, color: '#909399', icon: Clock },
  { label: '运行中', value: props.stats.activeOrders, color: '#409EFF', icon: Loading },
  { label: '已完成', value: props.stats.finishedOrders, color: '#67C23A', icon: CircleCheck },
  { label: '已取消', value: props.stats.cancelledOrders, color: '#E6A23C', icon: CloseBold },
  { label: '失败', value: props.stats.failedOrders, color: '#F56C6C', icon: WarningFilled }
]);
</script>

<template>
  <div class="task-stats-bar">
    <div
      v-for="item in items"
      :key="item.label"
      class="stat-item"
      :style="{ '--stat-color': item.color }"
    >
      <el-icon class="stat-icon"><component :is="item.icon" /></el-icon>
      <div class="stat-info">
        <span class="stat-value">{{ item.value }}</span>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-stats-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  transition: all 0.2s;
}

.stat-item:hover {
  border-color: var(--stat-color);
  box-shadow: 0 0 0 1px var(--stat-color) inset;
}

.stat-icon {
  font-size: 14px;
  color: var(--stat-color);
}

.stat-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--stat-color);
}

.stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>