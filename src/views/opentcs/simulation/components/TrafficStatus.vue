<template>
  <div class="traffic-status">
    <el-empty v-if="conflicts.length === 0" description="暂无交通冲突" />
    <el-table v-else :data="conflicts" style="width: 100%" size="small">
      <el-table-column prop="vehicleId1" label="车辆1" width="120" />
      <el-table-column prop="vehicleId2" label="车辆2" width="120" />
      <el-table-column prop="type" label="冲突类型" width="120">
        <template #default="scope">
          <el-tag :type="getTypeType(scope.row.type)">{{ scope.row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="detectedTime" label="检测时间" width="180">
        <template #default="scope">
          {{ formatDate(scope.row.detectedTime) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  conflicts: any[]
}>()

const getTypeType = (type: string) => {
  switch (type) {
    case 'CURRENT':
      return 'danger'
    case 'PREDICTED':
      return 'warning'
    default:
      return 'info'
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.traffic-status {
  height: 380px;
  overflow-y: auto;
}
</style>