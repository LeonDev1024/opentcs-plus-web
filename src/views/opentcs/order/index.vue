<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="订单编号" prop="orderNo">
            <el-input v-model="queryParams.orderNo" placeholder="请输入订单编号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="车辆VIN码" prop="vehicleVin">
            <el-input v-model="queryParams.vehicleVin" placeholder="请输入车辆VIN码" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="订单状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="订单状态" clearable>
              <el-option label="待分配" value="0" />
              <el-option label="已分配" value="1" />
              <el-option label="运输中" value="2" />
              <el-option label="已完成" value="3" />
              <el-option label="已取消" value="4" />
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
            <el-button v-hasPermi="['opentcs:transportOrder:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:transportOrder:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
              修改
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:transportOrder:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:transportOrder:assign']" type="warning" plain icon="Connection" :disabled="single" @click="handleAssign()">
              分配车辆
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:transportOrder:start']" type="info" plain icon="VideoPlay" :disabled="single" @click="handleStart()">
              开始运输
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:transportOrder:complete']" type="success" plain icon="Check" :disabled="single" @click="handleComplete()">
              完成订单
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:transportOrder:cancel']" type="danger" plain icon="Close" :disabled="single" @click="handleCancel()">
              取消订单
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="orderList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="订单编号" align="center" prop="orderNo" width="180" />
        <el-table-column label="订单名称" align="center" prop="name" />
        <el-table-column label="车辆" align="center" prop="vehicleName" />
        <el-table-column label="起始位置" align="center" prop="startLocationName" />
        <el-table-column label="目标位置" align="center" prop="targetLocationName" />
        <el-table-column label="订单状态" align="center" prop="status" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.status === '0'" type="info">待分配</el-tag>
            <el-tag v-else-if="scope.row.status === '1'" type="warning">已分配</el-tag>
            <el-tag v-else-if="scope.row.status === '2'" type="primary">运输中</el-tag>
            <el-tag v-else-if="scope.row.status === '3'" type="success">已完成</el-tag>
            <el-tag v-else-if="scope.row.status === '4'" type="danger">已取消</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" align="center" prop="priority" width="80">
          <template #default="scope">
            <el-tag v-if="scope.row.priority === '0'" type="info">低</el-tag>
            <el-tag v-else-if="scope.row.priority === '1'" type="warning">中</el-tag>
            <el-tag v-else-if="scope.row.priority === '2'" type="danger">高</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预计开始时间" align="center" prop="plannedStartTime" width="180" />
        <el-table-column label="预计完成时间" align="center" prop="plannedEndTime" width="180" />
        <el-table-column label="实际开始时间" align="center" prop="actualStartTime" width="180" />
        <el-table-column label="实际完成时间" align="center" prop="actualEndTime" width="180" />
        <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="200">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="scope.row.status === '0'" content="分配车辆" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:assign']" link type="warning" icon="Connection" @click="handleAssign(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="scope.row.status === '1'" content="开始运输" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:start']" link type="info" icon="VideoPlay" @click="handleStart(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="scope.row.status === '2'" content="完成订单" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:complete']" link type="success" icon="Check" @click="handleComplete(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="['0', '1', '2'].includes(scope.row.status)" content="取消订单" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:cancel']" link type="danger" icon="Close" @click="handleCancel(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改运输订单对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="orderFormRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="订单编号" prop="orderNo">
          <el-input v-model="form.orderNo" placeholder="请输入订单编号" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="订单名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入订单名称" />
        </el-form-item>
        <el-form-item label="车辆ID" prop="vehicleId">
          <el-input-number v-model="form.vehicleId" placeholder="请输入车辆ID" style="width: 100%" />
        </el-form-item>
        <el-form-item label="起始位置ID" prop="startLocationId">
          <el-input-number v-model="form.startLocationId" placeholder="请输入起始位置ID" style="width: 100%" />
        </el-form-item>
        <el-form-item label="目标位置ID" prop="targetLocationId">
          <el-input-number v-model="form.targetLocationId" placeholder="请输入目标位置ID" style="width: 100%" />
        </el-form-item>
        <el-form-item label="订单状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">待分配</el-radio>
            <el-radio value="1">已分配</el-radio>
            <el-radio value="2">运输中</el-radio>
            <el-radio value="3">已完成</el-radio>
            <el-radio value="4">已取消</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="form.priority">
            <el-radio value="0">低</el-radio>
            <el-radio value="1">中</el-radio>
            <el-radio value="2">高</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预计开始时间" prop="plannedStartTime">
          <el-date-picker v-model="form.plannedStartTime" type="datetime" placeholder="选择预计开始时间" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="预计完成时间" prop="plannedEndTime">
          <el-date-picker v-model="form.plannedEndTime" type="datetime" placeholder="选择预计完成时间" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" />
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
    <!-- 分配车辆对话框 -->
    <el-dialog v-model="assignDialog.visible" title="分配车辆" width="400px" append-to-body>
      <el-form ref="assignFormRef" :model="assignForm" label-width="100px">
        <el-form-item label="车辆ID" prop="vehicleId">
          <el-input-number v-model="assignForm.vehicleId" placeholder="请输入车辆ID" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="assignLoading" type="primary" @click="submitAssign">确 定</el-button>
          <el-button @click="assignDialog.visible = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Order" lang="ts">
import { listOrder, getOrder, delOrder, addOrder, updateOrder, assignOrder, cancelOrder } from '@/api/opentcs/order';
import { OrderVO, OrderQuery, OrderForm } from '@/api/opentcs/order/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const orderList = ref<OrderVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const orderFormRef = ref<ElFormInstance>();
const assignFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const assignDialog = reactive<DialogOption>({
  visible: false,
  title: '分配车辆'
});

const assignLoading = ref(false);
const assignForm = ref({
  orderId: undefined as string | number | undefined,
  vehicleId: undefined as string | number | undefined
});

const initFormData: OrderForm = {
  id: undefined,
  orderNo: undefined,
  name: undefined,
  vehicleId: undefined,
  startLocationId: undefined,
  targetLocationId: undefined,
  status: '0',
  priority: '1',
  plannedStartTime: undefined,
  plannedEndTime: undefined,
  description: undefined
};
const data = reactive<PageData<OrderForm, OrderQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: undefined,
    vehicleVin: undefined,
    status: undefined
  },
  rules: {
    orderNo: [{ required: true, message: '订单编号不能为空', trigger: 'blur' }],
    startLocationId: [{ required: true, message: '起始位置不能为空', trigger: 'blur' }],
    targetLocationId: [{ required: true, message: '目标位置不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询运输订单列表 */
const getList = async () => {
  loading.value = true;
  const res = await listOrder(queryParams.value);
  orderList.value = res.rows;
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
  orderFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: OrderVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加运输订单';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: OrderVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getOrder(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改运输订单';
};

/** 提交按钮 */
const submitForm = () => {
  orderFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id) {
        await updateOrder(form.value).finally(() => (buttonLoading.value = false));
      } else {
        await addOrder(form.value).finally(() => (buttonLoading.value = false));
      }
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      await getList();
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: OrderVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除运输订单编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delOrder(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

/** 分配车辆按钮操作 */
const handleAssign = (row?: OrderVO) => {
  const _id = row?.id || ids.value[0];
  assignForm.value = {
    orderId: _id,
    vehicleId: undefined
  };
  assignDialog.visible = true;
};

/** 提交分配 */
const submitAssign = async () => {
  if (!assignForm.value.vehicleId) {
    proxy?.$modal.msgError('请选择车辆');
    return;
  }
  assignLoading.value = true;
  try {
    await assignOrder(assignForm.value.orderId!, assignForm.value.vehicleId);
    proxy?.$modal.msgSuccess('分配成功');
    assignDialog.visible = false;
    await getList();
  } finally {
    assignLoading.value = false;
  }
};

/** 开始运输按钮操作 */
const handleStart = async (row?: OrderVO) => {
  proxy?.$modal.msgInfo('开始运输功能暂未实现');
};

/** 完成订单按钮操作 */
const handleComplete = async (row?: OrderVO) => {
  proxy?.$modal.msgInfo('完成订单功能暂未实现');
};

/** 取消订单按钮操作 */
const handleCancel = async (row?: OrderVO) => {
  const _id = row?.id || ids.value[0];
  try {
    await proxy?.$modal.confirm('确认要取消该订单吗？');
    loading.value = true;
    await cancelOrder(_id);
    proxy?.$modal.msgSuccess('取消订单成功');
    await getList();
  } catch (error) {
    console.error('取消订单失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  getList();
});
</script>

