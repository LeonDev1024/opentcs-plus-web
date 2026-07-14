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
    WORKING:     { label: '运行',   color: '#409EFF' },
    CHARGING:    { label: '充电',   color: '#E6A23C' },
    ERROR:       { label: '异常',   color: '#F56C6C' },
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

/** 底部行：充电时是 ETA，其他状态是速度；都没有就隐藏 */
const bottomLine = computed<{ label: string; value: string } | null>(() => {
  if (isCharging.value && props.robot.estimatedFinishMinutes != null) {
    return {
      label: '预计完成',
      value: `${Math.max(0, Math.round(props.robot.estimatedFinishMinutes))}min`
    };
  }
  if (props.robot.velocity != null && Number.isFinite(props.robot.velocity)) {
    return {
      label: '速度',
      value: `${props.robot.velocity.toFixed(1)} m/s`
    };
  }
  return null;
});
</script>

<template>
  <div
    class="robot-card"
    :class="{ active }"
    :style="{ '--state-color': stateConfig.color }"
    @click="emit('click')"
  >
    <div class="card-indicator"></div>
    <div class="card-body">
      <!-- 第 1 行：名称 + 状态药丸 -->
      <div class="row-name">
        <span class="robot-name" :title="robot.name">{{ robot.name }}</span>
        <span class="state-pill">{{ stateConfig.label }}</span>
      </div>

      <!-- 第 2 行：任务 -->
      <div class="row-task">
        <span class="task-label">任务</span>
        <span class="task-value" :class="{ empty: taskIsEmpty }" :title="taskText">
          {{ taskText }}
        </span>
      </div>

      <!-- 第 3 行：电量 -->
      <div v-if="energyPercent !== null" class="row-energy">
        <span class="energy-label">电量</span>
        <div class="energy-bar">
          <div
            class="energy-fill"
            :style="{ width: energyPercent + '%', background: energyColor }"
          ></div>
        </div>
        <span class="energy-text" :style="{ color: energyColor }">
          {{ energyPercent }}%
        </span>
      </div>

      <!-- 第 4 行：速度 / 预计完成 -->
      <div v-if="bottomLine" class="row-bottom">
        <span class="bottom-label">{{ bottomLine.label }}</span>
        <span class="bottom-value">{{ bottomLine.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.robot-card {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--el-fill-color-lighter);
}

.robot-card:hover {
  border-color: var(--state-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.robot-card.active {
  border-color: var(--state-color);
  background: var(--el-fill-color-light);
  box-shadow: 0 0 0 2px var(--state-color);
}

.card-indicator {
  width: 4px;
  background: var(--state-color);
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  padding: 10px 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* —— 行 1：名称 + 状态 —— */
.row-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.robot-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--state-color);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.state-pill {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 10px;
  color: var(--state-color);
  background: color-mix(in srgb, var(--state-color) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--state-color) 35%, transparent);
  font-weight: 500;
}

/* —— 行 2：任务 —— */
.row-task {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  min-width: 0;
}

.task-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.task-value {
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.task-value.empty {
  color: var(--el-text-color-placeholder);
}

/* —— 行 3：电量 —— */
.row-energy {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.energy-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.energy-bar {
  flex: 1;
  height: 6px;
  background: var(--el-fill-color);
  border-radius: 3px;
  overflow: hidden;
  min-width: 0;
}

.energy-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background 0.3s ease;
}

.energy-text {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  width: 36px;
  text-align: right;
}

/* —— 行 4：底部信息 —— */
.row-bottom {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.bottom-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.bottom-value {
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
</style>
