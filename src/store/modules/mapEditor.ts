/**
 * 地图编辑器 Store
 */
import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type {
  MapEditorData,
  MapLayer,
  MapPoint,
  MapPath,
  MapLocation,
  ToolMode,
  CanvasState,
  SelectionState,
  Command
} from '@/types/mapEditor';
import { ToolMode as ToolModeEnum, LayerType } from '@/types/mapEditor';
import { CommandManager } from '@/utils/mapEditor/command';
import { loadMapEditorData, saveMapEditorData } from '@/api/opentcs/mapModel';

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
  
  // 画布状态
  const canvasState = reactive<CanvasState>({
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
  const selection = reactive<SelectionState>({
    selectedIds: new Set<string>(),
    selectedType: null
  });
  
  // 命令管理器（撤销/重做）
  const commandManager = new CommandManager();
  
  // 是否正在加载
  const loading = ref(false);
  
  // 是否已修改（用于提示保存）
  const isDirty = ref(false);
  
  // ==================== Getters ====================
  
  // 当前选中的元素
  const selectedElements = computed(() => {
    const elements: Array<MapPoint | MapPath | MapLocation> = [];
    
    if (selection.selectedType === 'point') {
      selection.selectedIds.forEach(id => {
        const point = points.value.find(p => p.id === id);
        if (point) elements.push(point);
      });
    } else if (selection.selectedType === 'path') {
      selection.selectedIds.forEach(id => {
        const path = paths.value.find(p => p.id === id);
        if (path) elements.push(path);
      });
    } else if (selection.selectedType === 'location') {
      selection.selectedIds.forEach(id => {
        const location = locations.value.find(l => l.id === id);
        if (location) elements.push(location);
      });
    }
    
    return elements;
  });
  
  // 是否可以撤销
  const canUndo = computed(() => commandManager.canUndo());
  
  // 是否可以重做
  const canRedo = computed(() => commandManager.canRedo());
  
  // ==================== Actions ====================
  
  /**
   * 加载地图数据
   */
  const loadMap = async (mapModelId: string | number) => {
    try {
      loading.value = true;
      currentMapModelId.value = mapModelId;
      
      // 从后端加载地图编辑器数据
      let data: MapEditorData;
      
      try {
        const response = await loadMapEditorData(mapModelId);
        // loadMapEditorData 返回 { data: ... } 格式
        data = (response.data || response) as MapEditorData;
      } catch (error: any) {
        // 如果文件不存在，创建空的地图数据
        if (error?.response?.status === 404 || error?.message?.includes('不存在')) {
          console.warn('地图文件不存在，创建新地图');
          data = createEmptyMapData(mapModelId);
        } else {
          throw error;
        }
      }
      
      // 验证数据格式
      if (!data || !data.mapInfo) {
        throw new Error('地图数据格式错误');
      }
      
      mapData.value = data;
      
      // 更新图层
      layers.value = data.layers || [];
      
      // 更新元素数据
      points.value = data.elements.points || [];
      paths.value = data.elements.paths || [];
      locations.value = data.elements.locations || [];
      
      // 更新画布状态
      if (data.mapInfo) {
        canvasState.width = data.mapInfo.width || 1920;
        canvasState.height = data.mapInfo.height || 1080;
        canvasState.scale = data.mapInfo.scale || 1;
        canvasState.offsetX = data.mapInfo.offsetX || 0;
        canvasState.offsetY = data.mapInfo.offsetY || 0;
      }
      
      // 如果没有图层，创建默认图层
      if (layers.value.length === 0) {
        layers.value = [
          {
            id: 'layer_point',
            name: '点位层',
            type: 'point' as any,
            visible: true,
            locked: false,
            zIndex: 1,
            opacity: 1,
            elementIds: []
          },
          {
            id: 'layer_path',
            name: '路径层',
            type: 'path' as any,
            visible: true,
            locked: false,
            zIndex: 2,
            opacity: 1,
            elementIds: []
          },
          {
            id: 'layer_location',
            name: '位置层',
            type: 'location' as any,
            visible: true,
            locked: false,
            zIndex: 3,
            opacity: 1,
            elementIds: []
          }
        ];
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
   * 创建空的地图数据
   */
  const createEmptyMapData = (mapModelId: string | number): MapEditorData => {
    return {
      mapInfo: {
        id: mapModelId,
        name: '新地图',
        version: '1.0',
        width: 1920,
        height: 1080,
        scale: 1,
        offsetX: 0,
        offsetY: 0
      },
      layers: [],
      elements: {
        points: [],
        paths: [],
        locations: []
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
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
      
      // 如果没有地图数据，创建新的
      if (!mapData.value) {
        mapData.value = createEmptyMapData(currentMapModelId.value);
      }
      
      // 更新地图数据
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
   * 更新画布状态
   */
  const updateCanvasState = (updates: Partial<CanvasState>) => {
    Object.assign(canvasState, updates);
    isDirty.value = true;
  };
  
  /**
   * 添加点
   */
  const addPoint = (point: Omit<MapPoint, 'id'>) => {
    const newPoint: MapPoint = {
      ...point,
      id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    points.value.push(newPoint);
    
    // 更新图层元素列表
    const layer = layers.value.find(l => l.id === point.layerId);
    if (layer) {
      layer.elementIds.push(newPoint.id);
    }
    
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
   * 删除点
   */
  const deletePoint = (id: string) => {
    const index = points.value.findIndex(p => p.id === id);
    if (index !== -1) {
      points.value.splice(index, 1);
      
      // 从图层中移除
      layers.value.forEach(layer => {
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
   * 添加路径
   */
  const addPath = (path: Omit<MapPath, 'id'>) => {
    const newPath: MapPath = {
      ...path,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    paths.value.push(newPath);
    
    // 更新图层元素列表
    const layer = layers.value.find(l => l.id === path.layerId);
    if (layer) {
      layer.elementIds.push(newPath.id);
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
    const index = paths.value.findIndex(p => p.id === id);
    if (index !== -1) {
      paths.value.splice(index, 1);
      
      // 从图层中移除
      layers.value.forEach(layer => {
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
   * 添加位置
   */
  const addLocation = (location: Omit<MapLocation, 'id'>) => {
    const newLocation: MapLocation = {
      ...location,
      id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    locations.value.push(newLocation);
    
    // 更新图层元素列表
    const layer = layers.value.find(l => l.id === location.layerId);
    if (layer) {
      layer.elementIds.push(newLocation.id);
    }
    
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
    const index = locations.value.findIndex(l => l.id === id);
    if (index !== -1) {
      locations.value.splice(index, 1);
      
      // 从图层中移除
      layers.value.forEach(layer => {
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
   * 选择元素
   */
  const selectElement = (id: string, type: 'point' | 'path' | 'location', multiSelect = false) => {
    if (!multiSelect) {
      selection.selectedIds.clear();
    }
    
    selection.selectedIds.add(id);
    selection.selectedType = type;
  };
  
  /**
   * 取消选择
   */
  const clearSelection = () => {
    selection.selectedIds.clear();
    selection.selectedType = null;
  };
  
  /**
   * 添加图层
   */
  const addLayer = (layer: Omit<MapLayer, 'id'>) => {
    const newLayer: MapLayer = {
      ...layer,
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
   * 删除图层
   */
  const deleteLayer = (id: string) => {
    const index = layers.value.findIndex(l => l.id === id);
    if (index !== -1) {
      // 删除图层中的所有元素
      const layer = layers.value[index];
      layer.elementIds.forEach(elementId => {
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
   * 重置编辑器
   */
  const reset = () => {
    mapData.value = null;
    currentMapModelId.value = null;
    layers.value = [];
    points.value = [];
    paths.value = [];
    locations.value = [];
    clearSelection();
    commandManager.clear();
    canvasState.scale = 1;
    canvasState.offsetX = 0;
    canvasState.offsetY = 0;
    isDirty.value = false;
  };
  
  return {
    // State
    mapData,
    currentMapModelId,
    currentTool,
    pointType,
    canvasState,
    layers,
    points,
    paths,
    locations,
    selection,
    loading,
    isDirty,
    
    // Getters
    selectedElements,
    canUndo,
    canRedo,
    
    // Actions
    loadMap,
    saveMap,
    setTool,
    setPointType,
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
    selectElement,
    clearSelection,
    addLayer,
    updateLayer,
    deleteLayer,
    undo,
    redo,
    executeCommand,
    reset,
    createEmptyMapData
  };
});

