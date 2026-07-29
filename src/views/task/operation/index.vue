<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="order-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.orderNo"
            placeholder="订单编号"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-input
            v-model="queryParams.vehicleVin"
            placeholder="机器人编码"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          />
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable size="default">
            <el-option label="待分配" value="0" />
            <el-option label="已分配" value="1" />
            <el-option label="运输中" value="2" />
            <el-option label="已完成" value="3" />
            <el-option label="已取消" value="4" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <el-button v-hasPermi="['opentcs:transportOrder:add']" type="primary" icon="Plus" @click="handleAdd">创建任务</el-button>
          <el-button v-hasPermi="['opentcs:transportOrder:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
            删除
          </el-button>
          <el-button v-hasPermi="['opentcs:transportOrder:assign']" type="warning" plain icon="Connection" :disabled="single" @click="handleAssign()">
            分配车辆
          </el-button>
          <el-button v-hasPermi="['opentcs:transportOrder:cancel']" type="danger" plain icon="Close" :disabled="single" @click="handleCancel()">
            取消订单
          </el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
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
            <span v-else>{{ scope.row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" align="center" prop="priority" width="80" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="160">
          <template #default="scope">
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="scope.row.status === '0'" content="分配车辆" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:assign']" link type="warning" icon="Connection" @click="handleAssign(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="['0', '1', '2'].includes(scope.row.status)" content="取消订单" placement="top">
              <el-button v-hasPermi="['opentcs:transportOrder:cancel']" link type="danger" icon="Close" @click="handleCancel(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 创建任务（极简） -->
    <el-dialog v-model="dialog.visible" title="创建任务" width="560px" append-to-body destroy-on-close>
      <el-form ref="orderFormRef" :model="form" :rules="rules" label-width="120px" class="create-task-form">
        <el-form-item label="订单号" prop="externalOrderNo">
          <el-input v-model="form.externalOrderNo" placeholder="请输入 订单号" maxlength="64" clearable />
          <div class="form-tip">仅支持数字、字母、符号</div>
        </el-form-item>

        <el-form-item label="任务号" prop="taskNo" required>
          <el-input v-model="form.taskNo" disabled />
          <div class="form-tip">仅支持数字、字母、符号，系统自动生成</div>
        </el-form-item>

        <el-form-item label="任务模板号" prop="templateCode">
          <el-select
            v-model="form.templateCode"
            placeholder="请选择 任务模板号"
            filterable
            style="width: 100%"
            @change="onTemplateChange"
          >
            <el-option
              v-for="item in templateOptions"
              :key="item.code"
              :label="`${item.code}（${item.name}）`"
              :value="item.code"
            />
          </el-select>
          <div class="form-tip">选择后自动带出起点、终点与默认优先级</div>
        </el-form-item>

        <el-form-item label="任务预约时间" prop="appointmentTime">
          <el-date-picker
            v-model="form.appointmentTime"
            type="datetime"
            placeholder="请选择 任务预约时间"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
            clearable
          />
        </el-form-item>

        <el-form-item label="执行任务AMR" prop="intendedVehicle">
          <el-select
            v-model="form.intendedVehicle"
            placeholder="请选择 执行任务AMR"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option v-for="item in vehicleOptions" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
          <div class="form-tip">不指定时由调度器自动分配</div>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="form.priority" :min="0" :max="9999" controls-position="right" placeholder="请输入 优先级" style="width: 100%" />
          <div class="form-tip">越大越优先，若不填写则使用任务模板优先级</div>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入 备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">关闭</el-button>
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">提交</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 分配车辆对话框 -->
    <el-dialog v-model="assignDialog.visible" title="分配车辆" width="400px" append-to-body>
      <el-form ref="assignFormRef" :model="assignForm" label-width="100px">
        <el-form-item label="执行AMR" prop="vehicleName">
          <el-select v-model="assignForm.vehicleName" placeholder="请选择车辆" filterable style="width: 100%">
            <el-option v-for="item in vehicleOptions" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
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
import { Refresh, Search } from '@element-plus/icons-vue';
import { listOrder, delOrder, createTransportOrder, assignOrder, cancelOrder } from '@/api/ops/order';
import { OrderVO, OrderQuery, OrderForm, CreateOrderCommand } from '@/api/ops/order/types';
import { listVehicle } from '@/api/deploy/device';
import { VehicleVO } from '@/api/deploy/device/types';
import { listTaskTemplateAll } from '@/api/task/template';
import { TaskTemplateVO } from '@/api/task/template/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const orderList = ref<OrderVO[]>([]);
const vehicleOptions = ref<VehicleVO[]>([]);
const templateOptions = ref<TaskTemplateVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const orderFormRef = ref<ElFormInstance>();
const assignFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: '创建任务'
});

