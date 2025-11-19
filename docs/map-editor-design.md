# 地图编辑器设计文档

## 一、交互处理方案

### 1.1 交互状态管理

#### 工具模式（Tool Mode）
```typescript
enum ToolMode {
  SELECT = 'select',        // 选择模式
  POINT = 'point',          // 绘制点
  PATH = 'path',            // 绘制路径
  LOCATION = 'location',    // 绘制位置（多边形）
  PAN = 'pan',              // 平移模式
  ZOOM = 'zoom'             // 缩放模式
}
```

#### 交互状态机
```
空闲状态 (IDLE)
  ↓ [点击画布]
绘制状态 (DRAWING)
  ↓ [完成绘制/取消]
空闲状态 (IDLE)

空闲状态 (IDLE)
  ↓ [选中元素]
编辑状态 (EDITING)
  ↓ [拖拽/修改属性]
编辑状态 (EDITING)
  ↓ [取消选择]
空闲状态 (IDLE)
```

### 1.2 事件处理流程

#### 画布事件处理
```typescript
// 事件优先级：工具模式 > 默认行为
CanvasEventFlow {
  // 鼠标按下
  mousedown: {
    1. 检查是否点击在已有元素上
    2. 根据工具模式执行对应操作
       - SELECT: 选中元素，显示属性面板
       - POINT: 在点击位置创建点
       - PATH: 开始绘制路径（记录起点）
       - LOCATION: 开始绘制多边形（记录第一个顶点）
       - PAN: 开始平移（记录起始位置）
  },
  
  // 鼠标移动
  mousemove: {
    1. 实时更新鼠标坐标显示
    2. 根据工具模式执行对应操作
       - SELECT: 显示悬停提示
       - PATH: 实时预览路径线段
       - LOCATION: 实时预览多边形
       - PAN: 更新画布位置
  },
  
  // 鼠标抬起
  mouseup: {
    1. 完成当前操作
    2. 记录到历史栈（用于撤销/重做）
    3. 更新数据模型
  },
  
  // 滚轮缩放
  wheel: {
    1. 计算缩放中心点（鼠标位置）
    2. 更新画布缩放比例
    3. 限制缩放范围（min: 0.1, max: 10）
  }
}
```

#### 元素交互处理
```typescript
ElementInteraction {
  // 点（Point）交互
  Point: {
    drag: {
      // 拖拽点
      onDragStart: 记录原始位置,
      onDragMove: 实时更新点坐标,
      onDragEnd: 保存新位置，记录历史
    },
    click: {
      // 点击选中
      onSelect: 显示属性面板，高亮显示
    }
  },
  
  // 路径（Path）交互
  Path: {
    // 路径由多个控制点组成
    controlPoint: {
      drag: {
        // 拖拽控制点
        onDragStart: 记录原始位置,
        onDragMove: 实时更新路径形状,
        onDragEnd: 保存新路径，记录历史
      },
      click: {
        // 点击控制点
        onSelect: 高亮显示该控制点
      }
    },
    segment: {
      // 路径线段
      click: {
        // 点击线段中间可插入新控制点
        onInsertPoint: 在点击位置插入新控制点
      }
    }
  },
  
  // 位置（Location）交互
  Location: {
    // 位置是多边形，由多个顶点组成
    vertex: {
      drag: {
        // 拖拽顶点
        onDragStart: 记录原始位置,
        onDragMove: 实时更新多边形形状,
        onDragEnd: 保存新形状，记录历史
      },
      click: {
        // 点击顶点
        onSelect: 高亮显示该顶点
      }
    },
    edge: {
      // 多边形边
      click: {
        // 点击边中间可插入新顶点
        onInsertVertex: 在点击位置插入新顶点
      }
    },
    area: {
      // 多边形内部区域
      drag: {
        // 拖拽整个多边形
        onDragStart: 记录所有顶点原始位置,
        onDragMove: 实时更新所有顶点位置,
        onDragEnd: 保存新位置，记录历史
      }
    }
  }
}
```

### 1.3 选择与多选

