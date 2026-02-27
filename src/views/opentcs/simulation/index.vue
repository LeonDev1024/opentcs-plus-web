<template>
  <div class="simulation-container">
    <el-card class="simulation-header">
      <template #header>
        <div class="card-header">
          <span>AGV 仿真系统</span>
          <div class="header-actions">
            <el-button type="primary" @click="startSimulation" :disabled="simulationStatus === 'RUNNING'">
              启动仿真
            </el-button>
            <el-button @click="pauseSimulation" :disabled="simulationStatus !== 'RUNNING'">
              暂停仿真
            </el-button>
            <el-button @click="resumeSimulation" :disabled="simulationStatus !== 'PAUSED'">
              继续仿真
            </el-button>
            <el-button type="danger" @click="stopSimulation" :disabled="simulationStatus === 'STOPPED'">
              停止仿真
            </el-button>
          </div>
        </div>
      </template>
      <div class="status-info">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="仿真状态">
              <template #value>
                <el-tag :type="getStatusType(simulationStatus)">{{ simulationStatus }}</el-tag>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="当前 Tick">
              <template #value>{{ currentTick }}</template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="仿真速率">
              <template #value>{{ tickRate }} ticks/秒</template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="运行时间">
              <template #value>{{ formatRunTime() }}</template>
            </el-statistic>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card class="simulation-map">
          <template #header>
            <div class="card-header">
              <span>仿真地图</span>
              <div class="header-actions">
                <el-button size="small" @click="zoomIn">放大</el-button>
                <el-button size="small" @click="zoomOut">缩小</el-button>
                <el-button size="small" @click="resetView">重置视图</el-button>
              </div>
            </div>
          </template>
          <div class="map-container" ref="mapContainer">
            <!-- 地图和车辆可视化 -->
            <div class="map-background"></div>
            <div v-for="vehicle in vehicles" :key="vehicle.vehicleId" 
                 class="vehicle" 
                 :style="getVehicleStyle(vehicle)">
              <div class="vehicle-label">{{ vehicle.name }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="simulation-stats">
          <template #header>
            <span>仿真统计</span>
          </template>
          <el-tabs type="border-card">
            <el-tab-pane label="车辆状态">
              <vehicle-status :vehicles="vehicles" />
            </el-tab-pane>
            <el-tab-pane label="订单状态">
              <order-status :orders="orders" />
            </el-tab-pane>
            <el-tab-pane label="交通冲突">
              <traffic-status :conflicts="conflicts" />
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="simulation-scene" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>仿真场景管理</span>
          <el-button type="primary" size="small" @click="showCreateSceneDialog">
            创建场景
          </el-button>
        </div>
      </template>
      <el-table :data="scenes" style="width: 100%">
        <el-table-column prop="name" label="场景名称" width="180" />
        <el-table-column prop="description" label="场景描述" />
        <el-table-column prop="creationTime" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.creationTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="small" @click="setCurrentScene(scope.row)">
              选择
            </el-button>
            <el-button size="small" type="danger" @click="deleteScene(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建场景对话框 -->
    <el-dialog
      v-model="createSceneDialogVisible"
      title="创建仿真场景"
      width="500px"
    >
      <el-form :model="sceneForm" label-width="80px">
        <el-form-item label="场景名称">
          <el-input v-model="sceneForm.name" placeholder="请输入场景名称" />
        </el-form-item>
        <el-form-item label="场景描述">
          <el-input v-model="sceneForm.description" type="textarea" placeholder="请输入场景描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createSceneDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="createScene">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import VehicleStatus from './components/VehicleStatus.vue'
import OrderStatus from './components/OrderStatus.vue'
import TrafficStatus from './components/TrafficStatus.vue'
import { simulationApi } from '@/api/opentcs/simulation'

// 仿真状态
const simulationStatus = ref('STOPPED')
const currentTick = ref(0)
const tickRate = ref(10)
const startTime = ref(0)

// 数据
const vehicles = ref<any[]>([])
const orders = ref<any[]>([])
const conflicts = ref<any[]>([])
const scenes = ref<any[]>([])

// 地图控制
const mapContainer = ref<HTMLElement>()
const zoom = ref(1)

// 创建场景对话框
const createSceneDialogVisible = ref(false)
const sceneForm = reactive({
  name: '',
  description: ''
})

// 方法
const startSimulation = async () => {
  try {
    const response = await simulationApi.start()
    if (response.success) {
      ElMessage.success(response.message)
      simulationStatus.value = 'RUNNING'
      startTime.value = Date.now()
      startPolling()
    }
  } catch (error) {
    ElMessage.error('启动仿真失败')
  }
}

const pauseSimulation = async () => {
  try {
    const response = await simulationApi.pause()
    if (response.success) {
      ElMessage.success(response.message)
      simulationStatus.value = 'PAUSED'
    }
  } catch (error) {
    ElMessage.error('暂停仿真失败')
  }
}

const resumeSimulation = async () => {
  try {
    const response = await simulationApi.resume()
    if (response.success) {
      ElMessage.success(response.message)
      simulationStatus.value = 'RUNNING'
    }
  } catch (error) {
    ElMessage.error('继续仿真失败')
  }
}

const stopSimulation = async () => {
  try {
    const response = await simulationApi.stop()
    if (response.success) {
      ElMessage.success(response.message)
      simulationStatus.value = 'STOPPED'
      currentTick.value = 0
    }
  } catch (error) {
    ElMessage.error('停止仿真失败')
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'RUNNING':
      return 'success'
    case 'PAUSED':
      return 'warning'
    case 'STOPPED':
      return 'info'
    default:
      return 'info'
  }
}

const formatRunTime = () => {
  if (simulationStatus.value === 'STOPPED') {
    return '00:00:00'
  }
  const now = Date.now()
  const diff = now - startTime.value
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const zoomIn = () => {
  zoom.value += 0.1
}

const zoomOut = () => {
  if (zoom.value > 0.5) {
    zoom.value -= 0.1
  }
}

const resetView = () => {
  zoom.value = 1
}

const getVehicleStyle = (vehicle: any) => {
  return {
    left: `${vehicle.x * 10 * zoom.value}px`,
    top: `${vehicle.y * 10 * zoom.value}px`,
    transform: `rotate(${vehicle.theta * 180 / Math.PI}deg) scale(${zoom.value})`,
    backgroundColor: getVehicleColor(vehicle.state)
  }
}

const getVehicleColor = (state: string) => {
  switch (state) {
    case 'IDLE':
      return '#67C23A'
    case 'MOVING':
      return '#409EFF'
    case 'CHARGING':
      return '#E6A23C'
    case 'ERROR':
      return '#F56C6C'
    default:
      return '#909399'
  }
}

const showCreateSceneDialog = () => {
  createSceneDialogVisible.value = true
}

const createScene = async () => {
  try {
    const response = await simulationApi.createScene(sceneForm)
    if (response.success) {
      ElMessage.success('场景创建成功')
      createSceneDialogVisible.value = false
      loadScenes()
    }
  } catch (error) {
    ElMessage.error('创建场景失败')
  }
}

const setCurrentScene = async (scene: any) => {
  try {
    const response = await simulationApi.setCurrentScene(scene.name)
    if (response.success) {
      ElMessage.success('场景设置成功')
    }
  } catch (error) {
    ElMessage.error('设置场景失败')
  }
}

const deleteScene = (scene: any) => {
  // 这里可以添加确认对话框
  ElMessage.success('场景删除成功')
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const startPolling = () => {
  setInterval(() => {
    loadVehicles()
    loadOrders()
    loadSimulationStatus()
  }, 1000)
}

const loadVehicles = async () => {
  try {
    const response = await simulationApi.getVehicles()
    if (response.success) {
      vehicles.value = response.vehicles
    }
  } catch (error) {
    console.error('加载车辆数据失败')
  }
}

const loadOrders = async () => {
  try {
    const response = await simulationApi.getOrders()
    if (response.success) {
      orders.value = response.orders
    }
  } catch (error) {
    console.error('加载订单数据失败')
  }
}

const loadSimulationStatus = async () => {
  try {
    const response = await simulationApi.getStatus()
    if (response.success) {
      simulationStatus.value = response.status
      currentTick.value = response.currentTick
      tickRate.value = response.tickRate
    }
  } catch (error) {
    console.error('加载仿真状态失败')
  }
}

const loadScenes = async () => {
  try {
    const response = await simulationApi.getScenes()
    if (response.success) {
      scenes.value = response.scenes
    }
  } catch (error) {
    console.error('加载场景数据失败')
  }
}

// 生命周期
onMounted(() => {
  loadScenes()
  loadVehicles()
  loadOrders()
  loadSimulationStatus()
})
</script>

<style scoped>
.simulation-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.status-info {
  margin-top: 20px;
}

.map-container {
  position: relative;
  width: 100%;
  height: 500px;
  border: 1px solid #e4e7ed;
  overflow: auto;
}

.map-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 2000px;
  height: 2000px;
  background-color: #f5f7fa;
  background-image: linear-gradient(#e4e7ed 1px, transparent 1px),
                    linear-gradient(90deg, #e4e7ed 1px, transparent 1px);
  background-size: 50px 50px;
}

.vehicle {
  position: absolute;
  width: 30px;
  height: 20px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: bold;
  transform-origin: center;
  transition: all 0.3s ease;
}

.vehicle-label {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.simulation-stats {
  height: 500px;
}

.simulation-scene {
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>