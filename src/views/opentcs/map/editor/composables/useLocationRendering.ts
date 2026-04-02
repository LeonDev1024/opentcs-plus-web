import { computed } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { ToolMode } from '@/types/mapEditor'
import type { MapLocation, MapPoint, MapLayerVisibility } from '@/types/mapEditor'
import {
  DASHED_LINK_STROKE_WIDTH,
  DASHED_LINK_DASH_PATTERN,
} from '@/utils/mapEditor/mapVisualTokens'
import type { useMapEditorStore } from '@/store/modules/mapEditor'

/** 业务位置小方框边长 */
export const BUSINESS_LOCATION_BOX_SIZE = 28
const BUSINESS_LOCATION_OVERLAY_SIZE = BUSINESS_LOCATION_BOX_SIZE + 4
const BUSINESS_LOCATION_OVERLAY_HALF = BUSINESS_LOCATION_OVERLAY_SIZE / 2

const LOCATION_TYPE_CONFIG: Record<string, { fill: string; stroke: string; symbol: string }> = {
  default:   { fill: '#ffffff', stroke: '#409EFF', symbol: 'L' },
  loading:   { fill: '#E6A23C', stroke: '#D48806', symbol: '↓' },
  unloading: { fill: '#67C23A', stroke: '#529B2E', symbol: '↑' },
  charge:    { fill: '#F56C6C', stroke: '#C21F1F', symbol: '⚡' },
  storage:   { fill: '#909399', stroke: '#606266', symbol: '□' },
}

type DashedLinkDragState = {
  startLocation: MapLocation | null
  currentPos: { x: number; y: number }
}

type LocationRenderingDeps = {
  currentTool: ComputedRef<ToolMode>
  isSelectInteractionTool: ComputedRef<boolean>
  isDragging: Ref<boolean>
  dashedLinkDragState: DashedLinkDragState
  hoveredLocationId: Ref<string | null>
  visibleLocations: ComputedRef<MapLocation[]>
  isBoxSelecting: Ref<boolean>
  boxSelectStart: Ref<{ x: number; y: number }>
  boxSelectEnd: Ref<{ x: number; y: number }>
  layerVisibility: ComputedRef<MapLayerVisibility> | ShallowRef<MapLayerVisibility>
  getSymbolForLocationTypeId: (id: string | number | undefined) => string
  locationIconImageCache: Ref<Record<string, HTMLImageElement>>
}

/**
 * 位置（Location）视觉配置（纯渲染，无副作用）
 */