```typescript
SelectionManager {
  // 单选
  selectSingle(element: MapElement) {
    1. 清除之前的选择
    2. 设置当前选中元素
    3. 显示属性面板
    4. 高亮显示元素（Konva Transformer）
  },
  
  // 多选（框选或 Ctrl+点击）
  selectMultiple(elements: MapElement[]) {
    1. 添加到选择集合
    2. 显示批量操作工具栏
    3. 高亮显示所有选中元素
  },
  
  // 取消选择
  clearSelection() {
    1. 清除选择集合
    2. 隐藏属性面板
    3. 移除高亮显示
  }
}
```

### 1.4 吸附与对齐

```typescript
SnapHelper {
  // 网格吸附
  snapToGrid(point: Point, gridSize: number): Point {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    }
  },
  
  // 点对点吸附
  snapToPoint(point: Point, targetPoints: Point[], threshold: number): Point {
    // 查找最近的点，距离小于阈值则吸附
  },
  
  // 点对线吸附
  snapToLine(point: Point, lines: Line[], threshold: number): Point {
    // 查找最近的线段，投影到线段上
  }
}
```

### 1.5 撤销/重做机制

```typescript
CommandPattern {
  // 命令接口
  interface Command {
    execute(): void;    // 执行
    undo(): void;      // 撤销
    redo(): void;      // 重做（通常等于execute）
  }
  
  // 具体命令
  class AddPointCommand implements Command {
    execute() { /* 添加点 */ },
    undo() { /* 删除点 */ }
  }
  
  class MovePointCommand implements Command {
    execute() { /* 移动点 */ },
    undo() { /* 恢复原位置 */ }
  }
  
  // 命令管理器
  class CommandManager {
    undoStack: Command[];      // 撤销栈
    redoStack: Command[];      // 重做栈
    
    execute(command: Command) {
      command.execute();
      undoStack.push(command);
      redoStack = [];  // 新操作清空重做栈
    },
    
    undo() {
      if (undoStack.length > 0) {
        const command = undoStack.pop();
        command.undo();
        redoStack.push(command);
      }
    },
    
    redo() {
      if (redoStack.length > 0) {
        const command = redoStack.pop();
        command.redo();
        undoStack.push(command);
      }
    }
  }
}
```

---

## 二、数据模型存储方案

### 2.1 核心数据模型

#### 地图编辑器数据模型
```typescript
// 地图编辑器完整数据模型
interface MapEditorData {
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
```

#### 图层模型
```typescript
enum LayerType {
  BACKGROUND = 'background',  // 背景层
  PATH = 'path',             // 路径层
  POINT = 'point',           // 点位层
  LOCATION = 'location',     // 位置层
  REGION = 'region'          // 区域层
}

interface MapLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;          // 是否可见
  locked: boolean;           // 是否锁定
  zIndex: number;            // 层级顺序
  opacity: number;           // 透明度 (0-1)
  elementIds: string[];      // 该图层包含的元素ID列表
}
```

#### 点（Point）模型
```typescript
interface MapPoint {
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
```

#### 路径（Path）模型
```typescript
interface MapPath {
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
    controlPoints: Array<{
      id: string;
      x: number;
      y: number;
      z?: number;
    }>;
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
```

#### 位置（Location）模型
```typescript
interface MapLocation {
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
    vertices: Array<{
      id: string;
      x: number;
      y: number;
      z?: number;
    }>;
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
```

### 2.2 状态管理（Pinia Store）

