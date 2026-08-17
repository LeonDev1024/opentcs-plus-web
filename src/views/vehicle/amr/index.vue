<template>
  <div class="p-2 amr-ops">
    <el-row :gutter="12">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>AMR 运维动作台</span>
              <el-button :icon="Refresh" @click="loadVehicles">刷新车辆</el-button>
            </div>
          </template>
          <el-table
            v-loading="loading"
            :data="vehicles"
            highlight-current-row
            border
            height="520"
            @current-change="onSelectVehicle"
          >
            <el-table-column prop="name" label="车辆" min-width="120" />
            <el-table-column prop="state" label="状态" width="110" />
            <el-table-column prop="currentPosition" label="位置" min-width="120" show-overflow-tooltip />
            <el-table-column prop="energyLevel" label="电量" width="90" />
            <el-table-column prop="currentTransportOrder" label="当前订单" min-width="140" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never" class="mb-3">
          <template #header>
            <span>动作执行 {{ current?.name ? `· ${current.name}` : '' }}</span>
          </template>
          <el-empty v-if="!current" description="请选择左侧车辆" :image-size="64" />
          <div v-else class="action-grid">
            <el-button v-hasPermi="['ops:amr:mode']" type="primary" @click="doMode('MANUAL')">暂停 (MANUAL)</el-button>
            <el-button v-hasPermi="['ops:amr:mode']" type="success" @click="doMode('AUTOMATIC')">恢复 (AUTOMATIC)</el-button>
            <el-button v-hasPermi="['ops:amr:charge']" type="warning" @click="doCharge">去充电</el-button>
            <el-button v-hasPermi="['ops:amr:map']" @click="mapDialog = true">切地图</el-button>
            <el-button v-hasPermi="['ops:amr:move']" @click="moveDialog = true">移动/重定位</el-button>
          </div>
          <el-alert
            v-if="lastResult"
            class="mt-3"
            :title="`最近动作 ${lastResult.actionId} · ${lastResult.status}`"
            :type="lastResult.accepted ? 'success' : 'error'"
            :description="lastResult.reasonMessage || lastResult.traceId"
            show-icon
            :closable="false"
          />
        </el-card>

        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>执行记录</span>
              <el-button link type="primary" @click="loadRecords">刷新</el-button>
            </div>
          </template>
          <el-timeline v-if="records.length">
            <el-timeline-item
              v-for="item in records"
              :key="item.actionId"
              :timestamp="item.operatedAt"
              placement="top"
            >
              <div class="record-line">
                <el-tag size="small">{{ item.actionCategory }}</el-tag>
                <span>{{ item.vehicleName }} · {{ item.actionType }}</span>
                <el-tag size="small" :type="statusType(item.executeStatus)">{{ item.executeStatus }}</el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无运维动作记录" :image-size="56" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="mapDialog" title="切换地图" width="420px">
      <el-form label-width="110px">
        <el-form-item label="目标地图ID">
          <el-input v-model="mapForm.targetMapId" placeholder="mapId" />
        </el-form-item>
        <el-form-item label="初始点位">
          <el-input v-model="mapForm.initPosition" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mapDialog = false">取消</el-button>
        <el-button type="primary" @click="doMapSwitch">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="moveDialog" title="移动 / 重定位" width="460px">
      <el-form label-width="110px">
        <el-form-item label="类型">
          <el-radio-group v-model="moveForm.moveType">
            <el-radio value="MOVE_TO_NODE">移动到节点</el-radio>
            <el-radio value="INIT_POSITION">重定位</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标节点">
          <el-input v-model="moveForm.targetNodeId" />
        </el-form-item>
        <el-form-item label="确认风险">
          <el-switch v-model="moveForm.confirmRisk" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moveDialog = false">取消</el-button>
        <el-button type="primary" @click="doMove">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import {
  goCharge,
  listActionRecords,
  listOpsVehicles,
  moveVehicle,
  precheck,
  switchMap,
  switchMode
} from '@/api/ops/amr';
import type { OpsActionRecord, OpsActionResult, OpsAmrVehicle } from '@/api/ops/amr/types';

defineOptions({ name: 'VehicleAmrOps' });

