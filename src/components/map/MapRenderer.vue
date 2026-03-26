/**
 * 统一地图渲染组件
 * 用于地图管理预览模式和地图编辑器模式，确保渲染效果一致
 */
<template>
  <div class="map-renderer-container" ref="containerRef">
    <v-stage
      :config="stageConfig"
      @wheel="handleWheel"
    >
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
        <template v-for="location in visibleLocations" :key="`loc-${location.id}`">
          <!-- 业务位置：矩形 -->
          <v-rect
            v-if="!isRuleRegionLocation(location)"
            :config="getLocationRectConfig(location)"
          />
          <!-- 规则区域：多边形 -->
          <v-line
            v-else
            :config="getLocationConfig(location)"
          />
          <!-- 位置图标 -->
          <v-image
            v-if="!isRuleRegionLocation(location) && getLocationIconConfig(location)"
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
        <template v-for="point in visiblePoints" :key="`pt-${point.id}`">
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
import { ref, computed, shallowRef, onMounted } from 'vue';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';
import { getLocationTypeListForSelect } from '@/api/opentcs/map/location';
import type { LocationVO } from '@/api/opentcs/map/location/types';

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
  autoCenter: false
});

const emit = defineEmits<{
  (e: 'scaleChange', scale: number): void;
}>();

// ==================== 常量 ====================
const DEFAULT_POINT_RADIUS = 10;
const PATH_RIBBON_STROKE_WIDTH = 18;
const DASHED_LINK_STROKE_WIDTH = 4;
const DASHED_LINK_DASH_PATTERN = [12, 8];
const PATH_DEFAULT_STROKE = 'rgba(186, 206, 245, 0.95)';

// ==================== Refs ====================
const containerRef = ref<HTMLElement | null>(null);

// ==================== 坐标转换 ====================
// 坐标转换函数：处理原点偏移
// 预览模式下不需要偏移，因为数据已经是相对于地图原点的坐标
function transformPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: x,
    y: y
  };
}
// 计算内容包围盒，用于自动居中
const contentBounds = computed(() => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

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
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
});

// ==================== 计算属性 ====================
const stageConfig = computed(() => {
  const bounds = props.autoCenter ? contentBounds.value : null;

  let stageX = props.offsetX;
  let stageY = props.offsetY;
  let scaleX = props.scale;
  let scaleY = props.scale;

  // 自动居中
  if (bounds && props.autoCenter) {
    const centerX = props.width / 2;
    const centerY = props.height / 2;
    stageX = centerX - bounds.cx * props.scale;
    stageY = centerY - bounds.cy * props.scale;
  }

  return {
    width: props.width,
    height: props.height,
    scaleX,
    scaleY,
    x: stageX,
    y: stageY,
    draggable: !props.readonly
  };
});

const visiblePoints = computed(() => props.points || []);
const visiblePaths = computed(() => props.paths || []);
const visibleLocations = computed(() => props.locations || []);

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
    y: Number((location as any).y ?? 0)
  };
}

// ==================== 点位渲染配置 ====================
const POINT_TYPE_COLORS: Record<string, string> = {
  'Halt point': '#409eff',
  'Station': '#67c23a',
  'Lock': '#e6a23c',
  'Parking': '#909399',
  'Charging': '#f56c6c'
};

function getPointVisualMeta(point: MapPoint) {
  const radius = point.editorProps?.radius ?? DEFAULT_POINT_RADIUS;
  return { radius };
}

function resolvePointBullseyeStyle(point: MapPoint) {
  const typeColor = point.editorProps?.color || POINT_TYPE_COLORS[point.type || ''] || '#409eff';
  return {
    outerStroke: typeColor,
    outerStrokeWidth: 2,
    coreFill: typeColor,
    coreStroke: typeColor,
    coreStrokeWidth: 0,
    shadow: {}
  };
}

function getPointBullseyeOuterConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const st = resolvePointBullseyeStyle(point);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    radius: visual.radius,
    fill: '#ffffff',
    stroke: st.outerStroke,
    strokeWidth: st.outerStrokeWidth,
    listening: false
  };
}

function getPointBullseyeCoreConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const st = resolvePointBullseyeStyle(point);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    radius: visual.radius * 0.66,
    fill: st.coreFill,
    stroke: st.coreStroke,
    strokeWidth: st.coreStrokeWidth,
    listening: false
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
    fill: '#ffffff',
    listening: false
  };
}