#### 地图编辑器 Store
```typescript
// src/store/modules/mapEditor.ts
export const useMapEditorStore = defineStore('mapEditor', () => {
  // 当前地图数据
  const mapData = ref<MapEditorData | null>(null);
  
  // 当前工具模式
  const currentTool = ref<ToolMode>(ToolMode.SELECT);
  
  // 画布状态
  const canvasState = reactive({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 1920,
    height: 1080
  });
  
  // 图层列表
  const layers = ref<MapLayer[]>([]);
  
  // 元素数据
  const points = ref<MapPoint[]>([]);
  const paths = ref<MapPath[]>([]);
  const locations = ref<MapLocation[]>([]);
  
  // 选择状态
  const selection = reactive({
    selectedIds: new Set<string>(),
    selectedType: null as 'point' | 'path' | 'location' | null
  });
  
  // 历史记录
  const history = reactive({
    undoStack: [] as Command[],
    redoStack: [] as Command[],
    maxHistorySize: 50
  });
  
  // Actions
  const loadMap = async (mapModelId: string | number) => {
    // 从后端加载地图数据
  };
  
  const saveMap = async () => {
    // 保存地图数据到后端
  };
  
  const addPoint = (point: Omit<MapPoint, 'id'>) => {
    // 添加点
  };
  
  const updatePoint = (id: string, updates: Partial<MapPoint>) => {
    // 更新点
  };
  
  const deletePoint = (id: string) => {
    // 删除点
  };
  
  // 类似地，为 path 和 location 提供 CRUD 操作
  
  return {
    mapData,
    currentTool,
    canvasState,
    layers,
    points,
    paths,
    locations,
    selection,
    history,
    loadMap,
    saveMap,
    addPoint,
    updatePoint,
    deletePoint
  };
});
```

### 2.3 数据持久化方案

#### 存储方案对比

**方案一：纯数据库存储**
- ✅ 优点：
  - 数据查询方便，支持复杂查询
  - 事务支持，数据一致性好
  - 版本管理容易实现
  - 支持增量更新
  - 便于权限控制和审计
- ❌ 缺点：
  - 大数据量时性能可能下降
  - 数据库存储成本较高
  - 备份恢复相对复杂

**方案二：纯文件存储**
- ✅ 优点：
  - 存储简单，文件系统管理
  - 便于版本控制（Git）
  - 可以离线使用
  - 文件大小不受数据库限制
- ❌ 缺点：
  - 查询不便，需要加载整个文件
  - 不支持部分更新
  - 并发控制困难
  - 权限管理复杂

**方案三：混合存储（推荐）**
- ✅ 优点：
  - 元数据存数据库，便于查询和管理
  - 完整数据存文件，性能好
  - 兼顾两种方案的优点
- ❌ 缺点：
  - 需要维护数据一致性
  - 实现相对复杂

#### 推荐方案：混合存储

基于现有系统已有 `filePath` 字段，推荐采用**混合存储方案**：

1. **元数据存储在数据库**（MapModel 表）
   - 基本信息：id、name、version、description、status
   - 文件路径：filePath（指向实际地图文件）
   - 关联关系：与 Point、Path、Location 表的关联

2. **完整地图数据存储在文件**（JSON/XML 格式）
   - 编辑器完整数据：图层、元素几何数据、编辑器属性
   - 文件格式：JSON（推荐，便于前端解析）或 XML（兼容 OpenTCS 标准）

#### 本地存储（IndexedDB / LocalStorage）
```typescript
// 用于临时保存，防止数据丢失
class MapEditorPersistence {
  // 自动保存到本地
  autoSave(mapData: MapEditorData) {
    localStorage.setItem('mapEditor_autoSave', JSON.stringify(mapData));
  },
  
  // 从本地恢复
  restore(): MapEditorData | null {
    const data = localStorage.getItem('mapEditor_autoSave');
    return data ? JSON.parse(data) : null;
  },
  
  // 清除本地保存
  clear() {
    localStorage.removeItem('mapEditor_autoSave');
  }
}
```

#### 后端存储实现

**数据库表结构（MapModel 表）**
```sql
-- 地图模型表（已存在）
CREATE TABLE map_model (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50),
  description TEXT,
  file_path VARCHAR(500),  -- 地图文件路径
  status CHAR(1),          -- 0正常 1停用
  create_time DATETIME,
  update_time DATETIME
);
```

**文件存储结构**
```
/maps/
  ├── {mapModelId}/
  │   ├── map_{version}.json      # 当前版本地图文件
  │   ├── map_{version}_backup.json # 备份文件
  │   └── versions/                # 历史版本
  │       ├── map_v1.0.json
  │       ├── map_v1.1.json
  │       └── ...
```

