<template>
  <div class="factory-container">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="工厂名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入工厂名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 120px;">
              <el-option label="正常" value="0" />
              <el-option label="停用" value="1" />
            </el-select>
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
            <el-button v-hasPermi="['factory:model:add']" type="primary" plain icon="Plus" @click="handleAdd">
              新增
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="factoryList" border>
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="工厂编号" align="center" prop="factoryId" width="200" />
        <el-table-column label="工厂名称" align="center" prop="name" />
        <el-table-column label="比例尺" align="center" width="100">
          <template #default="{ row }">
            {{ row.scale || 1 }} mm/px
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.status" active-value="0" inactive-value="1" @change="handleStatusChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />

        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="200">
          <template #default="{ row }">
            <el-tooltip content="管理地图" placement="top">
              <el-button v-hasPermi="['factory:model:edit']" link type="primary" icon="Map" @click="handleManageMaps(row)"></el-button>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top">
              <el-button v-hasPermi="['factory:model:edit']" link type="primary" icon="Edit" @click="handleUpdate(row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['factory:model:remove']" link type="primary" icon="Delete" @click="handleDelete(row)"></el-button>
            </el-tooltip>
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

    <!-- 添加或修改对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="工厂名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入工厂名称" />
        </el-form-item>
        <el-form-item label="工厂编号" prop="factoryId">
          <el-input v-model="form.factoryId" placeholder="自动生成" disabled />
        </el-form-item>
        <el-form-item label="比例尺" prop="scale">
          <el-input-number v-model="form.scale" :min="1" :max="100" :step="1" precision="0" />
          <span style="margin-left: 8px; color: #909399;">mm/px</span>
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
import { listFactoryModel, getFactoryModel, addFactoryModel, updateFactoryModel, delFactoryModel } from '@/api/opentcs/factory/model';
import type { FactoryModelVO, FactoryModelForm, FactoryModelQuery } from '@/api/opentcs/factory/model/types';
import { ElMessageBox } from 'element-plus';
import type { FormInstance, ElFormInstance } from 'element-plus';

const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const factoryList = ref<FactoryModelVO[]>([]);

const queryFormRef = ref<ElFormInstance>();

const queryParams = reactive<FactoryModelQuery>({
  pageNum: 1,
  pageSize: 10,
  name: undefined,
  status: undefined
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive<FactoryModelForm>({
  id: undefined,
  factoryId: '',
  name: '',
  scale: 1,
  description: '',
  status: '0'
});

const rules = {
  name: [{ required: true, message: '工厂名称不能为空', trigger: 'blur' }]
};

const formRef = ref<FormInstance>();

// 获取列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await listFactoryModel(queryParams);
    factoryList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
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
  dialog.title = '添加工厂模型';
};

// 修改
const handleUpdate = async (row: FactoryModelVO) => {
  reset();
  const res = await getFactoryModel(row.id);
  Object.assign(form, res.data);
  dialog.visible = true;
  dialog.title = '修改工厂模型';
};

// 提交
const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    if (form.id) {
      await updateFactoryModel(form);
      ElMessage.success('修改成功');
    } else {
      await addFactoryModel(form);
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
  form.factoryId = '';
  form.name = '';
  form.scale = 1;
  form.description = '';
  form.status = '0';
  formRef.value?.resetFields();
};

// 删除
const handleDelete = async (row: FactoryModelVO) => {
  try {
    await ElMessageBox.confirm('确认删除工厂模型 "' + row.name + '" 吗？', '警告', { type: 'warning' });
    await delFactoryModel(row.id);
    ElMessage.success('删除成功');
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 状态修改
const handleStatusChange = async (row: FactoryModelVO) => {
  try {
    await ElMessageBox.confirm('确认修改 "' + row.name + '" 状态吗？', '提示', { type: 'warning' });
    await updateFactoryModel({ ...row, id: row.id } as FactoryModelForm);
    ElMessage.success('状态修改成功');
  } catch (error) {
    row.status = row.status === '0' ? '1' : '0';
  }
};

// 管理地图
const handleManageMaps = (row: FactoryModelVO) => {
  router.push({
    path: '/opentcs/factory/maps',
    query: { factoryId: row.id.toString(), factoryName: row.name }
  });
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.factory-container {
  height: 100%;
  padding: 16px;
}

.search {
  margin-bottom: 16px;
}
</style>
