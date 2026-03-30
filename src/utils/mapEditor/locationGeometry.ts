import type { MapLocation } from "@/types/mapEditor";

/**
 * 获取位置的中心点（用于多边形质心或矩形中心）
 */
export function getLocationCentroid(location: MapLocation): {
  x: number;
  y: number;
} {
  const vertices = (location as any)?.geometry?.vertices;
  if (Array.isArray(vertices) && vertices.length > 0) {
    let sx = 0;
    let sy = 0;
    for (const v of vertices) {
      sx += Number(v?.x ?? 0);
      sy += Number(v?.y ?? 0);
    }
    return { x: sx / vertices.length, y: sy / vertices.length };
  }
  return {
    x: Number((location as any).x ?? 0),
    y: Number((location as any).y ?? 0),
  };
}

/**
 * 判断位置是否为规则区域（多边形）
 */
export function isRuleRegionLocation(location: MapLocation): boolean {
  return location.editorProps?.shapeType === "polygon";
}

/**
 * 获取位置标签配置
 */
export function getLocationLabelConfig(location: MapLocation) {
  const c = getLocationCentroid(location);
  const labelText = location.name || location.id;
  const offsetY = isRuleRegionLocation(location) ? 15 : 16;
  return {
    x: c.x,
    y: c.y + offsetY,
    text: String(labelText ?? ""),
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fill: "#303133",
    align: "center",
    verticalAlign: "top",
    padding: 2,
    scaleY: -1,
    listening: false,
    perfectDrawEnabled: false,
  };
}

/**
 * 获取位置的矩形配置
 */
export function getLocationRectConfig(location: MapLocation) {
  const w = 28;
  const h = 28;
  const strokeColor = "#2f88ff";
  const c = getLocationCentroid(location);
  return {
    x: c.x - w / 2,
    y: c.y - h / 2,
    width: w,
    height: h,
    fill: "#ffffff",
    stroke: strokeColor,
    strokeWidth: 2,
    cornerRadius: 0,
    listening: false,
  };
}

/**
 * 获取位置的多边形配置
 */
export function getLocationPolygonConfig(location: MapLocation) {
  const vertices = location.geometry?.vertices || [];
  const points: number[] = [];
  vertices.forEach((v: any) => {
    points.push(Number(v.x ?? 0), Number(v.y ?? 0));
  });

  const color =
    location.editorProps?.color ||
    LOCATION_TYPE_COLORS[location.type || ""] ||
    LOCATION_TYPE_COLORS.default;

  return {
    points,
    fill: color + "33",
    stroke: color,
    strokeWidth: 2,
    closed: true,
    listening: false,
  };
}

const LOCATION_TYPE_COLORS: Record<string, string> = {
  default: "#67c23a",
  load: "#409eff",
  unload: "#e6a23c",
};
