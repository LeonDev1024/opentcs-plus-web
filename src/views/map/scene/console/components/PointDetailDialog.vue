<template>
  <el-dialog
    v-model="dialogVisible"
    title="点属性详情"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="point" class="point-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="名称" :span="2">
          {{ point.name }}
        </el-descriptions-item>
        <el-descriptions-item label="编码">
          {{ point.code || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ point.type || 'Halt point' }}
        </el-descriptions-item>
        <el-descriptions-item label="X坐标">
          {{ point.x.toFixed(1) }} mm
        </el-descriptions-item>
        <el-descriptions-item label="Y坐标">
          {{ point.y.toFixed(1) }} mm
        </el-descriptions-item>
        <el-descriptions-item label="Z坐标">
          {{ point.z !== undefined ? point.z.toFixed(1) + ' mm' : 'NaN mm' }}
        </el-descriptions-item>
        <el-descriptions-item label="角度">
          NaN deg
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ point.status || '0' }}
        </el-descriptions-item>
        <el-descriptions-item label="半径">
          {{ point.editorProps.radius }} px
        </el-descriptions-item>
        <el-descriptions-item label="颜色">
          <span class="color-display" :style="{ backgroundColor: point.editorProps.color }"></span>
          {{ point.editorProps.color }}
        </el-descriptions-item>
        <el-descriptions-item label="描边颜色" v-if="point.editorProps.strokeColor">
          <span class="color-display" :style="{ backgroundColor: point.editorProps.strokeColor }"></span>
          {{ point.editorProps.strokeColor }}
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2" v-if="point.description">
          {{ point.description }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MapPoint } from '@/types/mapEditor';

const props = defineProps<{
  modelValue: boolean;
  point: MapPoint | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const handleClose = () => {
  emit('update:modelValue', false);
};
</script>

<style scoped lang="scss">
.point-detail {
  :deep(.el-descriptions__label) {
    font-weight: 500;
    width: 120px;
  }
  
  .color-display {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    vertical-align: middle;
    margin-right: 8px;
  }
}
</style>

