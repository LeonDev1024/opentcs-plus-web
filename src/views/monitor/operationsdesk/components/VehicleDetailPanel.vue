<script setup lang="ts">
import { computed } from 'vue';
import { Close } from '@element-plus/icons-vue';
import type { VehicleRuntimeVO } from '@/api/ops/monitor';

const props = defineProps<{
  vehicle: VehicleRuntimeVO;
  lastUpdated?: number | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const rawVehicle = computed<Record<string, any>>(
  () => props.vehicle as unknown as Record<string, any>
);

const stateConfig = computed(() => {
  const states: Record<string, { label: string; color: string }> = {
    IDLE: { label: '空闲', color: '#67c23a' },
    WORKING: { label: '执行中', color: '#1677ff' },
    EXECUTING: { label: '执行中', color: '#1677ff' },
    WAITING: { label: '等待中', color: '#e6a23c' },
    PAUSED: { label: '已暂停', color: '#e6a23c' },
    CHARGING: { label: '充电中', color: '#e6a23c' },
    ERROR: { label: '异常', color: '#f56c6c' },
    OFFLINE: { label: '离线', color: '#909399' },
    UNKNOWN: { label: '离线', color: '#909399' },
    UNAVAILABLE: { label: '不可用', color: '#909399' }
  };
  return states[props.vehicle.state] || states.UNKNOWN;
});

function firstValue(...values: unknown[]): string {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== ''
  );
  return value === undefined ? '-' : String(value);
}

const energyText = computed(() => {
  const raw = Number(props.vehicle.energyLevel);
  if (!Number.isFinite(raw)) return '-';
  const percent = raw <= 1 ? raw * 100 : raw;
  return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
});

const velocityText = computed(() => {
  const velocity = Number(props.vehicle.velocity);
  return Number.isFinite(velocity) ? `${velocity.toFixed(1)} m/s` : '-';
});

const coordinateText = computed(() => {
  const x = Number(props.vehicle.position?.x);
  const y = Number(props.vehicle.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return '-, -';
  return `${x.toFixed(2)}, ${y.toFixed(2)}`;
});

const orientationText = computed(() => {
  const angle = Number(props.vehicle.position?.orientation);
  return Number.isFinite(angle) ? `${angle.toFixed(0)}°` : '-';
});

const isLoaded = computed(() =>
  Boolean(
    rawVehicle.value.isLoaded ??
      rawVehicle.value.loaded ??
      rawVehicle.value.hasPayload
  )
);

const bodyStatus = computed(() => {
  const explicit = firstValue(
    rawVehicle.value.bodyStatusLabel,
    rawVehicle.value.bodyStatus
  );
  if (explicit !== '-') return explicit;
  return props.vehicle.position?.mapId ? '地图匹配' : '地图未匹配';
});

const reportTime = computed(() => {
  const raw = firstValue(
    rawVehicle.value.reportTime,
    rawVehicle.value.updateTime,
    rawVehicle.value.updatedAt
  );
  if (raw !== '-') return raw;
  if (!props.lastUpdated) return '-';
  return new Date(props.lastUpdated).toLocaleTimeString('zh-CN', {
    hour12: false
  });
});

const detailRows = computed(() => [
  {
    label: 'AMR / 厂商',
    value: firstValue(
      rawVehicle.value.manufacturer,
      rawVehicle.value.vendorName,
      rawVehicle.value.brandName,
      props.vehicle.typeId
    )
  },
  { label: 'AMR编号', value: props.vehicle.vehicleId },
  { label: '电量', value: energyText.value },
  { label: '实时速度', value: velocityText.value },
  {
    label: '工作模式',
    value: firstValue(rawVehicle.value.workModeLabel, rawVehicle.value.workMode, '自动')
  },
  {
    label: 'AMR状态',
    value: stateConfig.value.label,
    color: stateConfig.value.color,
    dot: true
  },
  { label: '所在地图', value: firstValue(props.vehicle.position?.mapId) },
  { label: '所在站点', value: firstValue(props.vehicle.position?.pointId) },
  { label: '当前坐标', value: coordinateText.value },
  { label: '当前角度', value: orientationText.value },
  {
    label: '是否载货',
    value: isLoaded.value ? '已载货' : '空载',
    color: isLoaded.value ? '#e6a23c' : '#64748b',
    dot: true
  },
  {
    label: 'AMR本体状态',
    value: bodyStatus.value,
    color: bodyStatus.value === '地图匹配' ? '#22a559' : '#e6a23c',
    dot: true
  },
  {
    label: '任务',
    value: firstValue(
      props.vehicle.taskDescription,
      rawVehicle.value.taskName,
      rawVehicle.value.orderName,
      props.vehicle.currentOrderId
    )
  },
  {
    label: '错误信息',
    value: firstValue(rawVehicle.value.errorMessage, rawVehicle.value.errorInfo),
    color: rawVehicle.value.errorMessage || rawVehicle.value.errorInfo ? '#f56c6c' : undefined
  },
  { label: '上报时间', value: reportTime.value, muted: true }
]);
</script>

<template>
  <section class="vehicle-detail-panel" :style="{ '--state-color': stateConfig.color }">
    <header class="detail-header">
      <div class="detail-title">
        <strong>{{ vehicle.name || vehicle.vehicleId }}</strong>
        <span class="header-status">
          <i></i>{{ stateConfig.label }}
        </span>
      </div>
      <button class="close-btn" title="关闭详情" @click="$emit('close')">
        <el-icon><Close /></el-icon>
      </button>
    </header>

    <div class="detail-body">
      <div v-for="row in detailRows" :key="row.label" class="detail-row">
        <span class="detail-label">{{ row.label }}</span>
        <span
          class="detail-value"
          :class="{ muted: row.muted }"
          :style="{ color: row.color }"
          :title="row.value"
        >
          <i v-if="row.dot" class="value-dot"></i>{{ row.value }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.vehicle-detail-panel {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 30;
  width: 390px;
  max-width: calc(100% - 28px);
  max-height: calc(100% - 28px);
  overflow: auto;
  padding: 0 14px 14px;
  border: 1px solid #dfe6ef;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
  color: #1f2937;
}

.detail-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.98);
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.detail-title strong {
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-status,
.detail-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.header-status {
  flex-shrink: 0;
  color: var(--state-color);
  font-size: 12px;
  font-weight: 500;
}

.header-status i,
.value-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.detail-body {
  padding-top: 9px;
}

.detail-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  min-height: 25px;
  align-items: center;
  font-size: 12px;
}

.detail-label {
  color: #718096;
}

.detail-value {
  min-width: 0;
  overflow: hidden;
  color: #1f2937;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-value.muted {
  color: #94a3b8;
  font-weight: 400;
}
</style>
