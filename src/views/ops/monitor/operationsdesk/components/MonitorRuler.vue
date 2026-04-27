<script setup lang="ts">
/**
 * 监控画布刻度尺（视觉对齐 deploy/map-editor 的 MapCanvasRuler）
 *
 * 与编辑器版的差异：
 * - 不依赖 mapEditor pinia store；scale / offsetX / offsetY 通过 props 注入
 * - 暴露左上角刻度信息盒（比例尺 + 鼠标坐标），样式同源
 *
 * 约定：1 单位 = 1 mm（项目默认）。刻度尺以 cm 为单位显示。
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 画布缩放（与 MonitorCanvas 的 canvasScale 同源） */
    scale: number;
    /** 工厂原点 O(0,0) 在画布内容区的水平像素位置 */
    offsetX: number;
    /** 工厂原点 O(0,0) 在画布内容区的垂直像素位置（屏幕像素，y 向下） */
    offsetY: number;
    /** 1 模型单位等于多少 mm（与地图 mapInfo.scaleX 一致；1m=1000, 1mm=1） */
    mmPerUnit?: number;
  }>(),
  {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    mmPerUnit: 1000
  }
);

/**
 * 刻度尺固定以 cm 显示（用户需求：始终 cm，不随 mmPerUnit 切换到 m）。
 * 极小比例尺（mmPerUnit < 1，理论上不存在）退回 mm。
 */
const rulerUnit = computed<'cm' | 'mm'>(() => {
  return (props.mmPerUnit ?? 1) >= 1 ? 'cm' : 'mm';
});

/** mmPerUnit → 1 模型单位 = 多少个「显示单位」 */
const displayUnitsPerModelUnit = computed(() => {
  const mpu = props.mmPerUnit ?? 1;
  return rulerUnit.value === 'cm' ? mpu / 10 : mpu;
});

const rulerHRef = ref<HTMLCanvasElement | null>(null);
const rulerVRef = ref<HTMLCanvasElement | null>(null);
const canvasContentRef = ref<HTMLElement | null>(null);
const mouseScreenX = ref(0);
const mouseScreenY = ref(0);

const mouseMapX = computed(
  () => (mouseScreenX.value - props.offsetX) / props.scale
);
const mouseMapY = computed(
  () => (mouseScreenY.value - props.offsetY) / props.scale
);

/**
 * 坐标信息框始终以最合适的单位格式化（不跟随 rulerUnit），
 * 保证无论刻度单位如何，显示的都是易读的 m/cm/mm。
 * 单位关系：1 模型单位 = mmPerUnit mm
 */
function fmtCoord(mapUnits: number): string {
  const mm = mapUnits * (props.mmPerUnit ?? 1);
  const abs = Math.abs(mm);
  if (abs >= 10000) return `${(mm / 1000).toFixed(2)} m`;
  if (abs >= 1000) return `${(mm / 1000).toFixed(3)} m`;
  if (abs >= 100) return `${(mm / 10).toFixed(1)} cm`;
  return `${mm.toFixed(1)} mm`;
}

const mouseRealXStr = computed(() => fmtCoord(mouseMapX.value));
const mouseRealYStr = computed(() => fmtCoord(mouseMapY.value));

// —— 比例尺标签：缩放下「100 像素 ≈ 多少现实距离」 ——
const SCALE_BAR_STEPS = [
  0.001, 0.002, 0.005,
  0.01, 0.02, 0.05,
  0.1, 0.2, 0.5,
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000
];
const SCALE_BAR_STEPS_PX = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

/**
 * 比例尺标签：100 屏幕像素约对应多少实际距离。
 * 步骤：
 *   1. rawMm = 100px / zoom * mmPerUnit（= 100px 对应的毫米数）
 *   2. 从步距表（mm 单位）选最接近的 nice 值
 *   3. 转为最合适的单位输出
 */
const SCALE_BAR_STEPS_MM = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000
];

const scaleBarLabel = computed(() => {
  const zoom = props.scale || 1;
  const mpu = props.mmPerUnit ?? 1;
  if (mpu > 0) {
    // 100 屏幕像素对应多少 mm
    const rawMm = (100 / zoom) * mpu;
    const nice = SCALE_BAR_STEPS_MM.reduce((a, b) =>
      Math.abs(b - rawMm) < Math.abs(a - rawMm) ? b : a
    );
    if (nice >= 1000) return `${nice / 1000} m`;
    if (nice >= 10) return `${nice / 10} cm`;
    return `${nice} mm`;
  }
  const rawPx = 100 / zoom;
  const nice = SCALE_BAR_STEPS_PX.reduce((a, b) =>
    Math.abs(b - rawPx) < Math.abs(a - rawPx) ? b : a
  );
  return `${nice} px`;
});

function handleMouseMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  mouseScreenX.value = e.clientX - r.left;
  mouseScreenY.value = e.clientY - r.top;
}

// —— 与 MapCanvasRuler 同源的颜色与算法 ——
const RULER_BG = '#f7f8fa';
const RULER_FG = '#888';
const RULER_BORDER = '#ddd';
const RULER_TICK = '#bbb';

