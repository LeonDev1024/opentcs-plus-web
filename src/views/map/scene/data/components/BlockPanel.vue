<template>
  <div class="panel-container">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="scene-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.name"
            placeholder="区域名称"
            clearable
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.type" placeholder="全部类型" clearable @change="handleQuery">
            <el-option v-for="t in blockTypes" :key="t" :label="blockTypeLabel(t)" :value="t" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column label="区域编码" align="center" prop="blockId" min-width="140" show-overflow-tooltip />
        <el-table-column label="区域名称" align="center" prop="name" min-width="140" show-overflow-tooltip />
        <el-table-column label="区域类型" align="center" prop="type" min-width="160">
          <template #default="{ row }">{{ blockTypeLabel(row.type) }}</template>
        </el-table-column>
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
import { Refresh, Search } from '@element-plus/icons-vue';
import { listBlock, getBlockTypes } from '@/api/deploy/factory/block';

const props = defineProps<{
  sceneId?: number;
  sceneName?: string;
}>();

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

interface BlockVO {
  id?: number;
  navigationMapId?: number;
  blockId?: string;
  name?: string;
  type?: string;
  createTime?: string;
}

const loading = ref(false);
const showSearch = ref(true);
const tableData = ref<BlockVO[]>([]);
const total = ref(0);
const blockTypes = ref<string[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  name: undefined as string | undefined,
  type: undefined as string | undefined,
});

const blockTypeLabel = (type?: string) => {
  if (type === 'SINGLE_VEHICLE_ONLY') return '单车互斥';
  if (type === 'SAME_DIRECTION_ONLY') return '同向通行';
  return type || '-';
};

const loadBlockTypes = async () => {
  const res = await getBlockTypes();
  blockTypes.value = (res as any).data ?? res ?? [];
};

const loadData = async () => {
  if (!props.sceneId) {
    tableData.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const res = await listBlock({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      factoryModelId: props.sceneId,
      name: queryParams.name || undefined,
      type: queryParams.type || undefined,
    });
    tableData.value = (res as any).rows ?? [];
    total.value = (res as any).total ?? 0;
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  loadData();
};

const resetQuery = () => {
  queryParams.name = undefined;
  queryParams.type = undefined;
  handleQuery();
};

const reload = async () => {
  await loadData();
};

watch(
  () => props.sceneId,
  async () => {
    queryParams.pageNum = 1;
    queryParams.pageSize = 10;
    queryParams.name = undefined;
    queryParams.type = undefined;
    await reload();
  },
  { immediate: true },
);

onMounted(loadBlockTypes);

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
