// 导航地图类型定义

export interface NavigationMapVO {
  id: number;
  factoryModelId: number;
  factoryName?: string;  // 关联的工厂名称
  factoryId?: string;   // 关联的工厂编号
  mapId: string;
  name: string;
  floorNumber: number | null;
  // AMR 型号（必填，对应 vehicle_type.name）
  amrModel?: string;
  // 地图定位参数（相对于场景原点，用于多地图统一显示）
  originX?: number;
  originY?: number;
  rotation?: number;
  properties?: string;
  status: string;
  description?: string;
  createTime?: string;
  updateTime?: string;
  // 栅格底图相关字段（PGM 障碍物地图，仅用于可视化）
  rasterUrl?: string;
  rasterVersion?: number;
  rasterWidth?: number;
  rasterHeight?: number;
  rasterResolution?: number;
  // 关联的点数、路径数等统计信息
  pointCount?: number;
  pathCount?: number;
}

export interface NavigationMapForm {
  id?: number;
  factoryModelId: number;
  mapId: string;
  name: string;
  floorNumber?: number | null;
  // AMR 型号（必填，对应 vehicle_type.name）
  amrModel?: string;
  // 地图定位参数（相对于场景原点）
  originX?: number;
  originY?: number;
  rotation?: number;
  properties?: string;
  status?: string;
  // 描述
  description?: string;
  // 栅格底图相关字段（创建/更新时传递）
  rasterUrl?: string;
  rasterVersion?: number;
  rasterWidth?: number;
  rasterHeight?: number;
  rasterResolution?: number;
}

export interface NavigationMapQuery {
  pageNum?: number;
  pageSize?: number;
  factoryModelId?: number;
  name?: string;
  mapId?: string;
  floorNumber?: number;
  status?: string;
}
