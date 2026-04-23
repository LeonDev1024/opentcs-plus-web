/**
 * 地图编辑器类型定义
 */

// ==================== 工具模式 ====================
export enum ToolMode {
  SELECT = "select", // 选择模式
  POINT = "point", // 绘制点
  PATH = "path", // 绘制路径
  LOCATION = "location", // 绘制位置（多边形）
  PAN = "pan", // 平移模式
  ZOOM = "zoom", // 缩放模式
  DASHED_LINK = "dashedLink", // 点与业务位置的虚线链接
  RULE_REGION = "ruleRegion", // 规则区域绘制
}

// ==================== 图层类型 ====================
export enum LayerType {
  BACKGROUND = "background", // 背景层
  PATH = "path", // 路径层
  POINT = "point", // 点位层
  LOCATION = "location", // 位置层
  REGION = "region", // 区域层
}

// ==================== 图层组模型 ====================
export interface LayerGroup {
  id: string;
  name: string;
  visible: boolean; // 是否可见
  description?: string; // 描述
}

// ==================== 图层模型 ====================
export interface MapLayer {
  id: string;
  name: string;
  type: LayerType;
  layerGroupId?: string; // 关联的图层组ID
  visible: boolean; // 是否可见
  locked: boolean; // 是否锁定
  zIndex: number; // 层级顺序
  opacity: number; // 透明度 (0-1)
  elementIds: string[]; // 该图层包含的元素ID列表
}

// ==================== 点（Point）模型 ====================
export interface MapPoint {
  id: string;
  pointId?: string; // 后端原始 pointId，用于路径关联
  layerId: string;

  // 基础属性（对应后端 PointVO）
  name: string;
  code?: string;
  x: number;
  y: number;
  z?: number;
  type?: string;
  description?: string;
  status: string;

  // 锁定状态
  locked?: boolean;

  // 调度属性（对应 openTCS PointModel）
  vehicleOrientationAngle?: number; // 车辆停靠朝向角度（度），NaN 表示任意方向

  // 编辑器扩展属性
  editorProps: {
    radius: number; // 显示半径
    color: string; // 填充颜色
    strokeColor?: string; // 描边颜色
    textColor?: string; // 图形内文字颜色
    icon?: string; // 图标URL
    label?: string; // 标签文本
    labelVisible: boolean; // 标签是否显示
    labelOffset?: {
      x: number; // 标签X偏移
      y: number; // 标签Y偏移
    };
  };

  // 元数据
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 路径（Path）模型 ====================
export interface PathControlPoint {
  id: string;
  x: number;
  y: number;
  z?: number;
}

export interface MapPath {
  id: string;
  layerId: string;

  // 基础属性（对应后端 PathVO）
  name: string;
  code?: string;
  startPointId?: string | number;
  endPointId?: string | number;
  length?: number;
  type?: string;
  description?: string;
  status: string;

  // 锁定状态
  locked?: boolean;

  // 调度属性（对应 openTCS PathModel）
  maxVelocity?: number;        // 正向最大速度（mm/s），0 表示使用车辆默认值
  maxReverseVelocity?: number; // 反向最大速度（mm/s），0 表示使用车辆默认值

  // 路径几何数据
  geometry: {
    // 路径由多个控制点组成
    controlPoints: PathControlPoint[];
    // 路径类型：直线、曲线、贝塞尔曲线
    pathType: "line" | "curve" | "bezier";
  };

  // 编辑器扩展属性
  editorProps: {
    strokeColor: string; // 线条颜色
    strokeWidth: number; // 线条宽度
    lineStyle: "solid" | "dashed" | "dotted";
    arrowVisible: boolean; // 是否显示箭头
    /**
     * 车道箭头展示：新建路径均为 one-way（先点起点再点终点即方向）。
     * two-way 仅可能来自后端/导入数据，前端不再提供手动切换。
     */
    laneMode?: "one-way" | "two-way";
    label?: string;
    labelVisible: boolean;
  };

  // 元数据
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 位置（Location）模型 ====================
export interface LocationVertex {
  id: string;
  x: number;
  y: number;
  z?: number;
}

export interface MapLocation {
  id: string;
  layerId: string;

  // 基础属性（对应后端 LocationVO）
  name: string;
  code?: string;
  locationTypeId?: string | number;
  x?: number; // 中心点X（可选，可由顶点计算）
  y?: number; // 中心点Y（可选，可由顶点计算）
  z?: number;
  blockId?: string | number;
  description?: string;
  status: string;

  // 锁定状态
  locked?: boolean;

  // 位置几何数据（多边形）
  geometry: {
    // 多边形由多个顶点组成
    vertices: LocationVertex[];
    // 是否闭合
    closed: boolean;
  };

  // 编辑器扩展属性
  editorProps: {
    fillColor: string; // 填充颜色
    fillOpacity: number; // 填充透明度
    strokeColor: string; // 边框颜色
    strokeWidth: number; // 边框宽度
    label?: string;
    labelVisible: boolean;
    labelOffset?: {
      x: number; // 标签X偏移
      y: number; // 标签Y偏移
    };
  };

