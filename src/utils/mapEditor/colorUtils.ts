// 颜色工具函数

const PATH_DIRECTION_ARROW_FILL = "#2563EB";

/**
 * 判断颜色是否有效不可见（透明度太低）
 */
export function isColorEffectivelyInvisible(color?: string): boolean {
  if (!color) return true;
  const s = String(color).trim().toLowerCase();
  if (s === "transparent" || s === "none") return true;
  const rgba = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgba) {
    const a = rgba[4] == null ? 1 : parseFloat(rgba[4]);
    return !Number.isFinite(a) || a < 0.06;
  }
  if (s.startsWith("#") && s.length === 9) {
    return parseInt(s.slice(7, 9), 16) / 255 < 0.06;
  }
  return false;
}

/**
 * 获取路径箭头填充颜色
 */
export function getPathArrowFillColor(strokeFromLine: string): string {
  if (isColorEffectivelyInvisible(strokeFromLine))
    return PATH_DIRECTION_ARROW_FILL;
  const s = String(strokeFromLine).trim().toLowerCase();
  const rgba = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgba) {
    const r = parseFloat(rgba[1]);
    const g = parseFloat(rgba[2]);
    const b = parseFloat(rgba[3]);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum > 0.72) return PATH_DIRECTION_ARROW_FILL;
  }
  if (s.startsWith("#") && (s.length === 7 || s.length === 9)) {
    const r = parseInt(s.slice(1, 3), 16);
    const g = parseInt(s.slice(3, 5), 16);
    const b = parseInt(s.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum > 0.82) return PATH_DIRECTION_ARROW_FILL;
  }
  return strokeFromLine;
}
