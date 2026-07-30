import request from '@/utils/request'

// ========== 监控大屏 API ==========

import { AxiosPromise } from 'axios';

/** 车辆状态枚举（运行态含 EXECUTING；WORKING 为历史兼容别名） */
export type VehicleState =
  | 'IDLE'
  | 'WORKING'
  | 'EXECUTING'
  | 'CHARGING'
  | 'ERROR'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'OFFLINE'
  | 'PAUSED'
  | 'WAITING';

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

/** 资源锁 */
export interface ResourceLockVO {
  lockId: string;
  resourceId: string;
  resourceType: string;
  vehicleId: string;
  orderId: string;
  status: string;
  createdAt?: string;
  expiresAt?: string;
}

/** 资源锁审计 */
export interface ResourceLockAuditVO {
  lockId: string;
  resourceType: string;
  resourceId: string;
  vehicleId?: string;
  orderId?: string;
  eventReason: string;
  status: string;
  operatorName?: string;
  detail?: string;
  eventTime?: string;
}

/** 监控告警 */
export interface MonitorAlarmVO {
  alarmId: string;
  severity: string;
  category: string;
  title: string;
  message: string;
  vehicleName?: string;
  resourceId?: string;
  resourceType?: string;
  acked?: boolean;
  createdAt?: string;
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

export const listResourceLocks = (): AxiosPromise<ResourceLockVO[]> => {
  return request({ url: '/ops/monitor/locks', method: 'get' });
};

export const listResourceLockAudits = (limit = 100): AxiosPromise<ResourceLockAuditVO[]> => {
  return request({ url: '/ops/monitor/locks/audit', method: 'get', params: { limit } });
};

export const forceReleaseLock = (resourceType: string, resourceId: string): AxiosPromise<boolean> => {
  return request({
    url: '/ops/monitor/locks/release',
    method: 'post',
    params: { resourceType, resourceId }
  });
};

export const listMonitorAlarms = (): AxiosPromise<MonitorAlarmVO[]> => {
  return request({ url: '/ops/monitor/alarms', method: 'get' });
};

export const ackMonitorAlarm = (alarmId: string): AxiosPromise<boolean> => {
  return request({ url: `/ops/monitor/alarms/${alarmId}/ack`, method: 'post' });
};

export { monitorApi };
