/** * 统一地图渲染组件 * 用于地图管理预览模式和地图编辑器模式，确保渲染效果一致
*/
<template>
  <div class="map-renderer-container" ref="containerRef">
    <v-stage :config="stageConfig" @wheel="handleWheel">
      <!-- 路径层 -->
      <v-layer>
        <template v-for="path in visiblePaths" :key="`path-${path.id}`">
          <v-line :config="getPathConfig(path)" />
        </template>
        <!-- 路径箭头 -->
        <template v-for="path in visiblePaths" :key="`path-arrows-${path.id}`">
          <template v-if="shouldShowPathArrow(path)">
            <v-line
              v-for="(arrowCfg, ai) in getPathArrowConfigs(path)"
              :key="`${path.id}-arrow-${ai}`"
              :config="arrowCfg"
            />
          </template>
        </template>
      </v-layer>

      <!-- 位置层 -->
      <v-layer>
        <template
          v-for="location in visibleLocations"
          :key="locationRenderKey(location)"
        >
          <!-- 业务位置：矩形 -->
          <v-rect
            v-if="!isRuleRegionLocation(location)"
            :config="getLocationRectConfig(location)"
          />
          <!-- 规则区域：多边形 -->
          <v-line v-else :config="getLocationConfig(location)" />
          <!-- 位置图标 -->
          <v-image
            v-if="
              !isRuleRegionLocation(location) && getLocationIconConfig(location)
            "
            :key="`${location.id}-icon`"
            :config="getLocationIconConfig(location)"
          />
          <!-- 无图标时显示标签 -->
          <v-text
            v-else-if="location.editorProps?.label"
            :key="`${location.id}-symbol`"
            :config="getLocationSymbolConfig(location)"
          />
          <!-- 位置名称标签 -->
          <v-text
            v-if="shouldShowLocationLabel(location)"
            :key="`${location.id}-label`"
            :config="getLocationLabelConfig(location)"
          />
        </template>
      </v-layer>

      <!-- 点位层 -->
      <v-layer>
        <template v-for="point in visiblePoints" :key="pointRenderKey(point)">
          <!-- 靶心外圈 -->
          <v-circle :config="getPointBullseyeOuterConfig(point)" />
          <!-- 靶心内圈 -->
          <v-circle :config="getPointBullseyeCoreConfig(point)" />
          <!-- 靶心中心点 -->
          <v-circle
            v-if="getPointBullseyeDotVisible(point)"
            :config="getPointBullseyeDotConfig(point)"
          />
          <!-- 点标签 -->
          <v-text
            v-if="shouldShowPointLabel(point)"
            :key="`${point.id}-label`"
            :config="getPointLabelConfig(point)"
          />
          <!-- 点位图标(Glyph) -->
          <v-text
            v-if="shouldRenderPointGlyph(point)"
            :key="`${point.id}-glyph`"
            :config="getPointGlyphConfig(point)"
          />
        </template>
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, onMounted, watch } from "vue";
import type { MapPoint, MapPath, MapLocation } from "@/types/mapEditor";
import {
  getPointVisualMeta,
  resolvePointBullseyeStyleReadonly,
  updateConnectedPointIds,
} from "@/utils/mapEditor/pointStyle";
import { getLocationTypeListForSelect } from "@/api/deploy/factory/location-type";
import type { LocationVO } from "@/api/deploy/factory/location-type/types";

// ==================== Props ====================
interface Props {
  points?: MapPoint[];
  paths?: MapPath[];
  locations?: MapLocation[];
  width?: number;
  height?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  readonly?: boolean;
  flipY?: boolean;
  originX?: number;
  originY?: number;
  autoCenter?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  points: () => [],
  paths: () => [],
  locations: () => [],
  width: 1920,
  height: 1080,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  readonly: true,
  flipY: false,
  originX: 0,
  originY: 0,
  autoCenter: false,
});

const emit = defineEmits<{
  (e: "scaleChange", scale: number): void;
}>();

/** Vue/Konva 列表项 key：id 与 pointId 同时参与，避免 id 缺失或重复时只渲染一个点 */
function pointRenderKey(point: MapPoint) {
  return `pt-${String(point.id)}-${String((point as any).pointId ?? "")}`;
}
function locationRenderKey(location: MapLocation) {
  return `loc-${String(location.id)}-${String((location as any).locationId ?? "")}`;
}

watch(
  () => props.paths,
  (paths) => {
    updateConnectedPointIds(paths ?? []);
  },
  { immediate: true, deep: true },
);

// ==================== 常量 ====================
const PATH_RIBBON_STROKE_WIDTH = 18;
const DASHED_LINK_STROKE_WIDTH = 4;
const DASHED_LINK_DASH_PATTERN = [12, 8];
const PATH_DEFAULT_STROKE = "rgba(186, 206, 245, 0.95)";
const PATH_DIRECTION_ARROW_FILL = "#2563EB";

