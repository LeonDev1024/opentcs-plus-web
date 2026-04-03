<template>
  <el-dialog
    :model-value="dialogVisible"
    title="导入栅格底图"
    width="560px"
    :close-on-click-modal="false"
    class="import-base-layer-dialog"
    @close="handleClose"
    @update:model-value="(val: boolean) => emit('update:modelValue', val)"
  >
    <div class="dialog-content">
      <!-- 说明区域 -->
      <div class="intro-section">
        <el-icon class="intro-icon"><InfoFilled /></el-icon>
        <div class="intro-text">
          <p>请上传 <strong>map.yaml</strong> 和 <strong>map.pgm</strong> 两个文件</p>
          <p class="intro-hint">系统将自动解析地图参数并对齐到坐标原点</p>
        </div>
      </div>

      <!-- 上传区域 -->
      <div class="upload-section">
        <div class="upload-item" :class="{ 'has-file': yamlFile }">
          <el-upload
            ref="yamlUploadRef"
            class="upload-component"
            :auto-upload="false"
            :limit="1"
            accept=".yaml,.yml"
            :file-list="yamlFileList"
            :on-change="handleYamlChange"
            :on-exceed="handleYamlExceed"
            :show-file-list="false"
            drag
          >
            <div class="upload-content">
              <div class="upload-icon-wrapper">
                <el-icon v-if="!yamlFile" class="upload-icon"><FolderAdd /></el-icon>
                <el-icon v-else class="upload-icon success"><CircleCheck /></el-icon>
              </div>
              <div class="upload-info">
                <span class="upload-title">{{ yamlFile ? yamlFile.name : '点击或拖拽 YAML 文件' }}</span>
                <span class="upload-hint">{{ yamlFile ? '已选择' : '支持 .yaml, .yml 格式' }}</span>
              </div>
            </div>
          </el-upload>
        </div>

        <div class="upload-divider">
          <span>然后</span>
        </div>

        <div class="upload-item" :class="{ 'has-file': pgmFile }">
          <el-upload
            ref="pgmUploadRef"
            class="upload-component"
            :auto-upload="false"
            :limit="1"
            accept=".pgm"
            :file-list="pgmFileList"
            :on-change="handlePgmChange"
            :on-exceed="handlePgmExceed"
            :show-file-list="false"
            drag
          >
            <div class="upload-content">
              <div class="upload-icon-wrapper">
                <el-icon v-if="!pgmFile" class="upload-icon"><Picture /></el-icon>
                <el-icon v-else class="upload-icon success"><CircleCheck /></el-icon>
              </div>
              <div class="upload-info">
                <span class="upload-title">{{ pgmFile ? pgmFile.name : '点击或拖拽 PGM 文件' }}</span>
                <span class="upload-hint">{{ pgmFile ? '已选择' : '支持 .pgm 格式' }}</span>
              </div>
            </div>
          </el-upload>
        </div>
      </div>

      <!-- 解析后的参数展示 -->
      <div v-if="parsedYamlInfo" class="params-section">
        <div class="params-header">
          <el-icon><DocumentChecked /></el-icon>
          <span>已解析的地图参数</span>
        </div>
        <div class="params-grid">
          <div class="param-item">
            <span class="param-label">分辨率</span>
            <span class="param-value highlight">{{ parsedYamlInfo.resolution }}</span>
            <span class="param-unit">米/像素</span>
          </div>
          <div class="param-item">
            <span class="param-label">Origin</span>
            <span class="param-value">[{{ parsedYamlInfo.origin?.join(', ') }}]</span>
          </div>
          <div class="param-item">
            <span class="param-label">图片尺寸</span>
            <span class="param-value">{{ parsedYamlInfo.width }} × {{ parsedYamlInfo.height }}</span>
            <span class="param-unit">像素</span>
          </div>
        </div>
      </div>

      <!-- 校验提示 -->
      <div v-if="yamlFile && pgmFile && parsedYamlInfo" class="validation-section">
        <el-icon class="validation-icon success"><CircleCheck /></el-icon>
        <span>文件匹配成功，可以导入</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="importing"
          :disabled="!canImport"
          @click="handleImport"
        >
          开始导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, type UploadInstance } from 'element-plus';
import { Upload, FolderAdd, Picture, CircleCheck, InfoFilled, DocumentChecked } from '@element-plus/icons-vue';

interface ParsedYamlInfo {
  resolution: number;
  origin: number[];
  width: number;
  height: number;
  imageName: string;
}

const props = defineProps<{
  modelValue?: boolean;
}>();

const emit = defineEmits<{
  (e: 'import', data: { yamlFile: File; pgmFile: File; yamlInfo: ParsedYamlInfo }): void;
  (e: 'update:modelValue', value: boolean): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue ?? false,
  set: (val) => emit('update:modelValue', val)
});

const yamlUploadRef = ref<UploadInstance>();
const pgmUploadRef = ref<UploadInstance>();

const yamlFileList = ref<any[]>([]);
const pgmFileList = ref<any[]>([]);

const yamlFile = ref<File | null>(null);
const pgmFile = ref<File | null>(null);
const parsedYamlInfo = ref<ParsedYamlInfo | null>(null);

const importing = ref(false);

const canImport = computed(() => {
  return yamlFile.value && pgmFile.value && parsedYamlInfo.value;
});

const open = () => {
  emit('update:modelValue', true);
  resetForm();
};

const resetForm = () => {
  yamlFileList.value = [];
  pgmFileList.value = [];
  yamlFile.value = null;
  pgmFile.value = null;
  parsedYamlInfo.value = null;
};

const handleClose = () => {
  emit('update:modelValue', false);
  resetForm();
};

