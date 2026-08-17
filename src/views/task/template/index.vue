<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="template-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.keyword"
            placeholder="模板号或名称"
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
          <el-button v-hasPermi="['task:template:add']" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          <el-button v-hasPermi="['task:template:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
            修改
          </el-button>
          <el-button v-hasPermi="['task:template:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
            删除
          </el-button>
          <el-button v-hasPermi="['task:template:edit']" type="success" plain icon="CircleCheck" :disabled="!canEnable" @click="changeSelectedStatus(true)">
            启用
          </el-button>
          <el-button v-hasPermi="['task:template:edit']" type="warning" plain icon="CircleClose" :disabled="!canDisable" @click="changeSelectedStatus(false)">
            禁用
          </el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table v-loading="loading" :data="templateList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="模板号" align="center" prop="code" min-width="120" show-overflow-tooltip />
        <el-table-column label="模板名称" align="center" prop="name" min-width="140" show-overflow-tooltip />
        <el-table-column label="所属地图" align="center" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            {{ mapNameOf(scope.row.navigationMapId) }}
          </template>
        </el-table-column>
        <el-table-column label="起点" align="center" min-width="120" show-overflow-tooltip>
          <template #default="scope">
            {{ pointNoOf(scope.row.navigationMapId, scope.row.sourcePoint) }}
          </template>
        </el-table-column>
        <el-table-column label="终点" align="center" min-width="120" show-overflow-tooltip>
          <template #default="scope">
            {{ pointNoOf(scope.row.navigationMapId, scope.row.destPoint) }}
          </template>
        </el-table-column>
        <el-table-column label="默认优先级" align="center" prop="priority" width="110">
          <template #default="scope">
            <span>{{ scope.row.priority ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'info'" effect="plain">
              {{ scope.row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" align="center" prop="remark" min-width="140" show-overflow-tooltip />
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

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="560px"
      align-center
      destroy-on-close
      append-to-body
      @closed="templateFormRef?.resetFields()"
    >
      <el-form ref="templateFormRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="模板号" prop="code">
          <el-input v-model="form.code" :disabled="editing" placeholder="请输入模板号" maxlength="64" />
          <div class="form-tip">仅支持数字、字母、下划线</div>
        </el-form-item>
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="所属地图" prop="navigationMapId">
          <el-select
            v-model="form.navigationMapId"
            placeholder="请选择导航地图"
            filterable
            style="width: 100%"
            @change="onMapChange"
          >
            <el-option
              v-for="item in mapOptions"
              :key="item.id"
              :label="`${item.name}（${item.mapId}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="起点" prop="sourcePoint">
          <el-select
            v-model="form.sourcePoint"
            placeholder="请选择导航点"
            filterable
            :disabled="!form.navigationMapId"
            :loading="pointsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="item in pointOptions"
              :key="item.pointId"
              :label="formatPointLabel(item)"
              :value="item.pointId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="终点" prop="destPoint">
          <el-select
            v-model="form.destPoint"
            placeholder="请选择导航点"
            filterable
            :disabled="!form.navigationMapId"
            :loading="pointsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="item in pointOptions"
              :key="`dest-${item.pointId}`"
              :label="formatPointLabel(item)"
              :value="item.pointId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="默认优先级" prop="priority">
          <el-input-number v-model="form.priority" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          <div class="form-tip">越大越优先，创建任务时可覆盖</div>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请输入备注" />
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

<script setup name="TaskConfigTemplate" lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue';
import {
  addTaskTemplate,
  changeTaskTemplateStatus,
  delTaskTemplate,
  getTaskTemplate,
  listTaskTemplate,
  updateTaskTemplate
} from '@/api/task/template';
import { TaskTemplateForm, TaskTemplateQuery, TaskTemplateVO } from '@/api/task/template/types';
import { listNavigationMap } from '@/api/deploy/factory/map';
import { NavigationMapVO } from '@/api/deploy/factory/map/types';
import { listPointsByMap, MapPointOption } from '@/api/deploy/map-editor/point';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const templateList = ref<TaskTemplateVO[]>([]);
const mapOptions = ref<NavigationMapVO[]>([]);
const pointOptions = ref<MapPointOption[]>([]);
/** mapId:pointId → 点位编号（优先名称，与地图主数据一致） */
const pointNoCache = ref<Record<string, string>>({});
const buttonLoading = ref(false);
const pointsLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const selectedItems = ref<TaskTemplateVO[]>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const editing = ref(false);

const canEnable = computed(() => selectedItems.value.some((item) => !item.enabled));
const canDisable = computed(() => selectedItems.value.some((item) => item.enabled));

const templateFormRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: TaskTemplateForm = {
  id: undefined,
  code: undefined,
  name: undefined,
  navigationMapId: undefined,
  sourcePoint: undefined,
  destPoint: undefined,
  priority: 0,
  enabled: true,
  remark: undefined
};

const data = reactive<PageData<TaskTemplateForm, TaskTemplateQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    enabled: undefined
  },
  rules: {
    code: [
      { required: true, message: '请输入模板号', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_]+$/, message: '仅允许字母、数字和下划线', trigger: 'blur' }
    ],
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    navigationMapId: [{ required: true, message: '请选择所属地图', trigger: 'change' }],
    sourcePoint: [{ required: true, message: '请选择起点导航点', trigger: 'change' }],
    destPoint: [{ required: true, message: '请选择终点导航点', trigger: 'change' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 点位编号：与地图主数据一致，优先名称，否则 pointId */
const resolvePointNo = (point: Pick<MapPointOption, 'pointId' | 'name'> & { code?: string }) => {
  const name = point.name != null ? String(point.name).trim() : '';
  const code = point.code != null ? String(point.code).trim() : '';
  return name || code || point.pointId || '-';
};

const formatPointLabel = (point: MapPointOption) => resolvePointNo(point);

const pointCacheKey = (mapId: number | string, pointId: string) => `${mapId}:${pointId}`;

const pointNoOf = (mapId?: number, pointId?: string) => {
  if (pointId == null || String(pointId).trim() === '') return '-';
  const id = String(pointId).trim();
  if (mapId == null) return id;
  return pointNoCache.value[pointCacheKey(mapId, id)] || id;
};

const mapNameOf = (mapId?: number) => {
  if (mapId == null) return '-';
  const map = mapOptions.value.find((item) => item.id === mapId);
  return map ? map.name : String(mapId);
};

const normalizePoints = (rows: any[]): MapPointOption[] => {
  return (rows || [])
    .map((point) => ({
      ...point,
      pointId: String(point.pointId ?? point.code ?? point.name ?? point.id ?? ''),
      name: point.name != null ? String(point.name) : undefined
    }))
    .filter((point) => !!point.pointId);
};

const rememberPoints = (mapId: number, points: MapPointOption[]) => {
  const next = { ...pointNoCache.value };
  points.forEach((point) => {
    next[pointCacheKey(mapId, point.pointId)] = resolvePointNo(point);
  });
  pointNoCache.value = next;
};

const loadMaps = async () => {
  try {
    const res = await listNavigationMap({ pageNum: 1, pageSize: 500 });
    mapOptions.value = res.rows || [];
  } catch {
    mapOptions.value = [];
  }
};

const loadPoints = async (mapId?: number) => {
  if (!mapId) {
    pointOptions.value = [];
    return;
  }
  pointsLoading.value = true;
  try {
    const res = await listPointsByMap(mapId);
    pointOptions.value = normalizePoints(res.data || []);
    rememberPoints(mapId, pointOptions.value);
  } catch {
    pointOptions.value = [];
  } finally {
    pointsLoading.value = false;
  }
};

const ensurePointNosForList = async (rows: TaskTemplateVO[]) => {
  const mapIds = [...new Set(rows.map((row) => row.navigationMapId).filter((id): id is number => id != null))];
  await Promise.all(
    mapIds.map(async (mapId) => {
      const needLoad = rows.some((row) => {
        if (row.navigationMapId !== mapId) return false;
        const source = row.sourcePoint ? pointCacheKey(mapId, row.sourcePoint) : '';
        const dest = row.destPoint ? pointCacheKey(mapId, row.destPoint) : '';
        return (source && !pointNoCache.value[source]) || (dest && !pointNoCache.value[dest]);
      });
      if (!needLoad) return;
      try {
        const res = await listPointsByMap(mapId);
        rememberPoints(mapId, normalizePoints(res.data || []));
      } catch {
        // 列表仍可回退展示 pointId
      }
    })
  );
};

const onMapChange = async (mapId?: number) => {
  form.value.sourcePoint = undefined;
  form.value.destPoint = undefined;
  await loadPoints(mapId);
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listTaskTemplate(queryParams.value);
    templateList.value = res.rows;
    total.value = res.total;
    await ensurePointNosForList(res.rows || []);
  } finally {
    loading.value = false;
  }
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData };
  editing.value = false;
  pointOptions.value = [];
  templateFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryParams.value.keyword = undefined;
  queryParams.value.enabled = undefined;
  handleQuery();
};

const handleSelectionChange = (selection: TaskTemplateVO[]) => {
  selectedItems.value = selection;
  ids.value = selection.map((item) => item.id);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

const handleAdd = async () => {
  reset();
  if (!mapOptions.value.length) {
    await loadMaps();
  }
  dialog.visible = true;
  dialog.title = '新增任务模板';
};

const handleUpdate = async (row?: TaskTemplateVO) => {
  reset();
  if (!mapOptions.value.length) {
    await loadMaps();
  }
  const id = row?.id || ids.value[0];
  const res = await getTaskTemplate(id);
  Object.assign(form.value, res.data);
  editing.value = true;
  dialog.visible = true;
  dialog.title = '修改任务模板';
  await loadPoints(form.value.navigationMapId);
};

const submitForm = () => {
  templateFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    buttonLoading.value = true;
    try {
      if (form.value.id) {
        await updateTaskTemplate(form.value);
      } else {
        await addTaskTemplate(form.value);
      }
      proxy?.$modal.msgSuccess('保存成功');
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

const handleDelete = async (row?: TaskTemplateVO) => {
  const targetIds = row?.id != null ? [row.id] : [...ids.value];
  if (!targetIds.length) {
    proxy?.$modal.msgWarning('请选择要删除的任务模板');
    return;
  }
  await proxy?.$modal.confirm('是否确认删除选中的任务模板？');
  await Promise.all(targetIds.map((id) => delTaskTemplate(id)));
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const changeSelectedStatus = async (enabled: boolean) => {
  const targets = selectedItems.value.filter((item) => item.enabled !== enabled);
  if (!targets.length) return;
  await proxy?.$modal.confirm(`确认${enabled ? '启用' : '禁用'}选中的任务模板？`);
  await Promise.all(targets.map((item) => changeTaskTemplateStatus({ id: item.id, enabled })));
  proxy?.$modal.msgSuccess('操作成功');
  await getList();
};

onMounted(async () => {
  await Promise.all([getList(), loadMaps()]);
});
</script>

<style scoped lang="scss">
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}
</style>
