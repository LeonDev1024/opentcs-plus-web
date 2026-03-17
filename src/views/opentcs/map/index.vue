<template>
  <div class="map-container">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="地图名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入地图名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:map:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="mapList" border>
        <el-table-column label="地图名称" align="center" prop="name" min-width="150" />
        <el-table-column label="地图ID" align="center" prop="mapId" width="200" />
        <el-table-column label="工厂名称" align="center" prop="factoryName" min-width="150" />
        <el-table-column label="工厂编号" align="center" prop="factoryId" width="180" />
        <el-table-column label="状态" align="center" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.status" active-value="0" inactive-value="1" @change="handleStatusChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />

        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
          <template #default="{ row }">
            <el-tooltip content="编辑地图" placement="top">
              <el-button v-hasPermi="['opentcs:map:edit']" link type="primary" icon="EditPen" @click="handleEdit(row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:map:remove']" link type="primary" icon="Delete" @click="handleDelete(row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属工厂" prop="factoryModelId">
          <el-select v-model="form.factoryModelId" placeholder="请选择工厂" style="width: 100%;">
            <el-option v-for="factory in factoryList" :key="factory.id" :label="factory.name" :value="factory.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="地图名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入地图名称，如：一楼车间" />
        </el-form-item>
        <el-form-item label="楼层号" prop="floorNumber">
          <el-input-number v-model="form.floorNumber" :placeholder="'-1表示地下楼层，null表示室外/公共区域'" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="地图类型" prop="mapType">
          <el-select v-model="form.mapType" placeholder="请选择地图类型" style="width: 100%;">
            <el-option label="室内 (INDOOR)" value="INDOOR" />
            <el-option label="室外 (OUTDOOR)" value="OUTDOOR" />
            <el-option label="混合 (MIXED)" value="MIXED" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listNavigationMap, addNavigationMap, updateNavigationMap, delNavigationMap } from '@/api/opentcs/factory/map';
import type { NavigationMapVO, NavigationMapForm, NavigationMapQuery } from '@/api/opentcs/factory/map/types';
import { listFactoryModel } from '@/api/opentcs/factory/model';
import type { FactoryModelVO } from '@/api/opentcs/factory/model/types';
import { useMapEditorTabsStore } from '@/store/modules/mapEditorTabs';
import { ElMessageBox } from 'element-plus';
import type { FormInstance, ElFormInstance } from 'element-plus';

const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const mapEditorTabsStore = useMapEditorTabsStore();

const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const mapList = ref<NavigationMapVO[]>([]);
const factoryList = ref<FactoryModelVO[]>([]);

const queryFormRef = ref<ElFormInstance>();

const queryParams = reactive<NavigationMapQuery>({
  pageNum: 1,
  pageSize: 10,
  name: undefined
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive<NavigationMapForm>({
  id: undefined,
  factoryModelId: undefined as number | undefined,
  name: '',
  floorNumber: undefined,
  mapType: 'INDOOR',
  description: '',
  status: '0'
});

const rules = {
  factoryModelId: [{ required: true, message: '请选择所属工厂', trigger: 'change' }],
  name: [{ required: true, message: '地图名称不能为空', trigger: 'blur' }]
};

const formRef = ref<FormInstance>();

// 获取列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await listNavigationMap(queryParams);
    mapList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};

// 获取工厂列表
const getFactoryList = async () => {
  try {
    const res = await listFactoryModel({ pageNum: 1, pageSize: 100 });
    factoryList.value = res.rows;
  } catch (error) {
    console.error('获取工厂列表失败:', error);
  }
};

// 搜索
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

// 重置
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

// 新增
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加地图';
};

// 编辑（打开地图编辑器标签页）
const handleEdit = (row: NavigationMapVO) => {
  // 使用标签页方式打开地图编辑器
  mapEditorTabsStore.addTab({
    id: String(row.id),
    name: row.name
  });
  // 跳转到地图编辑器页面（带查询参数）
  router.push({
    path: '/opentcs/map/mapeditor',
    query: { id: row.id, name: row.name }
  });
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

// 重置表单
const reset = () => {
  form.id = undefined;
  form.factoryModelId = undefined;
  form.name = '';
  form.floorNumber = undefined;
  form.mapType = 'INDOOR';
  form.description = '';
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
    await ElMessageBox.confirm('确认修改 "' + row.name + '" 状态吗？', '提示', { type: 'warning' });
    await updateNavigationMap({ ...row, id: row.id } as NavigationMapForm);
    ElMessage.success('状态修改成功');
  } catch (error) {
    row.status = row.status === '0' ? '1' : '0';
  }
};

onMounted(() => {
  getList();
  getFactoryList();
});
</script>

<style scoped lang="scss">
.map-container {
  height: 100%;
  padding: 16px;
}

.search {
  margin-bottom: 16px;
}
</style>
