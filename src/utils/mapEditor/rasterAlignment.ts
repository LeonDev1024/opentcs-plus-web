/**
 * 栅格底图（ROS map.yaml / PGM）与地图编辑器模型坐标对齐。
 * 约定：Layout scaleX/Y 为 mm/模型单位；yaml resolution 为 m/像素；
 * 模型坐标系与 openTCS 一致（X 向右、Y 向上），Konva 画布坐标系 Y 向下；
 * yaml origin 为地图左下角在世界坐标中的位置（米，Y 向北）。
 */

export const MAP_EDITOR_VIEWPORT_ORIGIN_PAD = 48

export function getLayoutScaleMm(mapData: {
  mapInfo?: { scaleX?: number | string }
  visualLayout?: { scaleX?: number | string }
} | null | undefined): number {
  const scaleX =
    mapData?.mapInfo?.scaleX ?? mapData?.visualLayout?.scaleX
  const v =
    typeof scaleX === 'number'
      ? scaleX
      : scaleX != null
        ? parseFloat(String(scaleX))
        : 50
  return Math.max(v || 50, 1e-6)
}

/**
 * 栅格与矢量对齐用的 mm/模型单位。
 * - 优先采用 mapInfo.scaleX / visualLayout.scaleX（与图层「毫米/单位」一致）。
 * - 若得到的是画布缩放等小值（常见误把 ~0.5 当作 scaleX），则退回 resolution×1000，
 *   与导入底图时「1 像素 ≈ 1 模型单位」一致。
 */
export function resolveScaleMmPerUnitForRaster(input: {
  mapInfo?: { scaleX?: number | string; scaleY?: number | string }
  visualLayout?: { scaleX?: number | string; scaleY?: number | string }
  rasterResolutionMPerPx: number
}): number {
  const res = Number(input.rasterResolutionMPerPx) || 0.05
  const fallback = Math.max(res * 1000, 1e-6)
  const raw = getLayoutScaleMm({
    mapInfo: input.mapInfo,
    visualLayout: input.visualLayout,
  })
  if (raw >= 5 && raw <= 500) return raw
  return fallback
}

export interface RasterModelLayoutInput {
  originXm: number
  originYm: number
  resolutionMPerPx: number
  widthPx: number
  heightPx: number
  scaleMmPerUnit: number
}

/** Konva v-image 在模型坐标系下的位置与尺寸（与点位、路径同一空间） */
export interface RasterModelLayout {
  modelUnitsPerPixel: number
  widthModel: number
  heightModel: number
  /** Image 左上角 x（左下角世界 x = originXm 对齐到图像左缘） */
  x: number
  /** Image 左上角 y（地理左下角落在图像底边：y + heightModel = 左下角模型 y） */
  y: number
  /** 地图左下角在模型坐标系中的 y（用于视口计算等） */
  bottomLeftY: number
}

/**
 * 每个像素对应多少模型单位：resolution(m/px) → mm/px，再除以 mm/单位。
 * 当 scaleMm = resolution×1000 时结果为 1（1 像素 = 1 模型单位）。
 */
export function computeRasterModelLayout(
  input: RasterModelLayoutInput,
): RasterModelLayout {
  const { originXm, originYm, resolutionMPerPx, widthPx, heightPx, scaleMmPerUnit } =
    input
  const mup = (resolutionMPerPx * 1000) / scaleMmPerUnit
  const widthModel = widthPx * mup
  const heightModel = heightPx * mup
  const mxBL = (originXm * 1000) / scaleMmPerUnit
  const myBL = (originYm * 1000) / scaleMmPerUnit
  // openTCS 模型 Y 轴向上，Konva Y 轴向下：模型 (x, yModel) → 画布 (x, -yModel)
  // 地图左下角模型坐标 (mxBL, myBL) → 画布坐标 (mxBL, -myBL)
  // Image 左上角 = (mxBL, -myBL - heightModel)
  return {
    modelUnitsPerPixel: mup,
    widthModel,
    heightModel,
    x: mxBL,
    y: -myBL - heightModel,
    bottomLeftY: -myBL,
  }
}

/** 导入后将模型原点 (0,0) 放在视口左下 padding 处时的 Stage 偏移（scale 为 1 时） */
export function viewportOffsetForModelOrigin(
  canvasWidth: number,
  canvasHeight: number,
  pad: number = MAP_EDITOR_VIEWPORT_ORIGIN_PAD,
): { offsetX: number; offsetY: number } {
  return {
    offsetX: pad,
    offsetY: Math.max(canvasHeight - pad, pad),
  }
}
