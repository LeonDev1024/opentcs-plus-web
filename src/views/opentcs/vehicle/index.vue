<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="车辆名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入车辆名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="车辆编码" prop="code">
            <el-input v-model="queryParams.code" placeholder="请输入车辆编码" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="车牌号" prop="licensePlate">
            <el-input v-model="queryParams.licensePlate" placeholder="请输入车牌号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="车辆类型" prop="vehicleTypeId">
            <el-input-number v-model="queryParams.vehicleTypeId" placeholder="请输入车辆类型ID" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="车辆状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="车辆状态" clearable>
              <el-option label="空闲" value="0" />
              <el-option label="工作中" value="1" />
              <el-option label="维护中" value="2" />
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
            <el-button v-hasPermi="['opentcs:vehicle:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:vehicle:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
              修改
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:vehicle:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="vehicleList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="id" align="center" prop="id" />
        <el-table-column label="车辆名称" align="center" prop="name" />
        <el-table-column label="车辆编码" align="center" prop="code" />
        <el-table-column label="车牌号" align="center" prop="licensePlate" />
        <el-table-column label="车辆类型" align="center" prop="vehicleTypeName" />
        <el-table-column label="车辆状态" align="center" prop="status">
          <template #default="scope">
            <el-tag v-if="scope.row.status === '0'" type="success">空闲</el-tag>
            <el-tag v-else-if="scope.row.status === '1'" type="warning">工作中</el-tag>
            <el-tag v-else-if="scope.row.status === '2'" type="danger">维护中</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前位置" align="center" prop="currentLocationName" />
        <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['opentcs:vehicle:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:vehicle:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改车辆对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="vehicleFormRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="车辆名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入车辆名称" />
        </el-form-item>
        <el-form-item label="车辆编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入车辆编码" />
        </el-form-item>
        <el-form-item label="车牌号" prop="licensePlate">
          <el-input v-model="form.licensePlate" placeholder="请输入车牌号" />
        </el-form-item>
        <el-form-item label="车辆类型ID" prop="vehicleTypeId">
          <el-input-number v-model="form.vehicleTypeId" placeholder="请输入车辆类型ID" style="width: 100%" />
        </el-form-item>
        <el-form-item label="车辆状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">空闲</el-radio>
            <el-radio value="1">工作中</el-radio>
            <el-radio value="2">维护中</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="当前位置ID" prop="currentLocationId">
          <el-input-number v-model="form.currentLocationId" placeholder="请输入当前位置ID" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
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

<script setup name="Vehicle" lang="ts">
import { listVehicle, getVehicle, delVehicle, addVehicle, updateVehicle } from '@/api/opentcs/vehicle';
import { VehicleVO, VehicleQuery, VehicleForm } from '@/api/opentcs/vehicle/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const vehicleList = ref<VehicleVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const vehicleFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: VehicleForm = {
  id: undefined,
  name: undefined,
  code: undefined,
  vehicleTypeId: undefined,
  licensePlate: undefined,
  status: '0',
  currentLocationId: undefined,
  description: undefined
};
const data = reactive<PageData<VehicleForm, VehicleQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    code: undefined,
    vehicleTypeId: undefined,
    licensePlate: undefined,
    status: undefined
  },
  rules: {
    name: [{ required: true, message: '车辆名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询车辆列表 */
const getList = async () => {
  loading.value = true;
  const res = await listVehicle(queryParams.value);
  vehicleList.value = res.rows;
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
  vehicleFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: VehicleVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加车辆';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: VehicleVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getVehicle(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改车辆';
};

/** 提交按钮 */
const submitForm = () => {
  vehicleFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id) {
        await updateVehicle(form.value).finally(() => (buttonLoading.value = false));
      } else {
        await addVehicle(form.value).finally(() => (buttonLoading.value = false));
      }
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      await getList();
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: VehicleVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除车辆编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delVehicle(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

onMounted(() => {
  getList();
});
</script>