function shouldShowPointLabel(point: MapPoint) {
  return point.editorProps?.labelVisible !== false && point.name;
}

function getPointLabelConfig(point: MapPoint) {
  const radius = point.editorProps?.radius ?? DEFAULT_POINT_RADIUS;
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y - radius - 12,
    text: point.name || '',
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    fill: '#4b5563',
    // 预览容器会做 Y 轴翻转，这里反向一次保证文字正向可读
    scaleY: -1,
    listening: false
  };
}

const POINT_GLYPH_MAP: Record<string, string> = {
  'Halt point': '',
  'Station': '',
  'P': 'P',
  'S': 'S'
};

function shouldRenderPointGlyph(point: MapPoint) {
  const type = point.type || '';
  const glyph = POINT_GLYPH_MAP[type];
  return !!glyph;
}

function getPointGlyphConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  const pos = transformPoint(Number(point.x ?? 0), Number(point.y ?? 0));
  return {
    x: pos.x,
    y: pos.y,
    text: POINT_GLYPH_MAP[point.type || ''] || '',
    fontSize: visual.radius * 1.1,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fill: '#ffffff',
    offsetX: 4,
    offsetY: 5,
    // 抵消预览层的 Y 翻转
    scaleY: -1,
    listening: false
  };
}

// ==================== 路径渲染配置 ====================
function getPathConfig(path: MapPath) {
  const points: number[] = [];
  path.geometry?.controlPoints?.forEach((cp: any) => {
    const pos = transformPoint(Number(cp.x ?? 0), Number(cp.y ?? 0));
    points.push(pos.x, pos.y);
  });

  const connectionType = path.type as 'direct' | 'orthogonal' | 'curve' | undefined;
  const isCurve = path.geometry?.pathType === 'curve' || connectionType === 'curve';
  const isOrthogonal = connectionType === 'orthogonal';

  const stroke = path.editorProps?.strokeColor || PATH_DEFAULT_STROKE;
  const strokeWidth = path.editorProps?.strokeWidth ||
    (path.editorProps?.lineStyle === 'dashed' ? DASHED_LINK_STROKE_WIDTH : PATH_RIBBON_STROKE_WIDTH);
  const isDashedLine = path.editorProps?.lineStyle === 'dashed';

  return {
    id: path.id,
    points,
    stroke,
    strokeWidth,
    opacity: 0.86,
    lineCap: 'round',
    lineJoin: isOrthogonal ? 'miter' : 'round',
    tension: isCurve ? 0.5 : 0,
    dash: isDashedLine ? DASHED_LINK_DASH_PATTERN : undefined,
    listening: false
  };
}

function shouldShowPathArrow(path: MapPath) {
  // 位置到点的虚线连接不显示箭头；普通路径显示箭头
  return path.editorProps?.lineStyle !== 'dashed';
}

function getPathArrowConfigs(path: MapPath) {
  const cps = path.geometry?.controlPoints;
  if (!cps || cps.length < 2) return [];

  // 与编辑器一致：每段在内部绘制 chevron，避免被端点圆圈遮挡
  const transformedCps = cps.map((cp: any) => transformPoint(Number(cp.x ?? 0), Number(cp.y ?? 0)));
  const arrowSize = 12;
  const arrowWidth = 8;
  const color = '#4a6fb3';
  const configs: any[] = [];

  for (let i = 0; i < transformedCps.length - 1; i++) {
    const a = transformedCps[i];
    const b = transformedCps[i + 1];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len < 1) continue;
    const ux = dx / len;
    const uy = dy / len;

    // 位置->点位通常是短虚线，箭头放在线段中部更不易被端点图形遮挡
    const isDashed = path.editorProps?.lineStyle === 'dashed';
    const t = isDashed ? 0.5 : 0.72;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    const baseX = cx - ux * (arrowSize / 2);
    const baseY = cy - uy * (arrowSize / 2);
    const tipX = cx + ux * (arrowSize / 2);
    const tipY = cy + uy * (arrowSize / 2);

    const leftX = baseX - uy * (arrowWidth / 2);
    const leftY = baseY + ux * (arrowWidth / 2);
    const rightX = baseX + uy * (arrowWidth / 2);
    const rightY = baseY - ux * (arrowWidth / 2);

    configs.push({
      points: [leftX, leftY, tipX, tipY, rightX, rightY],
      stroke: isDashed ? '#6b7280' : color,
      strokeWidth: 1,
      fill: isDashed ? '#6b7280' : color,
      closed: true,
      opacity: isDashed ? 1 : 0.95,
      listening: false
    });
  }

  return configs;
}

