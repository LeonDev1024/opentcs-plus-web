<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="head">
          <span>告警中心</span>
          <el-button :icon="Refresh" @click="load">刷新</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="alarms" border>
        <el-table-column prop="severity" label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="row.severity === 'ERROR' ? 'danger' : 'warning'" size="small">
              {{ row.severity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="140" />
        <el-table-column prop="title" label="标题" min-width="140" />
        <el-table-column prop="message" label="详情" min-width="240" show-overflow-tooltip />
        <el-table-column prop="vehicleName" label="车辆" width="120" />
        <el-table-column prop="createdAt" label="时间" min-width="180" />
        <el-table-column prop="acked" label="确认" width="90">
          <template #default="{ row }">
            <el-tag :type="row.acked ? 'success' : 'info'" size="small">
              {{ row.acked ? '已确认' : '未确认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="row.acked" @click="ack(row.alarmId)">确认</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { ackMonitorAlarm, listMonitorAlarms, type MonitorAlarmVO } from '@/api/ops/monitor';

defineOptions({ name: 'OpsMonitorAlarm' });

const loading = ref(false);
const alarms = ref<MonitorAlarmVO[]>([]);
let timer: number | undefined;

async function load() {
  loading.value = true;
  try {
    const res: any = await listMonitorAlarms();
    alarms.value = res?.data || res || [];
  } finally {
    loading.value = false;
  }
}

async function ack(alarmId: string) {
  await ackMonitorAlarm(alarmId);
  ElMessage.success('已确认');
  load();
}

onMounted(() => {
  load();
  timer = window.setInterval(load, 5000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