function isColorEffectivelyInvisible(color?: string): boolean {
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

function getPathArrowFillColor(strokeFromLine: string): string {
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

// ==================== Refs ====================
const containerRef = ref<HTMLElement | null>(null);

// ==================== 坐标转换 ====================
// 坐标转换函数：处理原点偏移
// 预览模式下不需要偏移，因为数据已经是相对于地图原点的坐标
function transformPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: x,
    y: y,
  };
}
// 计算内容包围盒，用于自动居中
const contentBounds = computed(() => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const p of props.points || []) {
    const x = Number(p.x ?? 0);
    const y = Number(p.y ?? 0);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (const l of props.locations || []) {
    const x = Number(l.x ?? 0);
    const y = Number(l.y ?? 0);
    const hw = (l.editorProps?.width ?? 24) / 2;
    const hh = (l.editorProps?.height ?? 24) / 2;
    minX = Math.min(minX, x - hw);
    maxX = Math.max(maxX, x + hw);
    minY = Math.min(minY, y - hh);
    maxY = Math.max(maxY, y + hh);
  }
  for (const path of props.paths || []) {
    const cps = path.geometry?.controlPoints ?? [];
    for (const cp of cps) {
      const x = Number(cp.x ?? 0);
      const y = Number(cp.y ?? 0);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX)) return null;
  return {
    minX,
    maxX,
    minY,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
});

// ==================== 计算属性 ====================
const stageConfig = computed(() => {
  const bounds = props.autoCenter ? contentBounds.value : null;

  let stageX = props.offsetX;
  let stageY = props.offsetY;
  const scaleX = props.scale;
  const scaleY = props.scale;

  // 自动居中
  if (bounds && props.autoCenter) {
    const centerX = props.width / 2;
    const centerY = props.height / 2;
    stageX = centerX - bounds.cx * props.scale;
    stageY = centerY - bounds.cy * props.scale;
  }

  const scaleYFinal = props.flipY ? -props.scale : props.scale;

  return {
    width: props.width,
    height: props.height,
    scaleX,
    scaleY: scaleYFinal,
    x: stageX,
    y: stageY,
    draggable: !props.readonly,
  };
});

const visiblePoints = computed(() => props.points || []);
const visiblePaths = computed(() => props.paths || []);
const visibleLocations = computed(() => props.locations || []);

// 与地图编辑器 MapCanvas 一致：Stage 正缩放，标签不额外翻转
const labelScaleY = 1;

function getLocationCentroid(location: MapLocation): { x: number; y: number } {
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

// ==================== 点位渲染配置（与 MapCanvas 靶心样式一致）====================
function getPointBullseyeOuterConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const st = resolvePointBullseyeStyleReadonly(point, props.paths || []);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    radius: visual.radius,
    fill: "#ffffff",
    stroke: st.outerStroke,
    strokeWidth: st.outerStrokeWidth,
    listening: false,
    perfectDrawEnabled: true,
    ...st.shadow,
  };
}

function getPointBullseyeCoreConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const st = resolvePointBullseyeStyleReadonly(point, props.paths || []);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    radius: visual.radius * 0.66,
    fill: st.coreFill,
    stroke: st.coreStroke,
    strokeWidth: st.coreStrokeWidth,
    listening: false,
    perfectDrawEnabled: true,
  };
}

function getPointBullseyeDotVisible(point: MapPoint): boolean {
  return !shouldRenderPointGlyph(point);
}

function getPointBullseyeDotConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    radius: Math.max(1.2, visual.radius * 0.22),
    fill: "#ffffff",
    listening: false,
  };
}

function shouldShowPointLabel(point: MapPoint) {
  const labelVisible = point.editorProps?.labelVisible !== false;
  return labelVisible && !!(point.name || point.id);
}

function getPointLabelConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  const labelText = point.name || point.id;

  // 标签偏移：默认在右上方 (x = -10, y = -20)，可自定义调整
  const labelOffset = point.editorProps?.labelOffset ?? { x: -30, y: -30 };
  const offsetX = labelOffset.x;
  const offsetY = labelOffset.y;

  return {
    x: pos.x + offsetX,
    y: pos.y + offsetY,
    text: String(labelText ?? ""),
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fill: "#303133",
    align: "center",
    verticalAlign: "top",
    padding: 2,
    scaleY: labelScaleY,
    listening: false,
    perfectDrawEnabled: false,
  };
}

function shouldRenderPointGlyph(point: MapPoint) {
  return Boolean(getPointVisualMeta(point).glyph);
}

function getPointGlyphConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  if (!visual.glyph) {
    return {};
  }
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    text: visual.glyph,
    fontSize: Math.max(10, visual.radius * 1.8),
    fontStyle: "bold",
    fill: visual.glyphColor,
    align: "center",
    verticalAlign: "middle",
    width: visual.radius * 2,
    height: visual.radius * 2,
    offsetX: visual.radius,
    offsetY: visual.radius,
    scaleY: labelScaleY,
    listening: false,
  };
}

// ==================== 路径渲染配置 ====================
function getPathConfig(path: MapPath) {
  const points: number[] = [];
  path.geometry?.controlPoints?.forEach((cp: any) => {
    const pos = transformPoint(Number(cp.x ?? 0), Number(cp.y ?? 0));
    points.push(pos.x, pos.y);
  });

  const connectionType = path.type as
    | "direct"
    | "orthogonal"
    | "curve"
    | undefined;
  const isCurve =
    path.geometry?.pathType === "curve" || connectionType === "curve";
  const isOrthogonal = connectionType === "orthogonal";

  const stroke = path.editorProps?.strokeColor || PATH_DEFAULT_STROKE;
  const strokeWidth =
    path.editorProps?.strokeWidth ||
    (path.editorProps?.lineStyle === "dashed"
      ? DASHED_LINK_STROKE_WIDTH
      : PATH_RIBBON_STROKE_WIDTH);
  const isDashedLine = path.editorProps?.lineStyle === "dashed";

  return {
    id: String(path.id),
    points,
    stroke,
    strokeWidth,
    opacity: 0.86,
    lineCap: "round",
    lineJoin: isOrthogonal ? "miter" : "round",
    tension: isCurve ? 0.5 : 0,
    dash: isDashedLine ? DASHED_LINK_DASH_PATTERN : undefined,
    listening: false,
  };
}

function shouldShowPathArrow(path: MapPath) {
  // 位置到点的虚线连接不显示箭头；普通路径显示箭头
  return path.editorProps?.lineStyle !== "dashed";
}

function buildChevronConfig(
  cx: number,
  cy: number,
  angle: number,
  opts: { arrowColor: string; len: number; w: number; opacity: number },
) {
  const { arrowColor, len, w, opacity } = opts;
  const localPoints: [number, number][] = [
    [len / 2, 0],
    [-len / 2, w / 2],
    [-len / 2, 0],
    [-len / 2, -w / 2],
  ];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points: number[] = [];
  for (const [lx, ly] of localPoints) {
    points.push(cx + lx * cos - ly * sin, cy + lx * sin + ly * cos);
  }
  return {
    points,
    closed: true,
    fill: arrowColor,
    stroke: undefined,
    lineCap: "round",
    lineJoin: "round",
    opacity,
    listening: false,
  };
}

function getPathArrowConfigs(path: MapPath) {
  const cps = path.geometry?.controlPoints;
  if (!cps || cps.length < 2) return [];

  // 与编辑器一致：每段在内部绘制 chevron
  const transformedCps = cps.map((cp: any) =>
    transformPoint(Number(cp.x ?? 0), Number(cp.y ?? 0)),
  );
  const lineStroke = path.editorProps?.strokeColor || PATH_DEFAULT_STROKE;
  const arrowColor = getPathArrowFillColor(lineStroke);
  const opacity = 0.92;
  const len = Math.max(10, PATH_RIBBON_STROKE_WIDTH * 0.52);
  const w = Math.max(4, PATH_RIBBON_STROKE_WIDTH * 0.26);
  const laneMode = path.editorProps?.laneMode ?? "one-way";
  const configs: any[] = [];

  for (let i = 0; i < transformedCps.length - 1; i++) {
    const a = transformedCps[i];
    const b = transformedCps[i + 1];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const angleForward = Math.atan2(dy, dx);
    if (laneMode === "two-way") {
      const tBack = segLen < 40 ? 0.44 : 0.38;
      const tFwd = segLen < 40 ? 0.56 : 0.62;
      configs.push(
        buildChevronConfig(
          a.x + dx * tBack,
          a.y + dy * tBack,
          angleForward + Math.PI,
          {
            arrowColor,
            len,
            w,
            opacity,
          },
        ),
      );
      configs.push(
        buildChevronConfig(a.x + dx * tFwd, a.y + dy * tFwd, angleForward, {
          arrowColor,
          len,
          w,
          opacity,
        }),
      );
    } else {
      const t = 0.72;
      configs.push(
        buildChevronConfig(a.x + dx * t, a.y + dy * t, angleForward, {
          arrowColor,
          len,
          w,
          opacity,
        }),
      );
    }
  }

  return configs;
}

// ==================== 位置渲染配置 ====================
const LOCATION_TYPE_COLORS: Record<string, string> = {
  default: "#67c23a",
  load: "#409eff",
  unload: "#e6a23c",
};

