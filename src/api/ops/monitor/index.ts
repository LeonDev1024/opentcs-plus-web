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

// ========== 监控大屏 API ==========

import { AxiosPromise } from 'axios';

/** 车辆状态枚举 */
export type VehicleState = 'IDLE' | 'WORKING' | 'CHARGING' | 'ERROR' | 'UNKNOWN' | 'UNAVAILABLE';

/** 位置信息 */
export interface Position {
  pointId?: string;
  x: number;
  y: number;
  orientation: number;
}

/** 车辆运行时状态 */
export interface VehicleRuntimeVO {
  vehicleId: string;
  name: string;
  typeId: string;
  state: VehicleState;
  position: Position;
  currentOrderId?: string;
  energyLevel?: number;
  factoryId?: number;
  factoryName?: string;
  /** 当前速度（m/s），可选 —— 后端有则展示 */
  velocity?: number;
  /** 当前任务/充电预计完成分钟数，可选 */
  estimatedFinishMinutes?: number;
  /** 任务可读描述，例如「取货 A3→拣选」「C 区→出货口」，后端拼好后下发 */
  taskDescription?: string;
}

/** AMR 统计 */
export interface AmrStats {
  totalVehicles: number;
  idleVehicles: number;
  executingVehicles: number;
  chargingVehicles: number;
  errorVehicles: number;
  offlineVehicles?: number;
}

/** 任务统计 */
export interface TaskStats {
  totalOrders: number;
  waitingOrders: number;
  activeOrders: number;
  finishedOrders: number;
  cancelledOrders: number;
  failedOrders: number;
}

/** 机器人卡片数据 */
export interface RobotCardVO {
  vehicleId: string;
  name: string;
  state: VehicleState;
  currentOrderId?: string;
  orderNo?: string;
  position: Position;
  energyLevel?: number;
  targetLocationName?: string;
  /** 速度（m/s） */
  velocity?: number;
  /** 预计完成分钟数（充电或任务） */
  estimatedFinishMinutes?: number;
  /** 任务可读描述 */
  taskDescription?: string;
}

const monitorApi = {
  /** 获取 AMR 运行时状态列表 */
  listVehicleRuntime: (factoryId?: number): AxiosPromise<VehicleRuntimeVO[]> => {
    return request({ url: '/vehicle/runtime/status/all', method: 'get', params: { factoryId } });
  },
  /** 获取车辆统计 */
  getVehicleStatistics: (factoryId?: number): AxiosPromise<AmrStats> => {
    return request({ url: '/vehicle/statistics', method: 'get', params: { factoryId } });
  },
  /** 获取任务统计 */
  getOrderStatistics: (factoryId?: number): AxiosPromise<TaskStats> => {
    return request({ url: '/transport-order/statistics', method: 'get', params: { factoryId } });
  },
  /** 获取可调度车辆列表 */
  listAvailableVehicles: (factoryId?: number): AxiosPromise<VehicleRuntimeVO[]> => {
    return request({ url: '/vehicle/runtime/available', method: 'get', params: { factoryId } });
  },
  /** 获取单个车辆运行时状态 */
  getVehicleRuntime: (vehicleId: string): AxiosPromise<VehicleRuntimeVO> => {
    return request({ url: '/vehicle/runtime/status/' + vehicleId, method: 'get' });
  }
};

export { monitorApi };
