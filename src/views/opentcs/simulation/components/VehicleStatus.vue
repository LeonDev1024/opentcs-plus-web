<template>
  <div class="vehicle-status">
    <el-empty v-if="vehicles.length === 0" description="暂无车辆数据" />
    <el-table v-else :data="vehicles" style="width: 100%" size="small">
      <el-table-column prop="name" label="车辆名称" width="120" />
      <el-table-column prop="state" label="状态" width="100">
        <template #default="scope">
          <el-tag :type="getStateType(scope.row.state)">{{ scope.row.state }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="currentSpeed" label="速度" width="80">
        <template #default="scope">
          {{ scope.row.currentSpeed.toFixed(2) }} m/s
        </template>
      </el-table-column>
      <el-table-column prop="currentBattery" label="电池" width="80">
        <template #default="scope">
          {{ scope.row.currentBattery.toFixed(1) }}%
        </template>
      </el-table-column>
      <el-table-column label="位置" width="120">
        <template #default="scope">
          ({{ scope.row.x.toFixed(1) }}, {{ scope.row.y.toFixed(1) }})
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  vehicles: any[]
}>()

const getStateType = (state: string) => {
  switch (state) {
    case 'IDLE':
      return 'success'
    case 'MOVING':
      return 'primary'
    case 'CHARGING':
      return 'warning'
    case 'ERROR':
      return 'danger'
    default:
      return 'info'
  }
}
</script>

<style scoped>
.vehicle-status {
  height: 380px;
  overflow-y: auto;
}
</style>