  // 元数据
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 视觉布局（Visual Layout）模型 ====================
export interface VisualLayout {
  visualLayoutId?: number;
  name: string;
  scaleX?: string | number;
  scaleY?: string | number;
  layers?: MapLayer[];
  layerGroups?: LayerGroup[];
  [key: string]: any; // 允许其他属性
}

// ==================== 地图编辑器完整数据模型 ====================
export interface MapEditorData {
  // 地图基本信息
  mapInfo: {
    id: string | number;
    name: string;
    mapVersion: string;
    /** 地图状态: 0-草稿(DRAFT), 1-已发布(PUBLISHED) */
    status?: string;
    description?: string;
    width: number; // 画布宽度
    height: number; // 画布高度
    scale: number; // 缩放比例
    offsetX: number; // 偏移X
    offsetY: number; // 偏移Y
    scaleX?: number; // X轴比例（单位：mm）
    scaleY?: number; // Y轴比例（单位：mm）
    /** 地图原点相对于场景原点的偏移（毫米）。默认 0,0（与场景原点重合）。 */
    originX?: number;
    originY?: number;
    /** 地图相对于场景的旋转角度（度） */
    rotation?: number;
  };

  // 图层组数据
  layerGroups?: LayerGroup[];

  // 图层数据
  layers: MapLayer[];

  // 元素数据
  elements: {
    points: MapPoint[];
    paths: MapPath[];
    locations: MapLocation[];
  };

  // Block 规则数据（资源互斥规则，对应 openTCS Block）
  blocks?: MapBlock[];

  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
  };

  // 视觉布局数据（用于视图树显示）
  visualLayout?: VisualLayout;
}

// ==================== 画布状态 ====================
export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// ==================== 栅格底图（YAML + PGM 导入）====================
export interface RasterBackground {
  /** 图像 Data URL（PGM 转成可显示格式） */
  imageDataUrl: string;
  /** 栅格原点 X，米（地图左下角在世界坐标系中的位置） */
  originX: number;
  /** 栅格原点 Y，米 */
  originY: number;
  /** 分辨率，米/像素 */
  resolution: number;
  /** 图像宽度，像素 */
  widthPx: number;
  /** 图像高度，像素 */
  heightPx: number;
}

// ==================== Block（资源互斥规则）模型 ====================
/**
 * 对应 openTCS Block 语义：资源的逻辑分组，配合调度规则。
 * Block 不是多边形区域，而是对现有 Point/Path/Location 的命名分组。
 */
export interface MapBlock {
  /** 前端临时 UUID，不提交给后端 */
  id: string;
  /** 后端持久化 blockId（字符串唯一标识） */
  blockId?: string;
  /** Block 名称（全图唯一） */
  name: string;
  /**
   * Block 类型：
   * - SINGLE_VEHICLE_ONLY: 同一时刻只允许一辆车占用 Block 内所有资源（路口互斥）
   * - SAME_DIRECTION_ONLY: 多车可同时进入，但方向必须相同（走廊同向通行）
   */
  type: 'SINGLE_VEHICLE_ONLY' | 'SAME_DIRECTION_ONLY';
  /**
   * 成员资源名称列表（Point.name / Path.name / Location.name）
   * 遵循 openTCS 规范：用 name 字符串标识，非数据库 id
   */
  members: string[];
  /** 成员元素在画布上的高亮颜色（hex 格式，如 "#F44336"） */
  color: string;
  /** 扩展属性（供策略插件读取） */
  properties?: Record<string, string>;
}

// ==================== 选择状态 ====================
export interface SelectionState {
  selectedIds: Set<string>;
  selectedType: "point" | "path" | "location" | "layout" | "block" | null;
}

// ==================== 命令接口（用于撤销/重做）====================
export interface Command {
  execute(): void; // 执行
  undo(): void; // 撤销
  redo(): void; // 重做（通常等于execute）
  description?: string; // 命令描述
}

// ==================== 历史记录 ====================
export interface HistoryState {
  undoStack: Command[];
  redoStack: Command[];
  maxHistorySize: number;
}

// ==================== 坐标点 ====================
export interface Point {
  x: number;
  y: number;
  z?: number;
}

// ==================== 线段 ====================
export interface Line {
  start: Point;
  end: Point;
}

/** 地图画布图层显隐（编辑器工具栏仅提供三项） */
export interface MapLayerVisibility {
  /** 站点（业务位置矩形与图标） */
  station: boolean;
  /** 路径方向箭头 */
  pathDirection: boolean;
  /** 栅格底图 */
  raster: boolean;
  /** 路径线 */
  path: boolean;
  /** 网格 */
  grid: boolean;
}

export function defaultMapLayerVisibility(): MapLayerVisibility {
  return {
    station: true,
    pathDirection: true,
    raster: true,
    path: true,
    grid: true,
  };
}