function pickNiceStep(visibleRange: number, screenPx: number): number {
  const rough = visibleRange / Math.max(1, screenPx / 80);
  if (!rough || !isFinite(rough) || rough <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

function drawSingleRuler(
  canvas: HTMLCanvasElement,
  isH: boolean,
  scale: number,
  offset: number,
  mmPerUnit: number
): boolean {
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  if (!cssW || !cssH) return false;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const length = isH ? cssW : cssH;
  const thickness = isH ? cssH : cssW;

  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.strokeStyle = RULER_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (isH) {
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
  } else {
    ctx.moveTo(cssW - 0.5, 0);
    ctx.lineTo(cssW - 0.5, cssH);
  }
  ctx.stroke();

  // 显示单位换算：1 模型单位 = displayPerUnit 个「显示单位」
  const unit = rulerUnit.value;
  const displayPerUnit = displayUnitsPerModelUnit.value;
  // screen px → 显示单位
  const screenToDisplay = (px: number) => ((px - offset) / scale) * displayPerUnit;
  const displayToScreen = (d: number) => (d / displayPerUnit) * scale + offset;

  const dAtStart = screenToDisplay(0);
  const dAtEnd = screenToDisplay(length);
  const dMin = Math.min(dAtStart, dAtEnd);
  const dMax = Math.max(dAtStart, dAtEnd);

  const step = pickNiceStep(dMax - dMin, length);
  if (step <= 0) return true;

  const subDivs = step % 10 < 0.0001 ? 10 : 5;
  const minorStep = step / subDivs;

  ctx.font = '9px Arial, system-ui, sans-serif';

  const firstMinor = Math.floor(dMin / minorStep) * minorStep;
  for (let d = firstMinor; d <= dMax + minorStep * 0.001; d += minorStep) {
    const sp = displayToScreen(d);
    if (sp < -1 || sp > length + 1) continue;

    const isMajor = Math.abs(d / step - Math.round(d / step)) < 0.0001;
    const tickLen = isMajor ? thickness * 0.6 : thickness * 0.35;
    ctx.strokeStyle = RULER_TICK;
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.beginPath();
    if (isH) {
      ctx.moveTo(sp, cssH);
      ctx.lineTo(sp, cssH - tickLen);
    } else {
      ctx.moveTo(cssW, sp);
      ctx.lineTo(cssW - tickLen, sp);
    }
    ctx.stroke();

    if (isMajor) {
      const rounded = Math.round(d * 10) / 10;
      const label = Number.isInteger(rounded)
        ? `${Math.round(rounded)}`
        : rounded.toFixed(1);
      ctx.fillStyle = RULER_FG;
      if (isH) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, sp, 2);
      } else {
        ctx.save();
        ctx.translate(2, sp);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }
  return true;
}

function redrawRulers() {
  const okH = rulerHRef.value
    ? drawSingleRuler(
        rulerHRef.value,
        true,
        props.scale,
        props.offsetX,
        props.mmPerUnit ?? 1
      )
    : false;
  const okV = rulerVRef.value
    ? drawSingleRuler(
        rulerVRef.value,
        false,
        props.scale,
        props.offsetY,
        props.mmPerUnit ?? 1
      )
    : false;
  if (!okH || !okV) requestAnimationFrame(redrawRulers);
}

watch(() => [props.scale, props.offsetX, props.offsetY], redrawRulers);

let rulerResizeObs: ResizeObserver | null = null;

onMounted(() => {
  requestAnimationFrame(redrawRulers);
  if (typeof ResizeObserver !== 'undefined' && canvasContentRef.value) {
    rulerResizeObs = new ResizeObserver(redrawRulers);
    rulerResizeObs.observe(canvasContentRef.value);
  }
});

onUnmounted(() => {
  rulerResizeObs?.disconnect();
});
</script>

<template>
  <div class="ruler-wrap">
    <div class="ruler-top-row">
      <div class="ruler-corner"><span class="ruler-unit">{{ rulerUnit }}</span></div>
      <canvas ref="rulerHRef" class="ruler-h-canvas" />
    </div>
    <div class="canvas-body-row">
      <canvas ref="rulerVRef" class="ruler-v-canvas" />
      <div
        ref="canvasContentRef"
        class="canvas-content"
        @mousemove="handleMouseMove"
      >
        <slot />
        <div class="ruler-info-box">
          <div class="rib-scale">{{ scaleBarLabel }}</div>
          <div class="rib-coord">x: {{ mouseRealXStr }}</div>
          <div class="rib-coord">y: {{ mouseRealYStr }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ruler-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.ruler-top-row {
  display: flex;
  flex-shrink: 0;
  height: 20px;
  background: #f7f8fa;
  border-bottom: 1px solid #ddd;

  .ruler-corner {
    width: 24px;
    flex-shrink: 0;
    background: #f7f8fa;
    border-right: 1px solid #ddd;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;

    .ruler-unit {
      font-size: 9px;
      color: #888;
      font-family: Arial, system-ui, sans-serif;
      line-height: 1;
    }
  }

  .ruler-h-canvas {
    flex: 1;
    height: 20px;
    display: block;
    min-width: 0;
  }
}

.canvas-body-row {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;

  .ruler-v-canvas {
    width: 24px;
    flex-shrink: 0;
    display: block;
    background: #f7f8fa;
    border-right: 1px solid #ddd;
  }
}

.canvas-content {
  flex: 1;
  position: relative;
  min-height: 0;
  min-width: 0;
}

.ruler-info-box {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 6;
  pointer-events: none;
  user-select: none;
  background: rgba(247, 248, 250, 0.92);
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 3px 6px;
  line-height: 1.7;

  .rib-scale {
    font-size: 11px;
    font-weight: 600;
    color: #303133;
  }

  .rib-coord {
    font-size: 10px;
    color: #666;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
}
</style>
