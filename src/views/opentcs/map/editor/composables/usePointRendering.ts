import type { ComputedRef, Ref } from 'vue'
import { ToolMode } from '@/types/mapEditor'
import type { MapPoint, MapLocation } from '@/types/mapEditor'
import { getPointVisualMeta } from '@/utils/mapEditor/pointStyle'
import { POINT_TYPE } from '@/utils/mapEditor/pointStyle'
import { POINT_TYPE_RADIUS } from '@/utils/mapEditor/mapVisualTokens'
import { DEFAULT_POINT_OUTER_RADIUS } from '@/utils/mapEditor/mapVisualTokens'
import type { useMapEditorStore } from '@/store/modules/mapEditor'

type PathDragState = {
  startPoint: MapPoint | null
  currentPos: { x: number; y: number }
}

type DashedLinkDragState = {
  startLocation: MapLocation | null
  currentPos: { x: number; y: number }
}

type PointRenderingDeps = {
  currentTool: ComputedRef<ToolMode>
  pathDragState: PathDragState
  dashedLinkDragState: DashedLinkDragState
  hoveredPointId: Ref<string | null>
  visiblePoints: ComputedRef<MapPoint[]>
  getDefaultLayerId: (type: 'point' | 'path' | 'location') => string
}

/**
 * 路网点位视觉配置（纯渲染，无副作用）
 */
