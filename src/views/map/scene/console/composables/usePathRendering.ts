import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { MapPath, MapPoint } from '@/types/mapEditor'
import {
  PATH_RIBBON_STROKE_WIDTH,
  DASHED_LINK_STROKE_WIDTH,
  DASHED_LINK_DASH_PATTERN,
} from '@/utils/mapEditor/mapVisualTokens'
import type { useMapEditorStore } from '@/store/modules/mapEditor'

type PathConnectionType = 'direct' | 'orthogonal' | 'curve'

type PathDragState = {
  startPoint: MapPoint | null
  currentPos: { x: number; y: number }
  pathType: PathConnectionType
}

type ManualDragStateLike = {
  kind: string
  pointId?: string
} | null

type PathRenderingDeps = {
  pathDragState: PathDragState
  pathControlPointDragPathId: Ref<string | null>
  manualDragState: Ref<ManualDragStateLike>
  getDefaultLayerId: (type: 'point' | 'path' | 'location') => string
  isSelectInteractionTool: ComputedRef<boolean>
}

export const PATH_ARROW = { radius: 6, color: '#409eff' }

/** 橡皮筋预览线：与正式路径同宽，略低透明度 */
export const PATH_PREVIEW_STROKE = 'rgba(59, 130, 246, 0.42)'

const PATH_DISPLAY_BASE_STROKE = 'rgba(147, 197, 253, 0.78)'
const PATH_DISPLAY_SELECTED_STROKE = 'rgba(37, 99, 235, 0.94)'
/** 箭头延迟（arrowVisible=false）时路径默认用实色 */
const PATH_DEFERRED_ARROW_DEFAULT_STROKE = '#2563EB'
const PATH_DIRECTION_ARROW_FILL = '#2563EB'

type PointLike = { x: number; y: number }

/**
 * 路径视觉配置（纯渲染，无副作用）
 */
