<template>
  <div class="p-4">
    <!-- 搜索区域 -->
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-if="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="80px">
          <el-form-item label="品牌名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入品牌名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="品牌Code" prop="code">
            <el-input v-model="queryParams.code" placeholder="请输入品牌Code" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="enabled">
            <el-select v-model="queryParams.enabled" placeholder="请选择状态" clearable style="width: 150px;">
              <el-option label="启用" :value="true" />
              <el-option label="禁用" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </transition>

    <!-- 操作栏 + 卡片列表 -->
    <el-card shadow="never">
      <template #header>
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button v-hasPermi="['opentcs:brand:add']" type="primary" plain icon="Plus" @click="handleAdd">
              新增品牌
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <!-- 品牌卡片列表 -->
      <div v-loading="loading" class="brand-card-list">
        <el-row :gutter="20">
          <el-col v-for="brand in brandList" :key="brand.id" :xs="24" :sm="12" :md="8" :lg="5">
            <el-card class="brand-card" shadow="hover">
              <!-- 顶部：Code + 名称 -->
              <div class="brand-card-header">
                <div class="brand-code">{{ brand.code }}</div>
                <div class="brand-name">{{ brand.name }}</div>
              </div>
              <!-- 中间：Logo -->
              <div class="brand-card-logo">
                <el-image v-if="brand.logo" :src="brand.logo" fit="contain" class="logo-img">
                  <template #error>
                    <div class="logo-placeholder">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div v-else class="logo-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
              </div>
              <!-- 底部：操作栏 -->
              <div class="brand-card-footer">
                <el-button link type="primary" icon="Edit" @click="handleUpdate(brand)">
                  编辑
                </el-button>
                <el-button link :type="brand.enabled ? 'danger' : 'success'" @click="handleChangeStatus(brand)">
                  {{ brand.enabled ? '禁用' : '启用' }}
                </el-button>
                <el-button link type="danger" icon="Delete" @click="handleDelete(brand)">
                  删除
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>

      <!-- 空状态 -->
      <el-empty v-if="brandList.length === 0 && !loading" description="暂无品牌数据" />
    </div>

    <!-- 分页 -->
    <pagination
      v-show="total > 0"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      :total="total"
      @pagination="getList"
    />
    </el-card>

    <!-- 添加或修改品牌对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="brandFormRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="品牌名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入品牌名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌Code" prop="code">
              <el-input v-model="form.code" placeholder="请输入品牌Code，如：HIK" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Logo" prop="logo">
              <el-input v-model="form.logo" placeholder="请输入Logo URL" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="官网" prop="website">
              <el-input v-model="form.website" placeholder="请输入官网地址" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系方式" prop="contact">
              <el-input v-model="form.contact" placeholder="请输入联系方式" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" :controls="false" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入品牌描述" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-radio-group v-model="form.enabled">
            <el-radio :value="true">启用</el-radio>
            <el-radio :value="false">禁用</el-radio>
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
</template>

<script setup name="Brand" lang="ts">
import { listBrand, getBrand, delBrand, addBrand, updateBrand, changeBrandStatus } from '@/api/deploy/device/brand';
import { BrandVO, BrandForm, BrandQuery } from '@/api/deploy/device/brand/types';
import { Picture } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const brandList = ref<BrandVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const brandFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData = {
  id: undefined,
  name: undefined,
  code: undefined,
  logo: undefined,
  website: undefined,
  description: undefined,
  contact: undefined,
  enabled: true,
  sort: 0
};

const data = reactive<PageData<any, BrandQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 12,
    name: undefined,
    code: undefined,
    enabled: undefined
  },
  rules: {
    name: [{ required: true, message: '品牌名称不能为空', trigger: 'blur' }],
    code: [{ required: true, message: '品牌Code不能为空', trigger: 'blur' }]
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
  queryFormRef.value?.resetFields();
  handleQuery();
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加品牌';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: BrandVO) => {
  reset();
  const _id = row?.id;
  const res = await getBrand(_id as string | number);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改品牌';
};

/** 启用/禁用 */
const handleChangeStatus = async (row: BrandVO) => {
  const statusText = row.enabled ? '禁用' : '启用';
  await proxy?.$modal.confirm(`确认要${statusText}"${row.name}"品牌吗？`);
  await changeBrandStatus({ id: row.id, enabled: !row.enabled });
  proxy?.$modal.msgSuccess(`${statusText}成功`);
  await getList();
};

/** 删除按钮操作 */
const handleDelete = async (row: BrandVO) => {
  await proxy?.$modal.confirm(`确认要删除品牌"${row.name}"吗？`);
  await delBrand(row.id);
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
.brand-card-list {
  min-height: 400px;
}

.brand-card {
  margin-bottom: 20px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
  }

  .brand-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
    margin-bottom: 12px;

    .brand-code {
      font-size: 12px;
      color: #909399;
    }

    .brand-name {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .brand-card-logo {
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;

    .logo-img {
      max-height: 90px;
      max-width: 140px;
      width: auto;
      height: auto;
    }

    .logo-placeholder {
      color: #c0c4cc;
      font-size: 32px;
    }
  }

  .brand-card-footer {
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: center;
    gap: 16px;
  }
}
</style>
