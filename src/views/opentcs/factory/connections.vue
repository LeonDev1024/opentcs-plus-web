<template>
  <div class="connection-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>跨层连接管理</span>
          <el-button type="primary" icon="Plus" @click="handleAdd">新增连接</el-button>
        </div>
      </template>

      <!-- 选择工厂 -->
      <el-form :inline="true" class="query-form">
        <el-form-item label="所属工厂">
          <el-select v-model="selectedFactory" placeholder="请选择工厂" @change="handleFactoryChange" clearable>
            <el-option v-for="factory in factoryList" :key="factory.id" :label="factory.name" :value="factory.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 连接列表 -->
      <el-table v-loading="loading" :data="connectionList" border stripe>
        <el-table-column label="连接名称" prop="name" />
        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.connectionType === 'ELEVATOR'" type="warning">电梯</el-tag>
            <el-tag v-else-if="row.connectionType === 'CONVEYOR'" type="primary">传送带</el-tag>
            <el-tag v-else type="info">物理门</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="源" min-width="150">
          <template #default="{ row }">
            {{ row.sourceMapName }} - {{ row.sourcePointId }}
            <el-tag size="small">{{ row.sourceFloor }}F</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标" min-width="150">
          <template #default="{ row }">
            {{ row.destMapName }} - {{ row.destPointId }}
            <el-tag size="small">{{ row.destFloor }}F</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="容量" prop="capacity" width="80" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.available ? 'success' : 'danger'">
              {{ row.available ? '可用' : '占用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button v-if="row.connectionType === 'ELEVATOR'" link type="primary" @click="handleReserve(row)">预约</el-button>
            <el-button v-if="row.connectionType === 'ELEVATOR'" link type="warning" @click="handleRelease(row)">释放</el-button>
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="getList"
      />
    </el-card>

    <!-- 添加/修改对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="650px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="form.name" placeholder="如：电梯A、1号提升机" />
        </el-form-item>
        <el-form-item label="所属工厂" prop="factoryModelId">
          <el-select v-model="form.factoryModelId" placeholder="请选择工厂" :disabled="!!form.id">
            <el-option v-for="factory in factoryList" :key="factory.id" :label="factory.name" :value="factory.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="连接类型" prop="connectionType">
          <el-radio-group v-model="form.connectionType">
            <el-radio value="ELEVATOR">电梯</el-radio>
            <el-radio value="CONVEYOR">传送带</el-radio>
            <el-radio value="PHYSICAL_DOOR">物理门</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="源地图" prop="sourceNavigationMapId">
              <el-select v-model="form.sourceNavigationMapId" placeholder="请选择源地图">
                <el-option v-for="map in mapList" :key="map.id" :label="map.name" :value="map.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="源点位ID" prop="sourcePointId">
              <el-input v-model="form.sourcePointId" placeholder="点位标识" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="源楼层" prop="sourceFloor">
              <el-input-number v-model="form.sourceFloor" :min="-99" :max="999" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目标地图" prop="destNavigationMapId">
              <el-select v-model="form.destNavigationMapId" placeholder="请选择目标地图">
                <el-option v-for="map in mapList" :key="map.id" :label="map.name" :value="map.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="目标点位ID" prop="destPointId">
              <el-input v-model="form.destPointId" placeholder="点位标识" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目标楼层" prop="destFloor">
              <el-input-number v-model="form.destFloor" :min="-99" :max="999" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="容量" prop="capacity">
              <el-input-number v-model="form.capacity" :min="1" :max="10" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="运行时间(秒)" prop="travelTime">
              <el-input-number v-model="form.travelTime" :min="0" :max="3600" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="最大承重(kg)" prop="maxWeight">
          <el-input-number v-model="form.maxWeight" :min="0" :step="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listFactoryModel } from '@/api/opentcs/factory/model';
import type { FactoryModelVO } from '@/api/opentcs/factory/model/types';
import { listMapsByFactory } from '@/api/opentcs/factory/map';
import type { NavigationMapVO } from '@/api/opentcs/factory/map/types';
import {
  listConnectionsByFactory,
  getCrossLayerConnection,
  addCrossLayerConnection,
  updateCrossLayerConnection,
  delCrossLayerConnection,
  reserveConnection,
  releaseConnection
} from '@/api/opentcs/factory/connection';
import type { CrossLayerConnectionVO, CrossLayerConnectionForm, CrossLayerConnectionQuery } from '@/api/opentcs/factory/connection/types';
import { ElMessageBox, ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';

const loading = ref(false);
const total = ref(0);
const connectionList = ref<CrossLayerConnectionVO[]>([]);
const factoryList = ref<FactoryModelVO[]>([]);
const mapList = ref<NavigationMapVO[]>([]);
const selectedFactory = ref<number | undefined>(undefined);

const queryParams = reactive<CrossLayerConnectionQuery>({
  pageNum: 1,
  pageSize: 10,
  factoryModelId: undefined
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive<CrossLayerConnectionForm>({
  id: undefined,
  factoryModelId: 0,
  connectionId: '',
  name: '',
  connectionType: 'ELEVATOR',
  sourceNavigationMapId: 0,
  sourcePointId: '',
  sourceFloor: 1,
  destNavigationMapId: 0,
  destPointId: '',
  destFloor: 2,
  capacity: 1,
  maxWeight: undefined,
  travelTime: undefined,
  available: true
});

const rules = {
  name: [{ required: true, message: '连接名称不能为空', trigger: 'blur' }],
  factoryModelId: [{ required: true, message: '请选择工厂', trigger: 'change' }],
  connectionType: [{ required: true, message: '请选择连接类型', trigger: 'change' }],
  sourceNavigationMapId: [{ required: true, message: '请选择源地图', trigger: 'change' }],
  sourcePointId: [{ required: true, message: '请输入源点位ID', trigger: 'blur' }],
  destNavigationMapId: [{ required: true, message: '请选择目标地图', trigger: 'change' }],
  destPointId: [{ required: true, message: '请输入目标点位ID', trigger: 'blur' }]
};

const formRef = ref<FormInstance>();

// 获取工厂列表
const getFactoryList = async () => {
  try {
    const res = await listFactoryModel({ pageNum: 1, pageSize: 100 });
    factoryList.value = res.rows || res.data || [];
  } catch (error) {
    console.error('获取工厂列表失败', error);
  }
};

// 获取地图列表
const getMapList = async (factoryId: number) => {
  try {
    const res = await listMapsByFactory(factoryId);
    mapList.value = res.data || res.rows || [];
  } catch (error) {
    console.error('获取地图列表失败', error);
  }
};

// 获取连接列表
const getList = async () => {
  if (!selectedFactory.value) {
    connectionList.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await listConnectionsByFactory(selectedFactory.value);
    connectionList.value = res.data || res.rows || [];
    total.value = res.total || connectionList.value.length;
  } finally {
    loading.value = false;
  }
};

// 工厂变更
const handleFactoryChange = () => {
  queryParams.pageNum = 1;
  if (selectedFactory.value) {
    getMapList(selectedFactory.value);
  } else {
    mapList.value = [];
  }
  getList();
};

// 新增
const handleAdd = () => {
  if (!selectedFactory.value) {
    ElMessage.warning('请先选择工厂');
    return;
  }
  reset();
  form.factoryModelId = selectedFactory.value;
  dialog.visible = true;
  dialog.title = '新增跨层连接';
};

// 修改
const handleUpdate = async (row: CrossLayerConnectionVO) => {
  const res = await getCrossLayerConnection(row.id);
  Object.assign(form, res.data);
  dialog.visible = true;
  dialog.title = '修改跨层连接';
};

// 提交
const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    if (form.id) {
      await updateCrossLayerConnection(form);
      ElMessage.success('修改成功');
    } else {
      await addCrossLayerConnection(form);
      ElMessage.success('新增成功');
    }
    dialog.visible = false;
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 取消
const cancel = () => {
  dialog.visible = false;
  reset();
};

// 重置
const reset = () => {
  form.id = undefined;
  form.connectionId = '';
  form.name = '';
  form.connectionType = 'ELEVATOR';
  form.sourceNavigationMapId = 0;
  form.sourcePointId = '';
  form.sourceFloor = 1;
  form.destNavigationMapId = 0;
  form.destPointId = '';
  form.destFloor = 2;
  form.capacity = 1;
  form.maxWeight = undefined;
  form.travelTime = undefined;
  form.available = true;
  formRef.value?.resetFields();
};

// 删除
const handleDelete = async (row: CrossLayerConnectionVO) => {
  try {
    await ElMessageBox.confirm('确认删除连接 "' + row.name + '" 吗？', '警告', { type: 'warning' });
    await delCrossLayerConnection(row.id);
    ElMessage.success('删除成功');
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 预约电梯
const handleReserve = async (row: CrossLayerConnectionVO) => {
  try {
    await reserveConnection(row.connectionId);
    ElMessage.success('预约成功');
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 释放电梯
const handleRelease = async (row: CrossLayerConnectionVO) => {
  try {
    await releaseConnection(row.connectionId);
    ElMessage.success('释放成功');
    getList();
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  getFactoryList();
});
</script>

<style scoped lang="scss">
.connection-container {
  height: 100%;
  padding: 16px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .query-form {
    margin-bottom: 16px;
  }
}
</style>
