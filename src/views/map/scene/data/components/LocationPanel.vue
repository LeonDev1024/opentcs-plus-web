<template>
  <div class="panel-container">
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column label="点位ID" align="center" prop="id" width="100" show-overflow-tooltip />
        <el-table-column label="点位编号" align="center" prop="pointNo" min-width="140" show-overflow-tooltip />
        <el-table-column label="点位名称" align="center" prop="name" min-width="140" show-overflow-tooltip />
        <el-table-column label="地图ID" align="center" prop="navigationMapId" width="100" />
        <el-table-column label="坐标(mm)" align="center" min-width="160">
          <template #default="{ row }">
            {{ formatPos(row.x ?? row.xPosition) }}, {{ formatPos(row.y ?? row.yPosition) }}
          </template>
        </el-table-column>
        <el-table-column label="锁定" align="center" width="80">
          <template #default="{ row }">
            <el-tag :type="row.locked ? 'danger' : 'success'" size="small">{{ row.locked ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
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
import { listPointsByMap } from '@/api/deploy/map-editor/point';
import type { NavigationMapVO } from '@/api/deploy/factory/map/types';

const props = defineProps<{
  sceneId?: number;
  sceneName?: string;
  keyword?: string;
  navigationMapId?: number;
  maps?: NavigationMapVO[];
}>();

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
});

const formatPos = (v: unknown) => (v == null ? '-' : Number(v).toFixed(0));

/** 点位编号默认与名称保持一致 */
const resolvePointNo = (point: any) => {
  const name = point?.name != null && String(point.name).trim() !== '' ? String(point.name).trim() : '';
  const code = point?.pointId != null && String(point.pointId).trim() !== '' ? String(point.pointId).trim() : '';
  return name || code || '-';
};

const loadPointsByMapItem = async (map: NavigationMapVO) => {
  const mapPk = Number(map.id);
  if (!Number.isFinite(mapPk)) return [];
  const res = await listPointsByMap(mapPk);
  const points = ((res as any).data ?? res ?? []) as any[];
  return points.map((point) => {
    const name = String(point.name ?? point.pointId ?? point.code ?? '');
    return {
      ...point,
      id: point.id,
      name,
      pointNo: resolvePointNo({ ...point, name }),
      pointId: point.pointId ?? point.code ?? name ?? point.id,
      navigationMapId: point.navigationMapId ?? mapPk,
      x: point.xPosition ?? point.x,
      y: point.yPosition ?? point.y,
    };
  });
};

const loadData = async () => {
  if (!props.sceneId) {
    tableData.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const maps = props.maps || [];
    const targetMaps = props.navigationMapId
      ? maps.filter((m) => Number(m.id) === Number(props.navigationMapId))
      : maps;
    const pointGroups = await Promise.all(targetMaps.map(loadPointsByMapItem));
    const keyword = (props.keyword || '').trim().toLowerCase();
    const rows = pointGroups
      .flat()
      .filter((point) => {
        if (!keyword) return true;
        return [point.name, point.pointNo, point.pointId, point.code, point.id]
          .filter((value) => value !== undefined && value !== null)
          .some((value) => String(value).toLowerCase().includes(keyword));
      });
    total.value = rows.length;
    const start = (queryParams.pageNum - 1) * queryParams.pageSize;
    tableData.value = rows.slice(start, start + queryParams.pageSize);
  } finally {
    loading.value = false;
  }
};

const reload = async () => {
  queryParams.pageNum = 1;
  await loadData();
};

watch(
  () => [props.sceneId, props.navigationMapId, props.maps?.length, props.keyword],
  async () => {
    queryParams.pageNum = 1;
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
