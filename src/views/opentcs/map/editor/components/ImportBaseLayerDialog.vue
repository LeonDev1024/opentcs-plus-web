<template>
  <el-dialog
    v-model="dialogVisible"
    title="导入栅格底图"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-tip">
      <p>请同时选择 <strong>map.yaml</strong> 和 <strong>map.pgm</strong> 两个文件</p>
    </div>

    <el-form label-width="100px" label-position="right">
      <el-form-item label="YAML 文件" required>
        <el-upload
          ref="yamlUploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".yaml,.yml"
          :file-list="yamlFileList"
          :on-change="handleYamlChange"
          :on-exceed="handleYamlExceed"
          drag
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">拖拽或点击上传 YAML 文件</div>
        </el-upload>
      </el-form-item>

      <el-form-item label="PGM 文件" required>
        <el-upload
          ref="pgmUploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".pgm"
          :file-list="pgmFileList"
          :on-change="handlePgmChange"
          :on-exceed="handlePgmExceed"
          drag
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">拖拽或点击上传 PGM 文件</div>
        </el-upload>
      </el-form-item>

      <!-- 解析后的参数展示 -->
      <template v-if="parsedYamlInfo">
        <el-divider content-position="left">YAML 参数</el-divider>
        <el-form-item label="分辨率">
          <span>{{ parsedYamlInfo.resolution }} 米/像素</span>
        </el-form-item>
        <el-form-item label="Origin">
          <span>[{{ parsedYamlInfo.origin?.join(', ') }}]</span>
        </el-form-item>
        <el-form-item label="图片尺寸">
          <span>{{ parsedYamlInfo.width }} × {{ parsedYamlInfo.height }} 像素</span>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="importing" :disabled="!canImport" @click="handleImport">
        导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox, type UploadInstance, type UploadRawFile } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';

interface ParsedYamlInfo {
  resolution: number;
  origin: number[];
  width: number;
  height: number;
  imageName: string;
}

const emit = defineEmits<{
  (e: 'import', data: { yamlFile: File; pgmFile: File; yamlInfo: ParsedYamlInfo }): void;
}>();

const dialogVisible = ref(false);
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
  dialogVisible.value = true;
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
  dialogVisible.value = false;
  resetForm();
};

// 解析 YAML 文件
const parseYamlFile = async (file: File): Promise<ParsedYamlInfo | null> => {
  try {
    const text = await file.text();
    const info: any = {};

    // 解析 resolution
    const resolutionMatch = text.match(/resolution:\s*([\d.]+)/);
    if (resolutionMatch) {
      info.resolution = parseFloat(resolutionMatch[1]);
    }

    // 解析 origin
    const originMatch = text.match(/origin:\s*\[([\d.,\s-]+)\]/);
    if (originMatch) {
      info.origin = originMatch[1].split(',').map((s: string) => parseFloat(s.trim()));
    }

    // 解析 image
    const imageMatch = text.match(/image:\s*(.+)/);
    if (imageMatch) {
      info.imageName = imageMatch[1].trim();
    }

    // 解析 pgm 尺寸
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

// 获取 PGM 尺寸
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

      readLine(); // P5
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

  // 校验文件扩展名
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'yaml' && ext !== 'yml') {
    ElMessage.error('请上传 YAML 文件');
    return;
  }

  // 如果pgm文件也已选择，解析yaml获取参数
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

  // 校验文件扩展名
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'pgm') {
    ElMessage.error('请上传 PGM 文件');
    return;
  }

  // 如果yaml文件也已选择，解析yaml获取参数
  if (yamlFile.value) {
    const info = await parseYamlFile(yamlFile.value);
    if (info) {
      parsedYamlInfo.value = info;
    }
  }
};

const handleYamlExceed = () => {
  ElMessage.warning('只能上传一个 YAML 文件');
};

const handlePgmExceed = () => {
  ElMessage.warning('只能上传一个 PGM 文件');
};

// 校验文件匹配
const validateFiles = (): boolean => {
  if (!yamlFile.value || !pgmFile.value || !parsedYamlInfo.value) {
    ElMessage.error('请完成文件选择');
    return false;
  }

  const pgmName = pgmFile.value.name;
  const yamlImageName = parsedYamlInfo.value.imageName;

  if (pgmName !== yamlImageName) {
    ElMessage.error(`文件不匹配：YAML 中 image 字段为 "${yamlImageName}"，请选择对应的 PGM 文件`);
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
.import-tip {
  margin-bottom: 20px;
  padding: 12px;
  background: #fdf6ec;
  border-radius: 4px;
  color: #e6a23c;
}

.el-icon--upload {
  font-size: 67px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.el-upload__text {
  color: #606266;
  font-size: 14px;
}
</style>