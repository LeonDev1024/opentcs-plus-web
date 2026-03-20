/**
 * 地图编辑器画布视觉常量：路径带状宽度与点位外圈半径联动。
 * 约定：点外接圆「直径」≈ 路径带状「线宽」× (1 + 1/3)，即点比路径宽约 1/3（同级比较：线宽 vs 圆直径）。
 */

/** 路径默认带状线宽（px，与 MapCanvas getPathConfig 默认一致） */
export const PATH_RIBBON_STROKE_WIDTH = 18;

/**
 * 位置↔点「虚线链接」线宽（px）：明显细于带状行驶路径，仍保持粗虚线可读。
 * 勿与 PATH_RIBBON 混用：旧逻辑曾把不足 8 的 strokeWidth 误判成带状宽度导致虚线过粗。
 */
export const DASHED_LINK_STROKE_WIDTH = 5;

/** 虚线链接的 dash 图案（与线宽匹配，略加长划段） */
export const DASHED_LINK_DASH_PATTERN: [number, number] = [10, 6];

/**
 * 默认点外圈半径（px）：直径 = PATH_RIBBON_STROKE_WIDTH × 4/3
 */
export const DEFAULT_POINT_OUTER_RADIUS = (PATH_RIBBON_STROKE_WIDTH * 4) / 3 / 2;

/**
 * 各点位类型相对 Halt 的半径比例（保持类型间差异）
 */
export const POINT_TYPE_RADIUS: Record<string, number> = {
  'Halt point': DEFAULT_POINT_OUTER_RADIUS,
  'Park point': DEFAULT_POINT_OUTER_RADIUS * (10 / 8),
  'Station': DEFAULT_POINT_OUTER_RADIUS * (9 / 8),
  'Charge point': DEFAULT_POINT_OUTER_RADIUS * (10 / 8)
};

/** 无类型或未知类型时的兜底半径 */
export function getDefaultPointRadiusForType(type: string | undefined): number {
  const key = type || 'Halt point';
  return POINT_TYPE_RADIUS[key] ?? DEFAULT_POINT_OUTER_RADIUS;
}
