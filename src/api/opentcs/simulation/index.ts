import request from '@/utils/request'

// 仿真相关API
const simulationApi = {
  // 启动仿真
  start: () => {
    return request({
      url: '/api/simulation/start',
      method: 'post'
    })
  },
  // 暂停仿真
  pause: () => {
    return request({
      url: '/api/simulation/pause',
      method: 'post'
    })
  },
  // 继续仿真
  resume: () => {
    return request({
      url: '/api/simulation/resume',
      method: 'post'
    })
  },
  // 停止仿真
  stop: () => {
    return request({
      url: '/api/simulation/stop',
      method: 'post'
    })
  },
  // 获取仿真状态
  getStatus: () => {
    return request({
      url: '/api/simulation/status',
      method: 'get'
    })
  },
  // 创建仿真场景
  createScene: (data: any) => {
    return request({
      url: '/api/simulation/scene/create',
      method: 'post',
      data
    })
  },
  // 获取所有场景
  getScenes: () => {
    return request({
      url: '/api/simulation/scenes',
      method: 'get'
    })
  },
  // 设置当前场景
  setCurrentScene: (sceneId: string) => {
    return request({
      url: `/api/simulation/scene/set-current/${sceneId}`,
      method: 'post'
    })
  },
  // 添加模拟车辆
  addVehicle: (data: any) => {
    return request({
      url: '/api/simulation/vehicle/add',
      method: 'post',
      data
    })
  },
  // 获取所有模拟车辆
  getVehicles: () => {
    return request({
      url: '/api/simulation/vehicles',
      method: 'get'
    })
  },
  // 获取所有模拟订单
  getOrders: () => {
    return request({
      url: '/api/simulation/orders',
      method: 'get'
    })
  }
}

export { simulationApi }