const loading = ref(false);
const vehicles = ref<OpsAmrVehicle[]>([]);
const current = ref<OpsAmrVehicle | null>(null);
const records = ref<OpsActionRecord[]>([]);
const lastResult = ref<OpsActionResult | null>(null);
const mapDialog = ref(false);
const moveDialog = ref(false);
const mapForm = reactive({ targetMapId: '', initPosition: '' });
const moveForm = reactive({
  moveType: 'MOVE_TO_NODE' as 'MOVE_TO_NODE' | 'INIT_POSITION',
  targetNodeId: '',
  confirmRisk: false
});

function statusType(status?: string) {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED' || status === 'TIMEOUT' || status === 'REJECTED') return 'danger';
  if (status === 'RUNNING' || status === 'PENDING' || status === 'ACCEPTED') return 'warning';
  return 'info';
}

function newRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadVehicles() {
  loading.value = true;
  try {
    const res: any = await listOpsVehicles({ pageNum: 1, pageSize: 200 } as any);
    vehicles.value = res?.rows || res?.data?.rows || [];
  } finally {
    loading.value = false;
  }
}

async function loadRecords() {
  const res: any = await listActionRecords(current.value?.name);
  records.value = (res?.data || res || []) as OpsActionRecord[];
}

function onSelectVehicle(row: OpsAmrVehicle | null) {
  current.value = row;
  loadRecords();
}

async function ensurePrecheck(actionType: string) {
  if (!current.value?.name) return false;
  const res: any = await precheck(current.value.name, actionType);
  const data = res?.data || res;
  if (!data?.allow) {
    ElMessage.error(data?.reasonMessage || '预校验未通过');
    return false;
  }
  if (data?.riskConfirmRequired) {
    await ElMessageBox.confirm(data.reasonMessage || '车辆忙碌，确认继续？', '风险确认', {
      type: 'warning'
    });
  }
  return true;
}

async function doMode(targetMode: 'AUTOMATIC' | 'MANUAL') {
  if (!(await ensurePrecheck('MODE_SWITCH'))) return;
  const res: any = await switchMode(current.value!.name, {
    targetMode,
    executePolicy: 'PAUSE_THEN_SWITCH',
    requestId: newRequestId()
  });
  lastResult.value = (res?.data || res) as OpsActionResult;
  ElMessage.success('模式切换指令已下发');
  loadRecords();
}

async function doCharge() {
  if (!(await ensurePrecheck('GO_CHARGE'))) return;
  const res: any = await goCharge(current.value!.name, {
    chargePolicy: 'NEAREST',
    interruptPolicy: 'WAIT_CURRENT_TASK',
    requestId: newRequestId()
  });
  lastResult.value = (res?.data || res) as OpsActionResult;
  ElMessage.success('去充电指令已下发');
  loadRecords();
}

async function doMapSwitch() {
  if (!(await ensurePrecheck('MAP_SWITCH'))) return;
  if (!mapForm.targetMapId) {
    ElMessage.warning('请填写目标地图ID');
    return;
  }
  const res: any = await switchMap(current.value!.name, {
    targetMapId: mapForm.targetMapId,
    initPosition: mapForm.initPosition || undefined,
    requestId: newRequestId()
  });
  lastResult.value = (res?.data || res) as OpsActionResult;
  mapDialog.value = false;
  ElMessage.success('切地图指令已下发');
  loadRecords();
}

async function doMove() {
  if (!(await ensurePrecheck('MOVE'))) return;
  const res: any = await moveVehicle(current.value!.name, {
    moveType: moveForm.moveType,
    targetNodeId: moveForm.targetNodeId || undefined,
    confirmRisk: moveForm.confirmRisk,
    requestId: newRequestId()
  });
  lastResult.value = (res?.data || res) as OpsActionResult;
  moveDialog.value = false;
  ElMessage.success('移动指令已下发');
  loadRecords();
}

onMounted(async () => {
  await loadVehicles();
  await loadRecords();
});
</script>

<style scoped>
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.record-line {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.mb-3 {
  margin-bottom: 12px;
}
.mt-3 {
  margin-top: 12px;
}
</style>
