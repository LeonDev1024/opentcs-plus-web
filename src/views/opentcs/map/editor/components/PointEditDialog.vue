<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑点属性"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      v-if="point"
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
      
      <el-form-item label="类型" prop="type">
        <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
          <el-option label="临时停车 (Halt point)" value="Halt point" />
          <el-option label="长时间停车 (Park point)" value="Park point" />
        </el-select>
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
      
      <el-form-item label="状态" prop="status">
        <el-input v-model="formData.status" placeholder="请输入状态" />
      </el-form-item>
      
      <el-form-item label="半径" prop="radius">
        <el-input-number 
          v-model="formData.radius" 
          :min="1"
          :max="100"
          style="width: 100%"
        />
      </el-form-item>
      
      <el-form-item label="颜色" prop="color">
        <el-color-picker v-model="formData.color" />
      </el-form-item>
      
      <el-form-item label="描边颜色" prop="strokeColor">
        <el-color-picker v-model="formData.strokeColor" />
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
import type { MapPoint } from '@/types/mapEditor';

const props = defineProps<{
  modelValue: boolean;
  point: MapPoint | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'updated': [];
}>();

const mapEditorStore = useMapEditorStore();
const formRef = ref<FormInstance>();
const saving = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const formData = ref({
  name: '',
  code: '',
  type: 'Halt point',
  x: 0,
  y: 0,
  z: undefined as number | undefined,
  status: '0',
  radius: 10,
  color: '#1890ff',
  strokeColor: undefined as string | undefined,
  description: ''
});

const rules: FormRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' }
  ],
  x: [
    { required: true, message: '请输入X坐标', trigger: 'blur' }
  ],
  y: [
    { required: true, message: '请输入Y坐标', trigger: 'blur' }
  ]
};

// 监听 point 变化，更新表单数据
watch(() => props.point, (point) => {
  if (point) {
    formData.value = {
      name: point.name || '',
      code: point.code || '',
      type: point.type || 'Halt point',
      x: point.x,
      y: point.y,
      z: point.z,
      status: point.status || '0',
      radius: point.editorProps.radius || 10,
      color: point.editorProps.color || '#1890ff',
      strokeColor: point.editorProps.strokeColor,
      description: point.description || ''
    };
  }
}, { immediate: true });

const handleClose = () => {
  formRef.value?.resetFields();
  emit('update:modelValue', false);
};

const handleSave = async () => {
  if (!props.point) return;
  
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    saving.value = true;
    
    // 更新点数据
    mapEditorStore.updatePoint(props.point.id, {
      name: formData.value.name,
      code: formData.value.code || undefined,
      type: formData.value.type,
      x: formData.value.x,
      y: formData.value.y,
      z: formData.value.z,
      status: formData.value.status,
      description: formData.value.description || undefined,
      editorProps: {
        ...props.point.editorProps,
        radius: formData.value.radius,
        color: formData.value.color,
        strokeColor: formData.value.strokeColor || undefined
      }
    });
    
    ElMessage.success('保存成功');
    emit('updated');
    handleClose();
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped lang="scss">
:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>

