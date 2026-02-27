<template>
  <div class="order-status">
    <el-empty v-if="orders.length === 0" description="暂无订单数据" />
    <el-table v-else :data="orders" style="width: 100%" size="small">
      <el-table-column prop="orderId" label="订单ID" width="180" />
      <el-table-column prop="state" label="状态" width="120">
        <template #default="scope">
          <el-tag :type="getStateType(scope.row.state)">{{ scope.row.state }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="distance" label="距离" width="80">
        <template #default="scope">
          {{ scope.row.distance.toFixed(1) }} m
        </template>
      </el-table-column>
      <el-table-column prop="assignedVehicleId" label="分配车辆" width="120" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  orders: any[]
}>()

const getStateType = (state: string) => {
  switch (state) {
    case 'CREATED':
      return 'info'
    case 'ASSIGNED':
      return 'warning'
    case 'IN_EXECUTION':
      return 'primary'
    case 'COMPLETED':
      return 'success'
    case 'TIMED_OUT':
      return 'danger'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'info'
  }
}
</script>

<style scoped>
.order-status {
  height: 380px;
  overflow-y: auto;
}
</style>