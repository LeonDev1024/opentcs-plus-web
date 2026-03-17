<template>
  <div class="path-list-container">
    <!-- 筛选条件 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="queryParams" label-width="80px">
        <el-form-item label="工厂">
          <el-select v-model="queryParams.factoryModelId" placeholder="请选择工厂" clearable @change="handleFactoryChange">
            <el-option v-for="factory in factoryList" :key="factory.id" :label="factory.name" :value="factory.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="导航地图">
          <el-select v-model="queryParams.navigationMapId" placeholder="请先选择工厂" clearable :disabled="!queryParams.factoryModelId">
            <el-option v-for="map in mapList" :key="map.id" :label="map.name" :value="map.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="pathList" border stripe>
        <el-table-column label="路径ID" prop="pathId" width="150" />
        <el-table-column label="路径名称" prop="name" min-width="150" />
        <el-table-column label="起点" prop="sourcePointId" width="120" />
        <el-table-column label="终点" prop="destPointId" width="120" />
        <el-table-column label="长度(m)" prop="length" width="100" align="center" />
        <el-table-column label="最大速度(m/s)" prop="maxVelocity" width="120" align="center" />
        <el-table-column label="方向类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.routingType === 'BIDIRECTIONAL'" type="success">双向</el-tag>
            <el-tag v-else-if="row.routingType === 'FORWARD'" type="primary">正向</el-tag>
            <el-tag v-else-if="row.routingType === 'BACKWARD'" type="warning">反向</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.locked" type="warning">已锁定</el-tag>
            <el-tag v-else-if="row.isBlocked" type="danger">已阻塞</el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
      </el-table>

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="getList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { listPath, listPathByFactory } from '@/api/opentcs/map/path-query';
import { listFactoryModel } from '@/api/opentcs/factory/model';
import { listMapsByFactory } from '@/api/opentcs/factory/map';

const loading = ref(true);
const total = ref(0);
const pathList = ref<any[]>([]);
const factoryList = ref<any[]>([]);
const mapList = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  factoryModelId: undefined as number | undefined,
  navigationMapId: undefined as number | undefined
});

// 获取工厂列表
const getFactoryList = async () => {
  try {
    const res = await listFactoryModel({ pageNum: 1, pageSize: 100 });
    factoryList.value = res.rows || [];
  } catch (error) {
    console.error('获取工厂列表失败:', error);
  }
};

// 获取地图列表
const getMapList = async (factoryId: number) => {
  try {
    const res = await listMapsByFactory(factoryId);
    mapList.value = res.data || [];
  } catch (error) {
    console.error('获取地图列表失败:', error);
  }
};

// 获取路径列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await listPath(queryParams);
    pathList.value = res.rows || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error('获取路径列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 工厂变化时触发
const handleFactoryChange = async (factoryId: number | undefined) => {
  queryParams.navigationMapId = undefined;
  if (factoryId) {
    await getMapList(factoryId);
  } else {
    mapList.value = [];
  }
  getList();
};

// 搜索
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

// 重置
const resetQuery = () => {
  queryParams.factoryModelId = undefined;
  queryParams.navigationMapId = undefined;
  queryParams.pageNum = 1;
  mapList.value = [];
  getList();
};

onMounted(() => {
  getFactoryList();
  getList();
});
</script>

<style scoped lang="scss">
.path-list-container {
  height: 100%;
  padding: 16px;

  .search-card {
    margin-bottom: 16px;
  }
}
</style>
