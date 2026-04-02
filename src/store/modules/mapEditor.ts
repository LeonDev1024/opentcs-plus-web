/**
 * 地图编辑器 Store
 */
import { defineStore } from 'pinia';
import { ref, reactive, computed, toRaw } from 'vue';
import type {
  MapEditorData,
  MapLayer,
  LayerGroup,
  MapPoint,
  MapPath,
  MapLocation,
  ToolMode,
  CanvasState,
  SelectionState,
  Command,
  RasterBackground
} from '@/types/mapEditor';
import { ToolMode as ToolModeEnum, LayerType } from '@/types/mapEditor';
import { CommandManager } from '@/utils/mapEditor/command';
import { loadMapEditorData, saveMapEditorData, saveMap as saveMapApi } from '@/api/opentcs/map';
import { getLocationTypeListForSelect } from '@/api/opentcs/map/location';
import type { MapEditorResponse, VisualLayoutData } from '@/api/opentcs/map/types';
import type { LocationVO } from '@/api/opentcs/map/location/types';

export const useMapEditorStore = defineStore('mapEditor', () => {
  // ==================== 状态 ====================
  
  // 当前地图数据
  const mapData = ref<MapEditorData | null>(null);
  
  // 当前地图业务标识（mapId）
  const currentMapId = ref<string | null>(null);
  
  // 当前工具模式
  const currentTool = ref<ToolMode>(ToolModeEnum.SELECT);
  
  // 点位类型（默认临时停靠点）
  const pointType = ref<string>('Halt point');
  
  // 点位命名计数器
  const pointNameCounter = ref(0);
  
  // Location命名计数器
  const locationNameCounter = ref(0);
  
  // 路径连线类型
  const pathConnectionType = ref<'direct' | 'orthogonal' | 'curve'>('direct');
  
  // 画布状态
  const canvasState = reactive<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 1920,
    height: 1080
  });
  
  // 图层组列表
  const layerGroups = ref<LayerGroup[]>([]);
  
  // 图层列表
  const layers = ref<MapLayer[]>([]);
  
  // 当前激活的图层ID
  const activeLayerId = ref<string | null>(null);
  
  // 元素数据
  const points = ref<MapPoint[]>([]);
  const paths = ref<MapPath[]>([]);
  const locations = ref<MapLocation[]>([]);
  
  // 选择状态
  const selection = reactive<SelectionState>({
    selectedIds: new Set<string>(),
    selectedType: null
  });
  
  // 命令管理器（撤销/重做）
  const commandManager = new CommandManager();

  // 剪贴板（用于复制粘贴）
  const clipboard = ref<{
    points: MapPoint[];
    paths: MapPath[];
    locations: MapLocation[];
  }>({
    points: [],
    paths: [],
    locations: []
  });

  // 是否正在加载
  const loading = ref(false);
  
  // 是否已修改（用于提示保存）
  const isDirty = ref(false);

  // 栅格底图（导入的 map.yaml + map.pgm）
  const rasterBackground = ref<RasterBackground | null>(null);

  // 版本历史记录
  interface VersionSnapshot {
    id: string;
    timestamp: number;
    description: string;
    points: MapPoint[];
    paths: MapPath[];
    locations: MapLocation[];
    layerGroups: LayerGroup[];
    layers: MapLayer[];
  }
  const versionHistory = ref<VersionSnapshot[]>([]);
  const maxVersionHistory = 20; // 最多保存20个版本

  // 位置类型列表（缓存，避免重复请求）
  const locationTypeList = ref<LocationVO[]>([]);
  const locationTypeLoaded = ref(false);

  /** 创建默认图层组与图层（新地图无图层时使用） */
  const createDefaultLayerStructure = (): { layerGroups: LayerGroup[]; layers: MapLayer[] } => {
    const groupId = `layer_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const layerGroup: LayerGroup = {
      id: groupId,
      name: 'Default layer group',
      visible: true
    };
    const ts = Date.now();
    const layers: MapLayer[] = [
      {
        id: `layer_${ts}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Default layer',
        type: LayerType.POINT,
        layerGroupId: groupId,
        visible: true,
        locked: false,
        zIndex: 1,
        opacity: 1,
        elementIds: []
      },
      {
        id: `layer_${ts}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Path layer',
        type: LayerType.PATH,
        layerGroupId: groupId,
        visible: true,
        locked: false,
        zIndex: 2,
        opacity: 1,
        elementIds: []
      },
      {
        id: `layer_${ts}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Location layer',
        type: LayerType.LOCATION,
        layerGroupId: groupId,
        visible: true,
        locked: false,
        zIndex: 3,
        opacity: 1,
        elementIds: []
      }
    ];
    return { layerGroups: [layerGroup], layers };
  };

  /** 将后端图层组转为前端格式（id 转 string，补全字段） */
  const normalizeLayerGroups = (raw: Record<string, any>[]): LayerGroup[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((g: Record<string, any>) => ({
      id: g?.id != null ? String(g.id) : `layer_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: g?.name ?? 'Layer group',
      visible: g?.visible !== false
    }));
  };

  const toFiniteNumber = (raw: unknown): number | undefined => {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
    const normalized = String(raw).trim().replace(',', '.');
    if (!normalized) return undefined;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : undefined;
  };

  const parseNameValueArray = (value: unknown): Record<string, any> => {
    if (!Array.isArray(value)) return {};
    const out: Record<string, any> = {};
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const key = (item as any).name ?? (item as any).key;
      if (!key) continue;
      out[String(key)] = (item as any).value;
    }
    return out;
  };

  const parseLayoutJson = (value: unknown): Record<string, any> => {
    if (!value) return {};
    if (typeof value === 'object') return value as Record<string, any>;
    if (typeof value !== 'string') return {};
    try {
      const parsed = JSON.parse(value);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch {
      return {};
    }
  };

  const pickCoordinate = (target: any, axis: 'x' | 'y'): number | undefined => {
    const upper = axis.toUpperCase();
    const candidates = [
      target?.[axis],
      target?.[`${axis}Position`],
      target?.[`${axis}position`],
      target?.[`position${upper}`],
      target?.position?.[axis],
      target?.pose?.[axis],
      target?.coordinate?.[axis],
      target?.coords?.[axis]
    ];
    for (const c of candidates) {
      const n = toFiniteNumber(c);
      if (n !== undefined) return n;
    }
    return undefined;
  };

  /** 将后端图层转为前端格式（id 转 string，ordinal->zIndex，补 type/opacity/locked/elementIds） */
  const normalizeLayers = (raw: Record<string, any>[], layerGroupIdMap: Map<string | number, string>): MapLayer[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((l: Record<string, any>, index: number) => {
      const id = l?.id != null ? String(l.id) : `layer_${Date.now()}_${index}`;
      const groupId = l?.layerGroupId != null ? layerGroupIdMap.get(l.layerGroupId) ?? String(l.layerGroupId) : undefined;
      const typeByOrdinal = [LayerType.POINT, LayerType.PATH, LayerType.LOCATION];
      const layerType = (l?.type as LayerType) ?? typeByOrdinal[index % 3];
      return {
        id,
        name: l?.name ?? 'Layer',
        type: layerType,
        layerGroupId: groupId,
        visible: l?.visible !== false,
        locked: l?.locked === true,
        zIndex: l?.ordinal != null ? Number(l.ordinal) : (l?.zIndex ?? index + 1),
        opacity: l?.opacity ?? 1,
        elementIds: Array.isArray(l?.elementIds) ? l.elementIds.map((e: string | number) => String(e)) : []
      };
    });
  };

  /** 将后端点转为前端 MapPoint（xPosition/yPosition->x/y，id 转 string，补 editorProps/layerId/status） */
  const normalizePoint = (p: Record<string, any>, defaultLayerId: string): MapPoint => {
    const id = p?.id != null ? String(p.id) : `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pointId = p?.pointId ?? p?.id; // 保留后端的 pointId 用于路径关联
    // 解析 properties 中的 point/editorProps（兼容后端仅在 properties 内保存坐标的场景）
    let parsedPointProps: any = {};
    let parsedEditorProps: any = {};
    if (p?.properties) {
      try {
        const parsed = typeof p.properties === 'string' ? JSON.parse(p.properties) : p.properties;
        const normalizedParsed = Array.isArray(parsed) ? parseNameValueArray(parsed) : parsed;
        parsedPointProps = normalizedParsed?.point || normalizedParsed?.Point || {};
        parsedEditorProps = normalizedParsed?.editorProps || normalizedParsed?.EditorProps || {};
      } catch (e) {
        // 忽略解析错误
      }
    }
    const parsedLayout = parseLayoutJson(p?.layout);
    const parsedLayoutEditorProps = parsedLayout?.editorProps && typeof parsedLayout.editorProps === 'object'
      ? parsedLayout.editorProps
      : {};
    const x = pickCoordinate(p, 'x') ?? pickCoordinate(parsedLayout, 'x') ?? pickCoordinate(parsedPointProps, 'x') ?? 0;
    const y = pickCoordinate(p, 'y') ?? pickCoordinate(parsedLayout, 'y') ?? pickCoordinate(parsedPointProps, 'y') ?? 0;
    return {
      ...parsedPointProps,
      ...p,
      id,
      pointId, // 保存 pointId 到前端模型
      layerId: p?.layerId ?? parsedLayout?.layerId ?? defaultLayerId,
      name: p?.name ?? id,
      x,
      y,
      z: p?.z ?? (p?.zPosition != null ? Number(p.zPosition) : undefined),
      status: p?.status ?? 'active',
      editorProps: {
        radius: parsedEditorProps?.radius ?? parsedLayoutEditorProps?.radius ?? p?.editorProps?.radius ?? p?.radius ?? 20,
        color: parsedEditorProps?.color ?? parsedLayoutEditorProps?.color ?? p?.editorProps?.color ?? '#4CAF50',
        strokeColor: parsedEditorProps?.strokeColor ?? parsedLayoutEditorProps?.strokeColor ?? p?.editorProps?.strokeColor,
        textColor: parsedEditorProps?.textColor ?? parsedLayoutEditorProps?.textColor ?? p?.editorProps?.textColor,
        icon: parsedEditorProps?.icon ?? parsedLayoutEditorProps?.icon ?? p?.editorProps?.icon,
        label: parsedEditorProps?.label ?? parsedLayoutEditorProps?.label ?? p?.editorProps?.label ?? p?.label,
        labelVisible: parsedEditorProps?.labelVisible ?? parsedLayoutEditorProps?.labelVisible ?? p?.editorProps?.labelVisible ?? p?.labelVisible ?? true
      }
    };
  };

  /** 将后端路径转为前端 MapPath（sourcePointId/destPointId->startPointId/endPointId，id 转 string，补 geometry/editorProps） */
  const normalizePath = (p: Record<string, any>, defaultLayerId: string, allPoints?: any[]): MapPath => {
    const parsedLayout = parseLayoutJson(p?.layout);
    const id = p?.id != null ? String(p.id) : `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // 注意：后端不同版本里 start/end 可能并不等于前端点位的 id
    // 后续我们会在成功解析出起终点坐标时，把 startPointId/endPointId 规范回“点位 id”
    let startPointId = p?.startPointId ?? p?.sourcePointId;
    let endPointId = p?.endPointId ?? p?.destPointId;
    // 创建新的 geometry 对象，避免引用问题
    const geometry: any = {
      controlPoints: (p?.geometry?.controlPoints || []).slice(),
      pathType: p?.geometry?.pathType || 'line'
    };

    // 1) 如果后端直接提供了布局控制点（layoutControlPoints），优先使用它
    const layoutControlPoints = p?.layoutControlPoints;
    const layoutPoints = Array.isArray(parsedLayout?.controlPoints) ? parsedLayout.controlPoints : [];
    const mergedLayoutPoints = layoutControlPoints && layoutControlPoints.length > 0 ? layoutControlPoints : layoutPoints;
    if (
      geometry.controlPoints.length === 0
      && Array.isArray(mergedLayoutPoints)
      && mergedLayoutPoints.length >= 2
    ) {
      geometry.controlPoints = mergedLayoutPoints
        .map((cp: any, index: number) => ({
          id: `cp_${id}_lp_${index}`,
          x: Number(cp?.x ?? cp?.xPosition ?? 0),
          y: Number(cp?.y ?? cp?.yPosition ?? 0),
          z: cp?.z != null ? Number(cp.z) : undefined
        }))
        .filter((cp: any) => Number.isFinite(cp.x) && Number.isFinite(cp.y));

      // 若后端未给出可直接匹配的点位 id，则用“最近点”反推起终点 id
      if (geometry.controlPoints.length >= 2) {
        const pointsSource = allPoints || mapData.value?.elements?.points || [];
        if (Array.isArray(pointsSource) && pointsSource.length >= 2) {
          const a = geometry.controlPoints[0];
          const b = geometry.controlPoints[geometry.controlPoints.length - 1];
          const nearestBy = (target: { x: number; y: number }) => {
            let best: any = null;
            let bestDist = Number.POSITIVE_INFINITY;
            for (const pt of pointsSource) {
              const px = Number(pt?.x ?? pt?.xPosition ?? 0);
              const py = Number(pt?.y ?? pt?.yPosition ?? 0);
              const dx = px - target.x;
              const dy = py - target.y;
              const d = dx * dx + dy * dy;
              if (Number.isFinite(d) && d < bestDist) {
                bestDist = d;
                best = pt;
              }
            }
            return best;
          };
          const ns = nearestBy({ x: a.x, y: a.y });
          const ne = nearestBy({ x: b.x, y: b.y });
          if (ns?.id != null) startPointId = ns.id;
          if (ne?.id != null) endPointId = ne.id;
        }
      }
    }

    // 2) 若仍没有足够控制点，尝试用起止点坐标重建
    // 说明：后端字段在不同版本里可能有不一致（sourcePointId/destPointId 与 points.id/points.pointId 未必能匹配）。
    // 因此这里做多策略兜底：先按 id/pointId 匹配，匹配失败则从 path.name 解析 Point-xxxx。
    if (geometry.controlPoints.length < 2 && startPointId != null && endPointId != null) {
      const pointsSource = allPoints || mapData.value?.elements?.points || [];

      const matchPointByIdOrPointId = (candidateId: any) => {
        if (candidateId == null) return undefined;
        return pointsSource.find(
          (pt: any) =>
            String(pt.id) === String(candidateId)
            || String(pt.pointId) === String(candidateId)
        );
      };

      let startPoint = matchPointByIdOrPointId(startPointId);
      let endPoint = matchPointByIdOrPointId(endPointId);

      // 兜底：从路径名提取点位名
      if (!startPoint || !endPoint) {
        const rawName = String(p?.name ?? '');
        const pointNums = [...rawName.matchAll(/Point-(\d+)/gi)].map(m => m[1]).filter(Boolean);
        if (pointNums.length >= 2) {
          const n1 = pointNums[0];
          const n2 = pointNums[1];
          const formatted1 = `Point-${String(n1).padStart(4, '0')}`;
          const formatted2 = `Point-${String(n2).padStart(4, '0')}`;
          startPoint =
            startPoint
            || pointsSource.find((pt: any) => String(pt?.name ?? '').toLowerCase() === formatted1.toLowerCase())
            || pointsSource.find((pt: any) => String(pt?.pointId ?? '') === String(n1))
            || pointsSource.find((pt: any) => String(pt?.id ?? '') === String(n1));
          endPoint =
            endPoint
            || pointsSource.find((pt: any) => String(pt?.name ?? '').toLowerCase() === formatted2.toLowerCase())
            || pointsSource.find((pt: any) => String(pt?.pointId ?? '') === String(n2))
            || pointsSource.find((pt: any) => String(pt?.id ?? '') === String(n2));
        }
      }

      // 最后兜底：如果点位数量刚好够，直接取前两个点连起来（避免完全不渲染）
      if ((!startPoint || !endPoint) && Array.isArray(pointsSource) && pointsSource.length >= 2) {
        startPoint = startPoint || pointsSource[0];
        endPoint = endPoint || pointsSource[1];
      }

      if (startPoint && endPoint) {
        // 规范起终点 id：用于后续“重复画线去重”和“箭头/选中逻辑”
        if (startPoint.id != null) startPointId = startPoint.id;
        if (endPoint.id != null) endPointId = endPoint.id;

        geometry.controlPoints = [
          {
            id: `cp_${id}_0`,
            x: Number(startPoint.x ?? startPoint.xPosition ?? 0),
            y: Number(startPoint.y ?? startPoint.yPosition ?? 0)
          },
          {
            id: `cp_${id}_1`,
            x: Number(endPoint.x ?? endPoint.xPosition ?? 0),
            y: Number(endPoint.y ?? endPoint.yPosition ?? 0)
          }
        ].filter((cp: any) => Number.isFinite(cp.x) && Number.isFinite(cp.y));
      }
    }
    // 解析 properties 中的 editorProps
    let parsedEditorProps: any = {};
    if (p?.properties) {
      try {
        const parsed = typeof p.properties === 'string' ? JSON.parse(p.properties) : p.properties;
        parsedEditorProps = parsed?.editorProps || {};
      } catch (e) {
        // 忽略解析错误
      }
    }
    return {
      ...p,
      id,
      layerId: p?.layerId ?? parsedLayout?.layerId ?? defaultLayerId,
      name: p?.name ?? id,
      startPointId,
      endPointId,
      status: p?.status ?? 'active',
      geometry: {
        ...geometry,
        pathType: p?.geometry?.pathType || parsedLayout?.pathType || 'line'
      },
      editorProps: {
        strokeColor: parsedEditorProps?.strokeColor ?? p?.editorProps?.strokeColor ?? '#2196F3',
        strokeWidth: parsedEditorProps?.strokeWidth ?? p?.editorProps?.strokeWidth ?? 2,
        lineStyle: parsedEditorProps?.lineStyle ?? p?.editorProps?.lineStyle ?? 'solid',
        arrowVisible: parsedEditorProps?.arrowVisible ?? p?.editorProps?.arrowVisible ?? true,
        laneMode: parsedEditorProps?.laneMode ?? p?.editorProps?.laneMode ?? 'one-way',
        label: parsedEditorProps?.label ?? p?.editorProps?.label,
        labelVisible: parsedEditorProps?.labelVisible ?? p?.editorProps?.labelVisible ?? true
      }
    };
  };

  /** 将后端位置转为前端 MapLocation（xPosition/yPosition->x/y，id 转 string，补 geometry/editorProps） */
  const normalizeLocation = (l: Record<string, any>, defaultLayerId: string): MapLocation => {
    const parsedLayout = parseLayoutJson(l?.layout);
    const parsedLayoutEditorProps = parsedLayout?.editorProps && typeof parsedLayout.editorProps === 'object'
      ? parsedLayout.editorProps
      : {};
    const parsedLayoutGeometry = parsedLayout?.geometry && typeof parsedLayout.geometry === 'object'
      ? parsedLayout.geometry
      : undefined;
    const id = l?.id != null ? String(l.id) : `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // 解析 properties 中的 location/editorProps/geometry
    let parsedLocationProps: any = {};
    let parsedEditorProps: any = {};
    let parsedGeometry: any = parsedLayoutGeometry ?? l?.geometry;
    if (l?.properties) {
      try {
        const parsed = typeof l.properties === 'string' ? JSON.parse(l.properties) : l.properties;
        const normalizedParsed = Array.isArray(parsed) ? parseNameValueArray(parsed) : parsed;
        parsedLocationProps = normalizedParsed?.location || normalizedParsed?.Location || {};
        parsedEditorProps = normalizedParsed?.editorProps || normalizedParsed?.EditorProps || {};
        if (normalizedParsed?.geometry) {
          parsedGeometry = normalizedParsed.geometry;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    const normalizedX = pickCoordinate(l, 'x') ?? pickCoordinate(parsedLayout, 'x') ?? pickCoordinate(parsedLocationProps, 'x') ?? 0;
    const normalizedY = pickCoordinate(l, 'y') ?? pickCoordinate(parsedLayout, 'y') ?? pickCoordinate(parsedLocationProps, 'y') ?? 0;
    if (!parsedGeometry) {
      parsedGeometry = {
        vertices: [
          { id: `v_${id}_0`, x: normalizedX, y: normalizedY },
          { id: `v_${id}_1`, x: normalizedX + 100, y: normalizedY },
          { id: `v_${id}_2`, x: normalizedX + 100, y: normalizedY + 100 },
          { id: `v_${id}_3`, x: normalizedX, y: normalizedY + 100 }
        ],
        closed: true
      };
    }
    if (parsedGeometry && typeof parsedGeometry.closed === 'undefined') {
      parsedGeometry.closed = true;
    }
    return {
      ...parsedLocationProps,
      ...l,
      id,
      layerId: l?.layerId ?? parsedLayout?.layerId ?? defaultLayerId,
      name: l?.name ?? id,
      x: normalizedX,
      y: normalizedY,
      status: l?.status ?? 'active',
      geometry: parsedGeometry,
      editorProps: {
        fillColor: parsedEditorProps?.fillColor ?? parsedLayoutEditorProps?.fillColor ?? l?.editorProps?.fillColor ?? 'rgba(33, 150, 243, 0.3)',
        fillOpacity: parsedEditorProps?.fillOpacity ?? parsedLayoutEditorProps?.fillOpacity ?? l?.editorProps?.fillOpacity ?? 0.3,
        strokeColor: parsedEditorProps?.strokeColor ?? parsedLayoutEditorProps?.strokeColor ?? l?.editorProps?.strokeColor ?? '#2196F3',
        strokeWidth: parsedEditorProps?.strokeWidth ?? parsedLayoutEditorProps?.strokeWidth ?? l?.editorProps?.strokeWidth ?? 1,
        labelVisible: parsedEditorProps?.labelVisible ?? parsedLayoutEditorProps?.labelVisible ?? l?.editorProps?.labelVisible ?? true
      }
    };
  };

  const POINT_NAME_REGEX = /^Point-(\d+)$/i;

  const formatPointName = (index: number) => {
    return `Point-${index.toString().padStart(4, '0')}`;
  };

  const updateCounterByName = (name?: string) => {
    if (!name) return;
    const match = name.match(POINT_NAME_REGEX);
    if (match) {
      const value = parseInt(match[1], 10);
      if (!Number.isNaN(value)) {
        pointNameCounter.value = Math.max(pointNameCounter.value, value);
      }
    }
  };

  const syncPointNameCounter = () => {
    pointNameCounter.value = 0;
    points.value.forEach(point => updateCounterByName(point.name));
  };

  const generatePointName = () => {
    pointNameCounter.value += 1;
    return formatPointName(pointNameCounter.value);
  };

  const LOCATION_NAME_REGEX = /^Location-(\d+)$/i;

  const formatLocationName = (index: number) => {
    return `Location-${index.toString().padStart(4, '0')}`;
  };

  const updateLocationCounterByName = (name?: string) => {
    if (!name) return;
    const match = name.match(LOCATION_NAME_REGEX);
    if (match) {
      const value = parseInt(match[1], 10);
      if (!Number.isNaN(value)) {
        locationNameCounter.value = Math.max(locationNameCounter.value, value);
      }
    }
  };

  const syncLocationNameCounter = () => {
    locationNameCounter.value = 0;
    locations.value.forEach(location => updateLocationCounterByName(location.name));
  };

  const generateLocationName = () => {
    locationNameCounter.value += 1;
    return formatLocationName(locationNameCounter.value);
  };
  
  // ==================== Getters ====================

  // 元素 Map 缓存 - 优化查找性能 O(n) -> O(1)
  const pointsMap = computed(() => new Map(points.value.map(p => [p.id, p])));
  const pathsMap = computed(() => new Map(paths.value.map(p => [p.id, p])));
  const locationsMap = computed(() => new Map(locations.value.map(l => [l.id, l])));

  // 当前选中的元素
  const selectedElements = computed(() => {
    const elements: Array<MapPoint | MapPath | MapLocation> = [];

    if (selection.selectedType === 'point') {
      selection.selectedIds.forEach(id => {
        const point = pointsMap.value.get(id);
        if (point) elements.push(point);
      });
    } else if (selection.selectedType === 'path') {
      selection.selectedIds.forEach(id => {
        const path = pathsMap.value.get(id);
        if (path) elements.push(path);
      });
    } else if (selection.selectedType === 'location') {
      selection.selectedIds.forEach(id => {
        const location = locationsMap.value.get(id);
        if (location) elements.push(location);
      });
    }

    return elements;
  });

  // 选中的元素数量
  const selectedCount = computed(() => selection.selectedIds.size);

  // 是否有选中元素
  const hasSelection = computed(() => selection.selectedIds.size > 0);

  // 是否可以撤销
  const canUndo = computed(() => commandManager.canUndo());
  
  // 是否可以重做
  const canRedo = computed(() => commandManager.canRedo());
  
  // ==================== Actions ====================

  /**
   * 获取位置类型列表（带缓存）
   */
  const fetchLocationTypeList = async (): Promise<LocationVO[]> => {
    if (locationTypeLoaded.value && locationTypeList.value.length > 0) {
      return locationTypeList.value;
    }
    try {
      const list = await getLocationTypeListForSelect();
      locationTypeList.value = list;
      locationTypeLoaded.value = true;
      return list;
    } catch (e) {
      console.error('获取位置类型列表失败', e);
      return [];
    }
  };

  /**
   * 加载地图数据
   */
  const loadMap = async (mapId: string | number) => {
    try {
      loading.value = true;
      currentMapId.value = String(mapId);
      
      // 从后端加载地图编辑器数据
      let data: MapEditorData;
      
      try {
        const response = await loadMapEditorData(mapId);
        // 兼容两种返回格式：
        // 1) 经过拦截器处理后的纯业务数据：{ name, mapId, ... }
        // 2) 原始 R 包装：{ code, msg, data: { name, mapId, ... } }
        const raw = response as unknown as MapEditorResponse & { data?: MapEditorResponse };
        const inner = raw && (raw as any).data;
        const apiData: MapEditorResponse =
          inner != null &&
          (inner.mapId !== undefined ||
            inner.mapInfo?.mapId !== undefined ||
            inner.name !== undefined ||
            Array.isArray(inner.points))
            ? (inner as MapEditorResponse)
            : raw;

        const mi = apiData.mapInfo;
        const flatHeader = {
          mapId: mi?.mapId ?? apiData.mapId,
          name: mi?.name ?? apiData.name,
          mapVersion: mi?.mapVersion ?? apiData.modelVersion,
          status: mi?.status ?? apiData.status,
          originX: mi?.originX ?? apiData.originX,
          originY: mi?.originY ?? apiData.originY,
          rotation: mi?.rotation ?? apiData.rotation,
          createTime: mi?.createTime ?? apiData.createTime,
          updateTime: mi?.updateTime ?? apiData.updateTime
        };

        if (
          apiData &&
          (flatHeader.mapId != null ||
            flatHeader.name ||
            apiData.visualLayout ||
            apiData.layerGroups ||
            apiData.layers)
        ) {
          const visualLayout = apiData.visualLayout || {};
          // 图层/图层组优先取顶层的 layerGroups/layers；如果没有再退到 visualLayout 里的配置
          const rawLayerGroups =
            (Array.isArray((apiData as any).layerGroups) && (apiData as any).layerGroups) ||
            (Array.isArray(visualLayout.layerGroups) ? visualLayout.layerGroups : []);
          const rawLayers =
            (Array.isArray((apiData as any).layers) && (apiData as any).layers) ||
            (Array.isArray(visualLayout.layers) ? visualLayout.layers : []);

          let normalizedGroups = normalizeLayerGroups(rawLayerGroups);
          const layerGroupIdMap = new Map(rawLayerGroups.map((g: Record<string, any>) => [g?.id, g?.id != null ? String(g.id) : null]).filter(([, v]) => v != null) as [string | number, string][]);
          let normalizedLayers = normalizeLayers(rawLayers, layerGroupIdMap);

          // 只有当前端/后端都没有提供任何图层信息时，才创建默认图层结构
          if ((rawLayerGroups.length === 0 && rawLayers.length === 0) && (normalizedGroups.length === 0 || normalizedLayers.length === 0)) {
            const { layerGroups: defaultGroups, layers: defaultLayers } = createDefaultLayerStructure();
            if (normalizedGroups.length === 0) normalizedGroups = defaultGroups;
            if (normalizedLayers.length === 0) normalizedLayers = defaultLayers;
          }

          const defaultPointLayerId = normalizedLayers.find((l) => l.type === LayerType.POINT)?.id ?? normalizedLayers[0]?.id ?? '';
          const defaultPathLayerId = normalizedLayers.find((l) => l.type === LayerType.PATH)?.id ?? normalizedLayers[0]?.id ?? '';
          const defaultLocationLayerId = normalizedLayers.find((l) => l.type === LayerType.LOCATION)?.id ?? normalizedLayers[0]?.id ?? '';

          const rawPoints = Array.isArray(apiData.points) ? apiData.points : (apiData.points ? Array.from(apiData.points) : []);
          const rawPaths = Array.isArray(apiData.paths) ? apiData.paths : (apiData.paths ? Array.from(apiData.paths) : []);
          const rawLocations = Array.isArray(apiData.locations) ? apiData.locations : (apiData.locations ? Array.from(apiData.locations) : []);

          data = {
            mapInfo: {
              id: flatHeader.mapId || mapId,
              name: flatHeader.name || '新地图',
              mapVersion: flatHeader.mapVersion || '1.0',
              description: apiData.description || '',
              width: 1920,
              height: 1080,
              // 与控制台保持一致：1mm = 1px
              scale: 1,
              offsetX: 0,
              offsetY: 0,
              scaleX: parseFloat(String(visualLayout.scaleX)) || 50.0,
              scaleY: parseFloat(String(visualLayout.scaleY)) || 50.0,
              originX: flatHeader.originX != null ? Number(flatHeader.originX) : 0,
              originY: flatHeader.originY != null ? Number(flatHeader.originY) : 0,
              rotation: flatHeader.rotation != null ? Number(flatHeader.rotation) : 0
            },
            layerGroups: normalizedGroups,
            layers: normalizedLayers,
            elements: {
              points: rawPoints.map((p: Record<string, any>) => normalizePoint(p, defaultPointLayerId)),
              paths: rawPaths.map((p: Record<string, any>) => normalizePath(p, defaultPathLayerId, rawPoints)),
              locations: rawLocations.map((l: Record<string, any>) => normalizeLocation(l, defaultLocationLayerId))
            },
            metadata: {
              createdAt: flatHeader.createTime || new Date().toISOString(),
              updatedAt: flatHeader.updateTime || new Date().toISOString()
            },
            visualLayout: visualLayout as any
          };
        } else if (apiData.mapInfo) {
          const rawGroups = Array.isArray(apiData.layerGroups) ? apiData.layerGroups : [];
          const rawLayers = Array.isArray(apiData.layers) ? apiData.layers : [];
          let legGroups = normalizeLayerGroups(rawGroups);
          const legMap = new Map(rawGroups.map((g: Record<string, any>) => [g?.id, g?.id != null ? String(g.id) : null]).filter(([, v]) => v != null) as [string | number, string][]);
          let legLayers = normalizeLayers(rawLayers, legMap);
          if (legGroups.length === 0 || legLayers.length === 0) {
            const def = createDefaultLayerStructure();
            if (legGroups.length === 0) legGroups = def.layerGroups;
            if (legLayers.length === 0) legLayers = def.layers;
          }
          const dpId = legLayers.find((l) => l.type === LayerType.POINT)?.id ?? legLayers[0]?.id ?? '';
          const dpathId = legLayers.find((l) => l.type === LayerType.PATH)?.id ?? legLayers[0]?.id ?? '';
          const dlocId = legLayers.find((l) => l.type === LayerType.LOCATION)?.id ?? legLayers[0]?.id ?? '';
          const rp = Array.isArray(apiData.elements?.points) ? apiData.elements.points : (Array.isArray(apiData.points) ? apiData.points : []);
          const rpath = Array.isArray(apiData.elements?.paths) ? apiData.elements.paths : (Array.isArray(apiData.paths) ? apiData.paths : []);
          const rloc = Array.isArray(apiData.elements?.locations) ? apiData.elements.locations : (Array.isArray(apiData.locations) ? apiData.locations : []);
          data = {
            mapInfo: {
              // id 保留数据库主键兼容；编辑器主标识统一使用 mapId
              id: apiData.mapInfo?.id || apiData.mapId || mapId,
              name: apiData.mapInfo?.name || '新地图',
              mapVersion: apiData.mapInfo.modelVersion || apiData.mapInfo.mapVersion || '1.0',
              description: apiData.mapInfo.description || '',
              width: parseFloat(String(apiData.mapInfo.layoutWidth ?? '')) || 1920,
              height: parseFloat(String(apiData.mapInfo.layoutHeight ?? '')) || 1080,
              scale: parseFloat(String(apiData.mapInfo.scale ?? '')) || 1,
              offsetX: 0,
              offsetY: 0,
              scaleX: 50.0,
              scaleY: 50.0,
              originX: apiData.originX != null ? Number(apiData.originX) : (apiData.mapInfo.originX != null ? Number(apiData.mapInfo.originX) : 0),
              originY: apiData.originY != null ? Number(apiData.originY) : (apiData.mapInfo.originY != null ? Number(apiData.mapInfo.originY) : 0),
              rotation: apiData.rotation != null ? Number(apiData.rotation) : 0
            },
            layerGroups: legGroups,
            layers: legLayers,
            elements: {
              points: rp.map((p: Record<string, any>) => normalizePoint(p, dpId)),
              paths: rpath.map((p: Record<string, any>) => normalizePath(p, dpathId, rp)),
              locations: rloc.map((l: Record<string, any>) => normalizeLocation(l, dlocId))
            },
            metadata: {
              createdAt: apiData.mapInfo.createTime || new Date().toISOString(),
              updatedAt: apiData.mapInfo.updateTime || new Date().toISOString()
            }
          };
        } else {
          // 如果没有数据，抛出错误（默认图层应该由后端创建）
          throw new Error('地图数据不存在，请先在后端创建地图模型');
        }
      } catch (error: unknown) {
        // 如果文件不存在，抛出错误（默认图层应该由后端创建）
        const err = error as { response?: { status?: number }; message?: string };
        if (err?.response?.status === 404 || err?.message?.includes('不存在')) {
          throw new Error('地图数据不存在，请先在后端创建地图模型');
        } else {
          throw error;
        }
      }
      
      // 验证数据格式
      if (!data || !data.mapInfo) {
        throw new Error('地图数据格式错误');
      }
      
      mapData.value = data;
      
      // 更新图层组与图层；若新创建的地图没有图层，则自动创建默认图层组和图层
      const hasLayerGroups = (data.layerGroups || []).length > 0;
      const hasLayers = (data.layers || []).length > 0;
      if (!hasLayerGroups || !hasLayers) {
        const { layerGroups: defaultGroups, layers: defaultLayers } = createDefaultLayerStructure();
        layerGroups.value = defaultGroups;
        layers.value = defaultLayers;
        data.layerGroups = defaultGroups;
        data.layers = defaultLayers;
        if (mapData.value) {
          mapData.value.layerGroups = defaultGroups;
          mapData.value.layers = defaultLayers;
        }
      } else {
        layerGroups.value = data.layerGroups || [];
        layers.value = data.layers || [];
      }
      
      // 更新元素数据（已由 normalizer 处理后端字段与默认值）
      points.value = data.elements.points || [];
      paths.value = data.elements.paths || [];
      locations.value = data.elements.locations || [];

      syncPointNameCounter();
      syncLocationNameCounter();
      
      // 更新画布状态
      if (data.mapInfo) {
        canvasState.width = data.mapInfo.width || 1920;
        canvasState.height = data.mapInfo.height || 1080;
        canvasState.scale = data.mapInfo.scale || 1;
        canvasState.offsetX = data.mapInfo.offsetX || 0;
        canvasState.offsetY = data.mapInfo.offsetY || 0;
        
        // 设置默认的 scaleX 和 scaleY（如果不存在）
        if (data.mapInfo.scaleX === undefined) {
          data.mapInfo.scaleX = 50.0;
        }
        if (data.mapInfo.scaleY === undefined) {
          data.mapInfo.scaleY = 50.0;
        }
      }
      
      // 使用接口返回的图层，不创建新的默认图层
      // 如果没有激活图层，选择第一个图层作为激活图层
      if (!activeLayerId.value || !layers.value.some(l => l.id === activeLayerId.value)) {
        const fallbackLayer = layers.value.find(l => l.name === 'Default layer') || layers.value[0];
        activeLayerId.value = fallbackLayer ? fallbackLayer.id : null;
      }
      
      // 清空选择
      clearSelection();
      
      // 清空历史记录
      commandManager.clear();
      
      isDirty.value = false;
      
      return data;
    } catch (error) {
      console.error('加载地图失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 保存地图数据
   */
  const saveMapEditor = async () => {
    if (!currentMapId.value) {
      throw new Error('没有可保存的地图 mapId');
    }
    
    try {
      loading.value = true;
      
      // 如果没有地图数据，抛出错误（默认图层应该由后端创建）
      if (!mapData.value) {
        throw new Error('地图数据不存在，请先加载地图数据');
      }
      
      // 更新地图数据
      mapData.value.layerGroups = layerGroups.value;
      mapData.value.layers = layers.value;
      mapData.value.elements.points = points.value;
      mapData.value.elements.paths = paths.value;
      mapData.value.elements.locations = locations.value;
      mapData.value.mapInfo.scale = canvasState.scale;
      mapData.value.mapInfo.offsetX = canvasState.offsetX;
      mapData.value.mapInfo.offsetY = canvasState.offsetY;
      mapData.value.mapInfo.width = canvasState.width;
      mapData.value.mapInfo.height = canvasState.height;
      mapData.value.metadata.updatedAt = new Date().toISOString();

      // 验证数据
      if (!mapData.value.mapInfo.name) {
        mapData.value.mapInfo.name = `地图_${currentMapId.value}`;
      }

      // 使用 toRaw 获取原始数据，避免循环引用
      const rawData = toRaw(mapData.value);

      const toLongOrNull = (v: unknown): number | null => {
        if (v == null) return null;
        const s = typeof v === 'number' ? String(v) : String(v).trim();
        if (!/^-?\d+$/.test(s)) return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };

      const toNumberOrNull = (v: unknown): number | null => {
        if (v == null) return null;
        const n = typeof v === 'number' ? v : Number(String(v));
        return Number.isFinite(n) ? n : null;
      };

      const buildStableNumericIdMap = (items: any[]): Map<string, number> => {
        const result = new Map<string, number>();
        let tempId = -1;
        for (const item of items || []) {
          const rawId = item?.id;
          if (rawId == null) continue;
          const key = String(rawId);
          const numeric = toLongOrNull(rawId);
          if (numeric != null) {
            result.set(key, numeric);
          } else if (!result.has(key)) {
            result.set(key, tempId);
            tempId -= 1;
          }
        }
        return result;
      };

      const layerGroupIdMap = buildStableNumericIdMap(rawData.layerGroups || []);
      const layerIdMap = buildStableNumericIdMap(rawData.layers || []);

      const serializePoints = (pointsToSave: any[]) => {
        return (pointsToSave || []).map((p) => {
          const pointId = p?.id != null ? String(p.id) : undefined;
          return {
            // 后端会在 service 层强制 setId(null)，这里先保证反序列化阶段不失败
            id: null,
            // point_id 在库里是 NOT NULL
            pointId: pointId || `point_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            layerId: (p?.layerId != null ? (layerIdMap.get(String(p.layerId)) ?? toLongOrNull(p.layerId)) : null),
            name: p?.name ?? pointId,
            xPosition: toNumberOrNull(p?.x) ?? toNumberOrNull(p?.xPosition) ?? 0,
            yPosition: toNumberOrNull(p?.y) ?? toNumberOrNull(p?.yPosition) ?? 0,
            zPosition: toNumberOrNull(p?.z) ?? toNumberOrNull(p?.zPosition) ?? 0,
            type: p?.type ?? 'HALT_POSITION',
            radius: toNumberOrNull(p?.editorProps?.radius) ?? toNumberOrNull(p?.radius) ?? 0,
            locked: p?.locked ?? null,
            label: p?.editorProps?.label ?? p?.label ?? null,
            layout: JSON.stringify({
              x: toNumberOrNull(p?.x) ?? toNumberOrNull(p?.xPosition) ?? 0,
              y: toNumberOrNull(p?.y) ?? toNumberOrNull(p?.yPosition) ?? 0,
              z: toNumberOrNull(p?.z) ?? toNumberOrNull(p?.zPosition) ?? 0,
              editorProps: p?.editorProps ?? {}
            }),
            // 额外信息存到 properties，避免丢失前端配置
            properties: JSON.stringify({
              status: p?.status,
              editorProps: p?.editorProps
            })
          };
        });
      };

      const serializePaths = (pathsToSave: any[]) => {
        const estimateLength = (geometry: any) => {
          const cps: any[] = geometry?.controlPoints || [];
          if (!Array.isArray(cps) || cps.length < 2) return null;
          let sum = 0;
          for (let i = 1; i < cps.length; i += 1) {
            const a = cps[i - 1];
            const b = cps[i];
            const ax = toNumberOrNull(a?.x) ?? 0;
            const ay = toNumberOrNull(a?.y) ?? 0;
            const bx = toNumberOrNull(b?.x) ?? 0;
            const by = toNumberOrNull(b?.y) ?? 0;
            sum += Math.hypot(ax - bx, ay - by);
          }
          return sum;
        };

        return (pathsToSave || []).map((path) => {
          const backendId = path?.id != null ? String(path.id) : undefined;
          const laneMode = path?.editorProps?.laneMode;
          const pathId = backendId
            ? backendId
            : (path?.pathId != null ? String(path.pathId) : `path_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
          const sourcePointId = String(path?.startPointId ?? path?.sourcePointId ?? '');
          const destPointId = String(path?.endPointId ?? path?.destPointId ?? '');
          return {
            id: null,
            pathId,
            layerId: (path?.layerId != null ? (layerIdMap.get(String(path.layerId)) ?? toLongOrNull(path.layerId)) : null),
            name: path?.name ?? pathId,
            sourcePointId,
            destPointId,
            locked: path?.locked ?? null,
            // path.length 在库里是 NOT NULL
            length: estimateLength(path?.geometry) ?? 0,
            // 几何连接类型：DIRECT / ELBOW / BEZIER
            connectionType: path?.type ?? 'DIRECT',
            properties: JSON.stringify({
              status: path?.status,
              editorProps: path?.editorProps
            }),
            layout: JSON.stringify({
              connectionType: path?.type ?? 'DIRECT',
              controlPoints: (path?.geometry?.controlPoints || []).map((cp: any) => ({
                x: toNumberOrNull(cp?.x),
                y: toNumberOrNull(cp?.y)
              }))
            })
          };
        });
      };

      const serializeLocations = (locationsToSave: any[]) => {
        return (locationsToSave || []).map((l) => {
          const locationId = l?.id != null ? String(l.id) : undefined;
          return {
            id: null,
            locationId,
            layerId: (l?.layerId != null ? (layerIdMap.get(String(l.layerId)) ?? toLongOrNull(l.layerId)) : null),
            locationTypeId: toLongOrNull(l?.locationTypeId),
            name: l?.name ?? locationId,
            xPosition: toNumberOrNull(l?.x) ?? toNumberOrNull(l?.xPosition),
            yPosition: toNumberOrNull(l?.y) ?? toNumberOrNull(l?.yPosition),
            zPosition: toNumberOrNull(l?.z) ?? toNumberOrNull(l?.zPosition),
            locked: l?.locked ?? null,
            isOccupied: null,
            layout: JSON.stringify({
              x: toNumberOrNull(l?.x) ?? toNumberOrNull(l?.xPosition),
              y: toNumberOrNull(l?.y) ?? toNumberOrNull(l?.yPosition),
              z: toNumberOrNull(l?.z) ?? toNumberOrNull(l?.zPosition),
              geometry: l?.geometry ?? null,
              editorProps: l?.editorProps ?? {}
            }),
            properties: JSON.stringify({
              status: l?.status,
              geometry: l?.geometry,
              editorProps: l?.editorProps
            })
          };
        });
      };

      const saveData = {
        mapInfo: {
          mapId: currentMapId.value,
          name: rawData.mapInfo?.name,
          mapVersion: rawData.mapInfo?.mapVersion || '1.0',
          originX: rawData.mapInfo?.originX || 0,
          originY: rawData.mapInfo?.originY || 0,
          rotation: rawData.mapInfo?.rotation || 0,
          data: JSON.stringify({
            mapInfo: {
              scale: canvasState.scale,
              offsetX: canvasState.offsetX,
              offsetY: canvasState.offsetY,
              width: canvasState.width,
              height: canvasState.height
            },
            layerGroups: rawData.layerGroups || [],
            layers: rawData.layers || []
          })
        },
        layerGroups: (rawData.layerGroups || []).map((g: any, index: number) => ({
          id: g?.id != null ? String(layerGroupIdMap.get(String(g.id)) ?? g.id) : undefined,
          name: g?.name ?? `LayerGroup-${index + 1}`,
          visible: g?.visible !== false,
          ordinal: g?.ordinal ?? index + 1,
          properties: g?.description ? JSON.stringify({ description: g.description }) : null
        })),
        layers: (rawData.layers || []).map((l: any, index: number) => ({
          id: l?.id != null ? String(layerIdMap.get(String(l.id)) ?? l.id) : undefined,
          layerGroupId: l?.layerGroupId != null ? String(layerGroupIdMap.get(String(l.layerGroupId)) ?? l.layerGroupId) : null,
          name: l?.name ?? `Layer-${index + 1}`,
          visible: l?.visible !== false,
          ordinal: l?.zIndex ?? l?.ordinal ?? index + 1,
          properties: JSON.stringify({
            type: l?.type,
            locked: l?.locked ?? false,
            opacity: l?.opacity ?? 1
          })
        })),
        points: serializePoints(rawData.elements?.points || []),
        paths: serializePaths(rawData.elements?.paths || []),
        locations: serializeLocations(rawData.elements?.locations || [])
      };

      // 保存到后端（语义数据）
      await saveMapApi(saveData);

      // 保存成功后不更新前端版本号，避免循环引用问题
      // 用户可以手动刷新页面查看新版本，或者重新加载地图

      isDirty.value = false;

      return mapData.value;
    } catch (error) {
      console.error('保存地图失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 更新布局属性
   */
  const updateLayoutProperties = (properties: { name?: string; scaleX?: number; scaleY?: number }) => {
    if (!mapData.value) return;
    if (properties.name !== undefined) {
      mapData.value.visualLayout.name = properties.name;
    }
    if (properties.scaleX !== undefined) {
      mapData.value.visualLayout.scaleX = properties.scaleX;
    }
    if (properties.scaleY !== undefined) {
      mapData.value.visualLayout.scaleY = properties.scaleY;
    }
  };

  /**
   * 设置工具模式
   */
  const setTool = (tool: ToolMode) => {
    currentTool.value = tool;
    clearSelection();
  };
  
  /**
   * 设置点位类型
   */
  const setPointType = (type: string) => {
    pointType.value = type;
  };
  
  /**
   * 设置路径连线类型
   */
  const setPathConnectionType = (type: 'direct' | 'orthogonal' | 'curve') => {
    pathConnectionType.value = type;
  };
  
  /**
   * 更新画布状态
   */
  const updateCanvasState = (updates: Partial<CanvasState>) => {
    Object.assign(canvasState, updates);
    isDirty.value = true;
  };
  
  /**
   * 添加点
   */
  const addPoint = (point: Omit<MapPoint, 'id'> & { id?: string }) => {
    const newPoint: MapPoint = {
      ...point,
      id: point.id || `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    points.value.push(newPoint);
    
    // 更新图层元素列表
    const layer = layers.value.find(l => l.id === point.layerId);
    if (layer) {
      if (!Array.isArray(layer.elementIds)) {
        layer.elementIds = [];
      }
      layer.elementIds.push(newPoint.id);
    }
    
    updateCounterByName(newPoint.name);
    isDirty.value = true;
    return newPoint;
  };
  
  /**
   * 更新点
   */
  const updatePoint = (id: string, updates: Partial<MapPoint>) => {
    const index = points.value.findIndex(p => p.id === id);
    if (index !== -1) {
      points.value[index] = { ...points.value[index], ...updates };
      isDirty.value = true;
    }
  };

  /**
   * 通用删除元素函数 - 抽取重复逻辑
   */
  const deleteElement = <T extends { id: string }>(
    elements: Ref<T[]>,
    id: string
  ) => {
    const index = elements.value.findIndex(el => el.id === id);
    if (index !== -1) {
      elements.value.splice(index, 1);

      // 从图层中移除
      layers.value.forEach(layer => {
        if (!Array.isArray(layer.elementIds)) return;
        const elementIndex = layer.elementIds.indexOf(id);
        if (elementIndex !== -1) {
          layer.elementIds.splice(elementIndex, 1);
        }
      });

      // 从选择中移除
      selection.selectedIds.delete(id);

      isDirty.value = true;
    }
  };

  /**
   * 删除点
   */
  const deletePoint = (id: string) => {
    // 检查是否锁定
    const point = points.value.find(p => p.id === id);
    if (point?.locked) {
      throw new Error('该元素已锁定，无法删除');
    }
    deleteElement(points, id);
  };

  /**
   * 添加路径
   */
  const addPath = (path: Omit<MapPath, 'id'>) => {
    // 防止重复画线：相同起点/终点/连线类型/车道模式/图层则复用已有路径
    const startId = path.startPointId != null ? String(path.startPointId) : null;
    const endId = path.endPointId != null ? String(path.endPointId) : null;
    if (startId && endId) {
      const laneMode = path.editorProps?.laneMode;
      const connectionType = path.type ?? 'direct';
      const layerId = path.layerId;

      const normalizeConnectionTypeForCompare = (p: MapPath): string => {
        // 优先使用前端显式 type
        if (p.type) return p.type;
        // 兼容后端未返回 type 的情况：从 geometry.pathType 推导
        const pt = p.geometry?.pathType;
        if (pt === 'curve') return 'curve';
        if (pt === 'orthogonal') return 'orthogonal';
        // 默认把 line/未知都当成 direct（用于去重）
        return 'direct';
      };

      const existing = paths.value.find(p => {
        const sameStart = p.startPointId != null && String(p.startPointId) === startId;
        const sameEnd = p.endPointId != null && String(p.endPointId) === endId;
        const sameType = normalizeConnectionTypeForCompare(p) === connectionType;
        const sameLaneMode = (p.editorProps?.laneMode ?? undefined) === laneMode;
        const sameLayer = (p.layerId ?? undefined) === (layerId ?? undefined);
        return sameStart && sameEnd && sameType && sameLaneMode && sameLayer;
      });
      if (existing) return existing;
    }

    const newPath: MapPath = {
      ...path,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    paths.value.push(newPath);
    
    // 更新图层元素列表 - 只有当图层存在时才更新
    if (path.layerId) {
      const layer = layers.value.find(l => l.id === path.layerId);
      if (layer) {
        if (!Array.isArray(layer.elementIds)) {
          layer.elementIds = [];
        }
        layer.elementIds.push(newPath.id);
      }
    }
    
    isDirty.value = true;
    return newPath;
  };
  
  /**
   * 更新路径
   */
  const updatePath = (id: string, updates: Partial<MapPath>) => {
    const index = paths.value.findIndex(p => p.id === id);
    if (index !== -1) {
      paths.value[index] = { ...paths.value[index], ...updates };
      isDirty.value = true;
    }
  };
  
  /**
   * 删除路径
   */
  const deletePath = (id: string) => {
    // 检查是否锁定
    const path = paths.value.find(p => p.id === id);
    if (path?.locked) {
      throw new Error('该元素已锁定，无法删除');
    }
    deleteElement(paths, id);
  };

  /**
   * 添加位置
   */
  const addLocation = (location: Omit<MapLocation, 'id'>) => {
    const newLocation: MapLocation = {
      ...location,
      id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    locations.value.push(newLocation);
    
    // 更新图层元素列表 - 只有当图层存在时才更新
    if (location.layerId) {
      const layer = layers.value.find(l => l.id === location.layerId);
      if (layer) {
        if (!Array.isArray(layer.elementIds)) {
          layer.elementIds = [];
        }
        layer.elementIds.push(newLocation.id);
      }
    }
    
    updateLocationCounterByName(newLocation.name);
    isDirty.value = true;
    return newLocation;
  };
  
  /**
   * 更新位置
   */
  const updateLocation = (id: string, updates: Partial<MapLocation>) => {
    const index = locations.value.findIndex(l => l.id === id);
    if (index !== -1) {
      locations.value[index] = { ...locations.value[index], ...updates };
      isDirty.value = true;
    }
  };
  
  /**
   * 删除位置
   */
  const deleteLocation = (id: string) => {
    // 检查是否锁定
    const location = locations.value.find(l => l.id === id);
    if (location?.locked) {
      throw new Error('该元素已锁定，无法删除');
    }
    deleteElement(locations, id);
  };

  /**
   * 锁定/解锁点
   */
  const togglePointLock = (id: string) => {
    const point = points.value.find(p => p.id === id);
    if (point) {
      point.locked = !point.locked;
      isDirty.value = true;
      return point.locked;
    }
    return false;
  };

  /**
   * 锁定/解锁路径
   */
  const togglePathLock = (id: string) => {
    const path = paths.value.find(p => p.id === id);
    if (path) {
      path.locked = !path.locked;
      isDirty.value = true;
      return path.locked;
    }
    return false;
  };

  /**
   * 锁定/解锁位置
   */
  const toggleLocationLock = (id: string) => {
    const location = locations.value.find(l => l.id === id);
    if (location) {
      location.locked = !location.locked;
      isDirty.value = true;
      return location.locked;
    }
    return false;
  };

  /**
   * 批量锁定选中的元素
   */
  const lockSelectedElements = (lock: boolean = true) => {
    if (selection.selectedType === 'point') {
      selection.selectedIds.forEach(id => {
        const point = points.value.find(p => p.id === id);
        if (point) point.locked = lock;
      });
    } else if (selection.selectedType === 'path') {
      selection.selectedIds.forEach(id => {
        const path = paths.value.find(p => p.id === id);
        if (path) path.locked = lock;
      });
    } else if (selection.selectedType === 'location') {
      selection.selectedIds.forEach(id => {
        const location = locations.value.find(l => l.id === id);
        if (location) location.locked = lock;
      });
    }
    isDirty.value = true;
  };

  /**
   * 检查元素是否锁定
   */
  const isElementLocked = (id: string, type: 'point' | 'path' | 'location'): boolean => {
    if (type === 'point') {
      return points.value.find(p => p.id === id)?.locked || false;
    } else if (type === 'path') {
      return paths.value.find(p => p.id === id)?.locked || false;
    } else if (type === 'location') {
      return locations.value.find(l => l.id === id)?.locked || false;
    }
    return false;
  };

  /**
   * 选择元素
   * @param id 元素ID
   * @param type 元素类型
   * @param multiSelect 是否多选（追加模式）
   * @param shiftSelect 是否使用Shift键选择（追加模式）
   */
  const selectElement = (id: string, type: 'point' | 'path' | 'location' | 'layout', multiSelect = false, shiftSelect = false) => {
    if (shiftSelect || multiSelect) {
      // 追加模式：不清除现有选择
      if (selection.selectedIds.has(id)) {
        // 如果已经选中，则取消选中
        selection.selectedIds.delete(id);
      } else {
        selection.selectedIds.add(id);
      }
    } else {
      selection.selectedIds.clear();
      selection.selectedIds.add(id);
    }
    selection.selectedType = type;
  };

  /**
   * 批量选择元素
   * @param ids 元素ID数组
   * @param type 元素类型
   * @param append 是否追加模式
   */
  const selectElements = (ids: string[], type: 'point' | 'path' | 'location', append = false) => {
    if (!append) {
      selection.selectedIds.clear();
    }
    ids.forEach(id => selection.selectedIds.add(id));
    selection.selectedType = type;
  };

  /**
   * 全选所有元素
   */
  const selectAll = () => {
    selection.selectedIds.clear();
    points.value.forEach(p => selection.selectedIds.add(p.id));
    paths.value.forEach(p => selection.selectedIds.add(p.id));
    locations.value.forEach(l => selection.selectedIds.add(l.id));
    // 选中多种类型时，selectedType 设为 null 表示多类型选择
    selection.selectedType = null;
  };

  /**
   * 取消选择
   */
  const clearSelection = () => {
    selection.selectedIds.clear();
    selection.selectedType = null;
  };

  /**
   * 选择布局（清除元素选择）
   */
  const selectLayout = () => {
    selection.selectedIds.clear();
    selection.selectedType = 'layout';
  };

  /**
   * 复制选中的元素到剪贴板
   */
  const copySelected = () => {
    const copiedPoints: MapPoint[] = [];
    const copiedPaths: MapPath[] = [];
    const copiedLocations: MapLocation[] = [];

    selection.selectedIds.forEach(id => {
      const point = pointsMap.value.get(id);
      if (point) {
        copiedPoints.push({ ...point });
      }
      const path = pathsMap.value.get(id);
      if (path) {
        copiedPaths.push({ ...path });
      }
      const location = locationsMap.value.get(id);
      if (location) {
        copiedLocations.push({ ...location });
      }
    });

    clipboard.value = {
      points: copiedPoints,
      paths: copiedPaths,
      locations: copiedLocations
    };
  };

  /**
   * 粘贴剪贴板中的元素
   * @param offsetX X轴偏移量
   * @param offsetY Y轴偏移量
   * @returns 是否粘贴成功
   */
  const paste = (offsetX = 20, offsetY = 20): boolean => {
    if (clipboard.value.points.length === 0 &&
        clipboard.value.paths.length === 0 &&
        clipboard.value.locations.length === 0) {
      return false;
    }

    // 创建ID映射，用于更新路径的起点和终点ID
    const pointIdMap = new Map<string, string>();
    const locationIdMap = new Map<string, string>();

    // 复制点
    clipboard.value.points.forEach(point => {
      const newId = `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      pointIdMap.set(point.id, newId);
      addPoint({
        ...point,
        id: newId,
        x: point.x + offsetX,
        y: point.y + offsetY,
        name: `${point.name}_copy`
      });
    });

    // 复制位置
    const copyTimestamp = Date.now();
    clipboard.value.locations.forEach(location => {
      const newId = `location_${copyTimestamp}_${Math.random().toString(36).substr(2, 9)}`;
      locationIdMap.set(location.id, newId);
      const newVertices = (location.geometry.vertices || []).map((v, index) => ({
        id: v.id || `vertex_${copyTimestamp}_${index}`,
        x: v.x + offsetX,
        y: v.y + offsetY,
        z: v.z
      }));
      addLocation({
        ...location,
        id: newId,
        geometry: {
          ...location.geometry,
          vertices: newVertices
        },
        name: `${location.name}_copy`
      } as Omit<MapLocation, 'id'>);
    });

    // 复制路径（需要更新起点和终点ID）
    clipboard.value.paths.forEach(path => {
      const newId = `path_${copyTimestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const newStartPointId = pointIdMap.get(String(path.startPointId)) || path.startPointId;
      const newEndPointId = pointIdMap.get(String(path.endPointId)) || path.endPointId;
      const newControlPoints = (path.geometry.controlPoints || []).map((cp, index) => ({
        id: cp.id || `cp_${copyTimestamp}_${index}`,
        x: cp.x + offsetX,
        y: cp.y + offsetY,
        z: cp.z
      }));
      addPath({
        ...path,
        id: newId,
        startPointId: newStartPointId,
        endPointId: newEndPointId,
        geometry: {
          ...path.geometry,
          controlPoints: newControlPoints
        }
      } as Omit<MapPath, 'id'>);
    });

    return true;
  };

  /**
   * 快速复制选中的元素（复制并粘贴，带偏移）
   */
  const duplicateSelected = (): boolean => {
    copySelected();
    return paste(20, 20);
  };

  /**
   * 添加图层
   */
  const addLayer = (layer: Omit<MapLayer, 'id'>) => {
    // 如果没有指定图层组，默认关联到"Default layer group"
    let layerGroupId = layer.layerGroupId;
    if (!layerGroupId) {
      const defaultLayerGroup = layerGroups.value.find(g => g.name === 'Default layer group');
      if (defaultLayerGroup) {
        layerGroupId = defaultLayerGroup.id;
      } else if (layerGroups.value.length > 0) {
        // 如果没有"Default layer group"，使用第一个图层组
        layerGroupId = layerGroups.value[0].id;
      }
    }
    
    const newLayer: MapLayer = {
      ...layer,
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerGroupId,
      elementIds: layer.elementIds || []
    };
    
    layers.value.push(newLayer);
    
    isDirty.value = true;
    return newLayer;
  };
  
  /**
   * 更新图层
   */
  const updateLayer = (id: string, updates: Partial<MapLayer>) => {
    const index = layers.value.findIndex(l => l.id === id);
    if (index !== -1) {
      layers.value[index] = { ...layers.value[index], ...updates };
      isDirty.value = true;
    }
  };
  
  /**
   * 设置激活图层
   */
  const setActiveLayer = (id: string | null) => {
    if (id && !layers.value.find(layer => layer.id === id)) {
      return;
    }
    if (activeLayerId.value === id) {
      return;
    }
    activeLayerId.value = id;
    isDirty.value = true;
  };
  
  /**
   * 删除图层
   */
  const deleteLayer = (id: string) => {
    const index = layers.value.findIndex(l => l.id === id);
    if (index !== -1) {
      // 删除图层中的所有元素
      const layer = layers.value[index];
      const elementIds = Array.isArray(layer.elementIds) ? layer.elementIds : [];
      elementIds.forEach(elementId => {
        // 根据类型删除元素
        if (points.value.find(p => p.id === elementId)) {
          deletePoint(elementId);
        } else if (paths.value.find(p => p.id === elementId)) {
          deletePath(elementId);
        } else if (locations.value.find(l => l.id === elementId)) {
          deleteLocation(elementId);
        }
      });
      
      layers.value.splice(index, 1);
      
      // 如果删除的是激活图层，重新选择一个
      if (activeLayerId.value === id) {
        const fallbackLayer = layers.value.find(l => l.name === 'Default layer') || layers.value[0];
        activeLayerId.value = fallbackLayer ? fallbackLayer.id : null;
      }
      
      isDirty.value = true;
    }
  };
  
  /**
   * 添加图层组
   */
  const addLayerGroup = (group: Omit<LayerGroup, 'id'>) => {
    const newGroup: LayerGroup = {
      ...group,
      id: `layer_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    layerGroups.value.push(newGroup);
    isDirty.value = true;
    return newGroup;
  };
  
  /**
   * 更新图层组
   */
  const updateLayerGroup = (id: string, updates: Partial<LayerGroup>) => {
    const index = layerGroups.value.findIndex(g => g.id === id);
    if (index !== -1) {
      layerGroups.value[index] = { ...layerGroups.value[index], ...updates };
      isDirty.value = true;
    }
  };
  
  /**
   * 删除图层组
   */
  const deleteLayerGroup = (id: string) => {
    const index = layerGroups.value.findIndex(g => g.id === id);
    if (index !== -1) {
      // 检查是否有图层使用该图层组
      const layersUsingGroup = layers.value.filter(l => l.layerGroupId === id);
      if (layersUsingGroup.length > 0) {
        throw new Error('无法删除图层组，仍有图层在使用该图层组');
      }
      
      layerGroups.value.splice(index, 1);
      isDirty.value = true;
    }
  };
  
  /**
   * 撤销
   */
  const undo = () => {
    commandManager.undo();
  };
  
  /**
   * 重做
   */
  const redo = () => {
    commandManager.redo();
  };
  
  /**
   * 执行命令
   */
  const executeCommand = (command: Command) => {
    commandManager.execute(command);
    isDirty.value = true;
  };

  /**
   * 保存版本快照
   */
  const saveVersion = (description: string = '自动保存') => {
    const snapshot: VersionSnapshot = {
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      description,
      points: JSON.parse(JSON.stringify(points.value)),
      paths: JSON.parse(JSON.stringify(paths.value)),
      locations: JSON.parse(JSON.stringify(locations.value)),
      layerGroups: JSON.parse(JSON.stringify(layerGroups.value)),
      layers: JSON.parse(JSON.stringify(layers.value))
    };

    // 添加新版本
    versionHistory.value.push(snapshot);

    // 限制版本数量
    if (versionHistory.value.length > maxVersionHistory) {
      versionHistory.value = versionHistory.value.slice(-maxVersionHistory);
    }

    return snapshot.id;
  };

  /**
   * 获取版本列表
   */
  const getVersionHistory = () => {
    return versionHistory.value.map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      description: v.description,
      pointCount: v.points.length,
      pathCount: v.paths.length,
      locationCount: v.locations.length
    }));
  };

  /**
   * 恢复到指定版本
   */
  const restoreVersion = (versionId: string) => {
    const snapshot = versionHistory.value.find(v => v.id === versionId);
    if (!snapshot) {
      throw new Error('版本不存在');
    }

    // 保存当前状态为新版本（恢复前）
    saveVersion('恢复前');

    // 恢复到指定版本
    points.value = JSON.parse(JSON.stringify(snapshot.points));
    paths.value = JSON.parse(JSON.stringify(snapshot.paths));
    locations.value = JSON.parse(JSON.stringify(snapshot.locations));
    layerGroups.value = JSON.parse(JSON.stringify(snapshot.layerGroups));
    layers.value = JSON.parse(JSON.stringify(snapshot.layers));

    // 清除选择
    clearSelection();

    // 标记为已修改
    isDirty.value = true;

    return true;
  };

  /**
   * 清除版本历史
   */
  const clearVersionHistory = () => {
    versionHistory.value = [];
  };

  /**
   * 重置编辑器
   */
  const reset = () => {
    mapData.value = null;
    currentMapId.value = null;
    rasterBackground.value = null;
    layerGroups.value = [];
    layers.value = [];
    points.value = [];
    paths.value = [];
    locations.value = [];
    activeLayerId.value = null;
    clearSelection();
    commandManager.clear();
    canvasState.scale = 1;
    canvasState.offsetX = 0;
    canvasState.offsetY = 0;
    isDirty.value = false;
    pointNameCounter.value = 0;
    locationNameCounter.value = 0;
  };

  const setRasterBackground = (data: RasterBackground | null) => {
    rasterBackground.value = data;
  };

  const clearRasterBackground = () => {
    rasterBackground.value = null;
  };

  /**
   * 初始化编辑器状态：默认漫游模式，不自动选中元素
   */
  const initEditorState = () => {
    // 设置为漫游模式（平移）
    currentTool.value = ToolModeEnum.PAN;
    clearSelection();
  };

  return {
    // State
    mapData,
    currentMapId,
    currentTool,
    pointType,
    pathConnectionType,
    canvasState,
    layerGroups,
    layers,
    activeLayerId,
    points,
    paths,
    locations,
    selection,
    loading,
    isDirty,
    rasterBackground,
    versionHistory,
    locationTypeList,  // 导出位置类型列表

    // Getters
    selectedElements,
    selectedCount,
    hasSelection,
    canUndo,
    canRedo,

    // Actions
    fetchLocationTypeList,  // 导出获取位置类型列表方法
    loadMap,
    saveMap: saveMapEditor,
    updateLayoutProperties,
    setTool,
    setPointType,
    setPathConnectionType,
    generatePointName,
    generateLocationName,
    updateCanvasState,
    addPoint,
    updatePoint,
    deletePoint,
    addPath,
    updatePath,
    deletePath,
    addLocation,
    updateLocation,
    deleteLocation,
    togglePointLock,
    togglePathLock,
    toggleLocationLock,
    lockSelectedElements,
    isElementLocked,
    selectElement,
    selectElements,
    selectAll,
    clearSelection,
    selectLayout,
    copySelected,
    paste,
    duplicateSelected,
    addLayer,
    updateLayer,
    deleteLayer,
    setActiveLayer,
    addLayerGroup,
    updateLayerGroup,
    deleteLayerGroup,
    undo,
    redo,
    executeCommand,
    saveVersion,
    getVersionHistory,
    restoreVersion,
    clearVersionHistory,
    reset,
    setRasterBackground,
    clearRasterBackground,
    initEditorState
  };
});

