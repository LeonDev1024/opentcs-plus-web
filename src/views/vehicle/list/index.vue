<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="vehicle-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.name"
            placeholder="机器人名称"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.vehicleTypeId" placeholder="全部机器人类型" clearable size="default">
            <el-option v-for="type in vehicleTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
          <el-select v-model="queryParams.state" placeholder="全部运行状态" clearable size="default">
            <el-option label="空闲" value="IDLE" />
            <el-option label="忙碌" value="BUSY" />
            <el-option label="充电" value="CHARGING" />
            <el-option label="异常" value="ERROR" />
            <el-option label="离线" value="OFFLINE" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <el-button v-hasPermi="['opentcs:vehicle:add']" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          <el-button v-hasPermi="['opentcs:vehicle:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
            修改
          </el-button>
          <el-button v-hasPermi="['opentcs:vehicle:edit']" plain :disabled="single" @click="openPositionDialog()">
            初始点
          </el-button>
          <el-button v-hasPermi="['opentcs:vehicle:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
            删除
          </el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table v-loading="loading" :data="vehicleList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="机器人名称" align="center" prop="name" min-width="120" show-overflow-tooltip />
        <el-table-column label="机器人编码" align="center" prop="vinCode" min-width="120" show-overflow-tooltip />
        <el-table-column label="机器人类型" align="center" prop="vehicleTypeName" min-width="120" show-overflow-tooltip />
        <el-table-column label="驱动" align="center" width="110">
          <template #default="scope">
            <el-tag v-if="scope.row.driverType === 'LOOPBACK'" type="warning" effect="plain">LOOPBACK</el-tag>
            <el-tag v-else-if="scope.row.driverType === 'VDA5050'" type="primary" effect="plain">VDA5050</el-tag>
            <span v-else class="text-muted">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" prop="state" width="100">
          <template #default="scope">
            <el-tag :type="robotStateTag(scope.row.state).type">{{ robotStateTag(scope.row.state).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" align="center" width="90">
          <template #default="scope">
            <el-switch
              v-hasPermi="['opentcs:vehicle:edit']"
              :model-value="isRobotEnabled(scope.row)"
              :loading="togglingId === scope.row.id"
              @change="(val: string | number | boolean) => handleEnableChange(scope.row, Boolean(val))"
            />
          </template>
        </el-table-column>
        <el-table-column label="当前位置" align="center" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.currentPosition || scope.row.currentLocationName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" append-to-body destroy-on-close>
      <el-form ref="vehicleFormRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="机器人名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入机器人名称" />
        </el-form-item>
        <el-form-item label="机器人编码" prop="vinCode">
          <el-input v-model="form.vinCode" placeholder="请输入机器人编码" />
        </el-form-item>
        <el-form-item label="机器人类型" prop="vehicleTypeId">
          <el-select v-model="form.vehicleTypeId" placeholder="请选择机器人类型" style="width: 100%">
            <el-option v-for="type in vehicleTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="驱动类型" prop="driverType">
          <el-select v-model="form.driverType" placeholder="请选择驱动类型" style="width: 100%">
            <el-option label="LOOPBACK（仿真）" value="LOOPBACK" />
            <el-option label="VDA5050（真车）" value="VDA5050" />
          </el-select>
          <div class="form-tip">仿真验收选 LOOPBACK；真车选 VDA5050 并另行配置 MQTT</div>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">取 消</el-button>
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="positionDialog.visible" title="设置初始点" width="480px" append-to-body destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="导航地图">
          <el-select
            v-model="positionDialog.mapId"
            placeholder="请选择已保存地图"
            filterable
            style="width: 100%"
            @change="onPositionMapChange"
          >
            <el-option
              v-for="item in mapOptions"
              :key="item.id"
              :label="`${item.name}（${item.mapId}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="初始点">
          <el-select
            v-model="positionDialog.pointId"
            placeholder="请选择点位"
            filterable
            :disabled="!positionDialog.mapId"
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
          <div class="form-tip">请选择已保存地图中的点位（保存后地图自动生效）</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="positionDialog.visible = false">取 消</el-button>
          <el-button type="primary" :loading="positionDialog.loading" @click="submitPosition">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Vehicle" lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue';
import {
  listVehicle,
  getVehicle,
  delVehicle,
  addVehicle,
  updateVehicle,
  connectVehicle,
  activateVehicle,
  deactivateVehicle,
  setVehiclePosition
} from '@/api/deploy/device';
import { listType } from '@/api/deploy/device/type';
import { VehicleVO, VehicleQuery, VehicleForm } from '@/api/deploy/device/types';
import { listNavigationMap } from '@/api/deploy/factory/map';
import { NavigationMapVO } from '@/api/deploy/factory/map/types';
import { listPointsByMap, MapPointOption } from '@/api/deploy/map-editor/point';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const vehicleList = ref<VehicleVO[]>([]);
const vehicleTypes = ref<any[]>([]);
const mapOptions = ref<NavigationMapVO[]>([]);
const pointOptions = ref<MapPointOption[]>([]);
const buttonLoading = ref(false);
const pointsLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const togglingId = ref<string | number | null>(null);
const ids = ref<Array<string | number>>([]);
const selectedRows = ref<VehicleVO[]>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const vehicleFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const positionDialog = reactive({
  visible: false,
  loading: false,
  mapId: undefined as number | undefined,
  pointId: undefined as string | undefined
});

const initFormData: VehicleForm = {
  id: undefined,
  name: undefined,
  vinCode: undefined,
  vehicleTypeId: undefined,
  driverType: 'LOOPBACK',
  description: undefined
};
const data = reactive<PageData<VehicleForm, VehicleQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    vinCode: undefined,
    vehicleTypeId: null as number | null,
    state: undefined
  },
  rules: {
    name: [{ required: true, message: '机器人名称不能为空', trigger: 'blur' }],
    driverType: [{ required: true, message: '请选择驱动类型', trigger: 'change' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const currentRow = computed(() => selectedRows.value[0]);
/** 展示态：空闲 / 忙碌 / 充电 / 异常 / 离线 */
const robotStateTag = (state?: string) => {
  if (state === 'IDLE') return { label: '空闲', type: 'success' as const };
  if (state === 'WORKING' || state === 'EXECUTING' || state === 'MOVING' || state === 'WAITING' || state === 'PAUSED') {
    return { label: '忙碌', type: 'warning' as const };
  }
  if (state === 'CHARGING') return { label: '充电', type: 'info' as const };
  if (state === 'ERROR') return { label: '异常', type: 'danger' as const };
  // UNAVAILABLE / UNKNOWN / OFFLINE / 空 → 离线（未启用或未连上）
  return { label: '离线', type: 'info' as const };
};

/** 已启用：非离线态 */
const isRobotEnabled = (row: VehicleVO) =>
  !!row.state && row.state !== 'UNAVAILABLE' && row.state !== 'UNKNOWN' && row.state !== 'OFFLINE';

const formatPointLabel = (point: MapPointOption) => {
  const name = point.name?.trim();
  if (name && name !== point.pointId) return `${name}（${point.pointId}）`;
  return point.pointId;
};

const getVehicleTypes = async () => {
  const res = await listType({ pageNum: 1, pageSize: 100 });
  vehicleTypes.value = (res as any).rows ?? (res as any).data?.rows ?? [];
};

const loadMaps = async () => {
  try {
    const res = await listNavigationMap({ pageNum: 1, pageSize: 500 } as any);
    mapOptions.value = (res as any).rows ?? (res as any).data?.rows ?? (res as any).data ?? [];
  } catch {
    mapOptions.value = [];
  }
};

const onPositionMapChange = async (mapId?: number) => {
  positionDialog.pointId = undefined;
  if (!mapId) {
    pointOptions.value = [];
    return;
  }
  pointsLoading.value = true;
  try {
    const res = await listPointsByMap(mapId);
    const rows = ((res as any).data ?? res ?? []) as any[];
    pointOptions.value = rows
      .map((p) => ({
        ...p,
        pointId: String(p.pointId ?? p.code ?? p.name ?? p.id ?? '')
      }))
      .filter((p) => !!p.pointId);
  } catch {
    pointOptions.value = [];
  } finally {
    pointsLoading.value = false;
  }
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listVehicle(queryParams.value);
    vehicleList.value = (res as any).rows ?? (res as any).data?.rows ?? [];
    total.value = (res as any).total ?? (res as any).data?.total ?? 0;
  } catch (error) {
    console.error('Error fetching vehicle list:', error);
    vehicleList.value = [];
    total.value = 0;
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
  vehicleFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryParams.value.name = undefined;
  queryParams.value.vinCode = undefined;
  queryParams.value.vehicleTypeId = null;
  queryParams.value.state = undefined;
  handleQuery();
};

const handleSelectionChange = (selection: VehicleVO[]) => {
  selectedRows.value = selection;
  ids.value = selection.map((item) => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加机器人';
};

const handleUpdate = async (row?: VehicleVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getVehicle(_id);
  Object.assign(form.value, res.data);
  if (!form.value.driverType) {
    form.value.driverType = (res.data as any)?.driverType || 'LOOPBACK';
  }
  dialog.visible = true;
  dialog.title = '修改机器人';
};

const submitForm = () => {
  vehicleFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    buttonLoading.value = true;
    try {
      if (form.value.id) {
        await updateVehicle(form.value);
      } else {
        await addVehicle(form.value);
      }
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

const handleDelete = async (row?: VehicleVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除机器人编号为"' + _ids + '"的数据项？').finally(() => (loading.value = false));
  await delVehicle(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

/** 列表内启用/禁用：启用时自动连接驱动 */
const handleEnableChange = async (row: VehicleVO, enabled: boolean) => {
  if (togglingId.value === row.id) return;
  const text = enabled ? '启用' : '禁用';
  try {
    await proxy?.$modal.confirm(`确认${text}机器人「${row.name}」？`);
  } catch {
    return;
  }

  if (enabled) {
    if (!row.driverType) {
      proxy?.$modal.msgWarning('请先编辑机器人并选择驱动类型');
      return;
    }
    if (!row.currentPosition && !row.currentLocationName) {
      proxy?.$modal.msgWarning('请先设置初始点');
      return;
    }
  }

  togglingId.value = row.id;
  try {
    if (enabled) {
      if (!row.driverConnected) {
        await connectVehicle(row.id);
      }
      await activateVehicle(row.id);
      proxy?.$modal.msgSuccess('已启用，可接单');
    } else {
      await deactivateVehicle(row.id);
      proxy?.$modal.msgSuccess('已禁用');
    }
    await getList();
  } catch {
    await getList();
  } finally {
    togglingId.value = null;
  }
};

const openPositionDialog = async () => {
  const row = currentRow.value;
  if (!row) return;
  if (!mapOptions.value.length) {
    await loadMaps();
  }
  positionDialog.mapId = undefined;
  positionDialog.pointId = row.currentPosition || undefined;
  pointOptions.value = [];
  positionDialog.visible = true;
};

const submitPosition = async () => {
  const row = currentRow.value;
  if (!row || !positionDialog.pointId) {
    proxy?.$modal.msgWarning('请选择初始点');
    return;
  }
  positionDialog.loading = true;
  try {
    await setVehiclePosition(row.id, positionDialog.pointId);
    proxy?.$modal.msgSuccess('初始点已设置');
    positionDialog.visible = false;
    await getList();
  } finally {
    positionDialog.loading = false;
  }
};

onMounted(async () => {
  await getVehicleTypes();
  getList();
});
</script>

<style scoped lang="scss">
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.text-muted {
  color: var(--el-text-color-secondary);
}
</style>
