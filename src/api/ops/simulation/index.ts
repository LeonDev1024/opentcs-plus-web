import request from '@/utils/request';

// ─── 类型定义 ────────────────────────────────────────────────

export type VehicleSimState = 'IDLE' | 'MOVING' | 'CHARGING' | 'ERROR' | 'STOPPED';
export type EngineStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';
export type OrderSimState = 'CREATED' | 'ASSIGNED' | 'IN_EXECUTION' | 'COMPLETED' | 'TIMED_OUT' | 'CANCELLED';

export interface SimVehicle {
  vehicleId: string;
  name: string;
  state: VehicleSimState;
  x: number;         // 仿真坐标 m（无地图模式）
  y: number;
  theta: number;
  targetX: number;
  targetY: number;
  distanceToTarget: number;
  currentSpeed: number;
  currentBattery: number;
  /** 剩余路径航点（有地图时）— {x, y} 单位 m */
  route?: Array<{ x: number; y: number }>;
}

export interface SimMapInfo {
  mapId: number;
  name: string;
  rasterUrl: string | null;
  rasterResolution: number | null;  // m/px
  rasterWidth: number | null;       // px
  rasterHeight: number | null;      // px
  mapOrigin: string | null;         // JSON [ox, oy, θ] mm
}

export interface SimSnapshot {
  success: boolean;
  engineStatus: EngineStatus;
  tick: number;
  vehicles: SimVehicle[];
  orderStats: Partial<Record<OrderSimState, number>>;
  orderTotal: number;
  mapInfo?: SimMapInfo;
}

export interface SimNavMap {
  id: number;
  name: string;
  rasterUrl: string | null;
  rasterResolution: number | null;
  rasterWidth: number | null;
  rasterHeight: number | null;
  mapOrigin: string | null;
}

// ─── API ──────────────────────────────────────────────────────

export const simulationApi = {
  start: () => request({ url: '/api/simulation/start', method: 'post' }),
  stop: () => request({ url: '/api/simulation/stop', method: 'post' }),
  pause: () => request({ url: '/api/simulation/pause', method: 'post' }),
  resume: () => request({ url: '/api/simulation/resume', method: 'post' }),

  snapshot: (): Promise<{ data: SimSnapshot }> =>
    request({ url: '/api/simulation/snapshot', method: 'get' }),

  batchAddVehicles: (count: number, maxSpeed = 2.0) =>
    request({
      url: '/api/simulation/vehicle/batch-add',
      method: 'post',
      data: { count, maxSpeed }
    }),

  /** 获取可用地图列表 */
  listMaps: (factoryId?: number) =>
    request({ url: '/api/simulation/maps', method: 'get', params: { factoryId } }),

  /** 设置仿真使用的地图（传工厂模型 ID），返回 navMapStringId 供前端加载地图拓扑 */
  setMap: (mapId: number | null): Promise<{ data: { success: boolean; navMapStringId?: string; message?: string } }> =>
    request({ url: '/api/simulation/map/set', method: 'post', data: { mapId } })
};
