<template>
  <div class="navigation-map-container">
    <!-- 顶部返回 + 工厂信息 -->
    <div class="page-header">
      <div class="header-left">
        <el-button icon="ArrowLeft" text @click="goBack">返回</el-button>
        <span class="factory-name">{{ factoryName }}</span>
      </div>
      <div class="header-right">
        <el-button type="primary" icon="Plus" @click="handleAdd">新增导航地图</el-button>
      </div>
    </div>

    <!-- 地图列表 -->
    <el-table v-loading="loading" :data="mapList" border stripe>
      <el-table-column label="地图ID" prop="mapId" width="150" />
      <el-table-column label="地图名称" prop="name" />
      <el-table-column label="楼层" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.floorNumber" type="info">{{ row.floorNumber }}F</el-tag>
          <el-tag v-else type="success">室外</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.mapType === 'INDOOR'" type="primary">室内</el-tag>
          <el-tag v-else-if="row.mapType === 'OUTDOOR'" type="success">室外</el-tag>
          <el-tag v-else type="warning">混合</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.status" active-value="0" inactive-value="1" @change="handleStatusChange(row)" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="180" />
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="EditPen" @click="handleEdit(row)">编辑地图</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination
      v-show="total > 0"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      :total="total"
      @pagination="getList"
    />

    <!-- 添加/修改对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="地图名称" prop="name">
          <el-input v-model="form.name" placeholder="如：一楼车间、室外道路" />
        </el-form-item>
        <el-form-item label="地图ID" prop="mapId">
          <el-input v-model="form.mapId" placeholder="唯一标识" :disabled="!!form.id" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="楼层号" prop="floorNumber">
              <el-input-number v-model="form.floorNumber" :min="-99" :max="999" placeholder="楼层" :clearable="true" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地图类型" prop="mapType">
              <el-select v-model="form.mapType" placeholder="请选择">
                <el-option label="室内 (INDOOR)" value="INDOOR" />
                <el-option label="室外 (OUTDOOR)" value="OUTDOOR" />
                <el-option label="混合 (MIXED)" value="MIXED" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="原点X" prop="originX">
          <el-input-number v-model="form.originX" :precision="4" :step="0.1" placeholder="PGM导入用" />
        </el-form-item>
        <el-form-item label="原点Y" prop="originY">
          <el-input-number v-model="form.originY" :precision="4" :step="0.1" placeholder="PGM导入用" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
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
import { listMapsByFactory, getNavigationMap, addNavigationMap, updateNavigationMap, delNavigationMap } from '@/api/opentcs/factory/map';
import type { NavigationMapVO, NavigationMapForm, NavigationMapQuery } from '@/api/opentcs/factory/map/types';
import { ElMessageBox, ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';

const route = useRoute();
const router = useRouter();

const factoryId = computed(() => route.query.factoryId as string);
const factoryName = computed(() => route.query.factoryName as string || '工厂详情');

const loading = ref(true);
const total = ref(0);
const mapList = ref<NavigationMapVO[]>([]);

const queryParams = reactive<NavigationMapQuery>({
  pageNum: 1,
  pageSize: 10,
  factoryModelId: undefined
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive<NavigationMapForm>({
  id: undefined,
  factoryModelId: 0,
  mapId: '',
  name: '',
  floorNumber: undefined,
  mapType: 'INDOOR',
  originX: 0,
  originY: 0,
  status: '0'
});

const rules = {
  name: [{ required: true, message: '地图名称不能为空', trigger: 'blur' }],
  mapId: [{ required: true, message: '地图ID不能为空', trigger: 'blur' }],
  mapType: [{ required: true, message: '请选择地图类型', trigger: 'change' }]
};

const formRef = ref<FormInstance>();

// 获取列表
const getList = async () => {
  if (!factoryId.value) return;
  loading.value = true;
  try {
    queryParams.factoryModelId = Number(factoryId.value);
    const res = await listMapsByFactory(factoryId.value);
    mapList.value = res.data || res.rows || [];
    total.value = res.total || mapList.value.length;
  } finally {
    loading.value = false;
  }
};

// 新增
const handleAdd = () => {
  reset();
  form.factoryModelId = Number(factoryId.value);
  dialog.visible = true;
  dialog.title = '新增导航地图';
};

// 修改
const handleUpdate = async (row: NavigationMapVO) => {
  reset();
  const res = await getNavigationMap(row.id);
  Object.assign(form, res.data);
  dialog.visible = true;
  dialog.title = '修改导航地图';
};

// 提交
const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    if (form.id) {
      await updateNavigationMap(form);
      ElMessage.success('修改成功');
    } else {
      await addNavigationMap(form);
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
  form.mapId = '';
  form.name = '';
  form.floorNumber = undefined;
  form.mapType = 'INDOOR';
  form.originX = 0;
  form.originY = 0;
  form.status = '0';
  formRef.value?.resetFields();
};

// 删除
const handleDelete = async (row: NavigationMapVO) => {
  try {
    await ElMessageBox.confirm('确认删除地图 "' + row.name + '" 吗？', '警告', { type: 'warning' });
    await delNavigationMap(row.id);
    ElMessage.success('删除成功');
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 状态修改
const handleStatusChange = async (row: NavigationMapVO) => {
  try {
    await ElMessageBox.confirm('确认修改状态吗？', '提示', { type: 'warning' });
    await updateNavigationMap({ ...row, id: row.id } as NavigationMapForm);
    ElMessage.success('状态修改成功');
  } catch (error) {
    row.status = row.status === '0' ? '1' : '0';
  }
};

// 编辑地图
const handleEdit = (row: NavigationMapVO) => {
  const url = `/map/mapeditor?id=${row.id}&name=${encodeURIComponent(row.name)}`;
  window.open(url, '_blank');
};

// 返回
const goBack = () => {
  router.push('/opentcs/factory');
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.navigation-map-container {
  height: 100%;
  padding: 16px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 4px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .factory-name {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }
    }
  }
}
</style>
