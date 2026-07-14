<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="80px">
          <el-form-item label="场景" prop="factoryModelId">
            <el-select v-model="queryParams.factoryModelId" placeholder="全部场景" clearable style="width: 200px" @change="handleQuery">
              <el-option v-for="f in factoryList" :key="f.id" :label="f.name" :value="f.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="区域名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入区域名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="区域类型" prop="type">
            <el-select v-model="queryParams.type" placeholder="全部类型" clearable style="width: 200px">
              <el-option v-for="t in blockTypes" :key="t" :label="blockTypeLabel(t)" :value="t" />
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
            <el-button v-hasPermi="['factory:block:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['factory:block:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['factory:block:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">删除</el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </el-row>
      </template>

      <el-table v-loading="loading" :data="blockList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="区域ID" align="center" prop="blockId" min-width="120" show-overflow-tooltip />
        <el-table-column label="区域名称" align="center" prop="name" min-width="140" />
        <el-table-column label="区域类型" align="center" prop="type" min-width="160">
          <template #default="{ row }">
            {{ blockTypeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="场景ID" align="center" prop="factoryModelId" width="100" />
        <el-table-column label="地图ID" align="center" prop="navigationMapId" width="100" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
        <el-table-column label="操作" align="center" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['factory:block:edit']" link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['factory:block:remove']" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属场景" prop="factoryModelId">
          <el-select v-model="form.factoryModelId" placeholder="请选择场景" style="width: 100%">
            <el-option v-for="f in factoryList" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域ID" prop="blockId">
          <el-input v-model="form.blockId" placeholder="请输入区域ID" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="区域类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择区域类型" style="width: 100%">
            <el-option v-for="t in blockTypes" :key="t" :label="blockTypeLabel(t)" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="成员资源" prop="members">
          <el-input v-model="form.members" type="textarea" :rows="4" placeholder="JSON 格式的成员资源列表" />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-input v-model="form.color" placeholder="如 #F44336" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :loading="dialog.loading" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="MapAreas">
import { listBlock, getBlock, createBlock, updateBlock, deleteBlock, getBlockTypes } from '@/api/deploy/factory/block';
import { listFactoryModel } from '@/api/deploy/factory/model';
import type { FactoryModelVO } from '@/api/deploy/factory/model/types';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';

interface BlockVO {
  id?: number;
  factoryModelId?: number;
  navigationMapId?: number;
  blockId?: string;
  name?: string;
  type?: string;
  members?: string;
  color?: string;
  createTime?: string;
}

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const blockList = ref<BlockVO[]>([]);
const factoryList = ref<FactoryModelVO[]>([]);
const blockTypes = ref<string[]>([]);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);

const queryFormRef = ref<FormInstance>();
const formRef = ref<FormInstance>();

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  factoryModelId: undefined as number | undefined,
  name: undefined as string | undefined,
  type: undefined as string | undefined,
});

const dialog = reactive({
  visible: false,
  title: '',
  loading: false,
});

const form = reactive<BlockVO>({
  id: undefined,
  factoryModelId: undefined,
  blockId: '',
  name: '',
  type: '',
  members: '[]',
  color: '#F44336',
});

const rules = {
  factoryModelId: [{ required: true, message: '请选择场景', trigger: 'change' }],
  blockId: [{ required: true, message: '区域ID不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '区域名称不能为空', trigger: 'blur' }],
  type: [{ required: true, message: '请选择区域类型', trigger: 'change' }],
};

const blockTypeLabel = (type?: string) => {
  if (type === 'SINGLE_VEHICLE_ONLY') return '单车互斥';
  if (type === 'SAME_DIRECTION_ONLY') return '同向通行';
  return type || '-';
};

const getFactoryList = async () => {
  const res = await listFactoryModel({ pageNum: 1, pageSize: 200 });
  factoryList.value = res.rows || [];
};

const loadBlockTypes = async () => {
  const res = await getBlockTypes();
  blockTypes.value = (res as any).data ?? res ?? [];
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listBlock(queryParams);
    blockList.value = (res as any).rows ?? [];
    total.value = (res as any).total ?? 0;
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const handleSelectionChange = (selection: BlockVO[]) => {
  ids.value = selection.map((item) => item.id!).filter(Boolean);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

const resetForm = () => {
  form.id = undefined;
  form.factoryModelId = queryParams.factoryModelId;
  form.navigationMapId = undefined;
  form.blockId = '';
  form.name = '';
  form.type = blockTypes.value[0] ?? '';
  form.members = '[]';
  form.color = '#F44336';
  formRef.value?.resetFields();
};

const handleAdd = () => {
  resetForm();
  dialog.visible = true;
  dialog.title = '新增区域';
};

const handleUpdate = async (row?: BlockVO) => {
  const id = row?.id ?? ids.value[0];
  if (!id) return;
  const res = await getBlock(Number(id));
  const data = (res as any).data ?? res;
  Object.assign(form, data);
  dialog.visible = true;
  dialog.title = '修改区域';
};

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  dialog.loading = true;
  try {
    if (form.id) {
      await updateBlock(form);
      ElMessage.success('修改成功');
    } else {
      await createBlock(form);
      ElMessage.success('新增成功');
    }
    dialog.visible = false;
    await getList();
  } finally {
    dialog.loading = false;
  }
};

const cancel = () => {
  dialog.visible = false;
  resetForm();
};

const handleDelete = async (row?: BlockVO) => {
  const deleteIds = row?.id ? [row.id] : ids.value;
  if (!deleteIds.length) return;
  await ElMessageBox.confirm('确认删除选中的区域吗？', '警告', { type: 'warning' });
  for (const id of deleteIds) {
    await deleteBlock(Number(id));
  }
  ElMessage.success('删除成功');
  await getList();
};

onMounted(async () => {
  await Promise.all([getFactoryList(), loadBlockTypes()]);
  await getList();
});
</script>
