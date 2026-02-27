<template>
  <div class="app-container home">
    <!-- 系统概览 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :sm="24" :md="12" :lg="6" class="col-item">
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <span>车辆状态</span>
              <el-icon class="el-icon--right"><monitor /></el-icon>
            </div>
          </template>
          <div class="overview-content">
            <el-statistic :value="vehicleStats.total" title="总车辆数" />
            <div class="stats-row">
              <div class="stat-item">
                <el-tag type="success">空闲</el-tag>
                <span>{{ vehicleStats.idle }}</span>
              </div>
              <div class="stat-item">
                <el-tag type="warning">工作中</el-tag>
                <span>{{ vehicleStats.working }}</span>
              </div>
              <div class="stat-item">
                <el-tag type="danger">维护中</el-tag>
                <span>{{ vehicleStats.maintenance }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :sm="24" :md="12" :lg="6" class="col-item">
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <span>订单状态</span>
              <el-icon class="el-icon--right"><document /></el-icon>
            </div>
          </template>
          <div class="overview-content">
            <el-statistic :value="orderStats.total" title="总订单数" />
            <div class="stats-row">
              <div class="stat-item">
                <el-tag type="info">待分配</el-tag>
                <span>{{ orderStats.pending }}</span>
              </div>
              <div class="stat-item">
                <el-tag type="primary">运输中</el-tag>
                <span>{{ orderStats.transporting }}</span>
              </div>
              <div class="stat-item">
                <el-tag type="success">已完成</el-tag>
                <span>{{ orderStats.completed }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :sm="24" :md="12" :lg="6" class="col-item">
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <span>系统状态</span>
              <el-icon class="el-icon--right"><cpu /></el-icon>
            </div>
          </template>
          <div class="overview-content">
            <div class="status-title">运行状态</div>
            <div class="status-value">{{ systemStatus.status }}</div>
            <div class="stats-row">
              <div class="stat-item">
                <span>CPU使用率</span>
                <span>{{ systemStatus.cpuUsage }}%</span>
              </div>
              <div class="stat-item">
                <span>内存使用率</span>
                <span>{{ systemStatus.memoryUsage }}%</span>
              </div>
              <div class="stat-item">
                <span>磁盘使用率</span>
                <span>{{ systemStatus.diskUsage }}%</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :sm="24" :md="12" :lg="6" class="col-item">
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <span>告警信息</span>
              <el-icon class="el-icon--right"><warning /></el-icon>
            </div>
          </template>
          <div class="overview-content">
            <el-statistic :value="alarmStats.total" title="总告警数" />
            <div class="stats-row">
              <div class="stat-item">
                <el-tag type="danger">严重</el-tag>
                <span>{{ alarmStats.critical }}</span>
              </div>
              <div class="stat-item">
                <el-tag type="warning">警告</el-tag>
                <span>{{ alarmStats.warning }}</span>
              </div>
              <div class="stat-item">
                <el-tag type="info">信息</el-tag>
                <span>{{ alarmStats.info }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index" lang="ts">
import { ref, onMounted } from 'vue';
import { Monitor, Document, Cpu, Warning } from '@element-plus/icons-vue';

// 模拟数据
const vehicleStats = ref({
  total: 10,
  idle: 3,
  working: 6,
  maintenance: 1
});

const orderStats = ref({
  total: 20,
  pending: 5,
  transporting: 8,
  completed: 7
});

const systemStatus = ref({
  status: '正常',
  cpuUsage: 35,
  memoryUsage: 45,
  diskUsage: 60
});

const alarmStats = ref({
  total: 5,
  critical: 0,
  warning: 2,
  info: 3
});

onMounted(() => {
  // 这里可以从后端获取真实数据
  console.log('首页加载完成');
});
</script>

<style lang="scss" scoped>
.home {
  .col-item {
    margin-bottom: 20px;
  }

  font-family: 'open sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #676a6c;
  overflow-x: hidden;

  .overview-card {
    transition: all 0.3s ease;
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    }
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .overview-content {
    padding: 10px 0;
  }
  
  .status-title {
    font-size: 14px;
    color: #909399;
    margin-bottom: 8px;
  }
  
  .status-value {
    font-size: 24px;
    font-weight: 500;
    color: #303133;
  }
  
  .stats-row {
    display: flex;
    justify-content: space-around;
    margin-top: 15px;
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
</style>