const parseYamlFile = async (file: File): Promise<ParsedYamlInfo | null> => {
  try {
    const text = await file.text();
    const info: any = {};

    const resolutionMatch = text.match(/resolution:\s*([\d.]+)/);
    if (resolutionMatch) {
      info.resolution = parseFloat(resolutionMatch[1]);
    }

    const originMatch = text.match(/origin:\s*\[([\d.,\s-]+)\]/);
    if (originMatch) {
      info.origin = originMatch[1].split(',').map((s: string) => parseFloat(s.trim()));
    }

    const imageMatch = text.match(/image:\s*(.+)/);
    if (imageMatch) {
      info.imageName = imageMatch[1].trim();
    }

    const { width, height } = await getPgmDimensions(pgmFile.value!);
    info.width = width;
    info.height = height;

    if (!info.resolution || !info.origin || !info.imageName) {
      ElMessage.error('YAML 文件格式不正确');
      return null;
    }

    return info;
  } catch (error) {
    console.error('解析 YAML 失败:', error);
    ElMessage.error('解析 YAML 文件失败');
    return null;
  }
};

const getPgmDimensions = async (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new Uint8Array(e.target?.result as ArrayBuffer);
      let offset = 0;
      const readLine = (): string => {
        let line = '';
        while (offset < view.length && view[offset] !== 0x0a) {
          line += String.fromCharCode(view[offset]);
          offset++;
        }
        if (offset < view.length) offset++;
        return line.trim();
      };
      readLine();
      let line = readLine();
      while (line.startsWith('#')) line = readLine();
      const [wStr, hStr] = line.split(/\s+/);
      resolve({ width: parseInt(wStr, 10), height: parseInt(hStr, 10) });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const handleYamlChange = async (file: any) => {
  yamlFile.value = file.raw;
  yamlFileList.value = [file];
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'yaml' && ext !== 'yml') {
    ElMessage.error('请上传 YAML 文件');
    return;
  }
  if (pgmFile.value) {
    const info = await parseYamlFile(file.raw);
    if (info) {
      parsedYamlInfo.value = info;
    }
  }
};

const handlePgmChange = async (file: any) => {
  pgmFile.value = file.raw;
  pgmFileList.value = [file];
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'pgm') {
    ElMessage.error('请上传 PGM 文件');
    return;
  }
  if (yamlFile.value) {
    const info = await parseYamlFile(yamlFile.value);
    if (info) {
      parsedYamlInfo.value = info;
    }
  }
};

const handleYamlExceed = () => ElMessage.warning('只能上传一个 YAML 文件');
const handlePgmExceed = () => ElMessage.warning('只能上传一个 PGM 文件');

const validateFiles = (): boolean => {
  if (!yamlFile.value || !pgmFile.value || !parsedYamlInfo.value) {
    ElMessage.error('请完成文件选择');
    return false;
  }
  // 只校验文件名和后缀
  const pgmName = pgmFile.value.name.toLowerCase();
  if (!pgmName.endsWith('.pgm')) {
    ElMessage.error('PGM 文件后缀不正确');
    return false;
  }
  // 提取 yaml 中 image 的文件名（截取最后一个 / 后的部分）
  const fullPath = parsedYamlInfo.value.imageName;
  const yamlFileName = fullPath.substring(fullPath.lastIndexOf('/') + 1).toLowerCase();
  const pgmBaseName = pgmName.replace(/\.pgm$/, '');
  const yamlBaseName = yamlFileName.replace(/\.pgm$/, '');
  if (pgmBaseName !== yamlBaseName) {
    ElMessage.error(`文件不匹配：PGM 文件名与 YAML 中 image 不一致`);
    return false;
  }
  return true;
};

const handleImport = async () => {
  if (!validateFiles()) return;
  importing.value = true;
  try {
    emit('import', {
      yamlFile: yamlFile.value!,
      pgmFile: pgmFile.value!,
      yamlInfo: parsedYamlInfo.value!,
    });
    handleClose();
  } finally {
    importing.value = false;
  }
};

defineExpose({ open });
</script>

<style scoped>
.import-base-layer-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 说明区域 */
.intro-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-radius: 8px;
  border: 1px solid #91d5ff;
}

.intro-icon {
  font-size: 20px;
  color: #1890ff;
  flex-shrink: 0;
  margin-top: 2px;
}

.intro-text p {
  margin: 0;
  color: #262626;
  line-height: 1.6;
}

.intro-text strong {
  color: #1890ff;
}

.intro-hint {
  font-size: 13px;
  color: #8c8c8c;
}

/* 上传区域 */
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-item {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.upload-item :deep(.el-upload-dragger) {
  padding: 20px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.upload-item:hover :deep(.el-upload-dragger) {
  border-color: #1890ff;
  background: #f0f9ff;
}

.upload-item.has-file :deep(.el-upload-dracker) {
  border-color: #52c41a;
  background: #f6ffed;
}

.upload-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.upload-icon {
  font-size: 24px;
  color: #8c8c8c;
}

.upload-icon.success {
  color: #52c41a;
}

.upload-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upload-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.upload-hint {
  font-size: 12px;
  color: #8c8c8c;
}

.upload-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #bfbfbf;
  font-size: 12px;
}

.upload-divider::before,
.upload-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}

/* 参数区域 */
.params-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.params-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #262626;
  font-weight: 500;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label {
  font-size: 12px;
  color: #8c8c8c;
}

.param-value {
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.param-value.highlight {
  color: #1890ff;
}

.param-unit {
  font-size: 12px;
  color: #8c8c8c;
}

/* 校验提示 */
.validation-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f6ffed;
  border-radius: 8px;
  border: 1px solid #b7eb8f;
  color: #52c41a;
  font-size: 14px;
}

.validation-icon {
  font-size: 16px;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>