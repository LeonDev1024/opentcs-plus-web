<template>
  <div class="panel-container">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="scene-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.name"
            placeholder="路径编码或名称"
            clearable
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.navigationMapId" placeholder="全部地图" clearable @change="handleQuery">
            <el-option v-for="m in mapOptions" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

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
import { Refresh, Search } from '@element-plus/icons-vue';
import { listPath } from '@/api/deploy/map-editor/path-query';
import { listMapsByFactory } from '@/api/deploy/factory/map';
import type { NavigationMapVO } from '@/api/deploy/factory/map/types';

const props = defineProps<{
  sceneId?: number;
  sceneName?: string;
}>();

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const loading = ref(false);
const showSearch = ref(true);
const tableData = ref<any[]>([]);
const total = ref(0);
const mapOptions = ref<NavigationMapVO[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  name: undefined as string | undefined,
  navigationMapId: undefined as number | undefined,
});

const loadMaps = async () => {
  if (!props.sceneId) {
    mapOptions.value = [];
    return;
  }
  const res = await listMapsByFactory(props.sceneId);
  const data = (res as any).data ?? res;
  mapOptions.value = Array.isArray(data) ? data : [];
};

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
      navigationMapId: queryParams.navigationMapId,
      name: queryParams.name || undefined,
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
  queryParams.navigationMapId = undefined;
  handleQuery();
};

const reload = async () => {
  await loadMaps();
  await loadData();
};

watch(
  () => props.sceneId,
  async () => {
    queryParams.pageNum = 1;
    queryParams.pageSize = 10;
    queryParams.name = undefined;
    queryParams.navigationMapId = undefined;
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
