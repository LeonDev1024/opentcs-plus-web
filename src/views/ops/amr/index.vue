<template>
  <div class="p-2 ops-amr-page">
    <el-card shadow="hover" class="query-card">
      <el-form :model="queryParams" :inline="true" label-width="90px" class="query-form">
        <el-form-item label="车辆名称">
          <el-input v-model="queryParams.name" placeholder="请输入车辆名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="车辆状态">
          <el-select v-model="queryParams.state" placeholder="请选择车辆状态" clearable style="width: 180px">
            <el-option label="空闲" value="IDLE" />
            <el-option label="作业中" value="EXECUTING" />
            <el-option label="维护中" value="UNAVAILABLE" />
            <el-option label="充电中" value="CHARGING" />
            <el-option label="错误" value="ERROR" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="Switch" :disabled="single" @click="openModeDialog()">切换自动/手动</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Location" :disabled="single" @click="openMapDialog()">切换地图</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Lightning" :disabled="single" @click="openChargeDialog()">去充电</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Position" :disabled="single" @click="openMoveDialog()">移动AMR</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="info" plain icon="List" @click="openRecords">执行记录</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="primary" icon="Refresh" :loading="loading" @click="getVehicleList">刷新</el-button>
          </el-col>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="vehicleList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="车辆名称" prop="name" min-width="140" />
        <el-table-column label="状态" prop="state" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.state === 'IDLE'" type="success">空闲</el-tag>
            <el-tag v-else-if="row.state === 'EXECUTING' || row.state === 'WORKING'" type="warning">作业中</el-tag>
            <el-tag v-else-if="row.state === 'CHARGING'" type="primary">充电中</el-tag>
            <el-tag v-else-if="row.state === 'UNAVAILABLE'" type="danger">维护中</el-tag>
            <el-tag v-else type="info">{{ row.state || '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前点位" prop="currentPosition" min-width="130" />
        <el-table-column label="电量" prop="energyLevel" width="90">
          <template #default="{ row }">{{ row.energyLevel ?? '--' }}</template>
        </el-table-column>
        <el-table-column label="任务" prop="currentTransportOrder" min-width="140" />
        <el-table-column label="操作" align="center" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="openModeDialog(row)">切模式</el-button>
            <el-button link type="warning" @click="openMapDialog(row)">切地图</el-button>
            <el-button link type="success" @click="openChargeDialog(row)">充电</el-button>
            <el-button link type="danger" @click="openMoveDialog(row)">移动</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="modeDialogVisible" :title="`切换模式 - ${selectedVehicle?.name || ''}`" width="460px">
      <el-form :model="modeForm" label-width="110px">
        <el-form-item label="目标模式">
          <el-radio-group v-model="modeForm.targetMode">
            <el-radio value="AUTOMATIC">自动</el-radio>
            <el-radio value="MANUAL">手动</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="执行策略">
          <el-select v-model="modeForm.executePolicy">
            <el-option label="忙碌时拒绝" value="REJECT_IF_BUSY" />
            <el-option label="暂停后切换" value="PAUSE_THEN_SWITCH" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleModeSwitch">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="mapDialogVisible" :title="`切换地图 - ${selectedVehicle?.name || ''}`" width="480px">
      <el-form :model="mapForm" label-width="110px">
        <el-form-item label="目标地图">
          <el-input v-model="mapForm.targetMapId" placeholder="输入地图ID" />
        </el-form-item>
        <el-form-item label="目标版本">
          <el-input v-model="mapForm.targetMapVersion" placeholder="输入版本号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mapDialogVisible = false">取消</el-button>
        <el-button type="warning" :disabled="!mapForm.targetMapId" @click="handleMapSwitch">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="chargeDialogVisible" :title="`去充电 - ${selectedVehicle?.name || ''}`" width="480px">
      <el-form :model="chargeForm" label-width="110px">
        <el-form-item label="充电策略">
          <el-select v-model="chargeForm.chargePolicy">
            <el-option label="最近站点" value="NEAREST" />
            <el-option label="指定站点" value="SPECIFIED_STATION" />
          </el-select>
        </el-form-item>
        <el-form-item label="站点ID" v-if="chargeForm.chargePolicy === 'SPECIFIED_STATION'">
          <el-input v-model="chargeForm.stationId" placeholder="输入站点ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chargeDialogVisible = false">取消</el-button>
        <el-button type="success" @click="handleGoCharge">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="moveDialogVisible" :title="`移动AMR - ${selectedVehicle?.name || ''}`" width="520px">
      <el-form :model="moveForm" label-width="110px">
        <el-form-item label="移动类型">
          <el-radio-group v-model="moveForm.moveType">
            <el-radio value="MOVE_TO_NODE">点到点</el-radio>
            <el-radio value="INIT_POSITION">重定位</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标点位" v-if="moveForm.moveType === 'MOVE_TO_NODE'">
          <el-input v-model="moveForm.targetNodeId" placeholder="输入点位ID" />
        </el-form-item>
        <el-form-item label="坐标X" v-if="moveForm.moveType === 'INIT_POSITION'">
          <el-input-number v-model="moveForm.x" style="width: 100%" />
        </el-form-item>
        <el-form-item label="坐标Y" v-if="moveForm.moveType === 'INIT_POSITION'">
          <el-input-number v-model="moveForm.y" style="width: 100%" />
        </el-form-item>
        <el-form-item label="角度" v-if="moveForm.moveType === 'INIT_POSITION'">
          <el-input-number v-model="moveForm.theta" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleMove">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="recordDrawerVisible" title="运维动作执行记录" size="50%">
      <el-table :data="actionRecords" border>
        <el-table-column prop="actionId" label="Action ID" min-width="180" />
        <el-table-column prop="vehicleName" label="车辆" min-width="120" />
        <el-table-column prop="actionCategory" label="动作类别" min-width="120" />
        <el-table-column prop="actionType" label="动作类型" min-width="110" />
        <el-table-column prop="executeStatus" label="状态" min-width="100" />
        <el-table-column prop="operatedAt" label="时间" min-width="180" />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts" name="OpsAmr">
import { ElMessage } from 'element-plus';
import {
  goCharge,
  listActionRecords,
  listOpsVehicles,
  moveVehicle,
  switchMap,
  switchMode
} from '@/api/opentcs/ops/amr';
import type { GoChargeRequest, MapSwitchRequest, ModeSwitchRequest, MoveRequest, OpsActionRecord, OpsAmrVehicle } from '@/api/opentcs/ops/amr/types';

const loading = ref(false);
const vehicleList = ref<OpsAmrVehicle[]>([]);
const selectedVehicle = ref<OpsAmrVehicle>();
const ids = ref<Array<string | number>>([]);
const single = ref(true);

const modeDialogVisible = ref(false);
const mapDialogVisible = ref(false);
const chargeDialogVisible = ref(false);
const moveDialogVisible = ref(false);

const recordDrawerVisible = ref(false);
const actionRecords = ref<OpsActionRecord[]>([]);
const queryParams = reactive({
  name: '',
  state: ''
});

const modeForm = reactive<ModeSwitchRequest>({
  targetMode: 'AUTOMATIC',
  executePolicy: 'REJECT_IF_BUSY'
});

const mapForm = reactive<MapSwitchRequest>({
  targetMapId: '',
  targetMapVersion: ''
});

const chargeForm = reactive<GoChargeRequest>({
  chargePolicy: 'NEAREST',
  interruptPolicy: 'WAIT_CURRENT_TASK'
});

const moveForm = reactive<MoveRequest>({
  moveType: 'MOVE_TO_NODE',
  confirmRisk: true
});

const getVehicleList = async () => {
  loading.value = true;
  try {
    const res = await listOpsVehicles({
      pageNum: 1,
      pageSize: 200,
      name: queryParams.name || undefined,
      state: queryParams.state || undefined
    });
    vehicleList.value = (res as any).rows ?? (res as any).data?.rows ?? [];
  } finally {
    loading.value = false;
  }
};

const handleQuery = async () => {
  await getVehicleList();
};

const resetQuery = async () => {
  queryParams.name = '';
  queryParams.state = '';
  await getVehicleList();
};

const handleSelectionChange = (rows: OpsAmrVehicle[]) => {
  ids.value = rows.map((item) => item.id);
  single.value = rows.length !== 1;
  selectedVehicle.value = rows.length === 1 ? rows[0] : undefined;
};

const ensureSelectedVehicle = () => {
  if (!selectedVehicle.value?.name) {
    ElMessage.warning('请先选择一台 AMR');
    return false;
  }
  return true;
};

const openModeDialog = (row?: OpsAmrVehicle) => {
  if (row) {
    selectedVehicle.value = row;
  }
  if (!ensureSelectedVehicle()) return;
  modeDialogVisible.value = true;
};

const openMapDialog = (row?: OpsAmrVehicle) => {
  if (row) {
    selectedVehicle.value = row;
  }
  if (!ensureSelectedVehicle()) return;
  mapDialogVisible.value = true;
};

const openChargeDialog = (row?: OpsAmrVehicle) => {
  if (row) {
    selectedVehicle.value = row;
  }
  if (!ensureSelectedVehicle()) return;
  chargeDialogVisible.value = true;
};

const openMoveDialog = (row?: OpsAmrVehicle) => {
  if (row) {
    selectedVehicle.value = row;
  }
  if (!ensureSelectedVehicle()) return;
  moveDialogVisible.value = true;
};

const handleModeSwitch = async () => {
  if (!ensureSelectedVehicle()) return;
  await switchMode(selectedVehicle.value!.name, modeForm);
  ElMessage.success('模式切换命令已下发');
  modeDialogVisible.value = false;
  await refreshRecords();
};

const handleMapSwitch = async () => {
  if (!ensureSelectedVehicle()) return;
  await switchMap(selectedVehicle.value!.name, mapForm);
  ElMessage.success('地图切换命令已下发');
  mapDialogVisible.value = false;
  await refreshRecords();
};

const handleGoCharge = async () => {
  if (!ensureSelectedVehicle()) return;
  await goCharge(selectedVehicle.value!.name, chargeForm);
  ElMessage.success('去充电命令已下发');
  chargeDialogVisible.value = false;
  await refreshRecords();
};

const handleMove = async () => {
  if (!ensureSelectedVehicle()) return;
  await moveVehicle(selectedVehicle.value!.name, moveForm);
  ElMessage.success('移动命令已下发');
  moveDialogVisible.value = false;
  await refreshRecords();
};

const refreshRecords = async () => {
  const res = await listActionRecords(selectedVehicle.value?.name);
  actionRecords.value = (res as any).data ?? (res as any) ?? [];
};

const openRecords = async () => {
  recordDrawerVisible.value = true;
  await refreshRecords();
};

onMounted(async () => {
  await getVehicleList();
});
</script>

<style scoped>
.query-card {
  margin-bottom: 12px;
}

.query-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.query-form :deep(.el-form-item) {
  display: flex;
  align-items: center;
  margin-bottom: 0;
  margin-right: 12px;
}

.query-form :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
}
</style>
