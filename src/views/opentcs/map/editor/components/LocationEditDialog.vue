<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑位置属性"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      v-if="location"
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="right"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入名称" />
      </el-form-item>
      
      <el-form-item label="编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入编码" />
      </el-form-item>
      
      <el-form-item label="位置类型" prop="locationTypeId">
        <el-input v-model="formData.locationTypeId" placeholder="请输入位置类型" />
      </el-form-item>
      
      <el-form-item label="X坐标" prop="x">
        <el-input-number 
          v-model="formData.x" 
          :precision="1"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>
      
      <el-form-item label="Y坐标" prop="y">
        <el-input-number 
          v-model="formData.y" 
          :precision="1"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>
      
      <el-form-item label="Z坐标" prop="z">
        <el-input-number 
          v-model="formData.z" 
          :precision="1"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>
      
      <el-form-item label="区块ID" prop="blockId">
        <el-input v-model="formData.blockId" placeholder="请输入区块ID" />
      </el-form-item>
      
      <el-form-item label="状态" prop="status">
        <el-input v-model="formData.status" placeholder="请输入状态" />
      </el-form-item>
      
      <el-form-item label="填充颜色" prop="fillColor">
        <el-color-picker v-model="formData.fillColor" />
      </el-form-item>
      
      <el-form-item label="填充透明度" prop="fillOpacity">
        <el-input-number 
          v-model="formData.fillOpacity" 
          :min="0"
          :max="1"
          :step="0.1"
          style="width: 100%"
        />
      </el-form-item>
      
      <el-form-item label="描边颜色" prop="strokeColor">
        <el-color-picker v-model="formData.strokeColor" />
      </el-form-item>
      
      <el-form-item label="描边宽度" prop="strokeWidth">
        <el-input-number 
          v-model="formData.strokeWidth" 
          :min="1"
          :max="10"
          style="width: 100%"
        />
      </el-form-item>
      
      <el-form-item label="标签" prop="label">
        <el-input v-model="formData.label" placeholder="请输入标签" />
      </el-form-item>
      
      <el-form-item label="标签可见" prop="labelVisible">
        <el-switch v-model="formData.labelVisible" />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input 
          v-model="formData.description" 
          type="textarea" 
          :rows="3"
          placeholder="请输入描述"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapLocation } from '@/types/mapEditor';

const mapEditorStore = useMapEditorStore();

// Props
const props = defineProps<{
  visible: boolean;
  locationId: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'save', location: MapLocation): void;
}>();

// Refs
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const formRef = ref<FormInstance>();
const saving = ref(false);

// 表单数据
const formData = ref({
  name: '',
  code: '',
  locationTypeId: '',
  x: 0,
  y: 0,
  z: 0,
  blockId: '',
  status: '',
  fillColor: '#1890ff',
  fillOpacity: 0.3,
  strokeColor: '#40a9ff',
  strokeWidth: 2,
  label: '',
  labelVisible: true,
  description: ''
});

// 表单规则
const rules = ref<FormRules>({
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请输入状态', trigger: 'blur' }
  ]
});

// 获取位置数据
const location = computed(() => {
  return mapEditorStore.getLocation(props.locationId);
});

// 监听位置数据变化，更新表单
watch(location, (newLocation) => {
  if (newLocation) {
    formData.value = {
      name: newLocation.name || '',
      code: newLocation.code || '',
      locationTypeId: newLocation.locationTypeId || '',
      x: newLocation.x || 0,
      y: newLocation.y || 0,
      z: newLocation.z || 0,
      blockId: newLocation.blockId || '',
      status: newLocation.status || '',
      fillColor: newLocation.editorProps.fillColor || '#1890ff',
      fillOpacity: newLocation.editorProps.fillOpacity || 0.3,
      strokeColor: newLocation.editorProps.strokeColor || '#40a9ff',
      strokeWidth: newLocation.editorProps.strokeWidth || 2,
      label: newLocation.editorProps.label || '',
      labelVisible: newLocation.editorProps.labelVisible !== false,
      description: newLocation.description || ''
    };
  }
}, { immediate: true });

// 处理关闭
const handleClose = () => {
  emit('update:visible', false);
};

// 处理保存
const handleSave = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    
    saving.value = true;
    
    const updates: Partial<MapLocation> = {
      name: formData.value.name,
      code: formData.value.code,
      locationTypeId: formData.value.locationTypeId,
      x: formData.value.x,
      y: formData.value.y,
      z: formData.value.z,
      blockId: formData.value.blockId,
      status: formData.value.status,
      description: formData.value.description,
      editorProps: {
        fillColor: formData.value.fillColor,
        fillOpacity: formData.value.fillOpacity,
        strokeColor: formData.value.strokeColor,
        strokeWidth: formData.value.strokeWidth,
        label: formData.value.label,
        labelVisible: formData.value.labelVisible
      }
    };
    
    mapEditorStore.updateLocation(props.locationId, updates);
    
    ElMessage.success('保存成功');
    emit('save', mapEditorStore.getLocation(props.locationId)!);
    emit('update:visible', false);
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
/* 可以添加一些自定义样式 */
</style>