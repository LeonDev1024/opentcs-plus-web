<template>
  <div class="panel-container">
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column label="路径ID" align="center" prop="id" width="100" show-overflow-tooltip />
        <el-table-column label="路径编号" align="center" prop="pathNo" min-width="180" show-overflow-tooltip />
        <el-table-column label="方向" align="center" width="80">
          <template #default>单向</template>
        </el-table-column>
        <el-table-column label="起点坐标(mm)" align="center" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatCoord(row.sourceX, row.sourceY) }}
          </template>
        </el-table-column>
        <el-table-column label="终点坐标(mm)" align="center" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatCoord(row.destX, row.destY) }}
          </template>
        </el-table-column>
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
import { listPointsByMap } from '@/api/deploy/map-editor/point';
import type { NavigationMapVO } from '@/api/deploy/factory/map/types';

type PointLookup = {
  name: string;
  x?: number | null;
  y?: number | null;
};

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

const formatPos = (v: unknown) => (v == null || v === '' ? null : Number(v));

const formatCoord = (x: unknown, y: unknown) => {
  const fx = formatPos(x);
  const fy = formatPos(y);
  if (fx == null || fy == null || Number.isNaN(fx) || Number.isNaN(fy)) return '-';
  return `${fx.toFixed(0)}, ${fy.toFixed(0)}`;
};

const resolvePointLabel = (point?: PointLookup | null, fallbackId?: string) => {
  const name = point?.name?.trim();
  if (name) return name;
  if (fallbackId) return fallbackId;
  return '?';
};

/** 路径编号：起点名称 --- 终点名称，例如 P12 --- P13 */
const buildPathNo = (sourceLabel: string, destLabel: string) => `${sourceLabel} --- ${destLabel}`;

const buildPointLookup = async (mapIds: number[]) => {
  const lookup = new Map<string, PointLookup>();
  const uniqueMapIds = [...new Set(mapIds.filter((id) => Number.isFinite(id)))];
  await Promise.all(
    uniqueMapIds.map(async (mapId) => {
      try {
        const res = await listPointsByMap(mapId);
        const points = (res as any).data ?? res ?? [];
        for (const point of points as any[]) {
          const key = String(point.pointId ?? point.name ?? point.id ?? '');
          if (!key) continue;
          const name = String(point.name ?? point.pointId ?? key);
          lookup.set(key, {
            name,
            x: formatPos(point.xPosition ?? point.x),
            y: formatPos(point.yPosition ?? point.y),
          });
          // 兼容路径端点存的是名称或主键
          if (point.name) lookup.set(String(point.name), lookup.get(key)!);
          if (point.id != null) lookup.set(String(point.id), lookup.get(key)!);
        }
      } catch {
        // ignore single map failure
      }
    })
  );
  return lookup;
};

const enrichPaths = (rows: any[], lookup: Map<string, PointLookup>) => {
  return rows.map((path) => {
    const sourceId = String(path.sourcePointId ?? path.sourcePoint ?? '');
    const destId = String(path.destPointId ?? path.destPoint ?? '');
    const source = lookup.get(sourceId);
    const dest = lookup.get(destId);
    const sourceLabel = resolvePointLabel(source, sourceId);
    const destLabel = resolvePointLabel(dest, destId);
    return {
      ...path,
      pathNo: buildPathNo(sourceLabel, destLabel),
      sourceX: source?.x,
      sourceY: source?.y,
      destX: dest?.x,
      destY: dest?.y,
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
    const res = await listPath({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      factoryModelId: props.sceneId,
      navigationMapId: props.navigationMapId,
      name: props.keyword || undefined,
    });
    const rows = ((res as any).rows ?? []) as any[];
    const mapIdsFromPaths = rows
      .map((row) => Number(row.navigationMapId))
      .filter((id) => Number.isFinite(id));
    const mapIdsFromProps = (props.maps || [])
      .map((map) => Number(map.id))
      .filter((id) => Number.isFinite(id));
    const lookup = await buildPointLookup(
      props.navigationMapId != null ? [Number(props.navigationMapId), ...mapIdsFromPaths] : [...mapIdsFromPaths, ...mapIdsFromProps]
    );
    tableData.value = enrichPaths(rows, lookup);
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
  () => [props.sceneId, props.navigationMapId, props.maps?.length, props.keyword],
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