const assignDialog = reactive<DialogOption>({
  visible: false,
  title: '分配车辆'
});

const assignLoading = ref(false);
const assignForm = ref({
  orderId: undefined as string | number | undefined,
  vehicleName: undefined as string | undefined
});

/** 生成任务号：FT + yyMMddHHmmss + 随机后缀 */
const genTaskNo = () => {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const ts =
    String(d.getFullYear()).slice(2) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `FT${ts}${rand}`;
};

const initFormData: OrderForm = {
  id: undefined,
  externalOrderNo: undefined,
  taskNo: undefined,
  templateCode: undefined,
  sourcePoint: undefined,
  destPoint: undefined,
  intendedVehicle: undefined,
  appointmentTime: undefined,
  priority: undefined,
  remark: undefined
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
    templateCode: [{ required: true, message: '请选择任务模板号', trigger: 'change' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const loadVehicles = async () => {
  try {
    const res = await listVehicle({ pageNum: 1, pageSize: 500 });
    vehicleOptions.value = res.rows || [];
  } catch {
    vehicleOptions.value = [];
  }
};

const loadTemplates = async () => {
  try {
    const res = await listTaskTemplateAll();
    templateOptions.value = res.data || [];
  } catch {
    templateOptions.value = [];
  }
};

const onTemplateChange = (code?: string) => {
  const selected = templateOptions.value.find((item) => item.code === code);
  if (!selected) {
    form.value.sourcePoint = undefined;
    form.value.destPoint = undefined;
    form.value.priority = undefined;
    return;
  }
  form.value.sourcePoint = selected.sourcePoint;
  form.value.destPoint = selected.destPoint;
  form.value.priority = selected.priority ?? undefined;
};

/** 查询运输订单列表 */
const getList = async () => {
  loading.value = true;
  try {
    const res = await listOrder(queryParams.value);
    orderList.value = res.rows;
    total.value = res.total;
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
  orderFormRef.value?.resetFields();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  queryParams.value.orderNo = undefined;
  queryParams.value.vehicleVin = undefined;
  queryParams.value.status = undefined;
  handleQuery();
};

/** 多选框选中数据 */
const handleSelectionChange = (selection: OrderVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = async () => {
  reset();
  form.value.taskNo = genTaskNo();
  dialog.visible = true;
  await Promise.all([
    vehicleOptions.value.length ? Promise.resolve() : loadVehicles(),
    loadTemplates()
  ]);
};

/** 提交创建 */
const submitForm = () => {
  orderFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    if (!form.value.sourcePoint || !form.value.destPoint) {
      proxy?.$modal.msgError('请选择有效的任务模板');
      return;
    }
    buttonLoading.value = true;
    try {
      const payload: CreateOrderCommand = {
        name: form.value.taskNo,
        externalOrderNo: form.value.externalOrderNo || undefined,
        sourcePoint: form.value.sourcePoint.trim(),
        destPoint: form.value.destPoint.trim(),
        intendedVehicle: form.value.intendedVehicle || undefined,
        priority: form.value.priority ?? undefined,
        remark: form.value.remark || undefined,
        templateCode: form.value.templateCode || undefined
      };
      if (form.value.appointmentTime) {
        payload.deadline = new Date(form.value.appointmentTime.replace(/-/g, '/')).getTime();
      }
      await createTransportOrder(payload);
      proxy?.$modal.msgSuccess('创建成功');
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: OrderVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除选中的运输订单？').finally(() => (loading.value = false));
  await delOrder(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

/** 分配车辆按钮操作 */
const handleAssign = async (row?: OrderVO) => {
  const _id = row?.id || ids.value[0];
  assignForm.value = {
    orderId: _id,
    vehicleName: undefined
  };
  if (!vehicleOptions.value.length) {
    await loadVehicles();
  }
  assignDialog.visible = true;
};

/** 提交分配 */
const submitAssign = async () => {
  if (!assignForm.value.vehicleName) {
    proxy?.$modal.msgError('请选择车辆');
    return;
  }
  assignLoading.value = true;
  try {
    await assignOrder(assignForm.value.orderId!, assignForm.value.vehicleName);
    proxy?.$modal.msgSuccess('分配成功');
    assignDialog.visible = false;
    await getList();
  } finally {
    assignLoading.value = false;
  }
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

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';

.create-task-form {
  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-text-color-secondary);
  }

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}
</style>