**API 接口设计**
```typescript
// 保存地图编辑器数据（保存到文件）
export const saveMapEditorData = async (
  mapModelId: string | number, 
  data: MapEditorData
) => {
  // 1. 将编辑器数据序列化为 JSON
  const jsonData = JSON.stringify(data, null, 2);
  
  // 2. 上传文件到服务器
  const formData = new FormData();
  const blob = new Blob([jsonData], { type: 'application/json' });
  formData.append('file', blob, `map_${data.mapInfo.version}.json`);
  
  return request({
    url: `/map/model/${mapModelId}/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// 加载地图编辑器数据（从文件加载）
export const loadMapEditorData = async (
  mapModelId: string | number
): Promise<MapEditorData> => {
  // 1. 获取地图模型信息（包含 filePath）
  const modelRes = await getMapModel(mapModelId);
  const filePath = modelRes.data.filePath;
  
  if (!filePath) {
    throw new Error('地图文件路径不存在');
  }
  
  // 2. 下载并解析地图文件
  const fileRes = await request({
    url: `/map/model/${mapModelId}/download`,
    method: 'get',
    responseType: 'blob'
  });
  
  // 3. 解析 JSON
  const text = await fileRes.data.text();
  return JSON.parse(text) as MapEditorData;
};

// 导出地图文件
export const exportMapFile = async (
  mapModelId: string | number,
  format: 'json' | 'xml' = 'json'
) => {
  const data = await loadMapEditorData(mapModelId);
  
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else {
    // 转换为 XML 格式（兼容 OpenTCS）
    return convertToXML(data);
  }
};

