import { ref, computed, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import { AXIS_ARM } from './useCanvasAxis'
import type { useMapEditorStore } from '@/store/modules/mapEditor'

const DEFAULT_VIEWPORT_ORIGIN_PAD = 48
const INFINITE_CANVAS_HALF = 100_000

/** 辅助：获取 Konva 节点（兼容不同版本的 vue-konva） */
export const getKonvaNode = (ref: any) => {
  if (!ref) return null
  if (ref.getNode && typeof ref.getNode === 'function') return ref.getNode()
  if (ref.$konva) return ref.$konva
  if (ref.getStage && typeof ref.getStage === 'function') return ref.getStage()
  if (ref.findOne) return ref
  return null
}

/**
 * 画布视口管理：容器尺寸、Stage 配置、网格、视口范围、可见元素
 */
export function useCanvasViewport(
  mapEditorStore: ReturnType<typeof useMapEditorStore>,
  containerRef: Ref<HTMLDivElement | undefined>,
  rasterLayerRef: Ref<any>,
) {
  const containerSize = ref({ width: 1920, height: 1080 })
  const canvasState = computed(() => mapEditorStore.canvasState)

  // 将默认视口原点置于左下角
  function tryApplyViewportOriginBottomLeft() {
    const el = containerRef.value
    if (!el) return
    const cs = mapEditorStore.canvasState
    if (cs.offsetX !== 0 || cs.offsetY !== 0) return
    const h = el.clientHeight || 1080
    const w = el.clientWidth || 1920
    if (h < 80 || w < 80) return
    const originX = Number(mapEditorStore.mapData?.mapInfo?.originX ?? 0) || 0
    const originY = Number(mapEditorStore.mapData?.mapInfo?.originY ?? 0) || 0
    const s = cs.scale || 1
    const mapOriginY = -originY

    if (originX !== 0 || originY !== 0) {
      const pad = DEFAULT_VIEWPORT_ORIGIN_PAD
      const minXModel = Math.min(0, originX)
      const maxXModel = Math.max(AXIS_ARM, originX + AXIS_ARM)
      const minYModel = Math.min(-AXIS_ARM, mapOriginY - AXIS_ARM)
      const maxYModel = Math.max(0, mapOriginY)
      const centerXModel = (minXModel + maxXModel) / 2
      const centerYModel = (minYModel + maxYModel) / 2
      mapEditorStore.updateCanvasState({
        offsetX: w / 2 - centerXModel * s,
        offsetY: h / 2 - centerYModel * s,
      })
      return
    }
    mapEditorStore.updateCanvasState({
      offsetX: DEFAULT_VIEWPORT_ORIGIN_PAD,
      offsetY: h - DEFAULT_VIEWPORT_ORIGIN_PAD,
    })
  }

  // 监听 offset 变化，触发视口原点初始化
  watch(
    () => [mapEditorStore.canvasState.offsetX, mapEditorStore.canvasState.offsetY] as const,
    () => { nextTick(() => tryApplyViewportOriginBottomLeft()) },
  )

  // Stage 配置
  const stageConfig = computed(() => {
    const MIN_STAGE = 400
    const containerWidth = Math.max(MIN_STAGE, containerSize.value.width || 1920)
    const containerHeight = Math.max(MIN_STAGE, containerSize.value.height || 1080)
    return {
      width: containerWidth,
      height: containerHeight,
      scaleX: canvasState.value.scale,
      scaleY: canvasState.value.scale,
      x: canvasState.value.offsetX,
      y: canvasState.value.offsetY,
      draggable: false,
    }
  })

  // 无限画布占位矩形配置（静态）
  const stageAreaRectConfig = {
    x: -INFINITE_CANVAS_HALF,
    y: -INFINITE_CANVAS_HALF,
    width: INFINITE_CANVAS_HALF * 2,
    height: INFINITE_CANVAS_HALF * 2,
    fill: 'transparent',
    listening: true,
  }

  // 栅格底图：比例尺（m/单位）
  const rasterScaleM = computed(() => {
    const scaleX =
      mapEditorStore.mapData?.mapInfo?.scaleX ?? mapEditorStore.mapData?.visualLayout?.scaleX
    const v = typeof scaleX === 'number' ? scaleX : scaleX != null ? parseFloat(String(scaleX)) : 50
    return (v || 50) / 1000
  })

  // 栅格底图图片
  const rasterLoadedImage = ref<HTMLImageElement | null>(null)
  watch(
    () => mapEditorStore.rasterBackground?.imageDataUrl,
    (dataUrl) => {
      rasterLoadedImage.value = null
      if (!dataUrl) return
      const img = new Image()
      img.onload = () => {
        rasterLoadedImage.value = img
        nextTick(() => {
          const layer = getKonvaNode(rasterLayerRef.value)
          if (layer) layer.batchDraw?.()
        })
      }
      img.onerror = () => { rasterLoadedImage.value = null }
      img.src = dataUrl
    },
    { immediate: true },
  )

  const rasterBackgroundConfig = computed(() => {
    const raster = mapEditorStore.rasterBackground
    if (!raster) return null
    const img = rasterLoadedImage.value
    if (!img) return null

    // 获取比例尺（mm/模型单位）
    const scaleX =
      mapEditorStore.mapData?.mapInfo?.scaleX ?? mapEditorStore.mapData?.visualLayout?.scaleX
    const v = typeof scaleX === 'number' ? scaleX : scaleX != null ? parseFloat(String(scaleX)) : 50
    const mmPerUnit = (v || 50) / 1000 // 模型单位（米）

    // 获取画布缩放
    const scale = canvasState.value.scale || 1

    // 获取画布偏移
    const offsetX = canvasState.value.offsetX || 0
    const offsetY = canvasState.value.offsetY || 0

    // 计算底图在画布中的位置
    // 底图偏移（模型单位）= -originX / resolution
    // originX 是米，resolution 是米/像素，所以结果直接是像素数（因为 resolution=0.05 意味着 1像素=0.05米）
    const offsetModelX = -raster.originX / raster.resolution
    const offsetModelY = -raster.originY / raster.resolution

    // 转换为画布坐标：modelX * mmPerUnit * scale + offsetX
    const canvasX = offsetModelX * mmPerUnit * scale + offsetX
    const canvasY = offsetModelY * mmPerUnit * scale + offsetY

    const h = raster.heightPx
    const w = raster.widthPx
    return {
      x: canvasX,
      y: canvasY,
      width: w * mmPerUnit * scale,
      height: h * mmPerUnit * scale,
      image: img,
      listening: false,
    }
  })

  // 网格
  const gridSize = ref(18)
  const gridColor = ref('#dcdfe6')
  const snapEnabled = ref(true)

  const gridLines = computed(() => {
    const lines: any[] = []
    const width = canvasState.value.width || 1920
    const height = canvasState.value.height || 1080
    const size = gridSize.value
    const padding = size * 20
    const startX = Math.floor(-padding / size) * size
    const endX = Math.ceil((width + padding) / size) * size
    const startY = Math.floor(-padding / size) * size
    const endY = Math.ceil((height + padding) / size) * size

    for (let x = startX; x <= endX; x += size) {
      const isMajor = size > 0 && x !== 0 && x % (size * 5) === 0
      lines.push({
        points: [x, startY, x, endY],
        stroke: isMajor ? '#b0b0b0' : '#cccccc',
        strokeWidth: isMajor ? 1.2 : 1,
        listening: false,
        perfectDrawEnabled: false,
        hitStrokeWidth: 0,
      })
    }
    for (let y = startY; y <= endY; y += size) {
      const isMajor = size > 0 && y !== 0 && y % (size * 5) === 0
      lines.push({
        points: [startX, y, endX, y],
        stroke: isMajor ? '#b0b0b0' : '#cccccc',
        strokeWidth: isMajor ? 1.2 : 1,
        listening: false,
        perfectDrawEnabled: false,
        hitStrokeWidth: 0,
      })
    }
    return lines
  })

  // 视口范围（模型坐标系）
  const viewportBounds = computed(() => {
    const scale = canvasState.value.scale || 1
    const offsetX = canvasState.value.offsetX || 0
    const offsetY = canvasState.value.offsetY || 0
    const containerWidth = containerSize.value.width || 1920
    const containerHeight = containerSize.value.height || 1080
    const padding = 200
    return {
      minX: (0 - offsetX) / scale - padding,
      maxX: (containerWidth - offsetX) / scale + padding,
      minY: (0 - offsetY) / scale - padding,
      maxY: (containerHeight - offsetY) / scale + padding,
    }
  })

  // 按视口范围过滤可见元素（按需渲染）
  const visiblePoints = computed(() => {
    const bounds = viewportBounds.value
    const padding = 100
    return mapEditorStore.points.filter((point) => {
      const layer = mapEditorStore.layers.find((l) => l.id === point.layerId)
      if (layer?.visible === false) return false
      return (
        point.x >= bounds.minX - padding &&
        point.x <= bounds.maxX + padding &&
        point.y >= bounds.minY - padding &&
        point.y <= bounds.maxY + padding
      )
    })
  })

  const visiblePaths = computed(() => {
    const bounds = viewportBounds.value
    const padding = 100
    return mapEditorStore.paths.filter((path) => {
      const layer = mapEditorStore.layers.find((l) => l.id === path.layerId)
      if (layer?.visible === false) return false
      const controlPoints = path.geometry.controlPoints || []
      return controlPoints.some(
        (cp) =>
          cp.x >= bounds.minX - padding &&
          cp.x <= bounds.maxX + padding &&
          cp.y >= bounds.minY - padding &&
          cp.y <= bounds.maxY + padding,
      )
    })
  })

  const visibleLocations = computed(() => {
    const bounds = viewportBounds.value
    const padding = 100
    return mapEditorStore.locations.filter((location) => {
      const layer = mapEditorStore.layers.find((l) => l.id === location.layerId)
      if (layer?.visible === false) return false
      const vertices = location.geometry.vertices || []
      if (vertices.length > 0) {
        return vertices.some(
          (v) =>
            v.x >= bounds.minX - padding &&
            v.x <= bounds.maxX + padding &&
            v.y >= bounds.minY - padding &&
            v.y <= bounds.maxY + padding,
        )
      }
      if (location.x !== undefined && location.y !== undefined) {
        return (
          location.x >= bounds.minX - padding &&
          location.x <= bounds.maxX + padding &&
          location.y >= bounds.minY - padding &&
          location.y <= bounds.maxY + padding
        )
      }
      return false
    })
  })

  const setGridSize = (size: number) => {
    gridSize.value = Math.max(5, Math.min(100, size))
  }

  const setGridColor = (color: string) => {
    gridColor.value = color
  }

  const setSnapEnabled = (enabled: boolean) => {
    snapEnabled.value = enabled
  }

  return {
    containerSize,
    canvasState,
    gridSize,
    gridColor,
    snapEnabled,
    stageConfig,
    stageAreaRectConfig,
    rasterScaleM,
    rasterBackgroundConfig,
    gridLines,
    viewportBounds,
    visiblePoints,
    visiblePaths,
    visibleLocations,
    setGridSize,
    setGridColor,
    setSnapEnabled,
    tryApplyViewportOriginBottomLeft,
  }
}
