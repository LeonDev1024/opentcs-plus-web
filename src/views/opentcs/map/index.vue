<template>
  <div class="map-management">
    <!-- 地图列表区域 -->
    <div class="map-list-panel">
      <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
        <div v-show="showSearch" class="search">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="100px">
            <el-form-item label="工厂模型名称" prop="name">
              <el-input v-model="queryParams.name" placeholder="请输入工厂模型名称" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-select v-model="queryParams.status" placeholder="状态" clearable>
                <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
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
              <el-button v-hasPermi="['opentcs:mapModel:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
            </el-col>
            <el-col :span="1.5">
              <el-button v-hasPermi="['opentcs:mapModel:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
                修改
              </el-button>
            </el-col>
            <el-col :span="1.5">
              <el-button v-hasPermi="['opentcs:mapModel:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
                删除
              </el-button>
            </el-col>
            <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
          </el-row>
        </template>

        <el-table v-loading="loading" :data="mapList" border @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="工厂模型ID" align="center" prop="id" width="200" />
          <el-table-column label="工厂模型名称" align="center" prop="name" />
          <el-table-column label="版本" align="center" prop="modelVersion" width="100" />
          <el-table-column key="status" label="状态" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)"></el-switch>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
          <el-table-column label="描述" align="center" prop="description" show-overflow-tooltip />

          <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="180">
            <template #default="scope">
              <el-tooltip content="编辑地图" placement="top">
                <el-button v-hasPermi="['opentcs:mapModel:edit']" link type="primary" icon="EditPen" @click="handleEdit(scope.row)"></el-button>
              </el-tooltip>
              <el-tooltip content="加载地图" placement="top">
                <el-button v-hasPermi="['opentcs:mapModel:edit']" link type="primary" icon="Upload" @click="handleLoad(scope.row)"></el-button>
              </el-tooltip>
              <el-tooltip content="修改" placement="top">
                <el-button v-hasPermi="['opentcs:mapModel:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button v-hasPermi="['opentcs:mapModel:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
      </el-card>
      <!-- 添加或修改地图模型对话框 -->
      <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
        <el-form ref="mapFormRef" :model="form" :rules="rules" label-width="120px">
          <el-form-item label="地图模型名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入地图模型名称" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="form.status">
              <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">
                {{ dict.label }}
              </el-radio>
            </el-radio-group>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
import { ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { listMap, getMap, delMap, addMap, updateMap } from '@/api/opentcs/map';
import type { MapVO, MapQuery, MapForm } from '@/api/opentcs/map/types';

const { proxy } = getCurrentInstance() as any;
const { sys_normal_disable } = proxy?.useDict('sys_normal_disable') || {};

const mapList = ref<MapVO[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<string[]>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const buttonLoading = ref(false);

const queryParams = reactive<MapQuery>({
  pageNum: 1,
  pageSize: 10,
  name: undefined,
  status: undefined
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive<MapForm>({
  id: undefined,
  name: '',
  description: '',
  status: '0'
});

const rules = reactive({
  name: [{ required: true, message: '地图模型名称不能为空', trigger: 'blur' }]
});

const mapFormRef = ref<FormInstance>();

// 查询列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await listMap(queryParams);
    mapList.value = res.rows;
    total.value = res.total;
  } catch (error) {
    console.error('获取地图列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 搜索按钮
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

// 重置按钮
const resetQuery = () => {
  queryParams.name = undefined;
  queryParams.status = undefined;
  handleQuery();
};

// 多选框选中数据
const handleSelectionChange = (selection: MapVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

// 新增按钮操作
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加地图模型';
};

// 修改按钮操作
const handleUpdate = async (row?: MapVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getMap(_id);
  Object.assign(form, res.data);
  dialog.visible = true;
  dialog.title = '修改地图模型';
};

// 提交按钮
const submitForm = async () => {
  const valid = await mapFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  buttonLoading.value = true;
  try {
    if (form.id) {
      await updateMap(form);
    } else {
      await addMap(form);
    }
    dialog.visible = false;
    getList();
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    buttonLoading.value = false;
  }
};

// 删除按钮操作
const handleDelete = async (row?: MapVO) => {
  const _ids = row?.id || ids.value;
  try {
    await proxy?.$modal.confirm('是否确认删除地图模型编号为"' + _ids + '"的数据项？');
    await delMap(_ids);
    proxy?.$modal.msgSuccess('删除成功');
    getList();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 状态修改
const handleStatusChange = async (row: MapVO) => {
  try {
    await proxy?.$modal.confirm('确认要修改"' + row.name + '"状态吗？');
    await updateMap({ ...row, id: row.id });
    proxy?.$modal.msgSuccess('状态修改成功');
  } catch (error) {
    row.status = row.status === '0' ? '1' : '0';
  }
};

// 重置表单
const reset = () => {
  form.id = undefined;
  form.name = '';
  form.description = '';
  form.status = '0';
  mapFormRef.value?.resetFields();
};

// 取消按钮
const cancel = () => {
  dialog.visible = false;
  reset();
};

// 编辑地图（打开新标签页）
const handleEdit = (row: MapVO) => {
  const url = `/map/mapeditor?id=${row.id}&name=${encodeURIComponent(row.name)}`;
  window.open(url, '_blank');
};

// 加载地图（打开新标签页）
const handleLoad = (row: MapVO) => {
  const url = `/map/mapeditor?id=${row.id}&name=${encodeURIComponent(row.name)}`;
  window.open(url, '_blank');
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.map-management {
  height: 100%;
  padding: 16px;

  .map-list-panel {
    height: 100%;
    overflow: auto;
  }
}
</style>
