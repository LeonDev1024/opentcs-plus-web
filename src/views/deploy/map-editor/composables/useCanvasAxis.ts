import { computed } from 'vue'
import type { useMapEditorStore } from '@/store/modules/mapEditor'

const AXIS_COLOR_X = '#2563eb'
const AXIS_COLOR_Y = '#dc2626'

/** 所有尺寸使用固定模型坐标，与地图元素一致，由 Stage scaleX/Y 统一缩放 */
const AXIS_W = 2       // 线宽（模型单位 = px）
export const AXIS_ARM = 120  // 臂长（模型单位 = mm），导出供视口原点计算使用
const AXIS_ARROW_L = 8
const AXIS_ARROW_H = 5
const MAP_DASH = [8, 5]

/**
 * 坐标轴 Konva 配置
 * - 场景/工厂原点 O(0,0)：实线臂 + 实心三角箭头
 * - 地图/导航原点 M(x,y)：虚线臂 + 实心三角箭头（同色）
 */
export function useCanvasAxis(mapEditorStore: ReturnType<typeof useMapEditorStore>) {
  // ═══════ 场景/工厂原点（实线，静态） ══════════════════════════════════════════
  const axisXLineConfig = {
    points: [0, 0, AXIS_ARM, 0],
    stroke: AXIS_COLOR_X,
    strokeWidth: AXIS_W,
    opacity: 0.9,
  }

  const axisYLineConfig = {
    points: [0, 0, 0, -AXIS_ARM],
    stroke: AXIS_COLOR_Y,
    strokeWidth: AXIS_W,
    opacity: 0.9,
  }

  const axisXArrowConfig = {
    points: [AXIS_ARM - AXIS_ARROW_L, -AXIS_ARROW_H, AXIS_ARM, 0, AXIS_ARM - AXIS_ARROW_L, AXIS_ARROW_H],
    stroke: AXIS_COLOR_X,
    fill: AXIS_COLOR_X,
    strokeWidth: AXIS_W,
    closed: true,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    opacity: 1,
  }

  const axisYArrowConfig = {
    points: [-AXIS_ARROW_H, -(AXIS_ARM - AXIS_ARROW_L), 0, -AXIS_ARM, AXIS_ARROW_H, -(AXIS_ARM - AXIS_ARROW_L)],
    stroke: AXIS_COLOR_Y,
    fill: AXIS_COLOR_Y,
    strokeWidth: AXIS_W,
    closed: true,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    opacity: 1,
  }

  // ═══════ 地图/导航原点（虚线，随 mapInfo 变化） ═══════════════════════════════
  /** 当前地图的 originX/Y（模型坐标 mm）；Konva y 轴向下为正，后端 originY 向上为正，需取反 */
  const mapOriginCoord = computed(() => ({
    x: mapEditorStore.mapData?.mapInfo?.originX ?? 0,
    y: -(mapEditorStore.mapData?.mapInfo?.originY ?? 0),
  }))

  const mapOriginXLineConfig = computed(() => {
    const { x, y } = mapOriginCoord.value
    return { points: [x, y, x + AXIS_ARM, y], stroke: AXIS_COLOR_X, strokeWidth: AXIS_W, dash: MAP_DASH, opacity: 0.9 }
  })

  const mapOriginYLineConfig = computed(() => {
    const { x, y } = mapOriginCoord.value
    return { points: [x, y, x, y - AXIS_ARM], stroke: AXIS_COLOR_Y, strokeWidth: AXIS_W, dash: MAP_DASH, opacity: 0.9 }
  })

  const mapOriginXArrowConfig = computed(() => {
    const { x, y } = mapOriginCoord.value
    const tip = x + AXIS_ARM
    return {
      points: [tip - AXIS_ARROW_L, y - AXIS_ARROW_H, tip, y, tip - AXIS_ARROW_L, y + AXIS_ARROW_H],
      stroke: AXIS_COLOR_X, fill: AXIS_COLOR_X, strokeWidth: AXIS_W,
      closed: true, lineCap: 'round' as const, lineJoin: 'round' as const, opacity: 1,
    }
  })

  const mapOriginYArrowConfig = computed(() => {
    const { x, y } = mapOriginCoord.value
    const tip = y - AXIS_ARM
    return {
      points: [x - AXIS_ARROW_H, tip + AXIS_ARROW_L, x, tip, x + AXIS_ARROW_H, tip + AXIS_ARROW_L],
      stroke: AXIS_COLOR_Y, fill: AXIS_COLOR_Y, strokeWidth: AXIS_W,
      closed: true, lineCap: 'round' as const, lineJoin: 'round' as const, opacity: 1,
    }
  })

  return {
    axisXLineConfig,
    axisYLineConfig,
    axisXArrowConfig,
    axisYArrowConfig,
    mapOriginCoord,
    mapOriginXLineConfig,
    mapOriginYLineConfig,
    mapOriginXArrowConfig,
    mapOriginYArrowConfig,
  }
}