export function usePathRendering(
  mapEditorStore: ReturnType<typeof useMapEditorStore>,
  deps: PathRenderingDeps,
) {
  const { pathDragState, pathControlPointDragPathId, manualDragState, getDefaultLayerId, isSelectInteractionTool } = deps

  const isColorEffectivelyInvisible = (color: string | undefined | null): boolean => {
    if (color == null) return false
    const s = String(color).trim().toLowerCase()
    if (s === '' || s === 'transparent' || s === 'none') return true
    const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/)
    if (m) {
      const a = m[4] !== undefined ? parseFloat(m[4]) : 1
      return a < 0.06
    }
    if (/^#([0-9a-f]{8})$/i.test(s)) return parseInt(s.slice(7, 9), 16) / 255 < 0.06
    return false
  }

  const getPathArrowFillColor = (strokeFromLine: string): string => {
    if (isColorEffectivelyInvisible(strokeFromLine)) return PATH_DIRECTION_ARROW_FILL
    const s = String(strokeFromLine).trim().toLowerCase()
    const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/)
    if (rgba) {
      const lum = (0.299 * parseFloat(rgba[1]) + 0.587 * parseFloat(rgba[2]) + 0.114 * parseFloat(rgba[3])) / 255
      if (lum > 0.72) return PATH_DIRECTION_ARROW_FILL
    }
    if (s.startsWith('#') && (s.length === 7 || s.length === 9)) {
      const lum = (0.299 * parseInt(s.slice(1, 3), 16) + 0.587 * parseInt(s.slice(3, 5), 16) + 0.114 * parseInt(s.slice(5, 7), 16)) / 255
      if (lum > 0.82) return PATH_DIRECTION_ARROW_FILL
    }
    return strokeFromLine
  }

  const pathConnectsPointId = (path: MapPath, pointId: string | undefined | null): boolean => {
    if (pointId == null) return false
    const pid = String(pointId)
    return String(path.startPointId ?? '') === pid || String(path.endPointId ?? '') === pid
  }

  const selectionHasPointId = (pointId: string | number | undefined | null): boolean => {
    if (pointId == null) return false
    const key = String(pointId)
    for (const id of mapEditorStore.selection.selectedIds) {
      if (String(id) === key) return true
    }
    return false
  }

  /** 选中、拖控制点、拖关联路网点时，透明路径需临时显示描边 */
  const pathNeedsVisibleStrokeWhileEditing = (path: MapPath): boolean => {
    if (mapEditorStore.selection.selectedIds.has(path.id)) return true
    if (pathControlPointDragPathId.value === path.id) return true
    const md = manualDragState.value
    if (md?.kind === 'point' && pathConnectsPointId(path, md.pointId)) return true
    return false
  }

  const getPathDisplayStroke = (path: MapPath): string => {
    const isSelected = mapEditorStore.selection.selectedIds.has(path.id)
    const raw = path.editorProps?.strokeColor
    if (isSelected) return PATH_DISPLAY_SELECTED_STROKE
    const deferredArrow = path.editorProps?.arrowVisible === false
    if (deferredArrow) {
      if (raw && !isColorEffectivelyInvisible(raw)) return raw
      return PATH_DEFERRED_ARROW_DEFAULT_STROKE
    }
    if (isColorEffectivelyInvisible(raw)) {
      if (pathNeedsVisibleStrokeWhileEditing(path)) return PATH_DISPLAY_BASE_STROKE
      return raw || 'transparent'
    }
    return raw || PATH_DISPLAY_BASE_STROKE
  }

  const getPathConfig = (path: MapPath) => {
    const isSelected = mapEditorStore.selection.selectedIds.has(path.id)
    const points: number[] = []
    path.geometry.controlPoints.forEach((cp) => { points.push(cp.x, cp.y) })
    const connectionType = path.type as 'direct' | 'orthogonal' | 'curve' | undefined
    const isCurve = path.geometry.pathType === 'curve' || connectionType === 'curve'
    const isOrthogonal = connectionType === 'orthogonal'
    const shadowConfig = isSelected ? { shadowColor: '#ff4d4f', shadowBlur: 8, shadowOpacity: 0.5 } : {}
    const stroke = getPathDisplayStroke(path)
    const deferredArrow = path.editorProps?.arrowVisible === false
    const forceEditVisibility =
      pathNeedsVisibleStrokeWhileEditing(path) && isColorEffectivelyInvisible(path.editorProps?.strokeColor)
    const sw = path.editorProps?.strokeWidth
    const isDashedLine = path.editorProps?.lineStyle === 'dashed'
    const strokeWidth = isDashedLine
      ? typeof sw === 'number' && sw >= 1 && sw <= 16 ? sw : DASHED_LINK_STROKE_WIDTH
      : typeof sw === 'number' && sw >= 8 && sw <= 48 ? sw : PATH_RIBBON_STROKE_WIDTH
    return {
      id: path.id,
      points,
      stroke,
      strokeWidth,
      opacity: isSelected || forceEditVisibility || deferredArrow ? 1 : 0.86,
      lineCap: 'round',
      lineJoin: isOrthogonal ? 'miter' : 'round',
      tension: isCurve ? 0.5 : 0,
      dash: isDashedLine ? DASHED_LINK_DASH_PATTERN : undefined,
      listening: true,
      ...shadowConfig,
    }
  }

  const shouldShowPathArrow = (path: MapPath) => {
    const arrowFlag = path.editorProps?.arrowVisible
    if (arrowFlag !== false) return true
    return selectionHasPointId(path.endPointId)
  }

  const buildChevronConfig = (
    cx: number, cy: number, angle: number,
    opts: { arrowColor: string; len: number; w: number; opacity: number; listening?: boolean },
  ) => {
    const { arrowColor, len, w, opacity, listening = true } = opts
    const localPoints: [number, number][] = [[len / 2, 0], [-len / 2, w / 2], [-len / 2, 0], [-len / 2, -w / 2]]
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const points: number[] = []
    for (const [lx, ly] of localPoints) {
      points.push(cx + lx * cos - ly * sin, cy + lx * sin + ly * cos)
    }
    return { points, closed: true, fill: arrowColor, stroke: undefined, lineCap: 'round', lineJoin: 'round', opacity, listening }
  }

  const getPathArrowConfigs = (path: MapPath) => {
    const controlPoints = path.geometry.controlPoints
    if (!controlPoints || controlPoints.length < 2) return []
    const isSelected = mapEditorStore.selection.selectedIds.has(path.id)
    const lineStroke = getPathDisplayStroke(path)
    const arrowColor = getPathArrowFillColor(lineStroke)
    const isEndSelected = selectionHasPointId(path.endPointId)
    const opacity = isSelected || isEndSelected ? 0.98 : 0.92
    const len = Math.max(10, PATH_RIBBON_STROKE_WIDTH * 0.52)
    const w = Math.max(4, PATH_RIBBON_STROKE_WIDTH * 0.26)
    const laneMode = path.editorProps?.laneMode ?? 'one-way'
    const configs: ReturnType<typeof buildChevronConfig>[] = []
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const a = controlPoints[i], b = controlPoints[i + 1]
      const dx = b.x - a.x, dy = b.y - a.y
      const segLen = Math.hypot(dx, dy) || 1
      const angleForward = Math.atan2(dy, dx)
      if (laneMode === 'two-way') {
        const tBack = segLen < 40 ? 0.44 : 0.38
        const tFwd = segLen < 40 ? 0.56 : 0.62
        configs.push(buildChevronConfig(a.x + dx * tBack, a.y + dy * tBack, angleForward + Math.PI, { arrowColor, len, w, opacity }))
        configs.push(buildChevronConfig(a.x + dx * tFwd, a.y + dy * tFwd, angleForward, { arrowColor, len, w, opacity }))
      } else {
        configs.push(buildChevronConfig(a.x + dx * 0.72, a.y + dy * 0.72, angleForward, { arrowColor, len, w, opacity }))
      }
    }
    return configs
  }

  const buildConnectionControlPoints = (start: PointLike, end: PointLike, type: PathConnectionType) => {
    const timestamp = Date.now()
    let index = 0
    const createControlPoint = (x: number, y: number) => ({ id: `cp_${timestamp}_${index++}`, x, y })
    const points = [createControlPoint(start.x, start.y)]
    if (type === 'orthogonal' && start.x !== end.x && start.y !== end.y) {
      points.push(createControlPoint(start.x, end.y))
    } else if (type === 'curve') {
      const dx = end.x - start.x, dy = end.y - start.y
      const length = Math.hypot(dx, dy) || 1
      const normalX = -dy / length, normalY = dx / length
      const offset = Math.min(80, length / 3)
      points.push(createControlPoint((start.x + end.x) / 2 + normalX * offset, (start.y + end.y) / 2 + normalY * offset))
    }
    points.push(createControlPoint(end.x, end.y))
    return points
  }

  const tempPathPreview = computed(() => {
    if (!pathDragState.startPoint) return null
    const start = pathDragState.startPoint
    let end = { x: pathDragState.currentPos.x, y: pathDragState.currentPos.y }
    if (Math.hypot(end.x - start.x, end.y - start.y) < 0.5) end = { x: start.x + 1, y: start.y }
    const controlPoints = buildConnectionControlPoints(start, end, pathDragState.pathType)
    const points: number[] = []
    controlPoints.forEach((cp) => { points.push(cp.x, cp.y) })
    const isCurvePreview = pathDragState.pathType === 'curve'
    return {
      line: {
        points,
        stroke: PATH_PREVIEW_STROKE,
        strokeWidth: PATH_RIBBON_STROKE_WIDTH,
        lineCap: 'round',
        lineJoin: 'round',
        tension: isCurvePreview ? 0.5 : 0,
        listening: false,
        opacity: 1,
        shadowBlur: 0,
        shadowOpacity: 0,
      },
    }
  })

  const createConnectionBetweenPoints = (start: MapPoint, end: MapPoint) => {
    const connectionType = mapEditorStore.pathConnectionType
    const controlPoints = buildConnectionControlPoints(start, end, connectionType)
    const startLabel = start.name || start.id
    const endLabel = end.name || end.id
    const newPath = mapEditorStore.addPath({
      layerId: getDefaultLayerId('path'),
      name: `Path ${startLabel} --- ${endLabel}`,
      startPointId: start.id,
      endPointId: end.id,
      status: '0',
      type: connectionType,
      geometry: {
        controlPoints,
        pathType: connectionType === 'curve' ? 'curve' : 'line',
      },
      editorProps: {
        strokeColor: '#d8e6ff',
        strokeWidth: PATH_RIBBON_STROKE_WIDTH,
        lineStyle: 'solid',
        arrowVisible: true,
        laneMode: 'one-way',
        labelVisible: true,
      },
    })
    return newPath.id
  }

  const getPathControlPointConfig = (path: MapPath, cp: any, index: number) => {
    const isSelected = mapEditorStore.selection.selectedIds.has(path.id)
    return {
      id: `${path.id}-cp-${index}`,
      x: cp.x,
      y: cp.y,
      radius: isSelected ? 6 : 4,
      fill: isSelected ? '#ff4d4f' : '#52c41a',
      stroke: '#ffffff',
      strokeWidth: 1,
      draggable: isSelected && isSelectInteractionTool.value,
      listening: true,
      opacity: isSelected ? 1 : 0.7,
    }
  }

  return {
    isColorEffectivelyInvisible,
    getPathArrowFillColor,
    pathConnectsPointId,
    selectionHasPointId,
    pathNeedsVisibleStrokeWhileEditing,
    getPathDisplayStroke,
    getPathConfig,
    shouldShowPathArrow,
    buildChevronConfig,
    getPathArrowConfigs,
    buildConnectionControlPoints,
    tempPathPreview,
    createConnectionBetweenPoints,
    getPathControlPointConfig,
  }
}
