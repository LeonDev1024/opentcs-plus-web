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

      <el-table v-loading="loading" :data="locationList" border @selection-change="handleSelectionChange">
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
        <el-table-column label="工作站图标" align="center" min-width="100">
          <template #default="scope">
            <svg-icon v-if="getSymbol(scope.row.properties)" :icon-class="getSymbol(scope.row.properties)" style="font-size: 20px;" />
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
      <el-form ref="locationFormRef" :model="form" :rules="rules" label-width="140px">
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
        <el-form-item label="工作站图标" prop="symbol">
          <LocationIconSelect v-model="form.symbol" />
          <div class="form-tip">选择 assets/location 目录下的图标，用于在地图上显示该位置类型的标识</div>
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

<script setup name="Location" lang="ts">
import { listLocation, getLocation, delLocation, addLocation, updateLocation } from '@/api/opentcs/map/location';
import { LocationVO, LocationQuery, LocationForm } from '@/api/opentcs/map/location/types';
import LocationIconSelect from '@/components/LocationIconSelect/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const locationList = ref<LocationVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const locationFormRef = ref<ElFormInstance>();

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

// 从properties中获取Symbol（properties是数组类型，格式为 [{"name":"symbol","value":"bettery"}]）
const getSymbol = (properties?: Array<Record<string, any>>): string | null => {
  if (!properties || !Array.isArray(properties)) return null;
  // 从数组中查找 name 为 "symbol" 或 "Symbol" 的项
  for (const prop of properties) {
    if (prop.name === 'symbol' || prop.name === 'Symbol') {
      return prop.value || null;
    }
    // 兼容旧格式：直接包含 symbol 或 Symbol 键
    if (prop.symbol) return prop.symbol;
    if (prop.Symbol) return prop.Symbol;
  }
  return null;
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

const data = reactive<PageData<any, LocationQuery>>({
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
  const res = await listLocation(queryParams.value);
  locationList.value = res.rows;
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
  locationFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: LocationVO[]) => {
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
const handleUpdate = async (row?: LocationVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getLocation(_id);
  const data = res.data;
  
  // 解析数据到表单
  form.value.id = data.id;
  form.value.name = data.name;
  
  // 解析 allowedOperations（对象数组）
  form.value.allowedOperationsList = parseOperationsArray(data.allowedOperations);
  
  // 解析 allowedPeripheralOperations（对象数组）
  form.value.allowedPeripheralOperationsList = parseOperationsArray(data.allowedPeripheralOperations);
  
  // 解析properties（数组类型，格式为 [{"name":"symbol","value":"bettery"}]）
  if (data.properties && Array.isArray(data.properties)) {
    // 从数组中查找 name 为 "symbol" 或 "Symbol" 的项
    const symbolProp = data.properties.find(p => p.name === 'symbol' || p.name === 'Symbol');
    form.value.symbol = symbolProp?.value || '';
    // 兼容旧格式：直接包含 symbol 或 Symbol 键
    if (!form.value.symbol) {
      const oldSymbolProp = data.properties.find(p => p.symbol || p.Symbol);
      form.value.symbol = oldSymbolProp?.symbol || oldSymbolProp?.Symbol || '';
    }
    // 将除了symbol之外的其他参数转换为JSON字符串用于编辑
    const otherProps = data.properties.filter(p => {
      const name = p.name || '';
      return name !== 'symbol' && name !== 'Symbol' && !('symbol' in p) && !('Symbol' in p);
    });
    form.value.propertiesText = otherProps.length > 0 ? JSON.stringify(otherProps, null, 2) : '';
  } else {
    form.value.symbol = '';
    form.value.propertiesText = '';
  }
  
  dialog.visible = true;
  dialog.title = '修改位置类型';
};

/** 提交按钮 */
const submitForm = () => {
  locationFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      
      // 构建提交数据
      const submitData: LocationForm = {
        id: form.value.id,
        name: form.value.name,
        // 将选中的操作转换为对象数组格式 [{ "name": "LOAD" }]
        allowedOperations: form.value.allowedOperationsList.map(name => ({ name })),
        allowedPeripheralOperations: form.value.allowedPeripheralOperationsList.map(name => ({ name }))
      };
      
      // 处理properties（数组类型，格式为 [{"name":"symbol","value":"bettery"}]）
      // propertiesText 只包含除了 symbol 之外的其他参数
      const propsArray: Array<Record<string, any>> = [];
      
      // 如果propertiesText存在且不为空，尝试解析（这些是除了symbol之外的其他参数）
      if (form.value.propertiesText && form.value.propertiesText.trim()) {
        try {
          const parsedProps = JSON.parse(form.value.propertiesText);
          // 如果解析出来是数组，直接使用
          if (Array.isArray(parsedProps)) {
            propsArray.push(...parsedProps);
          } else if (typeof parsedProps === 'object' && parsedProps !== null) {
            // 如果是对象，转换为数组项
            propsArray.push(parsedProps);
          }
        } catch {
          // 如果解析失败，忽略
        }
      }
      
      // 如果有symbol，添加到properties数组中（格式为 {"name":"symbol","value":"bettery"}）
      if (form.value.symbol) {
        propsArray.push({ name: 'symbol', value: form.value.symbol });
      }
      
      // 过滤掉空对象（如 {"name":"","value":""} 或所有值为空的对象）
      const filteredProps = propsArray.filter(prop => {
        // 检查对象是否有任何非空值
        const hasNonEmptyValue = Object.values(prop).some(value => {
          if (value === null || value === undefined) return false;
          if (typeof value === 'string' && value.trim() === '') return false;
          return true;
        });
        return hasNonEmptyValue;
      });
      
      // properties 作为数组传递（过滤后的），如果为空则不传递
      submitData.properties = filteredProps.length > 0 ? filteredProps : undefined;
      
      try {
        if (form.value.id) {
          await updateLocation(submitData);
        } else {
          await addLocation(submitData);
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
const handleDelete = async (row?: LocationVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除位置类型编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delLocation(_ids);
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

