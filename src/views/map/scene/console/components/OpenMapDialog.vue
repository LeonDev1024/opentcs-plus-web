<template>
  <el-dialog v-model="visible" title="打开地图" width="760px" append-to-body destroy-on-close @open="handleOpen">
    <div class="open-map-toolbar">
      <el-select
        v-model="factoryModelId"
        filterable
        clearable
        placeholder="全部场景"
        style="width: 220px"
        @change="loadMaps"
      >
        <el-option v-for="scene in scenes" :key="scene.id" :label="scene.name" :value="scene.id" />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="地图名称或ID"
        clearable
        style="width: 220px"
        @keyup.enter="loadMaps"
      />
      <el-button type="primary" :loading="loading" @click="loadMaps">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="filteredMaps" border height="360" @row-dblclick="handleSelect">
      <el-table-column label="地图名称" prop="name" min-width="160" show-overflow-tooltip />
      <el-table-column label="地图ID" prop="mapId" min-width="140" show-overflow-tooltip />
      <el-table-column label="场景" prop="factoryName" min-width="140" show-overflow-tooltip />
      <el-table-column label="楼层" prop="floorNumber" width="80" align="center" />
      <el-table-column label="操作" width="90" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleSelect(row)">打开</el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { listNavigationMap } from '@/api/deploy/factory/map';
import type { NavigationMapVO } from '@/api/deploy/factory/map/types';
import { listFactoryModel } from '@/api/deploy/factory/model';
import type { FactoryModelVO } from '@/api/deploy/factory/model/types';

const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{
  select: [map: NavigationMapVO];
}>();

const loading = ref(false);
const keyword = ref('');
const factoryModelId = ref<number>();
const scenes = ref<FactoryModelVO[]>([]);
const maps = ref<NavigationMapVO[]>([]);

const filteredMaps = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return maps.value;
  return maps.value.filter((m) =>
    `${m.name ?? ''}`.toLowerCase().includes(q) || `${m.mapId ?? ''}`.toLowerCase().includes(q),
  );
});

const loadScenes = async () => {
  const res = await listFactoryModel({ pageNum: 1, pageSize: 200, status: '0' });
  scenes.value = res.rows ?? [];
};

const loadMaps = async () => {
  loading.value = true;
  try {
    const res = await listNavigationMap({
      pageNum: 1,
      pageSize: 200,
      factoryModelId: factoryModelId.value,
    });
    const rows = (res as any).rows ?? (res as any).data ?? res;
    maps.value = Array.isArray(rows) ? rows : [];
  } finally {
    loading.value = false;
  }
};

const handleOpen = async () => {
  keyword.value = '';
  await loadScenes();
  await loadMaps();
};

const handleSelect = (row: NavigationMapVO) => {
  emit('select', row);
  visible.value = false;
};
</script>

<style scoped lang="scss">
.open-map-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
</style>