// ==================== 位置渲染配置 ====================
const LOCATION_TYPE_COLORS: Record<string, string> = {
  'default': '#67c23a',
  'load': '#409eff',
  'unload': '#e6a23c'
};

function isRuleRegionLocation(location: MapLocation) {
  return location.editorProps?.shapeType === 'polygon';
}

function getLocationRectConfig(location: MapLocation) {
  const w = 28;
  const h = 28;
  const strokeColor = '#2f88ff';
  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);

  return {
    x: pos.x - w / 2,
    y: pos.y - h / 2,
    width: w,
    height: h,
    fill: '#ffffff',
    stroke: strokeColor,
    strokeWidth: 2,
    cornerRadius: 0,
    listening: false
  };
}

function getLocationConfig(location: MapLocation) {
  const vertices = location.geometry?.vertices || [];
  const points: number[] = [];
  vertices.forEach((v: any) => {
    const pos = transformPoint(Number(v.x ?? 0), Number(v.y ?? 0));
    points.push(pos.x, pos.y);
  });

  const color = location.editorProps?.color || LOCATION_TYPE_COLORS[location.type || ''] || LOCATION_TYPE_COLORS.default;

  return {
    points,
    fill: color + '33',
    stroke: color,
    strokeWidth: 2,
    closed: true,
    listening: false
  };
}

const locationTypeList = ref<LocationVO[]>([]);
const locationIconUrlMap: Record<string, string> = {};
const iconCache = shallowRef<Record<string, HTMLImageElement>>({});

const getSymbolForLocationTypeId = (locationTypeId: string | number | undefined): string => {
  if (locationTypeId === undefined || locationTypeId === null) return '';
  const id = String(locationTypeId);
  const type = locationTypeList.value.find((t) => String(t.id) === id);
  if (!type?.properties) return '';
  try {
    const arr = typeof type.properties === 'string' ? JSON.parse(type.properties) : type.properties;
    if (Array.isArray(arr)) {
      const item = arr.find((p: any) => p?.name === 'symbol');
      return String(item?.value ?? '');
    }
  } catch {
    return '';
  }
  return '';
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
  const modules = import.meta.glob('@/assets/location/*.svg', { eager: true, as: 'url' }) as Record<string, string | { default: string }>;
  Object.keys(modules).forEach((path) => {
    const match = path.match(/location[\/\\]([^\/\\]+)\.svg$/);
    if (!match) return;
    const v = modules[path];
    const url = typeof v === 'string' ? v : v?.default;
    if (url) locationIconUrlMap[match[1]] = url;
  });
});

function getLocationIconConfig(location: MapLocation) {
  const symbol = getSymbolForLocationTypeId((location as any).locationTypeId) || String(location.editorProps?.icon || '');
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
    // 抵消预览层的 Y 翻转，保证图标方向与编辑器一致
    scaleY: -1,
    listening: false
  };
}

function getLocationSymbolConfig(location: MapLocation) {
  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);
  return {
    x: pos.x,
    y: pos.y,
    text: location.editorProps?.label || '',
    fontSize: 10,
    fontFamily: 'Arial, sans-serif',
    fill: '#ffffff',
    offsetX: 3,
    offsetY: 4,
    scaleY: -1,
    listening: false
  };
}

function shouldShowLocationLabel(location: MapLocation) {
  return location.editorProps?.labelVisible !== false && location.name;
}

function getLocationLabelConfig(location: MapLocation) {
  const h = 28;
  const c = getLocationCentroid(location);
  const pos = transformPoint(c.x, c.y);
  // 文本使用了 scaleY:-1 抵消画布翻转，锚点需取“上方偏移”才能视觉落在方框下方
  const offsetY = 16;
  return {
    x: pos.x,
    y: pos.y - (h / 2 + offsetY),
    text: location.name || '',
    fontSize: 11,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
    scaleY: -1,
    listening: false
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
    emit('scaleChange', clampedScale);
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
