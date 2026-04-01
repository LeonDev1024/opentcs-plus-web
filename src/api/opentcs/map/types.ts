export interface MapVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 地图模型名称
   */
  name: string;

  /**
   * 地图模型描述
   */
  description?: string;


  /**
   * 地图模型版本
   */
  modelVersion?: string;

  /**
   * 地图id
   */
  mapId?: string | number;


  /**
   * 状态（0正常 1停用）
   */
  status: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

export interface MapForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 地图模型名称
   */
  name?: string;

  /**
   * 地图模型描述
   */
  description?: string;


  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

export interface MapQuery extends PageQuery {
  /**
   * 地图模型名称
   */
  name?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

// ==================== 地图编辑器 API 类型 ====================

/**
 * 后端 MapEditorMapInfoDTO：导航地图元信息（加载/保存嵌套在 mapInfo 下）
 * 约定：对外主标识统一为 mapId，id 仅做兼容字段
 */
export interface MapEditorMapInfoApi {
  name?: string;
  mapId?: string | number;
  /** 地图主键ID（兼容字段，禁止作为编辑器主标识） */
  id?: string | number;
  factoryModelId?: number;
  factoryName?: string;
  originX?: number | string;
  originY?: number | string;
  rotation?: number | string;
  mapVersion?: string;
  /** 旧版字段名，兼容 */
  modelVersion?: string;
  status?: string;
  description?: string;
  layoutWidth?: string | number;
  layoutHeight?: string | number;
  scale?: string | number;
  /** 画布快照 JSON */
  data?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 地图编辑器保存请求体（对应后端 MapEditorSaveDTO）
 */
export interface MapEditorApiSavePayload {
  mapInfo: {
    mapId: string;
    name?: string;
    mapVersion?: string;
    originX?: number;
    originY?: number;
    rotation?: number;
    data?: string;
  };
  layerGroups?: any[];
  layers?: any[];
  points?: any[];
  paths?: any[];
  locations?: any[];
}

/**
 * 后端返回的地图编辑器数据
 * 对应后端 MapEditorDTO：mapInfo + points/paths/locations
 */
export interface MapEditorResponse {
  /** 响应码 */
  code?: number;
  /** 响应消息 */
  msg?: string;
  /** 嵌套：导航地图元信息（推荐） */
  mapInfo?: MapEditorMapInfoApi;
  /** 地图业务标识（主标识，旧版扁平字段兼容） */
  mapId?: string | number;
  /** 地图名称（旧版扁平字段兼容） */
  name?: string;
  /** 地图版本（旧版字段名 modelVersion，兼容） */
  modelVersion?: string;
  /** 地图状态: 0-草稿(DRAFT), 1-已发布(PUBLISHED) */
  status?: string;
  /** 描述 */
  description?: string;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
  /** 地图原点X坐标（毫米，旧版扁平兼容） */
  originX?: number;
  /** 地图原点Y坐标（毫米，旧版扁平兼容） */
  originY?: number;
  /** 地图旋转角度（度，旧版扁平兼容） */
  rotation?: number;
  /** 点位数据 */
  points?: any[];
  /** 路径数据 */
  paths?: any[];
  /** 位置数据 */
  locations?: any[];
  /** 视觉布局数据 */
  visualLayout?: VisualLayoutData;
  /** 图层组数据（备用） */
  layerGroups?: any[];
  /** 图层数据（备用） */
  layers?: any[];
  /** 元素数据（备用） */
  elements?: {
    points?: any[];
    paths?: any[];
    locations?: any[];
  };
}

/**
 * 视觉布局数据（后端返回）
 */
export interface VisualLayoutData {
  /** 图层组列表 */
  layerGroups?: any[];
  /** 图层列表 */
  layers?: any[];
  /** X轴比例 */
  scaleX?: number | string;
  /** Y轴比例 */
  scaleY?: number | string;
  /** 布局名称 */
  name?: string;
}

/**
 * 地图编辑器数据（前端内部使用）
 */
export interface MapEditorSaveData {
  mapInfo: {
    id: string | number;
    name: string;
    mapVersion: string;
    description?: string;
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    scaleX?: number;
    scaleY?: number;
  };
  layerGroups?: any[];
  layers?: any[];
  points?: any[];
  paths?: any[];
  locations?: any[];
  visualLayout?: VisualLayoutData;
}

