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
 * 后端返回的地图编辑器数据
 * 对应后端 PlantModelBO
 */
export interface MapEditorResponse {
  /** 响应码 */
  code?: number;
  /** 响应消息 */
  msg?: string;
  /** 数据库ID */
  id?: number;
  /** 地图编号（业务标识） */
  mapId?: string | number;
  /** 地图名称 */
  name?: string;
  /** 地图版本 */
  modelVersion?: string;
  /** 描述 */
  description?: string;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
  /** 地图原点X坐标（毫米） */
  originX?: number;
  /** 地图原点Y坐标（毫米） */
  originY?: number;
  /** 地图旋转角度（度） */
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
  /** 地图信息（备用） */
  mapInfo?: {
    createTime?: string;
    updateTime?: string;
    [key: string]: any;
  };
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

