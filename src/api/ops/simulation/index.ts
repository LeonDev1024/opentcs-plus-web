import request from '@/utils/request';

// ─── 类型定义 ────────────────────────────────────────────────

export type VehicleSimState = 'IDLE' | 'MOVING' | 'CHARGING' | 'ERROR' | 'STOPPED';
export type EngineStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';
export type OrderSimState = 'CREATED' | 'ASSIGNED' | 'IN_EXECUTION' | 'COMPLETED' | 'TIMED_OUT' | 'CANCELLED';

export interface SimVehicle {
  vehicleId: string;
  name: string;
  state: VehicleSimState;
  x: number;
  y: number;
  theta: number;
  targetX: number;
  targetY: number;
  distanceToTarget: number;
  currentSpeed: number;
  currentBattery: number;
}

export interface SimSnapshot {
  success: boolean;
  engineStatus: EngineStatus;
  tick: number;
  vehicles: SimVehicle[];
  orderStats: Partial<Record<OrderSimState, number>>;
  orderTotal: number;
}

// ─── API ──────────────────────────────────────────────────────

export const simulationApi = {
  start: () => request({ url: '/api/simulation/start', method: 'post' }),
  stop: () => request({ url: '/api/simulation/stop', method: 'post' }),
  pause: () => request({ url: '/api/simulation/pause', method: 'post' }),
  resume: () => request({ url: '/api/simulation/resume', method: 'post' }),

  /** 一次性聚合快照（1s 轮询用） */
  snapshot: (): Promise<{ data: SimSnapshot }> =>
    request({ url: '/api/simulation/snapshot', method: 'get' }),

  /** 批量添加测试车辆 */
  batchAddVehicles: (count: number, maxSpeed = 2.0) =>
    request({
      url: '/api/simulation/vehicle/batch-add',
      method: 'post',
      data: { count, maxSpeed }
    })
};
