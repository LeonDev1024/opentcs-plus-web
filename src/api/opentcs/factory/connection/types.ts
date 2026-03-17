// 跨层连接类型定义

export interface CrossLayerConnectionVO {
  id: number;
  factoryModelId: number;
  connectionId: string;
  name: string;
  connectionType: string;
  sourceNavigationMapId: number;
  sourcePointId: string;
  sourceFloor: number;
  destNavigationMapId: number;
  destPointId: string;
  destFloor: number;
  capacity: number;
  maxWeight?: number;
  travelTime?: number;
  available: boolean;
  currentLoad?: number;
  properties?: string;
  createTime?: string;
  updateTime?: string;
  // 关联的地图名称
  sourceMapName?: string;
  destMapName?: string;
}

export interface CrossLayerConnectionForm {
  id?: number;
  factoryModelId: number;
  connectionId?: string;
  name: string;
  connectionType: string;
  sourceNavigationMapId: number;
  sourcePointId: string;
  sourceFloor: number;
  destNavigationMapId: number;
  destPointId: string;
  destFloor: number;
  capacity?: number;
  maxWeight?: number;
  travelTime?: number;
  available?: boolean;
  currentLoad?: number;
  properties?: string;
}

export interface CrossLayerConnectionQuery {
  pageNum?: number;
  pageSize?: number;
  factoryModelId?: number;
  name?: string;
  connectionId?: string;
  connectionType?: string;
  available?: boolean;
}
