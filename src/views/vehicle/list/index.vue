<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="vehicle-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.name"
            placeholder="机器人编码"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.vehicleTypeId" placeholder="全部车辆类型" clearable size="default">
            <el-option v-for="type in vehicleTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
          <el-select v-model="queryParams.state" placeholder="全部运行状态" clearable size="default">
            <el-option label="空闲" value="IDLE" />
            <el-option label="工作中" value="WORKING" />
            <el-option label="维护中" value="UNAVAILABLE" />
            <el-option label="充电中" value="CHARGING" />
            <el-option label="错误" value="ERROR" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <el-button v-hasPermi="['opentcs:vehicle:add']" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          <el-button v-hasPermi="['opentcs:vehicle:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
            修改
          </el-button>
          <el-button v-hasPermi="['opentcs:vehicle:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
            删除
          </el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table v-loading="loading" :data="vehicleList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="机器人名称" align="center" prop="name" />
        <el-table-column label="机器人编码" align="center" prop="vinCode" />
        <el-table-column label="型号" align="center" prop="vehicleTypeName" />
        <el-table-column label="状态" align="center" prop="state">
          <template #default="scope">
            <el-tag v-if="scope.row.state === 'IDLE'" type="success">空闲</el-tag>
            <el-tag v-else-if="scope.row.state === 'WORKING' || scope.row.state === 'EXECUTING' || scope.row.state === 'MOVING'" type="warning">工作中</el-tag>
            <el-tag v-else-if="scope.row.state === 'UNAVAILABLE'" type="danger">维护中</el-tag>
            <el-tag v-else-if="scope.row.state === 'CHARGING'" type="info">充电中</el-tag>
            <el-tag v-else-if="scope.row.state === 'ERROR'" type="danger">错误</el-tag>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前位置" align="center" prop="currentLocationName" />
        <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改车辆对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="vehicleFormRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="车辆名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入车辆名称" />
        </el-form-item>
        <el-form-item label="车辆VIN码" prop="vinCode">
          <el-input v-model="form.vinCode" placeholder="请输入车辆VIN码" />
        </el-form-item>
        <el-form-item label="车辆类型" prop="vehicleTypeId">
          <el-select v-model="form.vehicleTypeId" placeholder="请选择车辆类型" style="width: 100%">
            <el-option v-for="type in vehicleTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="车辆状态" prop="state">
          <el-radio-group v-model="form.state">
            <el-radio value="IDLE">空闲</el-radio>
            <el-radio value="WORKING">工作中</el-radio>
            <el-radio value="UNAVAILABLE">维护中</el-radio>
          </el-radio-group>
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
import { Refresh, Search } from '@element-plus/icons-vue';
import { listVehicle, getVehicle, delVehicle, addVehicle, updateVehicle } from '@/api/deploy/device';
import { listType } from '@/api/deploy/device/type';
import { VehicleVO, VehicleQuery, VehicleForm } from '@/api/deploy/device/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const vehicleList = ref<VehicleVO[]>([]);
const vehicleTypes = ref<any[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const vehicleFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: VehicleForm = {
  id: undefined,
  name: undefined,
  vinCode: undefined,
  vehicleTypeId: undefined,
  state: 'IDLE',
  description: undefined
};
const data = reactive<PageData<VehicleForm, VehicleQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    vinCode: undefined,
    vehicleTypeId: null as number | null,
    state: undefined
  },
  rules: {
    name: [{ required: true, message: '车辆名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询车辆类型列表 */
const getVehicleTypes = async () => {
  const res = await listType({ pageNum: 1, pageSize: 100 });
  // 兼容两种返回格式：1) 经过拦截器处理的 { rows, total }；2) 原始 { data: { rows, total } }
  const rows = (res as any).rows ?? (res as any).data?.rows ?? [];
  vehicleTypes.value = rows;
};

/** 查询车辆列表 */
const getList = async () => {
  loading.value = true;
  try {
    const res = await listVehicle(queryParams.value);
    const rows = (res as any).rows ?? (res as any).data?.rows ?? [];
    const totalCount = (res as any).total ?? (res as any).data?.total ?? 0;
    vehicleList.value = rows;
    total.value = totalCount;
  } catch (error) {
    console.error('Error fetching vehicle list:', error);
    vehicleList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
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
  queryParams.value.name = undefined;
  queryParams.value.vinCode = undefined;
  queryParams.value.vehicleTypeId = null;
  queryParams.value.state = undefined;
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

onMounted(async () => {
  await getVehicleTypes();
  getList();
});
</script>

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';
</style>
