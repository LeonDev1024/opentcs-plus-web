<template>
  <div class="panel-container">
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column label="路径编码" align="center" prop="pathId" min-width="140" show-overflow-tooltip />
        <el-table-column label="路径名称" align="center" prop="name" min-width="140" show-overflow-tooltip />
        <el-table-column label="起点" align="center" prop="sourcePointId" min-width="120" show-overflow-tooltip />
        <el-table-column label="终点" align="center" prop="destPointId" min-width="120" show-overflow-tooltip />
        <el-table-column label="长度(mm)" align="center" prop="length" width="110" />
        <el-table-column label="最大速度" align="center" prop="maxVelocity" width="100" />
        <el-table-column label="地图ID" align="center" prop="navigationMapId" width="100" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      </el-table>

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :page-sizes="[10, 20, 30, 50]"
        :total="total"
        @pagination="loadData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { listPath } from '@/api/deploy/map-editor/path-query';

const props = defineProps<{
  sceneId?: number;
  sceneName?: string;
  keyword?: string;
  navigationMapId?: number;
}>();

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
});

const loadData = async () => {
  if (!props.sceneId) {
    tableData.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const res = await listPath({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      factoryModelId: props.sceneId,
      navigationMapId: props.navigationMapId,
      name: props.keyword || undefined,
    });
    tableData.value = (res as any).rows ?? [];
    total.value = (res as any).total ?? 0;
  } finally {
    loading.value = false;
  }
};

const reload = async () => {
  queryParams.pageNum = 1;
  await loadData();
};

watch(
  () => props.sceneId,
  async () => {
    queryParams.pageNum = 1;
    queryParams.pageSize = 10;
    await reload();
  },
  { immediate: true },
);

defineExpose({ reload });
</script>

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';

.panel-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
