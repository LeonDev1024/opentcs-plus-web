// 导航地图类型定义

export interface NavigationMapVO {
  id: number;
  factoryModelId: number;
  mapId: string;
  name: string;
  floorNumber: number | null;
  mapType: string;
  originX?: number;
  originY?: number;
  properties?: string;
  status: string;
  createTime?: string;
  updateTime?: string;
  // 关联的点数、路径数等统计信息
  pointCount?: number;
  pathCount?: number;
}

export interface NavigationMapForm {
  id?: number;
  factoryModelId: number;
  mapId?: string;
  name: string;
  floorNumber?: number | null;
  mapType?: string;
  originX?: number;
  originY?: number;
  properties?: string;
  status?: string;
}

export interface NavigationMapQuery {
  pageNum?: number;
  pageSize?: number;
  factoryModelId?: number;
  name?: string;
  mapId?: string;
  floorNumber?: number;
  mapType?: string;
  status?: string;
}