export function useLocationRendering(
  mapEditorStore: ReturnType<typeof useMapEditorStore>,
  deps: LocationRenderingDeps,
) {
  const {
    currentTool, isSelectInteractionTool, isDragging,
    dashedLinkDragState, hoveredLocationId,
    visibleLocations, isBoxSelecting, boxSelectStart, boxSelectEnd,
    layerVisibility, getSymbolForLocationTypeId, locationIconImageCache,
  } = deps

  const getLocationCentroid = (location: MapLocation) => {
    const vertices = location.geometry.vertices || []
    if (!vertices.length) return { x: location.x ?? 0, y: location.y ?? 0 }
    const sum = vertices.reduce((acc, v) => { acc.x += v.x; acc.y += v.y; return acc }, { x: 0, y: 0 })
    return { x: sum.x / vertices.length, y: sum.y / vertices.length }
  }

  // 判断该 Location 是否为规则区域（通过 editorProps 颜色识别）
  const isRuleRegionLocation = (location: MapLocation) => {
    const stroke = location.editorProps?.strokeColor
    const fill = location.editorProps?.fillColor
    return stroke === '#ff7d00' || fill === '#ffedd9'
  }

  // 按图层可见性过滤后的位置列表
  const visibleLocationsLayer = computed(() =>
    visibleLocations.value.filter((loc) => {
      if (isRuleRegionLocation(loc)) return true
      return layerVisibility.value.station
    }),
  )

  const getLocationVisualConfig = (location: MapLocation) => {
    const locationTypeId = String(location.locationTypeId || '').toLowerCase()
    return LOCATION_TYPE_CONFIG[locationTypeId] || LOCATION_TYPE_CONFIG['default']
  }

  const getLocationRectConfig = (location: MapLocation) => {
    const centroid = getLocationCentroid(location)
    const isSelected = mapEditorStore.selection.selectedIds.has(location.id)
    const size = BUSINESS_LOCATION_BOX_SIZE
    const half = size / 2
    const visualConfig = getLocationVisualConfig(location)
    return {
      id: `${location.id}-rect`,
      x: centroid.x - half, y: centroid.y - half,
      width: size, height: size,
      stroke: isSelected ? '#ff4d4f' : visualConfig.stroke,
      strokeWidth: isSelected ? 3 : 2,
      fill: location.editorProps?.fillColor || visualConfig.fill,
      listening: true,
      draggable: false,
      opacity: location.editorProps?.fillOpacity || 0.9,
    }
  }

  const getLocationDragOverlayConfig = (location: MapLocation) => {
    if (isRuleRegionLocation(location)) return null
    const centroid = getLocationCentroid(location)
    const size = BUSINESS_LOCATION_OVERLAY_SIZE
    const half = size / 2
    return {
      id: `${location.id}-drag-overlay`,
      x: centroid.x - half, y: centroid.y - half,
      width: size, height: size,
      fill: 'transparent',
      listening: isSelectInteractionTool.value && !isDragging.value,
      draggable: false,
    }
  }

  const getLocationSymbolConfig = (location: MapLocation) => {
    const centroid = getLocationCentroid(location)
    const isSelected = mapEditorStore.selection.selectedIds.has(location.id)
    const customSymbol = getSymbolForLocationTypeId(location.locationTypeId)
    const visualConfig = getLocationVisualConfig(location)
    const text = customSymbol || visualConfig.symbol || location.editorProps?.label || 'L'
    return {
      x: centroid.x, y: centroid.y,
      text,
      fontSize: customSymbol ? 20 : 16,
      fontStyle: 'bold',
      fill: isSelected ? '#ff4d4f' : '#ffffff',
      align: 'center', verticalAlign: 'middle',
      listening: false,
      shadowColor: '#000', shadowBlur: 2, shadowOpacity: 0.3,
    }
  }

  const getLocationSymbol = (location: MapLocation) => getSymbolForLocationTypeId(location.locationTypeId)

  const getLocationIconConfig = (location: MapLocation) => {
    const symbol = getLocationSymbol(location)
    const img = symbol ? locationIconImageCache.value[symbol] : null
    if (!img) return null
    const centroid = getLocationCentroid(location)
    const size = 20
    const half = size / 2
    return { x: centroid.x - half, y: centroid.y - half, width: size, height: size, image: img, listening: false }
  }

  const shouldShowLocationLabel = (location: MapLocation) => {
    const labelVisible = location.editorProps?.labelVisible !== false
    return labelVisible && (location.name || location.id)
  }

  const getLocationLabelConfig = (location: MapLocation) => {
    const centroid = getLocationCentroid(location)
    const labelText = location.name || location.id
    const isSelected = mapEditorStore.selection.selectedIds.has(location.id)

    const common = {
      text: labelText,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: isSelected ? '#ff4d4f' : '#303133',
      align: 'center' as const,
      verticalAlign: 'top' as const,
      padding: 2,
      listening: false,
      perfectDrawEnabled: false,
    }

    // 规则区域：标签在质心下方固定偏移；业务库位：使用 editorProps.labelOffset
    if (isRuleRegionLocation(location)) {
      return {
        ...common,
        x: centroid.x,
        y: centroid.y + 15,
      }
    }

    const labelOffset = location.editorProps?.labelOffset ?? { x: -30, y: -30 }
    return {
      ...common,
      x: centroid.x + labelOffset.x,
      y: centroid.y + labelOffset.y,
    }
  }

  const findLocationAtPosition = (x: number, y: number) => {
    for (const location of visibleLocationsLayer.value) {
      if (!isRuleRegionLocation(location)) {
        const centroid = getLocationCentroid(location)
        const half = BUSINESS_LOCATION_BOX_SIZE / 2
        if (x >= centroid.x - half && x <= centroid.x + half && y >= centroid.y - half && y <= centroid.y + half) {
          return location
        }
      } else {
        const vertices = location.geometry.vertices || []
        if (vertices.length < 3) continue
        let inside = false
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i].x, yi = vertices[i].y
          const xj = vertices[j].x, yj = vertices[j].y
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
        }
        if (inside) return location
      }
    }
    return null
  }

  const getLocationConfig = (location: MapLocation) => {
    const isSelected = mapEditorStore.selection.selectedIds.has(location.id)
    const points: number[] = []
    location.geometry.vertices.forEach((vertex) => { points.push(vertex.x, vertex.y) })
    if (location.geometry.closed && points.length > 0) {
      points.push(location.geometry.vertices[0].x, location.geometry.vertices[0].y)
    }
    return {
      id: location.id,
      points,
      fill: isSelected ? 'rgba(255, 77, 79, 0.3)' : location.editorProps.fillColor || 'rgba(24, 144, 255, 0.3)',
      fillOpacity: location.editorProps.fillOpacity || 0.3,
      stroke: isSelected ? '#ff4d4f' : location.editorProps.strokeColor || '#1890ff',
      strokeWidth: location.editorProps.strokeWidth || 2,
      closed: location.geometry.closed,
      listening: true, draggable: false,
    }
  }

  const getPolygonPreviewStyles = (tool: ToolMode | null) =>
    tool === ToolMode.RULE_REGION
      ? { stroke: '#ff7d00', fill: 'rgba(255, 125, 0, 0.15)' }
      : { stroke: '#1890ff', fill: 'rgba(24, 144, 255, 0.1)' }

  const getPolygonPersistStyles = (tool: ToolMode | null) =>
    tool === ToolMode.RULE_REGION
      ? { strokeColor: '#ff7d00', strokeWidth: 2, fillColor: '#ffedd9', fillOpacity: 0.35 }
      : { strokeColor: '#1890ff', strokeWidth: 2, fillColor: 'rgba(24, 144, 255, 0.2)', fillOpacity: 0.2 }

  // 位置中心点配置（用于虚线链接连接）
  const getLocationCenterPointConfig = (location: MapLocation) => {
    const centroid = getLocationCentroid(location)
    const isSelected = dashedLinkDragState.startLocation?.id === location.id
    return {
      x: centroid.x, y: centroid.y,
      radius: isSelected ? 8 : 6,
      fill: isSelected ? '#f7ba2a' : '#909399',
      stroke: '#ffffff', strokeWidth: 2,
      listening: true, opacity: isSelected ? 1 : 0.8,
      hitStrokeWidth: 20,
      perfectDrawEnabled: false,
    }
  }

  // 虚线链接预览（橡皮筋线）
  const tempDashedLinkPreview = computed(() => {
    if (!dashedLinkDragState.startLocation) return null
    const centroid = getLocationCentroid(dashedLinkDragState.startLocation)
    return {
      points: [centroid.x, centroid.y, dashedLinkDragState.currentPos.x, dashedLinkDragState.currentPos.y],
      stroke: '#909399',
      strokeWidth: DASHED_LINK_STROKE_WIDTH,
      lineCap: 'round', lineJoin: 'round',
      dash: DASHED_LINK_DASH_PATTERN,
      listening: false,
    }
  })

  // 框选矩形配置
  const boxSelectConfig = computed(() => {
    const x = Math.min(boxSelectStart.value.x, boxSelectEnd.value.x)
    const y = Math.min(boxSelectStart.value.y, boxSelectEnd.value.y)
    return {
      x, y,
      width: Math.abs(boxSelectEnd.value.x - boxSelectStart.value.x),
      height: Math.abs(boxSelectEnd.value.y - boxSelectStart.value.y),
      fill: 'rgba(64, 158, 255, 0.2)',
      stroke: '#409eff', strokeWidth: 1,
      dash: [5, 5],
      listening: false,
    }
  })

  return {
    getLocationCentroid,
    isRuleRegionLocation,
    visibleLocationsLayer,
    getLocationVisualConfig,
    getLocationRectConfig,
    getLocationDragOverlayConfig,
    getLocationSymbolConfig,
    getLocationSymbol,
    getLocationIconConfig,
    shouldShowLocationLabel,
    getLocationLabelConfig,
    findLocationAtPosition,
    getLocationConfig,
    getPolygonPreviewStyles,
    getPolygonPersistStyles,
    getLocationCenterPointConfig,
    tempDashedLinkPreview,
    boxSelectConfig,
  }
}
