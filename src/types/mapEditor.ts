/**
 * 地图编辑器类型定义
 */

// ==================== 工具模式 ====================
export enum ToolMode {
  SELECT = 'select',        // 选择模式
  POINT = 'point',          // 绘制点
  PATH = 'path',            // 绘制路径
  LOCATION = 'location',    // 绘制位置（多边形）
  PAN = 'pan',              // 平移模式
  ZOOM = 'zoom'             // 缩放模式
}

// ==================== 图层类型 ====================
export enum LayerType {
  BACKGROUND = 'background',  // 背景层
  PATH = 'path',             // 路径层
  POINT = 'point',           // 点位层
  LOCATION = 'location',     // 位置层
  REGION = 'region'          // 区域层
}

// ==================== 图层模型 ====================
export interface MapLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;          // 是否可见
  locked: boolean;           // 是否锁定
  zIndex: number;            // 层级顺序
  opacity: number;           // 透明度 (0-1)
  elementIds: string[];      // 该图层包含的元素ID列表
}

// ==================== 点（Point）模型 ====================
export interface MapPoint {
  id: string;
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
  
  // 编辑器扩展属性
  editorProps: {
    radius: number;          // 显示半径
    color: string;         // 颜色
    icon?: string;         // 图标URL
    label?: string;        // 标签文本
    labelVisible: boolean; // 标签是否显示
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
  
  // 路径几何数据
  geometry: {
    // 路径由多个控制点组成
    controlPoints: PathControlPoint[];
    // 路径类型：直线、曲线、贝塞尔曲线
    pathType: 'line' | 'curve' | 'bezier';
  };
  
  // 编辑器扩展属性
  editorProps: {
    strokeColor: string;   // 线条颜色
    strokeWidth: number;    // 线条宽度
    lineStyle: 'solid' | 'dashed' | 'dotted';
    arrowVisible: boolean;  // 是否显示箭头
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
  x?: number;              // 中心点X（可选，可由顶点计算）
  y?: number;              // 中心点Y（可选，可由顶点计算）
  z?: number;
  blockId?: string | number;
  description?: string;
  status: string;
  
  // 位置几何数据（多边形）
  geometry: {
    // 多边形由多个顶点组成
    vertices: LocationVertex[];
    // 是否闭合
    closed: boolean;
  };
  
  // 编辑器扩展属性
  editorProps: {
    fillColor: string;     // 填充颜色
    fillOpacity: number;   // 填充透明度
    strokeColor: string;   // 边框颜色
    strokeWidth: number;   // 边框宽度
    label?: string;
    labelVisible: boolean;
  };
  
  // 元数据
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 地图编辑器完整数据模型 ====================
export interface MapEditorData {
  // 地图基本信息
  mapInfo: {
    id: string | number;
    name: string;
    version: string;
    description?: string;
    width: number;        // 画布宽度
    height: number;       // 画布高度
    scale: number;        // 缩放比例
    offsetX: number;      // 偏移X
    offsetY: number;      // 偏移Y
  };
  
  // 图层数据
  layers: MapLayer[];
  
  // 元素数据
  elements: {
    points: MapPoint[];
    paths: MapPath[];
    locations: MapLocation[];
  };
  
  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
}

// ==================== 画布状态 ====================
export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// ==================== 选择状态 ====================
export interface SelectionState {
  selectedIds: Set<string>;
  selectedType: 'point' | 'path' | 'location' | null;
}

// ==================== 命令接口（用于撤销/重做）====================
export interface Command {
  execute(): void;    // 执行
  undo(): void;      // 撤销
  redo(): void;      // 重做（通常等于execute）
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

