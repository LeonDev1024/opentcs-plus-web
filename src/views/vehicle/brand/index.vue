<template>
  <div class="p-2">
    <!-- 搜索区域 -->
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="brand-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.keyword"
            placeholder="品牌编码或名称"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.enabled" placeholder="全部状态" clearable size="default">
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <el-button v-hasPermi="['opentcs:brand:add']" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          <el-button v-hasPermi="['opentcs:brand:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
            修改
          </el-button>
          <el-button v-hasPermi="['opentcs:brand:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
            删除
          </el-button>
          <el-button v-hasPermi="['opentcs:brand:edit']" type="success" plain icon="CircleCheck" :disabled="!canEnable" @click="changeSelectedStatus(true)">
            启用
          </el-button>
          <el-button v-hasPermi="['opentcs:brand:edit']" type="warning" plain icon="CircleClose" :disabled="!canDisable" @click="changeSelectedStatus(false)">
            禁用
          </el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table v-loading="loading" :data="brandList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="品牌编码" align="center" prop="code" min-width="120" show-overflow-tooltip />
        <el-table-column label="品牌名称" align="center" prop="name" min-width="150" show-overflow-tooltip />
        <el-table-column label="英文名称" align="center" prop="englishName" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="scope.row.englishName">{{ scope.row.englishName }}</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="品牌缩略图" width="160" align="center">
          <template #default="scope">
            <MasterDataLogo :src="scope.row.logo" :name="scope.row.name" :seed="scope.row.code" :width="112" :size="56" fit="contain" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'info'" effect="plain">
              {{ scope.row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" show-overflow-tooltip />
      </el-table>

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="getList"
      />
    </el-card>

    <!-- 添加或修改品牌对话框 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="640px"
      align-center
      destroy-on-close
      append-to-body
      @closed="brandFormRef?.resetFields()"
    >
      <el-form ref="brandFormRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="品牌编码" prop="code">
            <el-input v-model="form.code" :disabled="editing" placeholder="如 PJI" />
          </el-form-item>
          <el-form-item label="品牌名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入品牌名称" />
          </el-form-item>
          <el-form-item label="英文名称" prop="englishName">
            <el-input v-model="form.englishName" placeholder="请输入英文名称" />
          </el-form-item>
        </div>
        <el-form-item label="品牌缩略图">
          <LogoBase64Upload v-model="form.logo" :name="form.name" :seed="form.code" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请输入品牌描述" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancel">取 消</el-button>
        <el-button :loading="buttonLoading" type="primary" @click="submitForm">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Brand" lang="ts">
import { listBrand, getBrand, delBrand, addBrand, updateBrand, changeBrandStatus } from '@/api/deploy/device/brand';
import { BrandVO, BrandForm, BrandQuery } from '@/api/deploy/device/brand/types';
import LogoBase64Upload from '@/components/LogoBase64Upload.vue';
import MasterDataLogo from '@/components/MasterDataLogo.vue';
import { Refresh, Search } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const brandList = ref<BrandVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const selectedItems = ref<BrandVO[]>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const canEnable = computed(() => selectedItems.value.some((item) => !item.enabled));
const canDisable = computed(() => selectedItems.value.some((item) => item.enabled));

const brandFormRef = ref<ElFormInstance>();
const editing = ref(false);

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: BrandForm = {
  id: undefined,
  name: undefined,
  englishName: undefined,
  code: undefined,
  logo: undefined,
  description: undefined,
  enabled: true,
  sort: 0
};

const data = reactive<PageData<BrandForm, BrandQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    enabled: undefined
  },
  rules: {
    code: [
      { required: true, message: '请输入品牌编码', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_]+$/, message: '仅允许字母、数字和下划线', trigger: 'blur' }
    ],
    name: [
      { required: true, message: '请输入品牌名称', trigger: 'blur' },
      { min: 2, max: 64, message: '长度为 2 到 64 个字符', trigger: 'blur' }
    ]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询品牌列表 */
const getList = async () => {
  loading.value = true;
  try {
    const res = await listBrand(queryParams.value);
    brandList.value = res.rows;
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
  brandFormRef.value?.resetFields();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  queryParams.value.keyword = undefined;
  queryParams.value.enabled = undefined;
  handleQuery();
};

/** 多选框选中数据 */
const handleSelectionChange = (selection: BrandVO[]) => {
  ids.value = selection.map((item) => item.id);
  selectedItems.value = selection;
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  editing.value = false;
  dialog.visible = true;
  dialog.title = '新增品牌';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: BrandVO) => {
  reset();
  editing.value = true;
  const _id = row?.id || ids.value[0];
  const res = await getBrand(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '编辑品牌';
};

/** 批量启用/禁用 */
const changeSelectedStatus = async (enabled: boolean) => {
  const rows = selectedItems.value.filter((item) => item.enabled !== enabled);
  if (!rows.length) {
    return;
  }
  const statusText = enabled ? '启用' : '禁用';
  await proxy?.$modal.confirm(`确认要${statusText}选中的 ${rows.length} 个品牌吗？`);
  for (const row of rows) {
    await changeBrandStatus({ id: row.id, enabled });
  }
  proxy?.$modal.msgSuccess(`${statusText}成功`);
  await getList();
};

/** 删除按钮操作 */
const handleDelete = async (row?: BrandVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除选中的品牌数据？');
  await delBrand(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

/** 提交按钮 */
const submitForm = () => {
  brandFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      try {
        if (form.value.id) {
          await updateBrand(form.value);
          proxy?.$modal.msgSuccess('修改成功');
        } else {
          await addBrand(form.value);
          proxy?.$modal.msgSuccess('新增成功');
        }
        dialog.visible = false;
        await getList();
      } finally {
        buttonLoading.value = false;
      }
    }
  });
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
