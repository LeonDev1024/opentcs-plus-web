<template>
  <div class="ruler-wrap">
    <div class="ruler-top-row">
      <div class="ruler-corner"><span class="ruler-unit">cm</span></div>
      <canvas ref="rulerHRef" class="ruler-h-canvas" />
    </div>
    <div class="canvas-body-row">
      <canvas ref="rulerVRef" class="ruler-v-canvas" />
      <div class="canvas-content" ref="canvasContentRef" @mousemove="handleMouseMove">
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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useMapEditorStore } from "@/store/modules/mapEditor";

const mapEditorStore = useMapEditorStore();

const rulerHRef = ref<HTMLCanvasElement | null>(null);
const rulerVRef = ref<HTMLCanvasElement | null>(null);
const canvasContentRef = ref<HTMLElement | null>(null);
const mouseScreenX = ref(0);
const mouseScreenY = ref(0);

const canvasState = computed(() => mapEditorStore.canvasState);

const scaleX = computed(() => {
  const v =
    mapEditorStore.mapData?.mapInfo?.scaleX ??
    mapEditorStore.mapData?.visualLayout?.scaleX;
  return typeof v === "number" ? v : v != null ? parseFloat(String(v)) : null;
});
const scaleY = computed(() => {
  const v =
    mapEditorStore.mapData?.mapInfo?.scaleY ??
    mapEditorStore.mapData?.visualLayout?.scaleY;
  return typeof v === "number" ? v : v != null ? parseFloat(String(v)) : null;
});

const mouseMapX = computed(() => {
  const cs = canvasState.value;
  return cs ? (mouseScreenX.value - cs.offsetX) / cs.scale : 0;
});
const mouseMapY = computed(() => {
  const cs = canvasState.value;
  return cs ? (mouseScreenY.value - cs.offsetY) / cs.scale : 0;
});

function fmtRulerCoord(mapUnits: number, mmPerUnit: number | null): string {
  if (mmPerUnit != null && mmPerUnit > 0) {
    const mm = mapUnits * mmPerUnit;
    return Math.abs(mm) >= 1000
      ? `${(mm / 1000).toFixed(3)} m`
      : `${mm.toFixed(1)} mm`;
  }
  return `${Math.round(mapUnits)}`;
}

const mouseRealXStr = computed(() =>
  fmtRulerCoord(mouseMapX.value, scaleX.value),
);
const mouseRealYStr = computed(() =>
  fmtRulerCoord(mouseMapY.value, scaleY.value),
);

const SCALE_BAR_STEPS_MM = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
];
const SCALE_BAR_STEPS_PX = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

const scaleBarLabel = computed(() => {
  const zoom = canvasState.value?.scale ?? 1;
  const mmPerUnit = scaleX.value;
  if (mmPerUnit != null && mmPerUnit > 0) {
    const rawMm = (100 * mmPerUnit) / zoom;
    const nice = SCALE_BAR_STEPS_MM.reduce((a, b) =>
      Math.abs(b - rawMm) < Math.abs(a - rawMm) ? b : a,
    );
    return nice >= 1000 ? `${nice / 1000} m` : `${nice} mm`;
  }
  const rawPx = 100 / zoom;
  const nice = SCALE_BAR_STEPS_PX.reduce((a, b) =>
    Math.abs(b - rawPx) < Math.abs(a - rawPx) ? b : a,
  );
  return `${nice} px`;
});

function handleMouseMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  mouseScreenX.value = e.clientX - r.left;
  mouseScreenY.value = e.clientY - r.top;
}

const RULER_BG = "#f7f8fa";
const RULER_FG = "#888";
const RULER_BORDER = "#ddd";
const RULER_TICK = "#bbb";

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
  mmPerUnit: number | null,
): boolean {
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  if (!cssW || !cssH) return false;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

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

  const cmPerUnit =
    mmPerUnit != null && mmPerUnit > 0 ? mmPerUnit / 10 : 1;
  const screenToCm = (px: number) => ((px - offset) / scale) * cmPerUnit;
  const cmToScreen = (cm: number) => (cm / cmPerUnit) * scale + offset;

  const cmAtStart = screenToCm(0);
  const cmAtEnd = screenToCm(length);
  const cmMin = Math.min(cmAtStart, cmAtEnd);
  const cmMax = Math.max(cmAtStart, cmAtEnd);

  const step = pickNiceStep(cmMax - cmMin, length);
  if (step <= 0) return true;

  const subDivs = step % 10 < 0.0001 ? 10 : 5;
  const minorStep = step / subDivs;

  ctx.font = `9px Arial, system-ui, sans-serif`;

  const firstMinor = Math.floor(cmMin / minorStep) * minorStep;
  for (
    let cm = firstMinor;
    cm <= cmMax + minorStep * 0.001;
    cm += minorStep
  ) {
    const sp = cmToScreen(cm);
    if (sp < -1 || sp > length + 1) continue;

    const isMajor =
      Math.abs(cm / step - Math.round(cm / step)) < 0.0001;
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
      const rounded = Math.round(cm * 10) / 10;
      const label = Number.isInteger(rounded)
        ? `${Math.round(rounded)}`
        : rounded.toFixed(1);
      ctx.fillStyle = RULER_FG;
      if (isH) {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, sp, 2);
      } else {
        ctx.save();
        ctx.translate(2, sp);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }
  return true;
}

function redrawRulers() {
  const cs = canvasState.value;
  if (!cs) {
    requestAnimationFrame(redrawRulers);
    return;
  }
  const mmX = scaleX.value;
  const mmY = scaleY.value;
  const okH = rulerHRef.value
    ? drawSingleRuler(rulerHRef.value, true, cs.scale, cs.offsetX, mmX)
    : false;
  const okV = rulerVRef.value
    ? drawSingleRuler(rulerVRef.value, false, cs.scale, cs.offsetY, mmY)
    : false;
  if (!okH || !okV) requestAnimationFrame(redrawRulers);
}

watch(
  () => [
    canvasState.value?.scale,
    canvasState.value?.offsetX,
    canvasState.value?.offsetY,
  ],
  redrawRulers,
);

let rulerResizeObs: ResizeObserver | null = null;

onMounted(() => {
  requestAnimationFrame(redrawRulers);
  if (typeof ResizeObserver !== "undefined" && canvasContentRef.value) {
    rulerResizeObs = new ResizeObserver(redrawRulers);
    rulerResizeObs.observe(canvasContentRef.value);
  }
});

onUnmounted(() => {
  rulerResizeObs?.disconnect();
});
</script>

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

  :deep(.map-canvas-container) {
    width: 100%;
    height: 100%;
  }
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
