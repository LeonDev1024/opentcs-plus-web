<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="地图模型名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入地图模型名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="状态" clearable>
              <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
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
            <el-button v-hasPermi="['opentcs:mapModel:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:mapModel:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
              修改
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:mapModel:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:mapModel:load']" type="warning" plain icon="Upload" :disabled="single" @click="handleLoad()">
              加载模型
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="mapModelList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="id" align="center" prop="id" />
        <el-table-column label="地图模型名称" align="center" prop="name" />
        <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />
        <el-table-column label="版本" align="center" prop="version" />
        <el-table-column label="文件路径" align="center" prop="filePath" show-overflow-tooltip />
        <el-table-column key="status" label="状态" align="center">
          <template #default="scope">
            <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)"></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="250">
          <template #default="scope">
            <el-tooltip content="编辑地图" placement="top">
              <el-button v-hasPermi="['opentcs:mapModel:edit']" link type="primary" icon="EditPen" @click="handleEdit(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['opentcs:mapModel:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:mapModel:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="加载模型" placement="top">
              <el-button v-hasPermi="['opentcs:mapModel:load']" link type="warning" icon="Upload" @click="handleLoad(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改地图模型对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="mapModelFormRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="地图模型名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入地图模型名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="版本" prop="version">
          <el-input v-model="form.version" placeholder="请输入版本号" />
        </el-form-item>
        <el-form-item label="文件路径" prop="filePath">
          <el-input v-model="form.filePath" placeholder="请输入文件路径" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">
              {{ dict.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="MapModel" lang="ts">
import { useRouter } from 'vue-router';
import { listMapModel, getMapModel, delMapModel, addMapModel, updateMapModel, loadMapModel } from '@/api/opentcs/mapModel';
import { MapModelVO, MapModelQuery, MapModelForm } from '@/api/opentcs/mapModel/types';

const router = useRouter();

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { sys_normal_disable } = toRefs<any>(proxy?.useDict('sys_normal_disable'));

const mapModelList = ref<MapModelVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const mapModelFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: MapModelForm = {
  id: undefined,
  name: undefined,
  description: undefined,
  filePath: undefined,
  version: undefined,
  status: '0'
};
const data = reactive<PageData<MapModelForm, MapModelQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    status: undefined
  },
  rules: {
    name: [{ required: true, message: '地图模型名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询地图模型列表 */
const getList = async () => {
  loading.value = true;
  const res = await listMapModel(queryParams.value);
  mapModelList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

/** 取消按钮 */
const cancel = () => {
  reset();
  dialog.visible = false;
};

/** 表单重置 */
const reset = () => {
  form.value = { ...initFormData };
  mapModelFormRef.value?.resetFields();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

/** 多选框选中数据 */
const handleSelectionChange = (selection: MapModelVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加地图模型';
};

/** 编辑地图按钮操作 */
const handleEdit = (row: MapModelVO) => {
  router.push({
    path: '/opentcs/mapModel/editor',
    query: { id: row.id }
  });
};

/** 修改按钮操作 */
const handleUpdate = async (row?: MapModelVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getMapModel(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改地图模型';
};

/** 提交按钮 */
const submitForm = () => {
  mapModelFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id) {
        await updateMapModel(form.value).finally(() => (buttonLoading.value = false));
      } else {
        await addMapModel(form.value).finally(() => (buttonLoading.value = false));
      }
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      await getList();
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: MapModelVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除地图模型编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delMapModel(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

/** 加载模型按钮操作 */
const handleLoad = async (row?: MapModelVO) => {
  const _id = row?.id || ids.value[0];
  try {
    loading.value = true;
    await loadMapModel(_id);
    proxy?.$modal.msgSuccess('加载模型成功');
  } catch (error) {
    console.error('加载模型失败:', error);
  } finally {
    loading.value = false;
  }
};

/** 状态修改  */
const handleStatusChange = async (row: MapModelVO) => {
  const text = row.status === '0' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"吗?');
    // 这里需要调用状态修改接口，暂时使用更新接口
    await updateMapModel({ id: row.id, status: row.status });
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.status = row.status === '0' ? '1' : '0';
  }
};

onMounted(() => {
  getList();
});
</script>

