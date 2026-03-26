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
import { ref, computed, watch, onMounted } from 'vue';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';

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
  readonly: true
});

const emit = defineEmits<{
  (e: 'scaleChange', scale: number): void;
}>();

// ==================== 常量 ====================
const DEFAULT_POINT_RADIUS = 10;
const PATH_RIBBON_STROKE_WIDTH = 12;
const DASHED_LINK_STROKE_WIDTH = 4;
const DASHED_LINK_DASH_PATTERN = [12, 8];

// ==================== Refs ====================
const containerRef = ref<HTMLElement | null>(null);

// ==================== 计算属性 ====================
const stageConfig = computed(() => ({
  width: props.width,
  height: props.height,
  scaleX: props.scale,
  scaleY: props.scale,
  x: props.offsetX,
  y: props.offsetY,
  draggable: !props.readonly
}));

const visiblePoints = computed(() => props.points || []);
const visiblePaths = computed(() => props.paths || []);
const visibleLocations = computed(() => props.locations || []);

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
  return {
    x: point.x,
    y: point.y,
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
  return {
    x: point.x,
    y: point.y,
    radius: visual.radius * 0.66,
    fill: st.coreFill,
    stroke: st.coreStroke,
    strokeWidth: st.coreStrokeWidth,
    listening: false
  };
}

function getPointBullseyeDotVisible = (point: MapPoint) => !shouldRenderPointGlyph(point);

function getPointBullseyeDotConfig(point: MapPoint) {
  const visual = getPointVisualMeta(point);
  return {
    x: point.x,
    y: point.y,
    radius: Math.max(1.2, visual.radius * 0.22),
    fill: '#ffffff',
    listening: false
  };
}

function shouldShowPointLabel(point: MapPoint) {
  return point.editorProps?.labelVisible !== false && point.name;
}

function getPointLabelConfig(point: MapPoint) {
  return {
    x: point.x,
    y: point.y - (point.editorProps?.radius || DEFAULT_POINT_RADIUS) - 14,
    text: point.name || '',
    fontSize: 11,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
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
  return {
    x: point.x,
    y: point.y,
    text: POINT_GLYPH_MAP[point.type || ''] || '',
    fontSize: visual.radius * 1.1,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fill: '#ffffff',
    offsetX: 4,
    offsetY: 5,
    listening: false
  };
}

// ==================== 路径渲染配置 ====================
function getPathConfig(path: MapPath) {
  const points: number[] = [];
  path.geometry?.controlPoints?.forEach((cp: any) => {
    points.push(cp.x, cp.y);
  });

  const connectionType = path.type as 'direct' | 'orthogonal' | 'curve' | undefined;
  const isCurve = path.geometry?.pathType === 'curve' || connectionType === 'curve';
  const isOrthogonal = connectionType === 'orthogonal';

  const stroke = path.editorProps?.strokeColor || '#409eff';
  const strokeWidth = path.editorProps?.strokeWidth ||
    (path.editorProps?.lineStyle === 'dashed' ? DASHED_LINK_STROKE_WIDTH : PATH_RIBBON_STROKE_WIDTH);
  const isDashedLine = path.editorProps?.lineStyle === 'dashed';

  return {
    id: path.id,
    points,
    stroke,
    strokeWidth,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: isOrthogonal ? 'miter' : 'round',
    tension: isCurve ? 0.5 : 0,
    dash: isDashedLine ? DASHED_LINK_DASH_PATTERN : undefined,
    listening: false
  };
}

function shouldShowPathArrow(path: MapPath) {
  const arrowFlag = path.editorProps?.arrowVisible;
  return arrowFlag !== false;
}

function getPathArrowConfigs(path: MapPath) {
  const cps = path.geometry?.controlPoints;
  if (!cps || cps.length < 2) return [];

  const endCp = cps[cps.length - 1];
  const prevCp = cps[cps.length - 2];
  if (!endCp || !prevCp) return [];

  const dx = endCp.x - prevCp.x;
  const dy = endCp.y - prevCp.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return [];

  const ux = dx / len;
  const uy = dy / len;

  const arrowSize = 10;
  const arrowWidth = 7;
  const baseX = endCp.x - ux * arrowSize;
  const baseY = endCp.y - uy * arrowSize;

  const leftX = baseX + ux * arrowWidth - uy * arrowWidth;
  const leftY = baseY + uy * arrowWidth + ux * arrowWidth;
  const rightX = baseX + ux * arrowWidth + uy * arrowWidth;
  const rightY = baseY + uy * arrowWidth - ux * arrowWidth;

  return [{
    points: [leftX, leftY, endCp.x, endCp.y, rightX, rightY],
    stroke: path.editorProps?.strokeColor || '#409eff',
    strokeWidth: 2,
    fill: path.editorProps?.strokeColor || '#409eff',
    closed: true,
    listening: false
  }];
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
  const w = location.editorProps?.width || 24;
  const h = location.editorProps?.height || 24;
  const color = location.editorProps?.color || LOCATION_TYPE_COLORS[location.type || ''] || LOCATION_TYPE_COLORS.default;

  return {
    x: location.x - w / 2,
    y: location.y - h / 2,
    width: w,
    height: h,
    fill: color,
    stroke: '#ffffff',
    strokeWidth: 1,
    listening: false
  };
}

function getLocationConfig(location: MapLocation) {
  const vertices = location.geometry?.vertices || [];
  const points: number[] = [];
  vertices.forEach((v: any) => {
    points.push(v.x, v.y);
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

function getLocationIconConfig(location: MapLocation) {
  const iconUrl = location.editorProps?.icon;
  if (!iconUrl) return null;

  return {
    image: new Image(),
    x: location.x - 10,
    y: location.y - 10,
    width: 20,
    height: 20
  };
}

function getLocationSymbolConfig(location: MapLocation) {
  const w = location.editorProps?.width || 24;
  return {
    x: location.x,
    y: location.y,
    text: location.editorProps?.label || '',
    fontSize: 10,
    fontFamily: 'Arial, sans-serif',
    fill: '#ffffff',
    offsetX: 3,
    offsetY: 4,
    listening: false
  };
}

function shouldShowLocationLabel(location: MapLocation) {
  return location.editorProps?.labelVisible !== false && location.name;
}

function getLocationLabelConfig(location: MapLocation) {
  const h = location.editorProps?.height || 24;
  return {
    x: location.x,
    y: location.y + h / 2 + 4,
    text: location.name || '',
    fontSize: 11,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
    listening: false
  };
}

// ==================== 事件处理 ====================
function handleWheel(e: any) {
  if (props.readonly) {
    // 预览模式：缩放
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