export function usePointRendering(
  mapEditorStore: ReturnType<typeof useMapEditorStore>,
  deps: PointRenderingDeps,
) {
  const { currentTool, pathDragState, dashedLinkDragState, hoveredPointId, visiblePoints, getDefaultLayerId } = deps

  const shouldRenderPointGlyph = (point: MapPoint) => Boolean(getPointVisualMeta(point).glyph)

  const shouldShowPointLabel = (point: MapPoint) => {
    const labelVisible = point.editorProps?.labelVisible !== false
    return labelVisible && (point.name || point.id)
  }

  const getPointLabelConfig = (point: MapPoint) => {
    const visual = getPointVisualMeta(point)
    const labelText = point.name || point.id
    const isSelected = mapEditorStore.selection.selectedIds.has(point.id)

    // 标签偏移：默认在右上方 (x = -10, y = -10)，可自定义调整
    const labelOffset = point.editorProps?.labelOffset ?? { x: -10, y: -10 }
    const offsetX = labelOffset.x
    const offsetY = labelOffset.y

    return {
      x: point.x + offsetX,
      y: point.y + offsetY,
      text: labelText,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: isSelected ? '#ff4d4f' : '#303133',
      align: 'center',
      verticalAlign: 'top',
      padding: 2,
      listening: false,
      perfectDrawEnabled: false,
    }
  }

  const getPointGlyphConfig = (point: MapPoint) => {
    const visual = getPointVisualMeta(point)
    if (!visual.glyph) return {}
    const isSelected = mapEditorStore.selection.selectedIds.has(point.id)
    const isPathStart =
      currentTool.value === ToolMode.PATH && pathDragState.startPoint?.id === point.id
    const highlighted = isSelected || isPathStart
    return {
      x: point.x,
      y: point.y,
      text: visual.glyph,
      fontSize: Math.max(10, visual.radius * 1.8),
      fontStyle: 'bold',
      fill: highlighted ? '#ffffff' : visual.glyphColor,
      align: 'center',
      verticalAlign: 'middle',
      width: visual.radius * 2,
      height: visual.radius * 2,
      offsetX: visual.radius,
      offsetY: visual.radius,
      listening: false,
    }
  }

  // 判断点是否被连线（已接入路径）
  const isPointConnected = (point: MapPoint): boolean =>
    mapEditorStore.paths.some((path) => {
      const startId = String(path.startPointId || '')
      const endId = String(path.endPointId || '')
      const pointId = String(point.id)
      return startId === pointId || endId === pointId
    })

  type PointBullseyeStyle = {
    outerStroke: string
    outerStrokeWidth: number
    coreFill: string
    coreStroke: string
    coreStrokeWidth: number
    shadow: Record<string, unknown>
  }

  const resolvePointBullseyeStyle = (point: MapPoint): PointBullseyeStyle => {
    const isSelected = mapEditorStore.selection.selectedIds.has(point.id)
    const isPathStart =
      currentTool.value === ToolMode.PATH && pathDragState.startPoint?.id === point.id
    const isPathHovered =
      currentTool.value === ToolMode.PATH &&
      hoveredPointId.value === point.id &&
      !isPathStart
    const isDashedLinkTarget =
      currentTool.value === ToolMode.DASHED_LINK &&
      dashedLinkDragState.startLocation &&
      hoveredPointId.value === point.id
    const isConnected = isPointConnected(point)
    const visual = getPointVisualMeta(point)

    let coreFill = visual.fill || '#2563EB'
    let coreStroke = 'transparent'
    let coreStrokeWidth = 0
    let outerStroke = '#2563EB'
    const outerStrokeWidth = 2.4

    if (isSelected) {
      coreFill = '#ff4d4f'; coreStroke = '#ff7875'; coreStrokeWidth = 2; outerStroke = '#ff4d4f'
    } else if (isPathStart) {
      coreFill = '#409eff'; coreStroke = '#73c0ff'; coreStrokeWidth = 2; outerStroke = '#2563EB'
    } else if (isPathHovered) {
      coreFill = '#73c0ff'; outerStroke = '#60a5fa'
    } else if (isDashedLinkTarget) {
      coreFill = '#f7ba2a'; coreStroke = '#f5d48f'; coreStrokeWidth = 1.5; outerStroke = '#e6a23c'
    } else if (isConnected) {
      coreFill = '#4c8dff'; outerStroke = '#2563EB'
    }

    const shadow = isSelected
      ? { shadowColor: '#ff4d4f', shadowBlur: 12, shadowOpacity: 0.6, shadowOffset: { x: 0, y: 0 } }
      : {}

    return { outerStroke, outerStrokeWidth, coreFill, coreStroke, coreStrokeWidth, shadow }
  }

  const getPointBullseyeOuterConfig = (point: MapPoint) => {
    const visual = getPointVisualMeta(point)
    const st = resolvePointBullseyeStyle(point)
    return {
      id: `${point.id}-bull-outer`,
      x: point.x, y: point.y,
      radius: visual.radius,
      fill: '#ffffff',
      stroke: st.outerStroke,
      strokeWidth: st.outerStrokeWidth,
      listening: false,
      perfectDrawEnabled: true,
      ...st.shadow,
    }
  }

  const getPointBullseyeCoreConfig = (point: MapPoint) => {
    const visual = getPointVisualMeta(point)
    const st = resolvePointBullseyeStyle(point)
    return {
      id: `${point.id}-bull-core`,
      x: point.x, y: point.y,
      radius: visual.radius * 0.66,
      fill: st.coreFill,
      stroke: st.coreStroke,
      strokeWidth: st.coreStrokeWidth,
      listening: false,
      perfectDrawEnabled: true,
    }
  }

  const getPointBullseyeDotVisible = (point: MapPoint) => !shouldRenderPointGlyph(point)

  const getPointBullseyeDotConfig = (point: MapPoint) => {
    const visual = getPointVisualMeta(point)
    return {
      id: `${point.id}-bull-dot`,
      x: point.x, y: point.y,
      radius: Math.max(1.2, visual.radius * 0.22),
      fill: '#ffffff',
      listening: false,
    }
  }

  const getPointHitConfig = (point: MapPoint) => {
    const visual = getPointVisualMeta(point)
    return {
      id: point.id,
      x: point.x, y: point.y,
      radius: visual.radius + 2,
      fill: 'rgba(0, 0, 0, 0.0001)',
      stroke: undefined,
      strokeWidth: 0,
      draggable: false,
      listening: true,
      hitStrokeWidth: 14,
    }
  }

  const findPointAtPosition = (x: number, y: number, toleranceMultiplier = 1.6) => {
    for (const point of visiblePoints.value) {
      const radius = point.editorProps?.radius || DEFAULT_POINT_OUTER_RADIUS
      const distance = Math.hypot(point.x - x, point.y - y)
      if (distance <= radius * toleranceMultiplier) return point
    }
    return null
  }

  const buildPointEditorProps = (type: string): MapPoint['editorProps'] => {
    if (type === POINT_TYPE.PARK) {
      return {
        radius: POINT_TYPE_RADIUS[POINT_TYPE.PARK],
        color: '#409eff',
        strokeColor: '#1d6fd6',
        textColor: '#ffffff',
        labelVisible: true,
        labelOffset: { x: -30, y: -30 },
      }
    }
    return {
      radius: POINT_TYPE_RADIUS[POINT_TYPE.HALT],
      color: '#8c8c8c',
      strokeColor: '#d9d9d9',
      textColor: '#595959',
      labelVisible: true,
      labelOffset: { x: -30, y: -30 },
    }
  }

  const createPointPayload = (x: number, y: number): Omit<MapPoint, 'id'> => {
    const nextName =
      typeof mapEditorStore.generatePointName === 'function'
        ? mapEditorStore.generatePointName()
        : `Point-${Date.now()}`
    return {
      layerId: getDefaultLayerId('point'),
      name: nextName,
      x,
      y,
      status: '0',
      type: mapEditorStore.pointType,
      editorProps: buildPointEditorProps(mapEditorStore.pointType),
    }
  }

  return {
    shouldRenderPointGlyph,
    shouldShowPointLabel,
    getPointLabelConfig,
    getPointGlyphConfig,
    isPointConnected,
    resolvePointBullseyeStyle,
    getPointBullseyeOuterConfig,
    getPointBullseyeCoreConfig,
    getPointBullseyeDotVisible,
    getPointBullseyeDotConfig,
    getPointHitConfig,
    findPointAtPosition,
    buildPointEditorProps,
    createPointPayload,
  }
}
