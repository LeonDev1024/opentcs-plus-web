<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="车辆类型名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入车辆类型名称" clearable @keyup.enter="handleQuery" />
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
            <el-button v-hasPermi="['opentcs:vehicleType:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:vehicleType:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
              修改
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:vehicleType:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="typeList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="车辆类型名称" align="center" prop="name" min-width="150" />
        <el-table-column label="尺寸(长×宽×高)" align="center" min-width="150">
          <template #default="scope">
            <span v-if="scope.row.length && scope.row.width && scope.row.height">
              {{ scope.row.length }}×{{ scope.row.width }}×{{ scope.row.height }}m
            </span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="最大速度" align="center" prop="maxVelocity" width="100">
          <template #default="scope">
            <span v-if="scope.row.maxVelocity">{{ scope.row.maxVelocity }} m/s</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="最大倒车速度" align="center" prop="maxReverseVelocity" width="120">
          <template #default="scope">
            <span v-if="scope.row.maxReverseVelocity">{{ scope.row.maxReverseVelocity }} m/s</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="能量等级" align="center" prop="energyLevel" width="100">
          <template #default="scope">
            <span v-if="scope.row.energyLevel !== null && scope.row.energyLevel !== undefined">{{ scope.row.energyLevel }}</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="允许的订单类型" align="center" prop="allowedOrders" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-for="(order, index) in getOrdersList(scope.row.allowedOrders)" :key="index" size="small" style="margin-right: 4px;">
              {{ order }}
            </el-tag>
            <span v-if="!scope.row.allowedOrders || scope.row.allowedOrders.length === 0" style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="允许的外设操作" align="center" prop="allowedPeripheralOperations" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-for="(op, index) in getOperationsList(scope.row.allowedPeripheralOperations)" :key="index" size="small" type="info" style="margin-right: 4px;">
              {{ op }}
            </el-tag>
            <span v-if="!scope.row.allowedPeripheralOperations || scope.row.allowedPeripheralOperations.length === 0" style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['opentcs:vehicleType:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:vehicleType:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改车辆类型对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="700px" append-to-body>
      <el-form ref="typeFormRef" :model="form" :rules="rules" label-width="140px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车辆类型名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入车辆类型名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">尺寸信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="长度(m)" prop="length">
              <el-input-number v-model="form.length" :precision="4" :step="0.1" :min="0" :controls="true" style="width: 100%;" placeholder="长度" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="宽度(m)" prop="width">
              <el-input-number v-model="form.width" :precision="4" :step="0.1" :min="0" :controls="true" style="width: 100%;" placeholder="宽度" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="高度(m)" prop="height">
              <el-input-number v-model="form.height" :precision="4" :step="0.1" :min="0" :controls="true" style="width: 100%;" placeholder="高度" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">速度信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最大速度(m/s)" prop="maxVelocity">
              <el-input-number v-model="form.maxVelocity" :precision="4" :step="0.1" :min="0" :controls="true" style="width: 100%;" placeholder="最大速度" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大倒车速度(m/s)" prop="maxReverseVelocity">
              <el-input-number v-model="form.maxReverseVelocity" :precision="4" :step="0.1" :min="0" :controls="true" style="width: 100%;" placeholder="最大倒车速度" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="能量等级" prop="energyLevel">
              <el-input-number v-model="form.energyLevel" :precision="4" :step="0.1" :min="0" :controls="true" style="width: 100%;" placeholder="能量等级" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">操作权限</el-divider>
        <el-form-item label="允许的订单类型" prop="allowedOrders">
          <el-select v-model="form.allowedOrdersList" multiple placeholder="请选择允许的订单类型" style="width: 100%;">
            <el-option label="TRANSPORT" value="TRANSPORT" />
            <el-option label="CHARGE" value="CHARGE" />
            <el-option label="PARK" value="PARK" />
            <el-option label="MOVE" value="MOVE" />
          </el-select>
          <div class="form-tip">选择该车辆类型支持的订单类型</div>
        </el-form-item>
        <el-form-item label="允许的外设操作" prop="allowedPeripheralOperations">
          <el-select v-model="form.allowedPeripheralOperationsList" multiple placeholder="请选择允许的外设操作" style="width: 100%;">
            <el-option label="LIFT_UP" value="LIFT_UP" />
            <el-option label="LIFT_DOWN" value="LIFT_DOWN" />
            <el-option label="CONVEYOR_START" value="CONVEYOR_START" />
            <el-option label="CONVEYOR_STOP" value="CONVEYOR_STOP" />
            <el-option label="LIGHT_ON" value="LIGHT_ON" />
            <el-option label="LIGHT_OFF" value="LIGHT_OFF" />
          </el-select>
          <div class="form-tip">选择该车辆类型支持的外设操作</div>
        </el-form-item>

        <el-divider content-position="left">扩展属性</el-divider>
        <el-form-item label="其他参数" prop="properties">
          <el-input v-model="form.propertiesText" type="textarea" :rows="4" placeholder='请输入JSON格式的其他参数，如：{"key": "value"}' />
          <div class="form-tip">扩展属性，JSON格式字符串</div>
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

<script setup name="Type" lang="ts">
import { listType, getType, delType, addType, updateType } from '@/api/opentcs/vehicle/type';
import { TypeVO, TypeQuery, TypeForm } from '@/api/opentcs/vehicle/type/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const typeList = ref<TypeVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const typeFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

// 将订单类型数组转换为显示数组
const getOrdersList = (orders?: string[]): string[] => {
  if (!orders || !Array.isArray(orders)) return [];
  return orders.filter((order: string) => order);
};

// 将操作数组转换为显示数组
const getOperationsList = (operations?: string[]): string[] => {
  if (!operations || !Array.isArray(operations)) return [];
  return operations.filter((op: string) => op);
};

const initFormData = {
  id: undefined,
  name: undefined,
  length: null as number | null,
  width: null as number | null,
  height: null as number | null,
  maxVelocity: null as number | null,
  maxReverseVelocity: null as number | null,
  energyLevel: null as number | null,
  allowedOrders: undefined,
  allowedPeripheralOperations: undefined,
  properties: undefined,
  allowedOrdersList: [] as string[],
  allowedPeripheralOperationsList: [] as string[],
  propertiesText: ''
};

const data = reactive<PageData<any, TypeQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined
  },
  rules: {
    name: [{ required: true, message: '车辆类型名称不能为空', trigger: 'blur' }],
    length: [
      { required: true, message: '长度不能为空', trigger: 'blur' },
      { type: 'number', message: '长度必须为数字', trigger: 'blur' }
    ],
    width: [
      { required: true, message: '宽度不能为空', trigger: 'blur' },
      { type: 'number', message: '宽度必须为数字', trigger: 'blur' }
    ],
    height: [
      { required: true, message: '高度不能为空', trigger: 'blur' },
      { type: 'number', message: '高度必须为数字', trigger: 'blur' }
    ],
    maxVelocity: [
      { required: true, message: '最大速度不能为空', trigger: 'blur' },
      { type: 'number', message: '最大速度必须为数字', trigger: 'blur' }
    ]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询车辆类型列表 */
const getList = async () => {
  loading.value = true;
  const res = await listType(queryParams.value);
  typeList.value = res.rows;
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
  form.value.id = initFormData.id;
  form.value.name = initFormData.name;
  form.value.length = initFormData.length;
  form.value.width = initFormData.width;
  form.value.height = initFormData.height;
  form.value.maxVelocity = initFormData.maxVelocity;
  form.value.maxReverseVelocity = initFormData.maxReverseVelocity;
  form.value.energyLevel = initFormData.energyLevel;
  form.value.allowedOrders = initFormData.allowedOrders;
  form.value.allowedPeripheralOperations = initFormData.allowedPeripheralOperations;
  form.value.properties = initFormData.properties;
  form.value.allowedOrdersList = [];
  form.value.allowedPeripheralOperationsList = [];
  form.value.propertiesText = '';
  typeFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: TypeVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加车辆类型';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: TypeVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getType(_id);
  const data = res.data;
  
  // 解析数据到表单
  form.value.id = data.id;
  form.value.name = data.name;
  form.value.length = data.length;
  form.value.width = data.width;
  form.value.height = data.height;
  form.value.maxVelocity = data.maxVelocity;
  form.value.maxReverseVelocity = data.maxReverseVelocity;
  form.value.energyLevel = data.energyLevel;
  
  // 解析 allowedOrders（数组格式）
  form.value.allowedOrdersList = data.allowedOrders && Array.isArray(data.allowedOrders) 
    ? [...data.allowedOrders] 
    : [];
  
  // 解析 allowedPeripheralOperations（数组格式）
  form.value.allowedPeripheralOperationsList = data.allowedPeripheralOperations && Array.isArray(data.allowedPeripheralOperations)
    ? [...data.allowedPeripheralOperations]
    : [];
  
  // 解析properties（JSON对象）
  if (data.properties && typeof data.properties === 'object') {
    form.value.propertiesText = JSON.stringify(data.properties, null, 2);
  } else {
    form.value.propertiesText = '';
  }
  
  dialog.visible = true;
  dialog.title = '修改车辆类型';
};

/** 提交按钮 */
const submitForm = () => {
  typeFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      
      // 构建提交数据
      const submitData: TypeForm = {
        id: form.value.id,
        name: form.value.name,
        length: form.value.length ?? undefined,
        width: form.value.width ?? undefined,
        height: form.value.height ?? undefined,
        maxVelocity: form.value.maxVelocity ?? undefined,
        maxReverseVelocity: form.value.maxReverseVelocity ?? undefined,
        energyLevel: form.value.energyLevel ?? undefined,
        // 将选中的订单类型转换为数组格式
        allowedOrders: form.value.allowedOrdersList && form.value.allowedOrdersList.length > 0 
          ? form.value.allowedOrdersList 
          : undefined,
        // 将选中的外设操作转换为数组格式
        allowedPeripheralOperations: form.value.allowedPeripheralOperationsList && form.value.allowedPeripheralOperationsList.length > 0
          ? form.value.allowedPeripheralOperationsList
          : undefined
      };
      
      // 处理properties（JSON对象）
      if (form.value.propertiesText && form.value.propertiesText.trim()) {
        try {
          const parsedProps = JSON.parse(form.value.propertiesText);
          if (typeof parsedProps === 'object' && parsedProps !== null) {
            submitData.properties = parsedProps;
          }
        } catch (e) {
          proxy?.$modal.msgError('扩展属性JSON格式错误，请检查后重试');
          buttonLoading.value = false;
          return;
        }
      }
      
      try {
        if (form.value.id) {
          await updateType(submitData);
        } else {
          await addType(submitData);
        }
        proxy?.$modal.msgSuccess('操作成功');
        dialog.visible = false;
        await getList();
      } finally {
        buttonLoading.value = false;
      }
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: TypeVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除车辆类型编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delType(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>