function isRuleRegionLocation(location: MapLocation) {
  return location.editorProps?.shapeType === "polygon";
}

function getLocationRectConfig(location: MapLocation) {
  const w = 28;
  const h = 28;
  const strokeColor = "#2f88ff";
  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);

  return {
    x: pos.x - w / 2,
    y: pos.y - h / 2,
    width: w,
    height: h,
    fill: "#ffffff",
    stroke: strokeColor,
    strokeWidth: 2,
    cornerRadius: 0,
    listening: false,
  };
}

function getLocationConfig(location: MapLocation) {
  const vertices = location.geometry?.vertices || [];
  const points: number[] = [];
  vertices.forEach((v: any) => {
    const pos = transformPoint(Number(v.x ?? 0), Number(v.y ?? 0));
    points.push(pos.x, pos.y);
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

const locationTypeList = ref<LocationVO[]>([]);
const locationIconUrlMap: Record<string, string> = {};
const iconCache = shallowRef<Record<string, HTMLImageElement>>({});

const getSymbolForLocationTypeId = (
  locationTypeId: string | number | undefined,
): string => {
  if (locationTypeId === undefined || locationTypeId === null) return "";
  const id = String(locationTypeId);
  const type = locationTypeList.value.find((t) => String(t.id) === id);
  if (!type?.properties) return "";
  try {
    const arr =
      typeof type.properties === "string"
        ? JSON.parse(type.properties)
        : type.properties;
    if (Array.isArray(arr)) {
      const item = arr.find((p: any) => p?.name === "symbol");
      return String(item?.value ?? "");
    }
  } catch {
    return "";
  }
  return "";
};

function ensureIconLoaded(symbol: string) {
  if (!symbol) return;
  const url = locationIconUrlMap[symbol];
  if (!url || iconCache.value[symbol]) return;
  const img = new Image();
  img.onload = () => {
    iconCache.value = { ...iconCache.value, [symbol]: img };
  };
  img.src = url;
}

onMounted(async () => {
  try {
    locationTypeList.value = await getLocationTypeListForSelect();
  } catch {
    locationTypeList.value = [];
  }
  const modules = import.meta.glob("@/assets/location/*.svg", {
    eager: true,
    as: "url",
  }) as Record<string, string | { default: string }>;
  Object.keys(modules).forEach((path) => {
    const match = path.match(/location[\/\\]([^\/\\]+)\.svg$/);
    if (!match) return;
    const v = modules[path];
    const url = typeof v === "string" ? v : v?.default;
    if (url) locationIconUrlMap[match[1]] = url;
  });
});

function getLocationIconConfig(location: MapLocation) {
  const symbol =
    getSymbolForLocationTypeId((location as any).locationTypeId) ||
    String(location.editorProps?.icon || "");
  if (!symbol) return null;
  ensureIconLoaded(symbol);
  const iconImg = iconCache.value[symbol];
  if (!iconImg) return null;

  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);
  const size = 18;
  return {
    image: iconImg,
    x: pos.x,
    y: pos.y,
    width: size,
    height: size,
    offsetX: size / 2,
    offsetY: size / 2,
    scaleY: labelScaleY,
    listening: false,
  };
}

function getLocationSymbolConfig(location: MapLocation) {
  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);
  return {
    x: pos.x,
    y: pos.y,
    text: location.editorProps?.label || "",
    fontSize: 10,
    fontFamily: "Arial, sans-serif",
    fill: "#ffffff",
    offsetX: 3,
    offsetY: 4,
    scaleY: labelScaleY,
    listening: false,
  };
}

function shouldShowLocationLabel(location: MapLocation) {
  const labelVisible = location.editorProps?.labelVisible !== false;
  return labelVisible && !!(location.name || location.id);
}

/** 与 MapCanvas getLocationLabelConfig 一致：名称在业务位置中心下方，避免与点标签错位重叠 */
function getLocationLabelConfig(location: MapLocation) {
  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);
  const labelText = location.name || location.id;

  // 标签偏移：默认在右上方 (x = -10, y = -20)，可自定义调整
  const labelOffset = location.editorProps?.labelOffset ?? { x: -30, y: -30 };
  const offsetX = labelOffset.x;
  const offsetY = labelOffset.y;

  return {
    x: pos.x + offsetX,
    y: pos.y + offsetY,
    text: String(labelText ?? ""),
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    fill: "#303133",
    align: "center",
    verticalAlign: "top",
    padding: 2,
    scaleY: labelScaleY,
    listening: false,
    perfectDrawEnabled: false,
  };
}

// ==================== 事件处理 ====================
function handleWheel(e: any) {
  if (props.readonly) {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const oldScale = props.scale;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));
    emit("scaleChange", clampedScale);
  }
}
</script>

<style scoped>
.map-renderer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
