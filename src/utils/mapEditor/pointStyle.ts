/**
 * 地图点位视觉：与 MapCanvas 编辑器一致，供 MapRenderer 等只读场景复用。
 */
import type { MapPoint, MapPath } from "@/types/mapEditor";
import {
  DEFAULT_POINT_OUTER_RADIUS,
  POINT_TYPE_RADIUS,
} from "@/utils/mapEditor/mapVisualTokens";

export const POINT_TYPE = {
  HALT: "Halt point",
  PARK: "Park point",
  STATION: "Station",
  CHARGE: "Charge point",
} as const;

export type PointVisualMeta = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  glyph?: string;
  glyphColor: string;
};

/** 与 MapCanvas POINT_TYPE_CONFIG 保持一致 */
export const POINT_TYPE_CONFIG: Record<
  string,
  {
    fill: string;
    stroke: string;
    glyph: string | undefined;
    glyphColor: string;
    radius: number;
  }
> = {
  [POINT_TYPE.HALT]: {
    fill: "#409EFF",
    stroke: "#096DD9",
    glyph: undefined,
    glyphColor: "#FFFFFF",
    radius: POINT_TYPE_RADIUS[POINT_TYPE.HALT],
  },
  [POINT_TYPE.PARK]: {
    fill: "#67C23A",
    stroke: "#237804",
    glyph: "P",
    glyphColor: "#FFFFFF",
    radius: POINT_TYPE_RADIUS[POINT_TYPE.PARK],
  },
  [POINT_TYPE.STATION]: {
    fill: "#E6A23C",
    stroke: "#D48806",
    glyph: "S",
    glyphColor: "#FFFFFF",
    radius: POINT_TYPE_RADIUS[POINT_TYPE.STATION],
  },
  [POINT_TYPE.CHARGE]: {
    fill: "#F56C6C",
    stroke: "#C21F1F",
    glyph: "⚡",
    glyphColor: "#FFFFFF",
    radius: POINT_TYPE_RADIUS[POINT_TYPE.CHARGE],
  },
};

/** 新建点默认占位色（与 MapCanvas buildPointEditorProps 一致），显示时仍按类型色渲染靶心 */
const PLACEHOLDER_POINT_FILL = "#8c8c8c";

function resolvePointFill(
  point: MapPoint,
  typeConfig: (typeof POINT_TYPE_CONFIG)[string] | undefined,
): string {
  const custom = point.editorProps?.color;
  if (custom && custom.trim().toLowerCase() !== PLACEHOLDER_POINT_FILL) {
    return custom;
  }
  return typeConfig?.fill || custom || "#409EFF";
}

// ==================== 视觉元数据缓存 ====================

// 点位视觉元数据缓存
const pointVisualMetaCache = new Map<string, PointVisualMeta>();

/**
 * 获取点位的视觉元数据（带缓存）
 */
export function getPointVisualMeta(point: MapPoint): PointVisualMeta {
  const cacheKey = String(point.id);
  const cached = pointVisualMetaCache.get(cacheKey);
  if (cached) return cached;

  const result = computePointVisualMeta(point);
  pointVisualMetaCache.set(cacheKey, result);
  return result;
}

function computePointVisualMeta(point: MapPoint): PointVisualMeta {
  const typeConfig = POINT_TYPE_CONFIG[point.type || ""];

  return {
    fill: resolvePointFill(point, typeConfig),
    stroke: point.editorProps?.strokeColor || typeConfig?.stroke || "#ffffff",
    strokeWidth: typeConfig ? 1.6 : 1.2,
    radius:
      point.editorProps?.radius ||
      typeConfig?.radius ||
      DEFAULT_POINT_OUTER_RADIUS,
    glyph: point.editorProps?.icon ? undefined : typeConfig?.glyph || undefined,
    glyphColor:
      point.editorProps?.textColor || typeConfig?.glyphColor || "#606266",
  };
}

/**
 * 清除点位视觉元数据缓存
 */
export function clearPointVisualMetaCache(): void {
  pointVisualMetaCache.clear();
}

// ==================== 点位连接状态缓存 ====================

// 连接了点位的 ID 集合
let connectedPointIdsCache: Set<string> = new Set();

/**
 * 预计算连接了点位的 ID 集合
 */
export function updateConnectedPointIds(paths: MapPath[]): void {
  const ids = new Set<string>();
  paths.forEach((path) => {
    if (path.startPointId) ids.add(String(path.startPointId));
    if (path.endPointId) ids.add(String(path.endPointId));
  });
  connectedPointIdsCache = ids;
}

/**
 * 判断点是否连接了路径
 */
export function isPointConnected(pointId: string): boolean {
  return connectedPointIdsCache.has(String(pointId));
}

// ==================== 标签显示判断 ====================

/**
 * 判断是否应该显示点位标签
 */
export function shouldShowPointLabel(point: MapPoint): boolean {
  const labelVisible = point.editorProps?.labelVisible !== false;
  return labelVisible && !!(point.name || point.id);
}

/**
 * 判断是否应该渲染点位字形
 */
export function shouldRenderPointGlyph(point: MapPoint): boolean {
  return Boolean(getPointVisualMeta(point).glyph);
}

// ==================== Bullseye 样式 ====================

export type PointBullseyeStyle = {
  outerStroke: string;
  outerStrokeWidth: number;
  coreFill: string;
  coreStroke: string;
  coreStrokeWidth: number;
  shadow: Record<string, unknown>;
};

/**
 * 只读预览：与编辑器在未选中、非路径工具下的表现一致；
 * 若点作为某条路径端点，则使用与编辑器相同的「连线」强调色。
 */
export function resolvePointBullseyeStyleReadonly(
  point: MapPoint,
  paths: MapPath[],
): PointBullseyeStyle {
  // 使用缓存的连接状态，避免 O(n) 遍历
  const isConnected = isPointConnected(String(point.id));

  const visual = getPointVisualMeta(point);
  const baseFill = "#2563EB";
  let coreFill = visual.fill || baseFill;
  const coreStroke = "transparent";
  const coreStrokeWidth = 0;
  let outerStroke = "#2563EB";
  const outerStrokeWidth = 2.4;

  if (isConnected) {
    coreFill = "#4c8dff";
    outerStroke = "#2563EB";
  }

  return {
    outerStroke,
    outerStrokeWidth,
    coreFill,
    coreStroke,
    coreStrokeWidth,
    shadow: {},
  };
}
