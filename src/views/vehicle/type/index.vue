<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="type-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.name"
            placeholder="型号名称"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.brandId" placeholder="全部品牌" clearable filterable size="default">
            <el-option v-for="brand in brandList" :key="brand.id" :label="brand.name" :value="brand.id" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <el-button v-hasPermi="['opentcs:vehicleType:add']" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          <el-button v-hasPermi="['opentcs:vehicleType:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
            修改
          </el-button>
          <el-button v-hasPermi="['opentcs:vehicleType:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
            删除
          </el-button>
          <el-button v-hasPermi="['opentcs:vehicleType:edit']" type="warning" plain :icon="Setting" :disabled="single" @click="handlePropertiesConfig()">
            扩展参数配置
          </el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table v-loading="loading" :data="typeList" border class="type-table" @selection-change="handleSelectionChange" @row-dblclick="handleDetail">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="类型编码" align="center" prop="code" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="scope.row.code">{{ scope.row.code }}</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="类型名称" align="center" prop="name" min-width="150" />
        <el-table-column label="车辆形态" align="center" prop="category" width="100">
          <template #default="scope">
            {{ getCategoryLabel(scope.row.category) }}
          </template>
        </el-table-column>
        <el-table-column label="所属品牌" align="center" prop="brandName" min-width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.brandName" size="small">{{ scope.row.brandName }}</el-tag>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
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
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改车辆类型对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="700px" append-to-body>
      <el-form ref="typeFormRef" :model="form" :rules="rules" label-width="140px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="类型编码" prop="code">
              <el-input v-model="form.code" :disabled="!!form.id" placeholder="如 HIK_LATENT_01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入类型名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属品牌" prop="brandId">
              <el-select v-model="form.brandId" placeholder="请选择品牌" style="width: 100%;">
                <el-option v-for="brand in brandList" :key="brand.id" :label="brand.name" :value="brand.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车辆形态" prop="category">
              <el-select v-model="form.category" placeholder="请选择车辆形态" style="width: 100%;">
                <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
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
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
    <!-- 扩展参数配置对话框 -->
    <el-dialog v-model="propertiesDialog.visible" :title="propertiesDialog.title" width="640px" append-to-body>
      <div v-if="propertiesTarget.name" class="properties-target">
        当前类型：<span class="properties-target__name">{{ propertiesTarget.code ? `${propertiesTarget.code} / ` : '' }}{{ propertiesTarget.name }}</span>
      </div>
      <el-form ref="propertiesFormRef" :model="propertiesForm" :rules="propertiesRules" label-width="0">
        <el-form-item prop="propertiesText">
          <el-input
            v-model="propertiesForm.propertiesText"
            type="textarea"
            :rows="14"
            placeholder='请输入 JSON 格式的扩展参数，如：{"maxLoad": 500, "navigation": "SLAM"}'
          />
          <div class="form-tip">扩展参数以 JSON 对象保存，保存后立即生效</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :loading="propertiesLoading" type="primary" @click="submitPropertiesConfig">保 存</el-button>
        <el-button @click="propertiesDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>
    <!-- 查看详情对话框 -->
    <el-dialog v-model="detailDialog.visible" title="车辆类型详情" width="600px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="类型编码">{{ detailData.code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型名称">{{ detailData.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属品牌">{{ detailData.brandName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="车辆形态">{{ getCategoryLabel(detailData.category) }}</el-descriptions-item>
        <el-descriptions-item label="能量等级">{{ detailData.energyLevel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="长度(m)">{{ detailData.length || '-' }}</el-descriptions-item>
        <el-descriptions-item label="宽度(m)">{{ detailData.width || '-' }}</el-descriptions-item>
        <el-descriptions-item label="高度(m)">{{ detailData.height || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最大速度(m/s)">{{ detailData.maxVelocity || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最大倒车速度(m/s)">{{ detailData.maxReverseVelocity || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间" :span="1">{{ detailData.updateTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="允许的订单类型" :span="2">
          <el-tag v-for="(order, index) in getOrdersList(detailData.allowedOrders)" :key="index" size="small" style="margin-right: 4px;">
            {{ order }}
          </el-tag>
          <span v-if="!detailData.allowedOrders || detailData.allowedOrders.length === 0" style="color: #909399;">-</span>
        </el-descriptions-item>
        <el-descriptions-item label="允许的外设操作" :span="2">
          <el-tag v-for="(op, index) in getOperationsList(detailData.allowedPeripheralOperations)" :key="index" size="small" type="info" style="margin-right: 4px;">
            {{ op }}
          </el-tag>
          <span v-if="!detailData.allowedPeripheralOperations || detailData.allowedPeripheralOperations.length === 0" style="color: #909399;">-</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialog.visible = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Type" lang="ts">
import { listType, getType, delType, addType, updateType } from '@/api/deploy/device/type';
import { listBrandAll } from '@/api/deploy/device/brand';
import { TypeVO, TypeQuery, TypeForm } from '@/api/deploy/device/type/types';
import { BrandVO } from '@/api/deploy/device/brand/types';
import { Refresh, Search, Setting } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const typeList = ref<TypeVO[]>([]);
const brandList = ref<BrandVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const typeFormRef = ref<ElFormInstance>();
const propertiesFormRef = ref<ElFormInstance>();
const propertiesLoading = ref(false);
const propertiesTypeData = ref<TypeVO | null>(null);

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const propertiesDialog = reactive<DialogOption>({
  visible: false,
  title: '扩展参数配置'
});

const propertiesTarget = reactive({
  code: '',
  name: ''
});

const propertiesForm = reactive({
  propertiesText: ''
});

const propertiesRules = {
  propertiesText: [
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!value || !value.trim()) {
          callback();
          return;
        }
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            callback(new Error('扩展参数必须是 JSON 对象'));
            return;
          }
          callback();
        } catch {
          callback(new Error('扩展参数 JSON 格式错误'));
        }
      },
      trigger: 'blur'
    }
  ]
};

const detailDialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const detailData = ref<any>({});

const categoryOptions = [
  { label: '潜伏式', value: 'LATENT' },
  { label: '叉车', value: 'FORKLIFT' }
];

const getCategoryLabel = (value?: string) => {
  if (!value) return '-';
  return categoryOptions.find((item) => item.value === value)?.label ?? value;
};

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

const formatPropertiesText = (properties: unknown) => {
  if (!properties) return '';
  if (typeof properties === 'object') {
    return JSON.stringify(properties, null, 2);
  }
  return '';
};

const parsePropertiesText = (text: string) => {
  if (!text || !text.trim()) {
    return undefined;
  }
  const parsed = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('invalid');
  }
  return parsed as Record<string, any>;
};

const buildTypeSubmitData = (source: TypeVO, overrides: Partial<TypeForm> = {}): TypeForm => ({
  id: source.id,
  brandId: source.brandId,
  code: source.code,
  name: source.name,
  category: source.category,
  length: source.length,
  width: source.width,
  height: source.height,
  maxVelocity: source.maxVelocity,
  maxReverseVelocity: source.maxReverseVelocity,
  energyLevel: source.energyLevel,
  allowedOrders: source.allowedOrders,
  allowedPeripheralOperations: source.allowedPeripheralOperations,
  properties: source.properties,
  ...overrides
});

const initFormData = {
  id: undefined,
  brandId: undefined,
  code: undefined,
  name: undefined,
  category: undefined,
  length: null as number | null,
  width: null as number | null,
  height: null as number | null,
  maxVelocity: null as number | null,
  maxReverseVelocity: null as number | null,
  energyLevel: null as number | null,
  allowedOrders: undefined,
  allowedPeripheralOperations: undefined,
  allowedOrdersList: [] as string[],
  allowedPeripheralOperationsList: [] as string[]
};

const data = reactive<PageData<any, TypeQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    brandId: undefined
  },
  rules: {
    code: [
      { required: true, message: '类型编码不能为空', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_]+$/, message: '仅允许字母、数字和下划线', trigger: 'blur' }
    ],
    brandId: [{ required: true, message: '请选择所属品牌', trigger: 'change' }],
    name: [{ required: true, message: '类型名称不能为空', trigger: 'blur' }],
    category: [{ required: true, message: '请选择车辆形态', trigger: 'change' }],
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
  form.value.brandId = initFormData.brandId;
  form.value.code = initFormData.code;
  form.value.name = initFormData.name;
  form.value.category = initFormData.category;
  form.value.length = initFormData.length;
  form.value.width = initFormData.width;
  form.value.height = initFormData.height;
  form.value.maxVelocity = initFormData.maxVelocity;
  form.value.maxReverseVelocity = initFormData.maxReverseVelocity;
  form.value.energyLevel = initFormData.energyLevel;
  form.value.allowedOrders = initFormData.allowedOrders;
  form.value.allowedPeripheralOperations = initFormData.allowedPeripheralOperations;
  form.value.allowedOrdersList = [];
  form.value.allowedPeripheralOperationsList = [];
  typeFormRef.value?.resetFields();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  queryParams.value.name = undefined;
  queryParams.value.brandId = undefined;
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
  form.value.brandId = data.brandId;
  form.value.code = data.code;
  form.value.name = data.name;
  form.value.category = data.category;
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

  dialog.visible = true;
  dialog.title = '修改车辆类型';
};