// 导入地图文件
export const importMapFile = async (
  mapModelId: string | number,
  file: File
) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return request({
    url: `/map/model/${mapModelId}/import`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

**数据同步策略**
```typescript
// 编辑器数据与数据库实体数据同步
class MapDataSync {
  /**
   * 保存时同步：
   * 1. 保存完整编辑器数据到文件
   * 2. 提取关键信息更新数据库实体表（Point、Path、Location）
   */
  static async syncToDatabase(
    mapModelId: string | number,
    editorData: MapEditorData
  ) {
    // 1. 保存编辑器数据到文件
    await saveMapEditorData(mapModelId, editorData);
    
    // 2. 同步点数据到数据库
    const points = editorData.elements.points;
    for (const point of points) {
      const pointForm = PointConverter.toForm(point);
      if (point.id) {
        await updatePoint(pointForm);
      } else {
        await addPoint(pointForm);
      }
    }
    
    // 3. 同步路径数据到数据库
    const paths = editorData.elements.paths;
    for (const path of paths) {
      const pathForm = PathConverter.toForm(path);
      if (path.id) {
        await updatePath(pathForm);
      } else {
        await addPath(pathForm);
      }
    }
    
    // 4. 同步位置数据到数据库
    const locations = editorData.elements.locations;
    for (const location of locations) {
      const locationForm = LocationConverter.toForm(location);
      if (location.id) {
        await updateLocation(locationForm);
      } else {
        await addLocation(locationForm);
      }
    }
  }
  
  /**
   * 加载时合并：
   * 1. 从文件加载编辑器数据
   * 2. 从数据库加载实体数据（用于补充业务属性）
   * 3. 合并两者数据
   */
  static async loadAndMerge(
    mapModelId: string | number
  ): Promise<MapEditorData> {
    // 1. 从文件加载编辑器数据
    const editorData = await loadMapEditorData(mapModelId);
    
    // 2. 从数据库加载实体数据
    const [pointsRes, pathsRes, locationsRes] = await Promise.all([
      listPoint({ mapModelId }),
      listPath({ mapModelId }),
      listLocation({ mapModelId })
    ]);
    
    // 3. 合并数据（数据库数据覆盖编辑器数据中的业务属性）
    editorData.elements.points = editorData.elements.points.map(editorPoint => {
      const dbPoint = pointsRes.data.find(p => String(p.id) === editorPoint.id);
      if (dbPoint) {
        return { ...editorPoint, ...PointConverter.fromVO(dbPoint, editorPoint.layerId) };
      }
      return editorPoint;
    });
    
    // 类似处理 paths 和 locations...
    
    return editorData;
  }
}
```

### 2.4 数据转换

#### 编辑器数据 ↔ 后端实体数据
```typescript
// 将编辑器数据转换为后端实体
class DataConverter {
  // 点数据转换
  static pointToVO(point: MapPoint): PointForm {
    return {
      id: point.id,
      name: point.name,
      code: point.code,
      x: point.x,
      y: point.y,
      z: point.z,
      type: point.type,
      description: point.description,
      status: point.status
    };
  },
  
  // 路径数据转换
  static pathToVO(path: MapPath): PathForm {
    const controlPoints = path.geometry.controlPoints;
    return {
      id: path.id,
      name: path.name,
      code: path.code,
      startPointId: controlPoints[0]?.id,
      endPointId: controlPoints[controlPoints.length - 1]?.id,
      length: this.calculatePathLength(controlPoints),
      type: path.type,
      description: path.description,
      status: path.status
    };
  },
  
  // 位置数据转换
  static locationToVO(location: MapLocation): LocationForm {
    const vertices = location.geometry.vertices;
    // 计算中心点
    const center = this.calculatePolygonCenter(vertices);
    return {
      id: location.id,
      name: location.name,
      code: location.code,
      locationTypeId: location.locationTypeId,
      x: center.x,
      y: center.y,
      z: location.z,
      blockId: location.blockId,
      description: location.description,
      status: location.status
    };
  },
  
  // 从后端实体转换为编辑器数据
  static VOToPoint(vo: PointVO, layerId: string): MapPoint {
    return {
      id: String(vo.id),
      layerId,
      name: vo.name,
      code: vo.code,
      x: vo.x || 0,
      y: vo.y || 0,
      z: vo.z,
      type: vo.type,
      description: vo.description,
      status: vo.status,
      editorProps: {
        radius: 5,
        color: '#1890ff',
        labelVisible: true
      }
    };
  }
}
```

### 2.5 数据版本管理

```typescript
// 支持地图数据版本管理
interface MapVersion {
  version: string;
  data: MapEditorData;
  createdAt: string;
  author?: string;
  description?: string;
}

class MapVersionManager {
  versions: MapVersion[] = [];
  
  // 创建新版本
  createVersion(data: MapEditorData, description?: string): MapVersion {
    const version = {
      version: this.generateVersion(),
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      createdAt: new Date().toISOString(),
      description
    };
    this.versions.push(version);
    return version;
  },
  
  // 恢复到指定版本
  restoreVersion(version: string): MapEditorData {
    const v = this.versions.find(v => v.version === version);
    return v ? JSON.parse(JSON.stringify(v.data)) : null;
  }
}
```

---

## 三、实现建议

### 3.1 技术栈
- **Vue 3** + **TypeScript** + **Vite**
- **Konva.js** 用于 2D Canvas 渲染
- **Pinia** 用于状态管理
- **Element Plus** 用于 UI 组件

### 3.2 目录结构
```
src/
  views/
    opentcs/
      mapModel/
        editor/
          MapEditor.vue          # 主编辑器组件
          components/
            MapCanvas.vue         # Konva 画布组件
            Toolbar.vue           # 工具栏
            LayerPanel.vue        # 图层面板
            PropertyPanel.vue     # 属性面板
            HistoryPanel.vue      # 历史记录面板
  store/
    modules/
      mapEditor.ts               # 地图编辑器 Store
  utils/
    mapEditor/
      command.ts                 # 命令模式实现
      converter.ts              # 数据转换工具
      geometry.ts               # 几何计算工具
      snap.ts                   # 吸附工具
  types/
    mapEditor.ts                # 类型定义
```

### 3.3 开发步骤
1. **第一阶段**：基础画布（缩放、平移）
2. **第二阶段**：图层管理
3. **第三阶段**：点绘制与编辑
4. **第四阶段**：路径绘制与编辑
5. **第五阶段**：位置（多边形）绘制与编辑
6. **第六阶段**：属性编辑面板
7. **第七阶段**：撤销/重做
8. **第八阶段**：数据持久化与后端对接

