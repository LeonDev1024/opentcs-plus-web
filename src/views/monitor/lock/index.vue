<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="head">
          <span>锁资源监控</span>
          <el-button :icon="Refresh" @click="load">刷新</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="locks" border>
        <el-table-column prop="resourceType" label="资源类型" width="140" />
        <el-table-column prop="resourceId" label="资源ID" min-width="160" show-overflow-tooltip />
        <el-table-column prop="vehicleId" label="持有车辆" min-width="120" />
        <el-table-column prop="orderId" label="订单" min-width="140" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="expiresAt" label="过期时间" min-width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="release(row)">强制释放</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { forceReleaseLock, listResourceLocks, type ResourceLockVO } from '@/api/ops/monitor';

defineOptions({ name: 'OpsMonitorLock' });

const loading = ref(false);
const locks = ref<ResourceLockVO[]>([]);
let timer: number | undefined;

async function load() {
  loading.value = true;
  try {
    const res: any = await listResourceLocks();
    locks.value = res?.data || res || [];
  } finally {
    loading.value = false;
  }
}

async function release(row: ResourceLockVO) {
  await ElMessageBox.confirm(`确认强制释放 ${row.resourceType}:${row.resourceId}？`, '风险操作', {
    type: 'warning'
  });
  await forceReleaseLock(row.resourceType, row.resourceId);
  ElMessage.success('已释放');
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
