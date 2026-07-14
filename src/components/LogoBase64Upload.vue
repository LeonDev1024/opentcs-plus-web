<template>
  <div class="logo-base64-upload">
    <MasterDataLogo
      v-if="modelValue"
      :src="modelValue"
      :name="name"
      :seed="seed"
      :size="previewSize"
      :width="previewWidth"
      fit="contain"
      :show-fallback="false"
    />
    <div class="actions">
      <el-upload :show-file-list="false" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" :before-upload="handleBeforeUpload">
        <el-button type="primary" plain :loading="uploading">{{ modelValue ? '更换图片' : '上传缩略图' }}</el-button>
      </el-upload>
      <el-button v-if="modelValue" link type="danger" @click="clear">清除</el-button>
    </div>
    <p class="hint">支持 PNG/JPG/WebP，上传后自动压缩（256px 内，约 200KB 以内）</p>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import MasterDataLogo from '@/components/MasterDataLogo.vue';
import { fileToLogoBase64 } from '@/utils/logoBase64';

withDefaults(
  defineProps<{
    modelValue?: string;
    name?: string;
    seed?: string;
    previewSize?: number;
    previewWidth?: number;
  }>(),
  {
    modelValue: '',
    name: '',
    seed: '',
    previewSize: 56,
    previewWidth: 140
  }
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const uploading = ref(false);

const handleBeforeUpload = async (file: File) => {
  uploading.value = true;
  try {
    emit('update:modelValue', await fileToLogoBase64(file));
  } catch (error: any) {
    ElMessage.error(error?.message ?? '上传失败');
  } finally {
    uploading.value = false;
  }
  return false;
};

const clear = () => emit('update:modelValue', '');
</script>

<style scoped lang="scss">
.logo-base64-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
