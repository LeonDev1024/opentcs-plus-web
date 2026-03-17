/**
 * 地图编辑器 Store
 */
import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
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
import { loadMapEditorData, saveMapEditorData } from '@/api/opentcs/map';
import type { MapEditorResponse, VisualLayoutData } from '@/api/opentcs/map/types';

export const useMapEditorStore = defineStore('mapEditor', () => {
  // ==================== 状态 ====================
  
  // 当前地图数据
  const mapData = ref<MapEditorData | null>(null);
  
  // 当前地图模型ID
  const currentMapModelId = ref<string | number | null>(null);
  
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
    const x = p?.x ?? (p?.xPosition != null ? Number(p.xPosition) : 0);
    const y = p?.y ?? (p?.yPosition != null ? Number(p.yPosition) : 0);
    return {
      ...p,
      id,
      layerId: p?.layerId ?? defaultLayerId,
      name: p?.name ?? id,
      x,
      y,
      z: p?.z ?? (p?.zPosition != null ? Number(p.zPosition) : undefined),
      status: p?.status ?? 'active',
      editorProps: {
        radius: p?.editorProps?.radius ?? p?.radius ?? 20,
        color: p?.editorProps?.color ?? '#4CAF50',
        strokeColor: p?.editorProps?.strokeColor,
        textColor: p?.editorProps?.textColor,
        icon: p?.editorProps?.icon,
        label: p?.editorProps?.label ?? p?.label,
        labelVisible: p?.editorProps?.labelVisible !== false
      }
    };
  };

  /** 将后端路径转为前端 MapPath（sourcePointId/destPointId->startPointId/endPointId，id 转 string，补 geometry/editorProps） */
  const normalizePath = (p: Record<string, any>, defaultLayerId: string): MapPath => {
    const id = p?.id != null ? String(p.id) : `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startPointId = p?.startPointId ?? p?.sourcePointId;
    const endPointId = p?.endPointId ?? p?.destPointId;
    const geometry = p?.geometry ?? {
      controlPoints: [],
      pathType: 'line' as const
    };
    if (geometry.controlPoints && geometry.controlPoints.length === 0 && startPointId != null && endPointId != null) {
      geometry.controlPoints = [
        { id: `cp_${id}_0`, x: 0, y: 0 },
        { id: `cp_${id}_1`, x: 0, y: 0 }
      ];
    }
    return {
      ...p,
      id,
      layerId: p?.layerId ?? defaultLayerId,
      name: p?.name ?? id,
      startPointId,
      endPointId,
      status: p?.status ?? 'active',
      geometry,
      editorProps: {
        strokeColor: p?.editorProps?.strokeColor ?? '#2196F3',
        strokeWidth: p?.editorProps?.strokeWidth ?? 2,
        lineStyle: p?.editorProps?.lineStyle ?? 'solid',
        arrowVisible: p?.editorProps?.arrowVisible !== false,
        label: p?.editorProps?.label,
        labelVisible: p?.editorProps?.labelVisible !== false
      }
    };
  };

  /** 将后端位置转为前端 MapLocation（xPosition/yPosition->x/y，id 转 string，补 geometry/editorProps） */
  const normalizeLocation = (l: Record<string, any>, defaultLayerId: string): MapLocation => {
    const id = l?.id != null ? String(l.id) : `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const x = l?.x ?? (l?.xPosition != null ? Number(l.xPosition) : 0);
    const y = l?.y ?? (l?.yPosition != null ? Number(l.yPosition) : 0);
    const geometry = l?.geometry ?? {
      vertices: [
        { id: `v_${id}_0`, x, y },
        { id: `v_${id}_1`, x: x + 100, y },
        { id: `v_${id}_2`, x: x + 100, y: y + 100 },
        { id: `v_${id}_3`, x, y: y + 100 }
      ],
      closed: true
    };
    if (geometry && typeof geometry.closed === 'undefined') geometry.closed = true;
    return {
      ...l,
      id,
      layerId: l?.layerId ?? defaultLayerId,
      name: l?.name ?? id,
      x,
      y,
      status: l?.status ?? 'active',
      geometry,
      editorProps: {
        fillColor: l?.editorProps?.fillColor ?? 'rgba(33, 150, 243, 0.3)',
        fillOpacity: l?.editorProps?.fillOpacity ?? 0.3,
        strokeColor: l?.editorProps?.strokeColor ?? '#2196F3',
        strokeWidth: l?.editorProps?.strokeWidth ?? 1,
        labelVisible: l?.editorProps?.labelVisible !== false
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
   * 加载地图数据
   */
  const loadMap = async (mapId: string | number) => {
    try {
      loading.value = true;
      currentMapModelId.value = mapId;
      
      // 从后端加载地图编辑器数据
      let data: MapEditorData;
      
      try {
        const response = await loadMapEditorData(mapId);
        // loadMapEditorData 返回的数据已经被响应拦截器处理，直接是业务数据
        // 后端返回的数据结构：{ code: 200, msg: "操作成功", data: { name, mapId, modelVersion, points, paths, locations, visualLayout: { name, scaleX, scaleY, layers, layerGroups } } }
        // 或者已经是 { name, mapId, modelVersion, ... } 格式
        const apiData = (response as MapEditorResponse);

        if (apiData && (apiData.name || apiData.visualLayout)) {
          const visualLayout = apiData.visualLayout || {};
          const rawLayerGroups = Array.isArray(visualLayout.layerGroups) ? visualLayout.layerGroups : [];
          const rawLayers = Array.isArray(visualLayout.layers) ? visualLayout.layers : [];

          let normalizedGroups = normalizeLayerGroups(rawLayerGroups);
          const layerGroupIdMap = new Map(rawLayerGroups.map((g: Record<string, any>) => [g?.id, g?.id != null ? String(g.id) : null]).filter(([, v]) => v != null) as [string | number, string][]);
          let normalizedLayers = normalizeLayers(rawLayers, layerGroupIdMap);

          if (normalizedGroups.length === 0 || normalizedLayers.length === 0) {
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
              id: apiData.mapId || mapId,
              name: apiData.name || '新地图',
              mapVersion: apiData.modelVersion || '1.0',
              description: apiData.description || '',
              width: 1920,
              height: 1080,
              scale: 1,
              offsetX: 0,
              offsetY: 0,
              scaleX: parseFloat(String(visualLayout.scaleX)) || 50.0,
              scaleY: parseFloat(String(visualLayout.scaleY)) || 50.0
            },
            layerGroups: normalizedGroups,
            layers: normalizedLayers,
            elements: {
              points: rawPoints.map((p: Record<string, any>) => normalizePoint(p, defaultPointLayerId)),
              paths: rawPaths.map((p: Record<string, any>) => normalizePath(p, defaultPathLayerId)),
              locations: rawLocations.map((l: Record<string, any>) => normalizeLocation(l, defaultLocationLayerId))
            },
            metadata: {
              createdAt: apiData.createTime || new Date().toISOString(),
              updatedAt: apiData.updateTime || new Date().toISOString()
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
              id: apiData.mapInfo.id || mapId,
              name: apiData.mapInfo.name || '新地图',
              mapVersion: apiData.mapInfo.modelVersion || '1.0',
              description: apiData.mapInfo.description || '',
              width: parseFloat(apiData.mapInfo.layoutWidth) || 1920,
              height: parseFloat(apiData.mapInfo.layoutHeight) || 1080,
              scale: parseFloat(apiData.mapInfo.scale) || 1,
              offsetX: 0,
              offsetY: 0,
              scaleX: 50.0,
              scaleY: 50.0
            },
            layerGroups: legGroups,
            layers: legLayers,
            elements: {
              points: rp.map((p: Record<string, any>) => normalizePoint(p, dpId)),
              paths: rpath.map((p: Record<string, any>) => normalizePath(p, dpathId)),
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
  const saveMap = async () => {
    if (!currentMapModelId.value) {
      throw new Error('没有可保存的地图模型ID');
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
        mapData.value.mapInfo.name = `地图_${currentMapModelId.value}`;
      }
      
      // 保存到后端
      await saveMapEditorData(currentMapModelId.value, mapData.value);
      
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
    clipboard.value.locations.forEach(location => {
      const newId = `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      locationIdMap.set(location.id, newId);
      const newVertices = (location.geometry.vertices || []).map(v => ({
        x: v.x + offsetX,
        y: v.y + offsetY
      }));
      addLocation({
        ...location,
        id: newId,
        geometry: {
          ...location.geometry,
          vertices: newVertices,
          position: location.geometry.position ? {
            x: location.geometry.position.x + offsetX,
            y: location.geometry.position.y + offsetY
          } : undefined
        },
        name: `${location.name}_copy`
      });
    });

    // 复制路径（需要更新起点和终点ID）
    clipboard.value.paths.forEach(path => {
      const newId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newStartPointId = pointIdMap.get(String(path.startPointId)) || path.startPointId;
      const newEndPointId = pointIdMap.get(String(path.endPointId)) || path.endPointId;
      const newControlPoints = (path.geometry.controlPoints || []).map(cp => ({
        x: cp.x + offsetX,
        y: cp.y + offsetY
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
      });
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
    currentMapModelId.value = null;
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
  
  return {
    // State
    mapData,
    currentMapModelId,
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
    
    // Getters
    selectedElements,
    selectedCount,
    hasSelection,
    canUndo,
    canRedo,
    
    // Actions
    loadMap,
    saveMap,
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
    clearRasterBackground
  };
});