/** 扩展参数配置 */
const handlePropertiesConfig = async (row?: TypeVO) => {
  const _id = row?.id || ids.value[0];
  if (!_id) {
    return;
  }
  const res = await getType(_id);
  const data = res.data;
  propertiesTypeData.value = data;
  propertiesTarget.code = data.code || '';
  propertiesTarget.name = data.name || '';
  propertiesForm.propertiesText = formatPropertiesText(data.properties);
  propertiesDialog.visible = true;
  await nextTick();
  propertiesFormRef.value?.clearValidate();
};

/** 保存扩展参数配置 */
const submitPropertiesConfig = () => {
  propertiesFormRef.value?.validate(async (valid: boolean) => {
    if (!valid || !propertiesTypeData.value) {
      return;
    }
    propertiesLoading.value = true;
    try {
      const properties = parsePropertiesText(propertiesForm.propertiesText);
      await updateType(buildTypeSubmitData(propertiesTypeData.value, { properties }));
      proxy?.$modal.msgSuccess('扩展参数保存成功');
      propertiesDialog.visible = false;
      await getList();
    } catch {
      proxy?.$modal.msgError('扩展参数 JSON 格式错误，请检查后重试');
    } finally {
      propertiesLoading.value = false;
    }
  });
};

/** 查看详情按钮操作 */
const handleDetail = async (row?: TypeVO) => {
  const _id = row?.id || ids.value[0];
  const res = await getType(_id);
  detailData.value = res.data;
  detailDialog.visible = true;
};

/** 提交按钮 */
const submitForm = () => {
  typeFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      
      // 构建提交数据
      const submitData: TypeForm = {
        id: form.value.id,
        brandId: form.value.brandId,
        code: form.value.code,
        name: form.value.name,
        category: form.value.category,
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
  getBrandList();
});

/** 获取品牌列表 */
const getBrandList = async () => {
  const res = await listBrandAll();
  brandList.value = res.data || [];
};
</script>

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.properties-target {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.properties-target__name {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.type-table :deep(.el-table__row) {
  cursor: pointer;
}
</style>

