<script setup lang="ts">
/**
 * 机器人卡片
 *
 * 布局（参考运维监控大屏标准卡片）：
 *   ┌──────────────────────┐
 *   │ 名称       [状态药丸] │
 *   │ 任务: <可读任务描述>   │
 *   │ 电量 ▓▓▓▓▓▓ 87%      │
 *   │ 速度: 1.2 m/s         │  ← 充电时显示「预计完成: 18min」
 *   └──────────────────────┘
 *
 * 字段缺失时降级：
 * - 无 taskDescription / currentOrderId → 任务行显示「—」
 * - 无 velocity → 充电时显示 ETA，否则隐藏速度行
 * - 无 energyLevel → 隐藏电量条
 */
import { computed } from 'vue';
import { Location, Van } from '@element-plus/icons-vue';
import type { RobotCardVO } from '@/api/ops/monitor';

const props = defineProps<{
  robot: RobotCardVO;
  active?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

/** 状态配置：标签 + 主色 */
const stateConfig = computed(() => {
  const map: Record<string, { label: string; color: string }> = {
    IDLE:        { label: '空闲',   color: '#67C23A' },
    WORKING:     { label: '执行中', color: '#1677FF' },
    EXECUTING:   { label: '执行中', color: '#1677FF' },
    CHARGING:    { label: '充电',   color: '#E6A23C' },
    ERROR:       { label: '异常',   color: '#F56C6C' },
    WAITING:     { label: '等待中', color: '#E6A23C' },
    PAUSED:      { label: '已暂停', color: '#E6A23C' },
    OFFLINE:     { label: '离线',   color: '#909399' },
    UNKNOWN:     { label: '离线',   color: '#909399' },
    UNAVAILABLE: { label: '不可用', color: '#909399' }
  };
  return map[props.robot.state] || map.UNKNOWN;
});

/** 是否充电态：影响任务行/底部行的展示分支 */
const isCharging = computed(() => props.robot.state === 'CHARGING');

/** 任务行文本 */
const taskText = computed<string>(() => {
  if (isCharging.value) return '充电中…';
  if (props.robot.taskDescription) return props.robot.taskDescription;
  if (props.robot.currentOrderId) return props.robot.orderNo || props.robot.currentOrderId;
  return '—';
});

/** 任务行是否为空状态（影响样式） */
const taskIsEmpty = computed(
  () =>
    !isCharging.value &&
    !props.robot.taskDescription &&
    !props.robot.currentOrderId
);

/** 电量百分比（兼容 0~1 与 0~100） */
const energyPercent = computed<number | null>(() => {
  const raw = props.robot.energyLevel;
  if (raw === undefined || raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
});

/** 电量颜色：充电时一律绿色（标识进度），其余按低电量警示 */
const energyColor = computed(() => {
  if (isCharging.value) return '#67C23A';
  const p = energyPercent.value;
  if (p === null) return '#C0C4CC';
  if (p <= 15) return '#F56C6C';
  if (p <= 30) return '#E6A23C';
  return '#67C23A';
});

const pointName = computed(() => props.robot.position?.pointId || '未知站点');
</script>

<template>
  <div
    class="robot-card"
    :class="{ active }"
    :style="{ '--state-color': stateConfig.color }"
    @click="emit('click')"
  >
    <div class="robot-icon">
      <el-icon><Van /></el-icon>
    </div>
    <div class="card-body">
      <div class="row-name">
        <span class="robot-name" :title="robot.name">{{ robot.name }}</span>
        <span class="state-text">
          <i class="state-dot"></i>{{ stateConfig.label }}
        </span>
      </div>

      <div class="row-task">
        <span class="task-label">任务</span>
        <span class="task-value" :class="{ empty: taskIsEmpty }" :title="taskText">
          {{ taskText }}
        </span>
        <span v-if="energyPercent !== null" class="battery" :style="{ color: energyColor }">
          <i class="battery-shell">
            <i class="battery-level" :style="{ width: energyPercent + '%', background: energyColor }"></i>
          </i>
          {{ energyPercent }}%
        </span>
      </div>

      <div class="row-position">
        <span class="position-value" :title="pointName">
          <el-icon><Location /></el-icon>{{ pointName }}
        </span>
        <span v-if="robot.velocity != null" class="velocity">
          {{ robot.velocity.toFixed(1) }} m/s
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.robot-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: #fff;
}

.robot-card:hover {
  border-color: #91bfff;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.1);
}

.robot-card.active {
  border-color: #69a6ff;
  background: #f5f9ff;
  box-shadow: 0 0 0 1px rgba(22, 119, 255, 0.12);
}

.robot-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #8da0b8;
  border-radius: 5px;
  color: #71849c;
  font-size: 19px;
}

.robot-card.active .robot-icon {
  border-color: #1677ff;
  color: #1677ff;
  background: #fff;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.robot-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-text {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--state-color);
  font-weight: 500;
}

.state-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.row-task {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  min-width: 0;
}

.task-label {
  color: #6d7fff;
  padding: 1px 4px;
  border-radius: 3px;
  background: #f0f3ff;
  flex-shrink: 0;
}

.task-value {
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.battery {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.battery-shell {
  position: relative;
  width: 15px;
  height: 7px;
  padding: 1px;
  border: 1px solid currentColor;
  border-radius: 1px;
}

.battery-shell::after {
  content: '';
  position: absolute;
  right: -3px;
  top: 2px;
  width: 2px;
  height: 3px;
  border-radius: 0 1px 1px 0;
  background: currentColor;
}

.battery-level {
  display: block;
  height: 100%;
}

.row-position {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  font-size: 10px;
  color: #94a3b8;
}

.position-value {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.position-value .el-icon {
  color: #f56c6c;
}

.velocity {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
</style>
