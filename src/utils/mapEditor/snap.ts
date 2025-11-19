/**
 * 吸附工具 - 用于对齐和吸附功能
 */
import type { Point, Line } from '@/types/mapEditor';

/**
 * 网格吸附
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
    z: point.z
  };
}

/**
 * 点对点吸附
 * @param point 当前点
 * @param targetPoints 目标点列表
 * @param threshold 吸附阈值（像素）
 * @returns 吸附后的点，如果没有可吸附的点则返回原点
 */
export function snapToPoint(
  point: Point,
  targetPoints: Point[],
  threshold: number = 10
): Point {
  let minDistance = Infinity;
  let snapPoint: Point | null = null;

  for (const target of targetPoints) {
    const distance = Math.sqrt(
      Math.pow(point.x - target.x, 2) + Math.pow(point.y - target.y, 2)
    );

    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      snapPoint = target;
    }
  }

  return snapPoint || point;
}

/**
 * 计算点到线段的距离
 */
function pointToLineDistance(point: Point, line: Line): number {
  const { start, end } = line;
  const A = point.x - start.x;
  const B = point.y - start.y;
  const C = end.x - start.x;
  const D = end.y - start.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = start.x;
    yy = start.y;
  } else if (param > 1) {
    xx = end.x;
    yy = end.y;
  } else {
    xx = start.x + param * C;
    yy = start.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 获取点到线段的最近点
 */
function getClosestPointOnLine(point: Point, line: Line): Point {
  const { start, end } = line;
  const A = point.x - start.x;
  const B = point.y - start.y;
  const C = end.x - start.x;
  const D = end.y - start.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  if (param < 0) {
    return { x: start.x, y: start.y, z: start.z };
  } else if (param > 1) {
    return { x: end.x, y: end.y, z: end.z };
  } else {
    return {
      x: start.x + param * C,
      y: start.y + param * D,
      z: start.z
    };
  }
}

/**
 * 点对线吸附
 * @param point 当前点
 * @param lines 线段列表
 * @param threshold 吸附阈值（像素）
 * @returns 吸附后的点，如果没有可吸附的线段则返回原点
 */
export function snapToLine(
  point: Point,
  lines: Line[],
  threshold: number = 10
): Point {
  let minDistance = Infinity;
  let snapPoint: Point | null = null;

  for (const line of lines) {
    const distance = pointToLineDistance(point, line);

    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      snapPoint = getClosestPointOnLine(point, line);
    }
  }

  return snapPoint || point;
}

/**
 * 综合吸附（网格 + 点 + 线）
 */
export function snapPoint(
  point: Point,
  options: {
    gridSize?: number;
    targetPoints?: Point[];
    targetLines?: Line[];
    snapToGrid?: boolean;
    snapToPoint?: boolean;
    snapToLine?: boolean;
    thresholds?: {
      point?: number;
      line?: number;
    };
  }
): Point {
  let result = { ...point };

  // 网格吸附
  if (options.snapToGrid && options.gridSize) {
    result = snapToGrid(result, options.gridSize);
  }

  // 点对点吸附
  if (options.snapToPoint && options.targetPoints) {
    result = snapToPoint(
      result,
      options.targetPoints,
      options.thresholds?.point || 10
    );
  }

  // 点对线吸附
  if (options.snapToLine && options.targetLines) {
    result = snapToLine(
      result,
      options.targetLines,
      options.thresholds?.line || 10
    );
  }

  return result;
}

