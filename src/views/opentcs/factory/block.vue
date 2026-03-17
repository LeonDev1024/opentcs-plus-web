<template>
  <div class="block-container">
    <!-- 搜索 -->
    <el-card shadow="never">
      <el-form :inline="true" :model="queryParams" label-width="80px">
        <el-form-item label="工厂">
          <el-select v-model="queryParams.factoryModelId" placeholder="请选择工厂" clearable @change="handleFactoryChange">
            <el-option v-for="factory in factoryList" :key="factory.id" :label="factory.name" :value="factory.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域类型">
          <el-select v-model="queryParams.type" placeholder="请选择类型" clearable>
            <el-option label="工作区域" value="WORK" />
            <el-option label="禁行区域" value="FORBIDDEN" />
            <el-option label="等待区域" value="WAIT" />
            <el-option label="充电区域" value="CHARGE" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域名称">
          <el-input v-model="queryParams.name" placeholder="请输入区域名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="mt-2">
      <template #header>
        <el-row :gutter="10">
          <el-col :span="1.5">
            <el-button v-hasPermi="['factory:block:add']" type="primary" plain icon="Plus" @click="handleAdd">
              新增
            </el-button>
          </el-col>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="blockList" border stripe>
        <el-table-column label="区域ID" prop="blockId" width="150" />
        <el-table-column label="区域名称" prop="name" min-width="150" />
        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'WORK'" type="success">工作区域</el-tag>
            <el-tag v-else-if="row.type === 'FORBIDDEN'" type="danger">禁行区域</el-tag>
            <el-tag v-else-if="row.type === 'WAIT'" type="warning">等待区域</el-tag>
            <el-tag v-else-if="row.type === 'CHARGE'" type="primary">充电区域</el-tag>
            <span v-else>{{ row.type }}</span>
          </template>
        </el-table-column>
        <el-table-column label="颜色" width="80" align="center">
          <template #default="{ row }">
            <div v-if="row.color" class="color-box" :style="{ backgroundColor: row.color }"></div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="成员数量" width="100" align="center">
          <template #default="{ row }">
            {{ getMemberCount(row.members) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
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

    <!-- 添加/修改对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="区域ID" prop="blockId">
          <el-input v-model="form.blockId" placeholder="唯一标识" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="区域类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型">
            <el-option label="工作区域 (WORK)" value="WORK" />
            <el-option label="禁行区域 (FORBIDDEN)" value="FORBIDDEN" />
            <el-option label="等待区域 (WAIT)" value="WAIT" />
            <el-option label="充电区域 (CHARGE)" value="CHARGE" />
          </el-select>
        </el-form-item>
        <el-form-item label="显示颜色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
        <el-form-item label="所属工厂" prop="factoryModelId">
          <el-select v-model="form.factoryModelId" placeholder="请选择工厂">
            <el-option v-for="factory in factoryList" :key="factory.id" :label="factory.name" :value="factory.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listBlock, getBlock, createBlock, updateBlock, deleteBlock } from '@/api/opentcs/factory/block';
import { listFactoryModel } from '@/api/opentcs/factory/model';
import { ElMessageBox, ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';

const loading = ref(true);
const total = ref(0);
const blockList = ref<any[]>([]);
const factoryList = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  factoryModelId: undefined as number | undefined,
  type: undefined as string | undefined,
  name: undefined as string | undefined
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive({
  id: undefined as number | undefined,
  blockId: '',
  name: '',
  type: 'WORK',
  color: '#409EFF',
  factoryModelId: undefined as number | undefined
});

const rules = {
  name: [{ required: true, message: '区域名称不能为空', trigger: 'blur' }],
  blockId: [{ required: true, message: '区域ID不能为空', trigger: 'blur' }],
  type: [{ required: true, message: '请选择区域类型', trigger: 'change' }],
  factoryModelId: [{ required: true, message: '请选择所属工厂', trigger: 'change' }]
};

const formRef = ref<FormInstance>();

// 获取工厂列表
const getFactoryList = async () => {
  try {
    const res = await listFactoryModel({ pageNum: 1, pageSize: 100 });
    factoryList.value = res.rows || [];
  } catch (error) {
    console.error('获取工厂列表失败:', error);
  }
};

// 获取列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await listBlock(queryParams);
    blockList.value = res.rows || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error('获取区域列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 工厂变化
const handleFactoryChange = () => {
  queryParams.pageNum = 1;
  getList();
};

// 搜索
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

// 重置
const resetQuery = () => {
  queryParams.factoryModelId = undefined;
  queryParams.type = undefined;
  queryParams.name = undefined;
  queryParams.pageNum = 1;
  getList();
};

// 新增
const handleAdd = () => {
  resetForm();
  dialog.visible = true;
  dialog.title = '新增区域';
  form.factoryModelId = queryParams.factoryModelId;
};

// 修改
const handleUpdate = async (row: any) => {
  resetForm();
  const res = await getBlock(row.id);
  Object.assign(form, res.data);
  dialog.visible = true;
  dialog.title = '修改区域';
};

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认删除区域 "' + row.name + '" 吗？', '警告', { type: 'warning' });
    await deleteBlock(row.id);
    ElMessage.success('删除成功');
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 提交
const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    if (form.id) {
      await updateBlock(form);
      ElMessage.success('修改成功');
    } else {
      await createBlock(form);
      ElMessage.success('新增成功');
    }
    dialog.visible = false;
    getList();
  } catch (error) {
    console.error(error);
  }
};

// 取消
const cancel = () => {
  dialog.visible = false;
  resetForm();
};

// 重置表单
const resetForm = () => {
  form.id = undefined;
  form.blockId = '';
  form.name = '';
  form.type = 'WORK';
  form.color = '#409EFF';
  form.factoryModelId = undefined;
  formRef.value?.resetFields();
};

// 获取成员数量
const getMemberCount = (members: string) => {
  if (!members) return 0;
  try {
    const arr = JSON.parse(members);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
};

onMounted(() => {
  getFactoryList();
  getList();
});
</script>

<style scoped lang="scss">
.block-container {
  height: 100%;
  padding: 16px;

  .mt-2 {
    margin-top: 16px;
  }

  .color-box {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
}
</style>
