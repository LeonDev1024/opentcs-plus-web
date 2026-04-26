<script setup lang="ts">
import { ref, watch } from 'vue';
import { listFactoryModel } from '@/api/deploy/factory/model';
import type { FactoryModelVO } from '@/api/deploy/factory/model/types';
import AmrStatsBar from './AmrStatsBar.vue';
import TaskStatsBar from './TaskStatsBar.vue';
import type { AmrStats, TaskStats } from '@/api/ops/monitor';

const props = defineProps<{
  amrStats: AmrStats;
  taskStats: TaskStats;
  factoryId?: number;
}>();

const emit = defineEmits<{
  (e: 'factory-change', id: number): void;
}>();

const factoryOptions = ref<FactoryModelVO[]>([]);
const selectedFactoryId = ref<number | undefined>(props.factoryId);

// 加载工厂列表
listFactoryModel().then((res) => {
  factoryOptions.value = res.data;
});

// 监听工厂切换
watch(selectedFactoryId, (val) => {
  if (val) emit('factory-change', val);
});
</script>

<template>
  <div class="stats-bar">
    <!-- 左侧：工厂选择 -->
    <div class="factory-selector">
      <el-select
        v-model="selectedFactoryId"
        placeholder="选择工厂"
        clearable
        style="width: 160px"
      >
        <el-option
          v-for="item in factoryOptions"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
      </el-select>
    </div>

    <!-- 中间：AMR 统计 -->
    <div class="stats-section">
      <AmrStatsBar :stats="amrStats" />
    </div>

    <!-- 右侧：任务统计 -->
    <div class="stats-section">
      <TaskStatsBar :stats="taskStats" />
    </div>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.factory-selector {
  flex-shrink: 0;
}

.stats-section {
  flex: 1;
  display: flex;
  align-items: center;
}
</style>