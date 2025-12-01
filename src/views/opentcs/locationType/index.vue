<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
          <el-form-item label="位置类型名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入位置类型名称" clearable @keyup.enter="handleQuery" />
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
            <el-button v-hasPermi="['opentcs:locationType:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:locationType:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
              修改
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:locationType:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="locationTypeList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="id" align="center" prop="id" width="80" />
        <el-table-column label="位置类型名称" align="center" prop="name" min-width="150" />
        <el-table-column label="允许的操作" align="center" prop="allowedOperations" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-for="(op, index) in getOperationsList(scope.row.allowedOperations)" :key="index" size="small" style="margin-right: 4px;">
              {{ op }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="允许的外设操作" align="center" prop="allowedPeripheralOperations" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-for="(op, index) in getOperationsList(scope.row.allowedPeripheralOperations)" :key="index" size="small" type="info" style="margin-right: 4px;">
              {{ op }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Symbol图标" align="center" min-width="100">
          <template #default="scope">
            <span v-if="getSymbol(scope.row.properties)">{{ getSymbol(scope.row.properties) }}</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['opentcs:locationType:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['opentcs:locationType:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>
    <!-- 添加或修改位置类型对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="locationTypeFormRef" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="位置类型名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入位置类型名称" />
        </el-form-item>
        <el-form-item label="允许的操作" prop="allowedOperations">
          <el-select v-model="form.allowedOperationsList" multiple placeholder="请选择允许的操作" style="width: 100%;">
            <el-option label="LOAD" value="LOAD" />
            <el-option label="UNLOAD" value="UNLOAD" />
            <el-option label="NOP" value="NOP" />
            <el-option label="MOVE" value="MOVE" />
            <el-option label="PARK" value="PARK" />
            <el-option label="CHARGE" value="CHARGE" />
          </el-select>
          <div class="form-tip">选择该位置类型支持的小车动作</div>
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
          <div class="form-tip">选择该位置类型支持的外设动作</div>
        </el-form-item>
        <el-form-item label="ICON图标" prop="symbol">
          <IconifyIconSelect v-model="form.symbol" />
          <div class="form-tip">选择 Iconify 图标或输入自定义文本（如：L, P, W等），用于在地图上显示该位置类型的标识</div>
        </el-form-item>
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

<script setup name="LocationType" lang="ts">
import { listLocationType, getLocationType, delLocationType, addLocationType, updateLocationType } from '@/api/opentcs/locationType';
import { LocationTypeVO, LocationTypeQuery, LocationTypeForm } from '@/api/opentcs/locationType/types';
import IconifyIconSelect from '@/components/IconifyIconSelect/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const locationTypeList = ref<LocationTypeVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const locationTypeFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

// 将操作列表（对象数组）转换为名称数组
const getOperationsList = (operations?: Array<{ name: string }>): string[] => {
  if (!operations || !Array.isArray(operations)) return [];
  return operations.map(op => op.name).filter((name: string) => name);
};

// 解析操作数组（对象数组）为名称数组
const parseOperationsArray = (operations?: Array<{ name: string }>): string[] => {
  if (!operations || !Array.isArray(operations)) return [];
  return operations.map(op => op.name).filter((name: string) => name);
};

// 从properties中获取Symbol
const getSymbol = (properties?: Record<string, any>): string | null => {
  if (!properties) return null;
  return properties.symbol || properties.Symbol || null;
};

const initFormData = {
  id: undefined,
  name: undefined,
  allowedOperations: undefined,
  allowedPeripheralOperations: undefined,
  properties: undefined,
  allowedOperationsList: [] as string[],
  allowedPeripheralOperationsList: [] as string[],
  symbol: '',
  propertiesText: ''
};

const data = reactive<PageData<any, LocationTypeQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined
  },
  rules: {
    name: [{ required: true, message: '位置类型名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询位置类型列表 */
const getList = async () => {
  loading.value = true;
  const res = await listLocationType(queryParams.value);
  locationTypeList.value = res.rows;
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
  locationTypeFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: LocationTypeVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加位置类型';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: LocationTypeVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getLocationType(_id);
  const data = res.data;
  
  // 解析数据到表单
  form.value.id = data.id;
  form.value.name = data.name;
  
  // 解析 allowedOperations（对象数组）
  form.value.allowedOperationsList = parseOperationsArray(data.allowedOperations);
  
  // 解析 allowedPeripheralOperations（对象数组）
  form.value.allowedPeripheralOperationsList = parseOperationsArray(data.allowedPeripheralOperations);
  
  // 解析properties（对象类型）
  form.value.symbol = data.properties?.symbol || data.properties?.Symbol || '';
  // 将properties对象转换为JSON字符串用于编辑
  form.value.propertiesText = data.properties ? JSON.stringify(data.properties, null, 2) : '';
  
  dialog.visible = true;
  dialog.title = '修改位置类型';
};

/** 提交按钮 */
const submitForm = () => {
  locationTypeFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      
      // 构建提交数据
      const submitData: LocationTypeForm = {
        id: form.value.id,
        name: form.value.name,
        // 将选中的操作转换为对象数组格式 [{ "name": "LOAD" }]
        allowedOperations: form.value.allowedOperationsList.map(name => ({ name })),
        allowedPeripheralOperations: form.value.allowedPeripheralOperationsList.map(name => ({ name }))
      };
      
      // 处理properties（对象类型）
      const props: Record<string, any> = {};
      if (form.value.symbol) {
        props.symbol = form.value.symbol;
      }
      
      // 如果propertiesText存在，尝试解析并合并
      if (form.value.propertiesText) {
        try {
          const parsedProps = JSON.parse(form.value.propertiesText);
          Object.assign(props, parsedProps);
          // 确保symbol优先使用表单中的值
          if (form.value.symbol) {
            props.symbol = form.value.symbol;
          }
        } catch {
          // 如果解析失败，只使用symbol
        }
      }
      
      // properties 直接作为对象传递，而不是JSON字符串
      submitData.properties = Object.keys(props).length > 0 ? props : undefined;
      
      try {
        if (form.value.id) {
          await updateLocationType(submitData);
        } else {
          await addLocationType(submitData);
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
const handleDelete = async (row?: LocationTypeVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除位置类型编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delLocationType(_ids);
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

