<template>
  <div class="workbench">
    <div class="rcs-workbench" v-loading="loading">
      <!-- 顶部工厂切换 -->
      <div class="rcs-header">
        <div class="factory-tabs">
          <button
            v-for="factory in factoryList"
            :key="factory.id"
            type="button"
            class="factory-tab"
            :class="{ active: factory.id === selectedFactoryId }"
            @click="selectFactory(factory)"
          >
            {{ factory.name }}
          </button>
        </div>
        <div class="header-actions">
          <el-button
            :type="isEditingOrigin ? 'warning' : 'default'"
            :plain="!isEditingOrigin"
            size="small"
            icon="Aim"
            :disabled="!selectedFactoryId || filteredMaps.length === 0"
            @click="toggleOriginEditing"
          >
            {{ isEditingOrigin ? "退出原点编辑" : "原点编辑" }}
          </el-button>
        </div>
      </div>

      <div class="rcs-stage2">
        <div
          class="stage2-canvas"
          ref="canvasRef"
          @mousedown="startPan"
          @wheel.prevent="handleCanvasWheel"
        >
          <!-- 地图层：随视图平移+缩放，被 canvas overflow:hidden 裁切 -->
          <div class="canvas-map-layer" :style="mapLayerStyle">
            <!-- 预览模式：底图与元素可叠加显示 -->
            <div
              v-if="
                !isEditingOrigin &&
                activeMap?.rasterUrl &&
                layerVisibility.raster
              "
              class="map-layer-image"
            >
              <img
                class="canvas-img"
                :src="activeMap.rasterUrl"
                alt="地图底图"
              />
            </div>

            <MapRenderer
              v-if="
                previewUseRenderer &&
                !isEditingOrigin &&
                activeMap &&
                hasRenderableElements
              "
              class="preview-konva-layer"
              :style="{
                width: `${previewCanvasSize.w}px`,
                height: `${previewCanvasSize.h}px`,
                left: `${-rendererClipCompensation.x}px`,
                top: `${-rendererClipCompensation.y}px`,
              }"
              :points="rendererPointsVisible"
              :paths="rendererPathsVisible"
              :locations="rendererLocationsVisible"
              :width="previewCanvasSize.w"
              :height="previewCanvasSize.h"
              :scale="canvasScale"
              :offset-x="konvaStageOffsetX"
              :offset-y="konvaStageOffsetY"
              :readonly="true"
              :auto-center="false"
            />

            <svg
              v-else-if="!isEditingOrigin && activeMap && hasRenderableElements"
              class="map-layer-svg"
            >
              <g :transform="previewSvgCenterTransform">
                <g
                  v-for="path in pathsForPreviewVisible"
                  :key="'path-' + path.id"
                >
                  <path
                    v-if="path.preview.mode === 'path'"
                    :d="path.preview.d"
                    fill="none"
                    stroke="#409eff"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <polyline
                    v-else-if="path.preview.mode === 'polyline'"
                    :points="path.preview.points"
                    fill="none"
                    stroke="#409eff"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <line
                    v-else-if="path.preview.mode === 'line'"
                    :x1="path.preview.x1"
                    :y1="path.preview.y1"
                    :x2="path.preview.x2"
                    :y2="path.preview.y2"
                    stroke="#409eff"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </g>

                <g
                  v-for="point in pointsForPreviewVisible"
                  :key="'pt-' + point.id"
                >
                  <circle
                    :cx="point.x * SCALE"
                    :cy="point.y * SCALE"
                    :r="point.editorProps?.radius || 8"
                    :fill="point.editorProps?.color || '#409eff'"
                    stroke="#fff"
                    stroke-width="2"
                  />
                  <text
                    v-if="
                      point.editorProps?.labelVisible !== false && point.name
                    "
                    :x="point.x * SCALE"
                    :y="point.y * SCALE - 12"
                    fill="#666"
                    font-size="10"
                    text-anchor="middle"
                  >
                    {{ point.name }}
                  </text>
                </g>

                <g
                  v-for="location in locationsForPreviewVisible"
                  :key="'loc-' + location.id"
                >
                  <rect
                    :x="
                      (location.x - (location.editorProps?.width || 20) / 2) *
                      SCALE
                    "
                    :y="
                      (location.y - (location.editorProps?.height || 20) / 2) *
                      SCALE
                    "
                    :width="(location.editorProps?.width || 20) * SCALE"
                    :height="(location.editorProps?.height || 20) * SCALE"
                    :fill="location.editorProps?.color || '#67c23a'"
                    stroke="#fff"
                    stroke-width="1"
                  />
                </g>
              </g>
            </svg>

            <MapManagementCanvasAxes
              :is-editing-origin="isEditingOrigin"
              :active-map="activeMap"
              :is-map-origin-at-factory="isMapOriginAtFactory"
              :map-origin-layer-style="mapOriginLayerStyle"
              :filtered-maps="filteredMaps"
              :get-map-layer-offset="getMapLayerOffset"
            />
          </div>

          <!-- 拖拽手柄：在地图层外部，使用屏幕坐标定位，避免 CSS transform 影响点击 -->
          <template v-if="isEditingOrigin">
            <div
              v-for="m in filteredMaps"
              :key="'handle-' + m.mapId"
              class="origin-drag-handle"
              :class="{ active: originEditingMapId === String(m.mapId) }"
              :style="getHandleScreenStyle(m)"
              @mousedown.stop.prevent="startDragMapOriginById(m, $event)"
            />
          </template>

          <!-- 空状态提示（在地图层外，不缩放） -->
          <div v-if="!activeMap" class="canvas-empty">
            <div v-if="!selectedFactoryId" class="muted">请选择工厂</div>
            <div v-else-if="filteredMaps.length === 0" class="muted">
              当前工厂暂无地图，请先新建地图
            </div>
            <div v-else class="muted">请选择左侧一张地图</div>
          </div>
          <div class="canvas-footer">
            <template v-if="isEditingOrigin">
              <span class="muted" style="color: #e6a23c">拓扑原点编辑模式</span>
              <span class="footer-sep">·</span>
              <span class="muted">共 {{ filteredMaps.length }} 张地图</span>
            </template>
            <template v-else>
              <span class="muted">预览模式</span>
              <span class="footer-sep">，</span>
              <span class="muted">地图ID：</span>
              <span class="mono">{{ activeMap?.mapId || "-" }}</span>
            </template>
            <span class="footer-sep">·</span>
            <span class="zoom-indicator" @click="resetView">
              {{ Math.round(canvasScale * 100) }}%
            </span>
          </div>

          <div class="canvas-floating-controls" v-if="!isEditingOrigin">
            <div class="floating-slot">
              <el-popover placement="left" trigger="click" :width="200">
                <template #reference>
                  <el-button
                    class="floating-btn floating-btn--layer"
                    :class="{ 'is-active': !layerAllVisible }"
                    size="small"
                  >
                    <img
                      class="floating-layer-icon"
                      :src="layerIconUrl"
                      alt=""
                    />
                  </el-button>
                </template>
                <ul class="layer-visibility-menu" @click.stop>
                  <li
                    v-for="item in layerMenuItems"
                    :key="item.key"
                    class="layer-visibility-menu__item"
                    :class="{ 'is-off': !layerVisibility[item.key] }"
                    @click="toggleLayerKey(item.key)"
                  >
                    <el-icon class="layer-visibility-menu__icon">
                      <View v-if="layerVisibility[item.key]" />
                      <Hide v-else />
                    </el-icon>
                    <span class="layer-visibility-menu__text">{{
                      item.label
                    }}</span>
                  </li>
                </ul>
              </el-popover>
            </div>
            <div class="floating-slot">
              <el-button
                class="floating-btn mono-btn"
                size="small"
                @click="resetView"
              >
                1:1
              </el-button>
            </div>
          </div>

          <div class="stage2-actions" v-if="!isEditingOrigin">
            <el-button
              type="primary"
              icon="Plus"
              :disabled="!selectedFactoryId"
              @click="handleAdd"
            >
              新建地图
            </el-button>
            <el-button
              type="primary"
              plain
              icon="EditPen"
              :disabled="!activeMap"
              @click="activeMap && handleEdit(activeMap)"
            >
              地图编辑
            </el-button>
          </div>

          <!-- 原点编辑模式：右上角显示选中地图的坐标编辑面板 -->
          <div
            v-if="isEditingOrigin && originEditingMapId"
            class="origin-edit-panel"
          >
            <div class="origin-edit-title">
              {{ originEditingMapName }} 原点坐标 (mm)
            </div>
            <div class="origin-edit-row">
              <label>X</label>
              <el-input-number
                v-model="editOriginX"
                size="small"
                :step="100"
                :precision="0"
                controls-position="right"
                @change="onOriginInputChange"
              />
            </div>
            <div class="origin-edit-row">
              <label>Y</label>
              <el-input-number
                v-model="editOriginY"
                size="small"
                :step="100"
                :precision="0"
                controls-position="right"
                @change="onOriginInputChange"
              />
            </div>
            <div class="origin-edit-hint">
              拖拽画布中该地图的橙色圆圈可移动原点
            </div>
            <div class="origin-edit-actions">
              <el-button
                type="primary"
                size="small"
                :loading="originSaving"
                @click="saveAllOrigins"
                >全部保存</el-button
              >
            </div>
          </div>
        </div>

        <div class="stage2-left">
          <div class="stage2-left-inner">
            <div v-if="selectedFactoryId" class="scene-list">
              <button
                v-for="m in filteredMaps"
                :key="m.id"
                type="button"
                class="scene-item"
                :class="{
                  active: isEditingOrigin
                    ? originEditingMapId === String(m.mapId)
                    : String(m.mapId) === selectedMapId,
                }"
                @click="
                  isEditingOrigin
                    ? selectOriginMap(String(m.mapId))
                    : selectMap(m)
                "
                @dblclick="!isEditingOrigin && handleEdit(m)"
              >
                <span class="scene-icon" />
                <span class="scene-name">{{ m.name }}</span>
              </button>

              <button
                v-if="!isEditingOrigin"
                type="button"
                class="scene-item add"
                :disabled="!selectedFactoryId"
                @click="handleAdd"
              >
                <span class="scene-plus" />
                <span class="scene-name">添加地图</span>
              </button>
            </div>

            <div v-else class="left-empty">
              <span class="muted">请先选择工厂</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑地图（P0：沿用现有弹窗能力） -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="700px"
      append-to-body
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="地图ID" prop="mapId">
          <el-input
            v-model="form.mapId"
            placeholder="请输入地图ID，如：map_001"
          />
        </el-form-item>
        <el-form-item label="地图名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入地图名称，如：一楼车间"
          />
        </el-form-item>
        <el-form-item label="所属楼层" prop="floorNumber">
          <el-input-number
            v-model="form.floorNumber"
            :placeholder="'-1表示地下楼层，0表示1楼'"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="车辆类型" prop="vehicleTypeId">
          <el-select
            v-model="form.vehicleTypeId"
            placeholder="请选择车辆类型"
            style="width: 100%"
          >
            <el-option
              v-for="type in amrTypeList"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="地图原点坐标">
          <div class="map-position-inputs">
            <div class="position-item">
              <span class="label">X坐标(mm)</span>
              <el-input-number
                v-model="form.originX"
                :step="100"
                :precision="0"
                controls-position="right"
                style="width: 120px"
              />
            </div>
            <div class="position-item">
              <span class="label">Y坐标(mm)</span>
              <el-input-number
                v-model="form.originY"
                :step="100"
                :precision="0"
                controls-position="right"
                style="width: 120px"
              />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="地图旋转角度">
          <div class="map-position-inputs">
            <div class="position-item">
              <span class="label">旋转角度(°)</span>
              <el-input-number
                v-model="form.rotation"
                :step="1"
                :min="-180"
                :max="180"
                controls-position="right"
                style="width: 120px"
              />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button
            type="primary"
            :loading="dialog.loading"
            @click="submitForm"
            >确 定</el-button
          >
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  listMapsByFactory,
  addNavigationMap,
  updateNavigationMap,
  delNavigationMap,
} from "@/api/opentcs/factory/map";
import type {
  NavigationMapVO,
  NavigationMapForm,
  NavigationMapQuery,
} from "@/api/opentcs/factory/map/types";
import { listFactoryModel } from "@/api/opentcs/factory/model";
import type { FactoryModelVO } from "@/api/opentcs/factory/model/types";
import { listType } from "@/api/opentcs/vehicle/type";
import type { TypeVO } from "@/api/opentcs/vehicle/type/types";
import { loadMapEditorData } from "@/api/opentcs/map";
import type { MapEditorResponse } from "@/api/opentcs/map/types";
import MapRenderer from "@/components/map/MapRenderer.vue";
import MapManagementCanvasAxes from "@/components/map/MapManagementCanvasAxes.vue";
import type { MapLayerVisibility } from "@/types/mapEditor";
import { defaultMapLayerVisibility } from "@/types/mapEditor";
import layerIconUrl from "@/assets/icons/svg/图层.svg?url";
import { getDefaultPointRadiusForType } from "@/utils/mapEditor/mapVisualTokens";
import {
  clearPointVisualMetaCache,
  updateConnectedPointIds,
} from "@/utils/mapEditor/pointStyle";
import { useMapEditorTabsStore } from "@/store/modules/mapEditorTabs";
import { useAppStore } from "@/store/modules/app";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance } from "element-plus";
import { View, Hide } from "@element-plus/icons-vue";
import { watch, onBeforeUnmount } from "vue";

const router = useRouter();
const mapEditorTabsStore = useMapEditorTabsStore();
const appStore = useAppStore();

const loading = ref(true);
const mapList = ref<NavigationMapVO[]>([]);
const factoryList = ref<FactoryModelVO[]>([]);
const amrTypeList = ref<TypeVO[]>([]);

// 地图元素数据
const mapElements = ref<{
  points: any[];
  paths: any[];
  locations: any[];
}>({ points: [], paths: [], locations: [] });
const layerVisibility = reactive<MapLayerVisibility>(
  defaultMapLayerVisibility(),
);
const layerMenuItems: { key: keyof MapLayerVisibility; label: string }[] = [
  { key: "station", label: "站点显隐" },
  { key: "path", label: "路径显隐" },
  { key: "pathDirection", label: "方向显隐" },
  { key: "raster", label: "底图显隐" },
];
function toggleLayerKey(key: keyof MapLayerVisibility) {
  layerVisibility[key] = !layerVisibility[key];
}
const layerAllVisible = computed(() =>
  (Object.keys(layerVisibility) as (keyof MapLayerVisibility)[]).every(
    (k) => layerVisibility[k],
  ),
);
const elementsLoading = ref(false);

// 画布缩放比例（1px = 1mm）
// 将 mm 坐标直接映射到屏幕像素：1mm -> 1px
const SCALE = 1;

/**
 * 与 mapEditor loadMap 一致：从 AjaxResult 中取出真正的地图负载。
 * 若仅当 code===SUCCESS 才用 data，而后端返回其它成功码时，会误用外层 { code, data } 导致 points 永远为空。
 */
function unwrapAjaxMapPayload(raw: unknown): Record<string, any> {
  const r = raw as Record<string, any>;
  if (!r || typeof r !== "object") return {};
  const inner = r.data as Record<string, any> | undefined;
  if (
    inner != null &&
    typeof inner === "object" &&
    !Array.isArray(inner) &&
    (inner.mapId !== undefined ||
      inner.mapInfo?.mapId !== undefined ||
      inner.name !== undefined ||
      Array.isArray(inner.points) ||
      (inner.elements &&
        typeof inner.elements === "object" &&
        !Array.isArray(inner.elements)) ||
      inner.mapInfo !== undefined)
  ) {
    return inner;
  }
  return r;
}

function pickElementsArray<T>(
  a: T[] | undefined | null,
  b: T[] | undefined | null,
): T[] {
  if (Array.isArray(a) && a.length > 0) return a;
  if (Array.isArray(b) && b.length > 0) return b;
  if (Array.isArray(a)) return a;
  if (Array.isArray(b)) return b;
  return [];
}

function parsePropertiesPayload(raw: any): Record<string, any> {
  if (!raw) return {};
  const normalizeNameValueArray = (arr: any[]): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const key = item.name ?? item.key;
      if (!key) continue;
      out[String(key)] = item.value;
    }
    return out;
  };
  if (typeof raw === "object") {
    if (Array.isArray(raw)) return normalizeNameValueArray(raw);
    return raw;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      if (Array.isArray(parsed)) return normalizeNameValueArray(parsed);
      return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

/** 与 mapEditor 一致：解析 layout 字符串，供坐标与 editorProps 兜底 */
function parseLayoutJson(value: unknown): Record<string, any> {
  if (value == null || value === "") return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function toFiniteNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  const normalized = String(raw).trim().replace(",", ".");
  if (normalized.length === 0) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function pickCoordinate(target: any, axis: "x" | "y"): number | undefined {
  const upper = axis.toUpperCase();
  const candidates = [
    target?.[axis],
    target?.[`${axis}Position`],
    target?.[`${axis}position`],
    target?.[`${upper}Position`],
    target?.[`${upper}position`],
    target?.[`position${upper}`],
    target?.position?.[axis],
    target?.pose?.[axis],
    target?.coordinate?.[axis],
    target?.coords?.[axis],
  ];
  for (const c of candidates) {
    const n = toFiniteNumber(c);
    if (n !== undefined) return n;
  }
  return undefined;
}

const selectedFactoryId = ref<number | undefined>(undefined);
const selectedMapId = ref<string>("");

// ═══════ 画布视图状态（像素坐标系，参照 Konva 编辑器） ════════════════════════
// viewOffset: 工厂原点 O(0,0) 在画布内容区的屏幕像素位置（左下角参考系）
const canvasRef = ref<HTMLElement | null>(null);
const viewOffset = reactive({ x: 150, y: 150 });
const canvasScale = ref(1);
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const viewStart = reactive({ x: 0, y: 0 });

function getCanvasRect() {
  const el = canvasRef.value;
  if (!el) return { w: 800, h: 600 };
  const rect = el.getBoundingClientRect();
  return { w: rect.width - 170, h: rect.height };
}

/**
 * 地图层 CSS transform（与地图编辑器 Konva Stage 一致）：
 * - 以画布内容区左下角为参考，translate 将工厂原点 O(0,0) 置于视口
 * - 统一正缩放，不在此层做 Y 轴翻转；模型坐标 = Konva（y 向下），与 useCanvasAxis / MapRenderer 单一约定
 */
const mapLayerStyle = computed(() => {
  const { h } = getCanvasRect();
  return {
    transform: `translate(${viewOffset.x}px, ${h - viewOffset.y}px) scale(${canvasScale.value})`,
  };
});

/**
 * 地图/导航原点在层内的偏移（mm≈px，SCALE=1）。
 * 与 useCanvasAxis.mapOriginCoord 一致：Konva y 向下，后端 originY 向上为正 → 模型 y = -originY
 */
function mapOriginOffset(ox: number, oy: number) {
  return {
    left: ox * SCALE + "px",
    top: -oy * SCALE + "px",
  };
}

const mapOriginLayerStyle = computed(() => {
  if (!activeMap.value) return {};
  return mapOriginOffset(
    activeMap.value.originX ?? 0,
    activeMap.value.originY ?? 0,
  );
});

// 滚轮缩放（指针锚点）
function handleCanvasWheel(e: WheelEvent) {
  const { w, h } = getCanvasRect();
  const el = canvasRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pointerX = e.clientX - rect.left - 170;
  const pointerY = rect.bottom - e.clientY;

  const oldScale = canvasScale.value;
  const scaleBy = 1.1;
  const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
  canvasScale.value = Math.max(0.1, Math.min(20, newScale));

  const ratio = canvasScale.value / oldScale;
  viewOffset.x = pointerX - (pointerX - viewOffset.x) * ratio;
  viewOffset.y = pointerY - (pointerY - viewOffset.y) * ratio;
}

function resetView() {
  canvasScale.value = 1;
  viewOffset.x = 150;
  viewOffset.y = 150;
}

// 画布拖拽平移（document 级别监听，避免与手柄拖拽冲突）
function startPan(e: MouseEvent) {
  if (isDraggingMapOrigin.value) return;
  if ((e.target as HTMLElement).closest(".origin-drag-handle")) return;
  isDragging.value = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  viewStart.x = viewOffset.x;
  viewStart.y = viewOffset.y;
  document.body.style.cursor = "grabbing";
  document.addEventListener("mousemove", onPan);
  document.addEventListener("mouseup", endPan);
}

function onPan(e: MouseEvent) {
  if (!isDragging.value) return;
  viewOffset.x = viewStart.x + (e.clientX - dragStart.x);
  viewOffset.y = viewStart.y - (e.clientY - dragStart.y);
}

function endPan() {
  if (isDragging.value) {
    isDragging.value = false;
    document.body.style.cursor = "";
  }
  document.removeEventListener("mousemove", onPan);
  document.removeEventListener("mouseup", endPan);
}

// ═══════ 地图原点编辑（工厂级拓扑视图） ══════════════════════════════════════
const isEditingOrigin = ref(false);
const originSaving = ref(false);
/** 当前选中编辑的地图 mapId */
const originEditingMapId = ref<string>("");
const editOriginX = ref(0);
const editOriginY = ref(0);

/** 编辑模式下每张地图的临时原点数据 */
const originDrafts = ref<Map<string, { originX: number; originY: number }>>(
  new Map(),
);

const originEditingMapName = computed(() => {
  const m = filteredMaps.value.find(
    (m) => String(m.mapId) === originEditingMapId.value,
  );
  return m?.name ?? "";
});

/** 普通模式：当前选中地图的原点是否与工厂原点重合 */
const isMapOriginAtFactory = computed(() => {
  if (!activeMap.value) return true;
  return (
    Number(activeMap.value.originX || 0) === 0 &&
    Number(activeMap.value.originY || 0) === 0
  );
});

function getMapLayerOffset(m: NavigationMapVO) {
  const draft = originDrafts.value.get(String(m.mapId));
  const ox = draft?.originX ?? m.originX ?? 0;
  const oy = draft?.originY ?? m.originY ?? 0;
  return mapOriginOffset(ox, oy);
}

/**
 * 拖拽手柄的屏幕坐标（使用 left + bottom 定位，与世界坐标 Y-up 自然对齐）。
 * 使用 bottom 避免依赖画布高度（getCanvasRect），位置与 mapLayerStyle 精确同步。
 */
function getHandleScreenStyle(m: NavigationMapVO) {
  const draft = originDrafts.value.get(String(m.mapId));
  const ox = draft?.originX ?? m.originX ?? 0;
  const oy = draft?.originY ?? m.originY ?? 0;
  return {
    left: 170 + viewOffset.x + ox * SCALE * canvasScale.value + "px",
    bottom: viewOffset.y + oy * SCALE * canvasScale.value + "px",
  };
}

function toggleOriginEditing() {
  if (isEditingOrigin.value) {
    isEditingOrigin.value = false;
    originEditingMapId.value = "";
    originDrafts.value.clear();
    return;
  }
  if (!selectedFactoryId.value || filteredMaps.value.length === 0) return;
  // 初始化每张地图的草稿
  const drafts = new Map<string, { originX: number; originY: number }>();
  filteredMaps.value.forEach((m) => {
    drafts.set(String(m.mapId), {
      originX: m.originX ?? 0,
      originY: m.originY ?? 0,
    });
  });
  originDrafts.value = drafts;
  // 默认选中第一张
  originEditingMapId.value = String(filteredMaps.value[0].mapId);
  selectOriginMap(originEditingMapId.value);
  isEditingOrigin.value = true;
}

function selectOriginMap(mapId: string) {
  originEditingMapId.value = mapId;
  const draft = originDrafts.value.get(mapId);
  editOriginX.value = draft?.originX ?? 0;
  editOriginY.value = draft?.originY ?? 0;
}

function onOriginInputChange() {
  if (!originEditingMapId.value) return;
  originDrafts.value.set(originEditingMapId.value, {
    originX: editOriginX.value,
    originY: editOriginY.value,
  });
}

function getMapDraftOrigin(m: NavigationMapVO) {
  const draft = originDrafts.value.get(String(m.mapId));
  return draft ?? { originX: m.originX ?? 0, originY: m.originY ?? 0 };
}

async function saveAllOrigins() {
  originSaving.value = true;
  try {
    const promises: Promise<any>[] = [];
    originDrafts.value.forEach((draft, mapId) => {
      const m = filteredMaps.value.find((m) => String(m.mapId) === mapId);
      if (!m) return;
      if (
        draft.originX === (m.originX ?? 0) &&
        draft.originY === (m.originY ?? 0)
      )
        return;
      promises.push(
        updateNavigationMap({
          id: m.id,
          factoryModelId: m.factoryModelId,
          mapId: m.mapId,
          name: m.name,
          originX: draft.originX,
          originY: draft.originY,
        }),
      );
      // 同步本地数据
      const idx = mapList.value.findIndex((ml) => ml.id === m.id);
      if (idx >= 0) {
        mapList.value[idx].originX = draft.originX;
        mapList.value[idx].originY = draft.originY;
      }
    });
    if (promises.length > 0) {
      await Promise.all(promises);
      ElMessage.success(`已保存 ${promises.length} 张地图原点`);
    } else {
      ElMessage.info("无修改需要保存");
    }
  } catch (e) {
    ElMessage.error("保存失败");
  } finally {
    originSaving.value = false;
  }
}

// ═══════ 画布拖拽：场景原点 + 地图原点 ══════════════════════════════════════
const isDraggingMapOrigin = ref(false);
const draggingMapId = ref("");
const mapOriginDragStart = reactive({ x: 0, y: 0 });
const mapOriginEditStart = reactive({ x: 0, y: 0 });

function startDragMapOriginById(m: NavigationMapVO, e: MouseEvent) {
  const mapId = String(m.mapId);
  selectOriginMap(mapId);
  draggingMapId.value = mapId;
  isDraggingMapOrigin.value = true;
  mapOriginDragStart.x = e.clientX;
  mapOriginDragStart.y = e.clientY;
  mapOriginEditStart.x = editOriginX.value;
  mapOriginEditStart.y = editOriginY.value;
  document.body.style.cursor = "move";
  document.addEventListener("mousemove", onDragMapOrigin);
  document.addEventListener("mouseup", endDragMapOrigin);
  e.preventDefault();
  e.stopPropagation();
}

function onDragMapOrigin(e: MouseEvent) {
  if (!isDraggingMapOrigin.value || !draggingMapId.value) return;
  const pxPerMm = SCALE * canvasScale.value;
  const deltaXPx = e.clientX - mapOriginDragStart.x;
  const deltaYPx = e.clientY - mapOriginDragStart.y;
  editOriginX.value = Math.round(mapOriginEditStart.x + deltaXPx / pxPerMm);
  // 控制台的拖拽手柄使用 screen Y 向下为正方向；
  // 为保证手柄拖拽与世界坐标变化方向一致，这里取反处理（与原点对齐逻辑一致）
  editOriginY.value = Math.round(mapOriginEditStart.y - deltaYPx / pxPerMm);
  originDrafts.value.set(draggingMapId.value, {
    originX: editOriginX.value,
    originY: editOriginY.value,
  });
}

function endDragMapOrigin() {
  if (isDraggingMapOrigin.value) {
    isDraggingMapOrigin.value = false;
    draggingMapId.value = "";
    document.body.style.cursor = "";
  }
  document.removeEventListener("mousemove", onDragMapOrigin);
  document.removeEventListener("mouseup", endDragMapOrigin);
}

// 保留 query 类型，便于后续扩展筛选/分页（P0 暂不使用）
const _queryParams = reactive<NavigationMapQuery>({});

const dialog = reactive({
  visible: false,
  title: "",
  loading: false,
});

const form = reactive<NavigationMapForm>({
  id: undefined,
  factoryModelId: undefined as number | undefined,
  mapId: "",
  name: "",
  floorNumber: 0,
  vehicleTypeId: undefined,
  originX: 0,
  originY: 0,
  rotation: 0,
  description: "",
  status: "0",
});

const rules = {
  mapId: [{ required: true, message: "地图ID不能为空", trigger: "blur" }],
  name: [{ required: true, message: "地图名称不能为空", trigger: "blur" }],
  vehicleTypeId: [
    { required: true, message: "请选择车辆类型", trigger: "change" },
  ],
};

const formRef = ref<FormInstance>();

const activeMap = computed(() =>
  mapList.value.find((m) => String(m.mapId) === selectedMapId.value),
);

// 处理路径数据，添加端点坐标
const processedPaths = computed(() => {
  const pointsMap = new Map();
  mapElements.value.points?.forEach((p) => {
    if (p?.id !== undefined && p?.id !== null) {
      pointsMap.set(String(p.id), p);
    }
    if (p?.pointId !== undefined && p?.pointId !== null) {
      pointsMap.set(String(p.pointId), p);
    }
  });

  return (mapElements.value.paths || []).map((path) => {
    let startPoint = path.startPoint;
    let endPoint = path.endPoint;

    // 如果没有 startPoint/endPoint，尝试从 points 中查找
    if (!startPoint && path.startPointId) {
      startPoint = pointsMap.get(String(path.startPointId));
    }
    if (!endPoint && path.endPointId) {
      endPoint = pointsMap.get(String(path.endPointId));
    }

    return { ...path, startPoint, endPoint };
  });
});

/** 与 MapCanvas 一致：优先 geometry.controlPoints，否则 layoutControlPoints */
function extractPathControlPoints(path: any): any[] | null {
  const g = path.geometry?.controlPoints;
  if (Array.isArray(g) && g.length >= 2) return g;
  const l = path.layoutControlPoints;
  if (Array.isArray(l) && l.length >= 2) return l;
  return null;
}

/** 与 getPathConfig 中 path.type / geometry.pathType 判定一致 */
function pathConnectionKind(path: any): "curve" | "orthogonal" | "direct" {
  const geoPt = (path.geometry?.pathType || "").toString().toLowerCase();
  if (geoPt === "curve") return "curve";
  const t = (path.type || path.connectionType || path.pathType || "")
    .toString()
    .toLowerCase();
  if (t === "curve" || t === "bezier" || t === "spline") return "curve";
  if (t === "orthogonal" || t === "right_angle" || t === "rightangle")
    return "orthogonal";
  return "direct";
}

type PathPreviewSpec =
  | { mode: "path"; d: string }
  | { mode: "polyline"; points: string }
  | { mode: "line"; x1: number; y1: number; x2: number; y2: number }
  | { mode: "none" };

/** 中间控制点到弦线的距离平方（mm²），用于无 pathType 时识别“弓高”曲线控制点 */
function pointToSegmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-12) return apx * apx + apy * apy;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
}

const previewUseRenderer = true;

/** 地图管理预览：Konva Stage 若仅用视口宽高，场景坐标大于视口的点/线会被画布裁掉；平移后仍看不到下方内容。 */
const PREVIEW_SCENE_PADDING = 96;
const PREVIEW_CANVAS_MAX_DIM = 16384;

const rendererClipCompensation = computed(() => {
  let minX = 0;
  let minY = 0;
  const push = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  };

  for (const p of mapElements.value.points || []) {
    push(Number(p.x ?? p.xPosition ?? 0), Number(p.y ?? p.yPosition ?? 0));
  }
  for (const l of mapElements.value.locations || []) {
    const lx = Number(l.x ?? l.xPosition ?? 0);
    const ly = Number(l.y ?? l.yPosition ?? 0);
    push(lx, ly);
    if (Array.isArray(l.geometry?.vertices)) {
      for (const v of l.geometry.vertices) {
        push(Number(v.x ?? v.xPosition ?? 0), Number(v.y ?? v.yPosition ?? 0));
      }
    }
  }
  for (const path of processedPaths.value) {
    const cps = extractPathControlPoints(path);
    if (Array.isArray(cps)) {
      for (const cp of cps) {
        push(Number(cp.x ?? cp.xPosition ?? 0), Number(cp.y ?? cp.yPosition ?? 0));
      }
    }
  }

  return {
    x: minX < 0 ? Math.ceil(-minX) + 8 : 0,
    y: minY < 0 ? Math.ceil(-minY) + 8 : 0,
  };
});

/** 与 rendererPoints 同坐标系：负坐标补偿后的场景最大范围，用于撑大 Konva 画布避免裁切 */
const rendererSceneExtentMax = computed(() => {
  const { x: sx, y: sy } = rendererClipCompensation.value;
  let maxX = 0;
  let maxY = 0;
  const push = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const p of mapElements.value.points || []) {
    push(
      Number(p.x ?? p.xPosition ?? 0) + sx,
      Number(p.y ?? p.yPosition ?? 0) + sy,
    );
  }
  for (const l of mapElements.value.locations || []) {
    push(
      Number(l.x ?? l.xPosition ?? 0) + sx,
      Number(l.y ?? l.yPosition ?? 0) + sy,
    );
    if (Array.isArray(l.geometry?.vertices)) {
      for (const v of l.geometry.vertices) {
        push(
          Number(v.x ?? v.xPosition ?? 0) + sx,
          Number(v.y ?? v.yPosition ?? 0) + sy,
        );
      }
    }
  }
  for (const path of processedPaths.value) {
    const cps = extractPathControlPoints(path);
    if (Array.isArray(cps)) {
      for (const cp of cps) {
        push(
          Number(cp.x ?? cp.xPosition ?? 0) + sx,
          Number(cp.y ?? cp.yPosition ?? 0) + sy,
        );
      }
    }
  }
  return { maxX, maxY };
});

const previewCanvasSize = computed(() => {
  const { w, h } = getCanvasRect();
  const pad = PREVIEW_SCENE_PADDING;
  const { maxX, maxY } = rendererSceneExtentMax.value;
  const needW = Math.max(w, Math.ceil(maxX + pad));
  const needH = Math.max(h, Math.ceil(maxY + pad));
  return {
    w: Math.max(
      1,
      Math.min(PREVIEW_CANVAS_MAX_DIM, Math.round(needW)),
    ),
    h: Math.max(
      1,
      Math.min(PREVIEW_CANVAS_MAX_DIM, Math.round(needH)),
    ),
  };
});

/**
 * Konva Stage 偏移：仅对齐「负坐标裁切」与 Stage 缩放，使场景 (0,0) 落在地图层本地 (0,0)，
 * 与 .layer-axis 工厂原点重合。平移视口只由外层 mapLayerStyle 的 translate(viewOffset) 负责，
 * 不可再叠加 viewOffset 到 Stage（否则会与坐标轴错位，量距原点不准）。
 */
const konvaStageOffsetX = computed(() => {
  const s = canvasScale.value;
  const sx = rendererClipCompensation.value.x;
  return sx * (1 - s);
});
const konvaStageOffsetY = computed(() => {
  const s = canvasScale.value;
  const sy = rendererClipCompensation.value.y;
  return sy * (1 - s);
});

const rendererPoints = computed(() => {
  const { x: sx, y: sy } = rendererClipCompensation.value;
  return (mapElements.value.points || []).map((p: any) => ({
    ...p,
    x: Number(p.x ?? p.xPosition ?? 0) + sx,
    y: Number(p.y ?? p.yPosition ?? 0) + sy,
    editorProps: {
      ...p.editorProps,
      radius: p.editorProps?.radius ?? getDefaultPointRadiusForType(p.type),
      color: p.editorProps?.color,
      labelVisible: p.editorProps?.labelVisible ?? true,
    },
  }));
});

const rendererPointsVisible = computed(() =>
  layerVisibility.station ? rendererPoints.value : [],
);

const rendererPaths = computed(() => {
  const { x: sx, y: sy } = rendererClipCompensation.value;
  return processedPaths.value.map((path: any) => {
    const cps = extractPathControlPoints(path);
    let controlPoints = Array.isArray(cps)
      ? cps.map((cp: any) => ({
          ...cp,
          x: Number(cp.x ?? cp.xPosition ?? 0) + sx,
          y: Number(cp.y ?? cp.yPosition ?? 0) + sy,
        }))
      : [];
    if (controlPoints.length < 2 && path.startPoint && path.endPoint) {
      controlPoints = [
        {
          id: `cp_${path.id}_0`,
          x:
            Number(path.startPoint.x ?? path.startPoint.xPosition ?? 0) + sx,
          y:
            Number(path.startPoint.y ?? path.startPoint.yPosition ?? 0) + sy,
        },
        {
          id: `cp_${path.id}_1`,
          x: Number(path.endPoint.x ?? path.endPoint.xPosition ?? 0) + sx,
          y:
            Number(path.endPoint.y ?? path.endPoint.yPosition ?? 0) + sy,
        },
      ];
    }
    return {
      ...path,
      geometry: {
        ...(path.geometry || {}),
        controlPoints,
        pathType: path.geometry?.pathType || pathConnectionKind(path),
      },
      editorProps: {
        ...path.editorProps,
        strokeColor:
          path.editorProps?.strokeColor ?? "rgba(186, 206, 245, 0.95)",
        strokeWidth:
          path.editorProps?.strokeWidth ??
          (path.editorProps?.lineStyle === "dashed" ? 4 : 18),
        lineStyle: path.editorProps?.lineStyle ?? "solid",
        arrowVisible: path.editorProps?.arrowVisible ?? true,
      },
    };
  });
});

const rendererPathsVisible = computed(() =>
  layerVisibility.path
    ? rendererPaths.value.map((p: any) => ({
        ...p,
        editorProps: {
          ...(p.editorProps ?? {}),
          arrowVisible: layerVisibility.pathDirection,
        },
      }))
    : [],
);

const rendererLocations = computed(() => {
  const { x: sx, y: sy } = rendererClipCompensation.value;
  return (mapElements.value.locations || []).map((l: any) => ({
    ...l,
    x: Number(l.x ?? l.xPosition ?? 0) + sx,
    y: Number(l.y ?? l.yPosition ?? 0) + sy,
    geometry:
      l.geometry && Array.isArray(l.geometry.vertices)
        ? {
            ...l.geometry,
            vertices: l.geometry.vertices.map((v: any) => ({
              ...v,
              x: Number(v.x ?? v.xPosition ?? 0) + sx,
              y: Number(v.y ?? v.yPosition ?? 0) + sy,
            })),
          }
        : l.geometry,
    editorProps: {
      ...l.editorProps,
      width: l.editorProps?.width ?? 24,
      height: l.editorProps?.height ?? 24,
      color: l.editorProps?.color ?? "#67c23a",
      labelVisible: l.editorProps?.labelVisible ?? true,
    },
  }));
});

const rendererLocationsVisible = computed(() =>
  layerVisibility.station ? rendererLocations.value : [],
);

const pointsForPreviewVisible = computed(() =>
  layerVisibility.station ? mapElements.value.points : [],
);
const pathsForPreviewVisible = computed(() => pathsForPreview.value);
const locationsForPreviewVisible = computed(() =>
  layerVisibility.station ? mapElements.value.locations : [],
);
const hasRenderableElements = computed(
  () =>
    pointsForPreviewVisible.value.length > 0 ||
    pathsForPreviewVisible.value.length > 0 ||
    locationsForPreviewVisible.value.length > 0,
);

/**
 * 预览路径：直线用 line；正交/多段用 polyline；
 * 曲线（Konva tension）不能用折线连控制点，三点时用 SVG 二次贝塞尔 Q 近似。
 */
function buildPathPreviewSpec(path: any): PathPreviewSpec {
  const cps = extractPathControlPoints(path);
  const kind = pathConnectionKind(path);

  const fp = (cp: any) => ({
    fx: Number(cp?.x ?? cp?.xPosition ?? 0),
    fy: Number(cp?.y ?? cp?.yPosition ?? 0),
  });
  /** SVG 与 Konva 一致：y 轴向下，模型 mm（SCALE=1 时 1mm=1px） */
  const sv = (fx: number, fy: number) => {
    if (!Number.isFinite(fx) || !Number.isFinite(fy)) return null;
    return { x: fx * SCALE, y: fy * SCALE };
  };

  const lineFromCp = (a: any, b: any): PathPreviewSpec => {
    const pa = sv(fp(a).fx, fp(a).fy);
    const pb = sv(fp(b).fx, fp(b).fy);
    if (!pa || !pb) return { mode: "none" };
    return { mode: "line", x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y };
  };

  if (!cps || cps.length < 2) {
    if (path.startPoint && path.endPoint) {
      const pa = sv(Number(path.startPoint.x), Number(path.startPoint.y));
      const pb = sv(Number(path.endPoint.x), Number(path.endPoint.y));
      if (pa && pb)
        return { mode: "line", x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y };
    }
    return { mode: "none" };
  }

  if (cps.length === 2) {
    return lineFromCp(cps[0], cps[1]);
  }

  if (cps.length === 3) {
    const f0 = fp(cps[0]);
    const f1 = fp(cps[1]);
    const f2 = fp(cps[2]);
    const midOffSq = pointToSegmentDistSq(
      f1.fx,
      f1.fy,
      f0.fx,
      f0.fy,
      f2.fx,
      f2.fy,
    );
    // 弓高约 >3mm：按曲线画 Q；与编辑器「三点 + 中间为法向偏移」一致，避免折线穿过端点
    const useQuad = kind === "curve" || midOffSq > 9;
    if (useQuad) {
      const p0 = sv(f0.fx, f0.fy);
      const p1 = sv(f1.fx, f1.fy);
      const p2 = sv(f2.fx, f2.fy);
      if (p0 && p1 && p2) {
        return {
          mode: "path",
          d: `M ${p0.x},${p0.y} Q ${p1.x},${p1.y} ${p2.x},${p2.y}`,
        };
      }
      return { mode: "none" };
    }
  }

  const parts: string[] = [];
  for (const cp of cps) {
    const p = sv(fp(cp).fx, fp(cp).fy);
    if (p) parts.push(`${p.x},${p.y}`);
  }
  if (parts.length < 2) return { mode: "none" };
  return { mode: "polyline", points: parts.join(" ") };
}

const pathsForPreview = computed(() =>
  processedPaths.value.map((p) => ({
    ...p,
    preview: buildPathPreviewSpec(p),
  })),
);

/** 根据全部元素计算工厂坐标系包围盒，用于把拓扑平移到视口附近 */
const previewContentBounds = computed(() => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const expand = (fx: number, fy: number) => {
    if (!Number.isFinite(fx) || !Number.isFinite(fy)) return;
    minX = Math.min(minX, fx);
    maxX = Math.max(maxX, fx);
    minY = Math.min(minY, fy);
    maxY = Math.max(maxY, fy);
  };

  for (const p of mapElements.value.points || []) {
    expand(Number(p.x ?? p.xPosition ?? 0), Number(p.y ?? p.yPosition ?? 0));
  }

  for (const l of mapElements.value.locations || []) {
    const x = Number(l.x ?? l.xPosition ?? 0);
    const y = Number(l.y ?? l.yPosition ?? 0);
    const hw = Number(l.editorProps?.width ?? 20) / 2;
    const hh = Number(l.editorProps?.height ?? 20) / 2;
    expand(x - hw, y - hh);
    expand(x + hw, y + hh);
  }

  for (const path of processedPaths.value) {
    const cps = extractPathControlPoints(path);
    if (cps) {
      for (const cp of cps) {
        expand(Number(cp.x ?? cp.xPosition ?? 0), Number(cp.y ?? cp.yPosition ?? 0));
      }
    } else if (path.startPoint && path.endPoint) {
      expand(Number(path.startPoint.x), Number(path.startPoint.y));
      expand(Number(path.endPoint.x), Number(path.endPoint.y));
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

const previewSvgCenterTransform = computed(() => {
  const b = previewContentBounds.value;
  if (!b) return "translate(0,0)";
  return `translate(${-b.cx * SCALE},${-b.cy * SCALE})`;
});

const filteredMaps = computed(() => {
  return [...mapList.value].sort((a, b) => {
    const fa = a.floorNumber ?? 9999;
    const fb = b.floorNumber ?? 9999;
    if (fa !== fb) return fa - fb;
    return (a.name || "").localeCompare(b.name || "");
  });
});

const groupedMaps = computed(() => {
  const groups = new Map<
    string,
    { key: string; label: string; items: NavigationMapVO[] }
  >();
  for (const m of filteredMaps.value) {
    const floor =
      m.floorNumber !== null && m.floorNumber !== undefined
        ? m.floorNumber
        : null;
    const key = floor === null ? "unknown" : String(floor);
    const label = floor === null ? "未设置楼层" : `${floor}楼`;
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(m);
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === "unknown") return 1;
    if (b.key === "unknown") return -1;
    return Number(a.key) - Number(b.key);
  });
});

const formatMapId = (mapId?: string) => {
  if (!mapId) return "-";
  if (mapId.length <= 14) return mapId;
  return `${mapId.slice(0, 6)}…${mapId.slice(-4)}`;
};

const noop = () => {};

const loadMaps = async () => {
  if (!selectedFactoryId.value) {
    mapList.value = [];
    selectedMapId.value = "";
    mapElements.value = { points: [], paths: [], locations: [] };
    return;
  }
  loading.value = true;
  try {
    const res = await listMapsByFactory(selectedFactoryId.value);
    // 兼容后端返回格式（有的接口是 { data }，有的是直接数组）
    const data = (res as any).data ?? res;
    mapList.value = Array.isArray(data) ? data : [];
    if (mapList.value.length > 0 && !selectedMapId.value) {
      selectedMapId.value = String(mapList.value[0].mapId);
    }
    // URL 或缓存的 mapId 若不在当前工厂列表中，回退到第一张
    if (
      selectedMapId.value &&
      mapList.value.length > 0 &&
      !mapList.value.some((m) => String(m.mapId) === selectedMapId.value)
    ) {
      selectedMapId.value = String(mapList.value[0].mapId);
    }
  } finally {
    loading.value = false;
  }
  // 无论当前选中来自列表默认还是 URL，统一拉取元素（避免仅因 mapId 判断错误导致空白）
  if (selectedMapId.value) {
    const selectedMap = mapList.value.find(
      (m) => String(m.mapId) === selectedMapId.value,
    );
    if (selectedMap) {
      await loadMapElements(selectedMap);
    } else {
      await loadMapElements(selectedMapId.value);
    }
  }
};

// 获取工厂列表
const getFactoryList = async () => {
  try {
    const res = await listFactoryModel({ pageNum: 1, pageSize: 100 });
    factoryList.value = res.rows;

    // 自动选择第一个工厂
    if (factoryList.value.length > 0 && !selectedFactoryId.value) {
      selectedFactoryId.value = factoryList.value[0].id;
      loadMaps();
    }
  } catch (error) {
    console.error("获取工厂列表失败:", error);
  }
};

// 获取AMR型号列表
const getAmrTypeList = async () => {
  try {
    const res = await listType({ pageNum: 1, pageSize: 100 });
    amrTypeList.value = res.rows || [];
  } catch (error) {
    console.error("获取AMR型号列表失败:", error);
  }
};

const handleFactoryChange = () => {
  selectedMapId.value = "";
  router.replace({
    query: {
      ...router.currentRoute.value.query,
      factoryId: selectedFactoryId.value
        ? String(selectedFactoryId.value)
        : undefined,
      mapId: undefined,
    },
  });
  loadMaps();
};

// 选择工厂
const selectFactory = (factory: FactoryModelVO) => {
  selectedFactoryId.value = factory.id;
  selectedMapId.value = "";
  viewOffset.x = 150;
  viewOffset.y = 150;
  canvasScale.value = 1;
  isEditingOrigin.value = false;
  originEditingMapId.value = "";
  originDrafts.value.clear();
  loadMaps();
};

// 新增
const handleAdd = () => {
  if (!selectedFactoryId.value) {
    ElMessage.warning("请先选择工厂");
    return;
  }
  reset();
  dialog.visible = true;
  dialog.title = "添加地图";
  if (selectedFactoryId.value) {
    form.factoryModelId = selectedFactoryId.value;
  }
};

// 编辑（打开地图编辑器标签页）
const handleEdit = (row: NavigationMapVO) => {
  // 使用标签页方式打开地图编辑器
  mapEditorTabsStore.addTab({
    id: String(row.mapId),
    name: row.name,
  });
  // 进入编辑器时收起左侧主导航，留出更多画布区域（状态会写入 sidebarStatus）
  appStore.closeSideBar({ withoutAnimation: false });
  // 跳转到地图编辑器页面（带查询参数）
  router.push({
    path: "/opentcs/map/mapeditor",
    query: { mapId: row.mapId },
  });
};

// 加载地图元素数据（兼容 AjaxResult、elements 嵌套、与编辑器一致的字段名）
const loadMapElements = async (
  mapIdOrMap: string | number | NavigationMapVO,
) => {
  elementsLoading.value = true;
  try {
    const normalizePayload = (payloadRaw: unknown) => {
      const payload = unwrapAjaxMapPayload(payloadRaw) as MapEditorResponse &
        Record<string, any>;
      const nested =
        payload.elements &&
        typeof payload.elements === "object" &&
        !Array.isArray(payload.elements)
          ? (payload.elements as Record<string, any>)
          : null;
      const pointsRaw = pickElementsArray(payload.points, nested?.points);
      const pathsRaw = pickElementsArray(payload.paths, nested?.paths);
      const locationsRaw = pickElementsArray(
        payload.locations,
        nested?.locations,
      );
      return { pointsRaw, pathsRaw, locationsRaw };
    };

    // 转换点位：与 mapEditor.normalizePoint 一致（xposition / layout.x / properties）
    const normalizePoints = (points: any[]) => {
      return (points || []).map((p, index) => {
        const propsPayload = parsePropertiesPayload(p?.properties);
        const pointFromProps = propsPayload?.point ?? {};
        const parsedEditorProps = propsPayload?.editorProps ?? {};
        const parsedLayout = parseLayoutJson(p?.layout);
        const parsedLayoutEditorProps =
          parsedLayout?.editorProps && typeof parsedLayout.editorProps === "object"
            ? parsedLayout.editorProps
            : {};
        const x =
          pickCoordinate(p, "x") ??
          pickCoordinate(parsedLayout, "x") ??
          pickCoordinate(pointFromProps, "x") ??
          0;
        const y =
          pickCoordinate(p, "y") ??
          pickCoordinate(parsedLayout, "y") ??
          pickCoordinate(pointFromProps, "y") ??
          0;
        const radiusResolved =
          toFiniteNumber(parsedEditorProps?.radius) ??
          toFiniteNumber(parsedLayoutEditorProps?.radius) ??
          toFiniteNumber(p?.editorProps?.radius) ??
          toFiniteNumber(p?.radius) ??
          20;
        const stableId =
          p?.id != null && String(p.id) !== ""
            ? String(p.id)
            : p?.pointId != null && String(p.pointId) !== ""
              ? `pid-${String(p.pointId)}`
              : `p-${index}`;
        return {
          ...pointFromProps,
          ...p,
          id: stableId,
          pointId: p.pointId ?? p.id,
          x,
          y,
          editorProps: {
            color:
              parsedEditorProps?.color ??
              parsedLayoutEditorProps?.color ??
              p?.editorProps?.color,
            radius: radiusResolved,
            strokeColor:
              parsedEditorProps?.strokeColor ??
              parsedLayoutEditorProps?.strokeColor ??
              p?.editorProps?.strokeColor,
            textColor:
              parsedEditorProps?.textColor ??
              parsedLayoutEditorProps?.textColor ??
              p?.editorProps?.textColor,
            label:
              parsedEditorProps?.label ??
              parsedLayoutEditorProps?.label ??
              p?.editorProps?.label ??
              p?.label,
            labelVisible:
              parsedEditorProps?.labelVisible ??
              parsedLayoutEditorProps?.labelVisible ??
              p?.editorProps?.labelVisible ??
              p?.labelVisible ??
              true,
            labelOffset: {
              x:
                toFiniteNumber(parsedEditorProps?.labelOffset?.x) ??
                toFiniteNumber(parsedLayoutEditorProps?.labelOffset?.x) ??
                toFiniteNumber(p?.editorProps?.labelOffset?.x) ??
                -30,
              y:
                toFiniteNumber(parsedEditorProps?.labelOffset?.y) ??
                toFiniteNumber(parsedLayoutEditorProps?.labelOffset?.y) ??
                toFiniteNumber(p?.editorProps?.labelOffset?.y) ??
                -30,
            },
          },
        };
      });
    };

    // 转换路径数据：与 mapEditor.normalizePath 一致，保留 API geometry.controlPoints，再补 layout / layoutControlPoints
    const normalizePaths = (paths: any[]) => {
      return (paths || []).map((p) => {
        const propsPayload = parsePropertiesPayload(p?.properties);
        const geometryFromProps = propsPayload?.geometry;
        const editorPropsFromProps = propsPayload?.editorProps;

        let layoutObj: any = null;
        let layoutCpFromJson: any[] = [];
        try {
          layoutObj =
            typeof p.layout === "string" ? JSON.parse(p.layout) : p.layout;
          if (layoutObj?.controlPoints && Array.isArray(layoutObj.controlPoints)) {
            layoutCpFromJson = layoutObj.controlPoints.map(
              (cp: any, index: number) => ({
                id: `cp_${p.id}_${index}`,
                x: pickCoordinate(cp, "x") ?? 0,
                y: pickCoordinate(cp, "y") ?? 0,
              }),
            );
          }
        } catch {
          // ignore
        }

        const baseGeometry =
          p.geometry && typeof p.geometry === "object" ? { ...p.geometry } : {};
        if (geometryFromProps && typeof geometryFromProps === "object") {
          Object.assign(baseGeometry, geometryFromProps);
        }

        let controlPoints = Array.isArray(baseGeometry.controlPoints)
          ? [...baseGeometry.controlPoints]
          : [];
        const layoutCpTop = p.layoutControlPoints;
        const mergedLayout =
          Array.isArray(layoutCpTop) && layoutCpTop.length > 0
            ? layoutCpTop
            : layoutCpFromJson;

        if (
          controlPoints.length === 0 &&
          Array.isArray(mergedLayout) &&
          mergedLayout.length >= 2
        ) {
          controlPoints = mergedLayout.map((cp: any, index: number) => ({
            id: `cp_${p.id}_lp_${index}`,
            x: pickCoordinate(cp, "x") ?? 0,
            y: pickCoordinate(cp, "y") ?? 0,
          }));
        }

        const pathType =
          baseGeometry.pathType ||
          layoutObj?.connectionType?.toLowerCase() ||
          "direct";

        return {
          ...(propsPayload?.path ?? {}),
          ...p,
          startPointId:
            p.startPointId ??
            p.sourcePointId ??
            p.sourcePoint?.id ??
            p.startPoint?.id,
          endPointId:
            p.endPointId ?? p.destPointId ?? p.destPoint?.id ?? p.endPoint?.id,
          geometry: {
            ...baseGeometry,
            controlPoints,
            pathType,
          },
          editorProps: {
            ...(editorPropsFromProps && typeof editorPropsFromProps === "object"
              ? editorPropsFromProps
              : {}),
            ...(p.editorProps ?? {}),
          },
        };
      });
    };

    // 转换库位：与 mapEditor.normalizeLocation 一致（layout.geometry、properties.geometry 覆盖顺序）
    const normalizeLocations = (locations: any[]) => {
      return (locations || []).map((l, index) => {
        const propsPayload = parsePropertiesPayload(l?.properties);
        const geometryFromProps = propsPayload?.geometry;
        const editorPropsFromProps = propsPayload?.editorProps ?? {};
        const locationFromProps = propsPayload?.location ?? {};
        const parsedLayout = parseLayoutJson(l?.layout);
        const parsedLayoutEditorProps =
          parsedLayout?.editorProps && typeof parsedLayout.editorProps === "object"
            ? parsedLayout.editorProps
            : {};
        const parsedLayoutGeometry =
          parsedLayout?.geometry && typeof parsedLayout.geometry === "object"
            ? parsedLayout.geometry
            : undefined;

        const mergedGeometry: Record<string, any> = {
          ...(parsedLayoutGeometry ?? {}),
          ...(l.geometry && typeof l.geometry === "object" ? l.geometry : {}),
          ...(geometryFromProps && typeof geometryFromProps === "object"
            ? geometryFromProps
            : {}),
        };

        const x =
          pickCoordinate(l, "x") ??
          pickCoordinate(parsedLayout, "x") ??
          pickCoordinate(locationFromProps, "x") ??
          0;
        const y =
          pickCoordinate(l, "y") ??
          pickCoordinate(parsedLayout, "y") ??
          pickCoordinate(locationFromProps, "y") ??
          0;

        const locStableId =
          l?.id != null && String(l.id) !== ""
            ? String(l.id)
            : l?.locationId != null && String(l.locationId) !== ""
              ? `lid-${String(l.locationId)}`
              : `loc-${index}`;

        if (
          !mergedGeometry.vertices ||
          !Array.isArray(mergedGeometry.vertices) ||
          mergedGeometry.vertices.length === 0
        ) {
          mergedGeometry.vertices = [
            { id: `v_${locStableId}_0`, x, y },
            { id: `v_${locStableId}_1`, x: x + 100, y },
            { id: `v_${locStableId}_2`, x: x + 100, y: y + 100 },
            { id: `v_${locStableId}_3`, x, y: y + 100 },
          ];
        }
        if (mergedGeometry.closed === undefined) mergedGeometry.closed = true;

        return {
          ...locationFromProps,
          ...l,
          id: locStableId,
          x,
          y,
          geometry: mergedGeometry,
          editorProps: {
            ...(parsedLayoutEditorProps && typeof parsedLayoutEditorProps === "object"
              ? parsedLayoutEditorProps
              : {}),
            ...(editorPropsFromProps && typeof editorPropsFromProps === "object"
              ? editorPropsFromProps
              : {}),
            ...(l.editorProps && typeof l.editorProps === "object" ? l.editorProps : {}),
          },
        };
      });
    };
    const mapId =
      typeof mapIdOrMap === "object" ? mapIdOrMap.mapId : mapIdOrMap;

    const primaryRes = await loadMapEditorData(mapId);
    const { pointsRaw, pathsRaw, locationsRaw } = normalizePayload(primaryRes);

    mapElements.value = {
      points: normalizePoints(pointsRaw),
      paths: normalizePaths(pathsRaw),
      locations: normalizeLocations(locationsRaw),
    };
    clearPointVisualMetaCache();
    updateConnectedPointIds(mapElements.value.paths as any);
  } catch (error) {
    console.error("加载地图元素失败:", error);
    mapElements.value = { points: [], paths: [], locations: [] };
  } finally {
    elementsLoading.value = false;
  }
};

const selectMap = (row: NavigationMapVO) => {
  selectedMapId.value = String(row.mapId);
  viewOffset.x = 150;
  viewOffset.y = 150;
  canvasScale.value = 1;
  isEditingOrigin.value = false;
  editOriginX.value = row.originX ?? 0;
  editOriginY.value = row.originY ?? 0;
  router.replace({
    query: {
      ...router.currentRoute.value.query,
      factoryId: selectedFactoryId.value
        ? String(selectedFactoryId.value)
        : undefined,
      mapId: selectedMapId.value,
    },
  });
  // 加载地图元素
  loadMapElements(row);
};

// 提交
const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  dialog.loading = true;
  try {
    if (form.id) {
      await updateNavigationMap(form);
      ElMessage.success("修改成功");
    } else {
      await addNavigationMap(form);
      ElMessage.success("新增成功");
    }
    dialog.visible = false;
    await loadMaps();
  } catch (error) {
    console.error(error);
  } finally {
    dialog.loading = false;
  }
};

// 取消
const cancel = () => {
  dialog.visible = false;
  reset();
};

// 重置表单
const reset = () => {
  form.id = undefined;
  form.factoryModelId = undefined;
  form.mapId = "";
  form.name = "";
  form.floorNumber = 0;
  form.vehicleTypeId = undefined;
  form.originX = 0;
  form.originY = 0;
  form.rotation = 0;
  form.description = "";
  form.status = "0";
  formRef.value?.resetFields();
};

// 删除
const handleDelete = async (row: NavigationMapVO) => {
  try {
    await ElMessageBox.confirm('确认删除地图 "' + row.name + '" 吗？', "警告", {
      type: "warning",
    });
    await delNavigationMap(row.id);
    ElMessage.success("删除成功");
    await loadMaps();
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  getFactoryList();
  getAmrTypeList();

  const factoryIdFromQuery = Number(router.currentRoute.value.query.factoryId);
  const mapIdFromQuery = router.currentRoute.value.query.mapId
    ? String(router.currentRoute.value.query.mapId)
    : "";

  if (!Number.isNaN(factoryIdFromQuery) && factoryIdFromQuery > 0) {
    selectedFactoryId.value = factoryIdFromQuery;
    if (mapIdFromQuery) selectedMapId.value = mapIdFromQuery;
    void loadMaps();
  }
  // 如果 URL 没有 factoryId，getFactoryList 会自动选择第一个工厂
});

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", onDragMapOrigin);
  document.removeEventListener("mouseup", endDragMapOrigin);
  document.removeEventListener("mousemove", onPan);
  document.removeEventListener("mouseup", endPan);
});
</script>

<style lang="scss">
.workbench {
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.rcs-workbench {
  height: 100%;
  overflow: hidden;
}

.rcs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e6e8ee;
  border-bottom: 1px solid #e6e8ee;
  border-radius: 10px 10px 0 0;
}

.factory-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.header-actions {
  flex-shrink: 0;
}

.factory-tab {
  padding: 8px 16px;
  border: 1px solid #e6e8ee;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #2b2f36;
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(64, 158, 255, 0.5);
    background: rgba(64, 158, 255, 0.04);
  }

  &.active {
    border-color: #409eff;
    background: rgba(64, 158, 255, 0.1);
    color: #409eff;
    font-weight: 500;
  }
}

.rcs-stage2 {
  position: relative;
  height: calc(100% - 48px);
  border: 1px solid #e6e8ee;
  border-top: none;
  border-radius: 0 0 10px 10px;
  overflow: hidden;
  background: #ffffff;
}

.stage2-canvas {
  position: absolute;
  inset: 0;
  padding-left: 170px;
  background-image:
    linear-gradient(#eef0f4 1px, transparent 1px),
    linear-gradient(90deg, #eef0f4 1px, transparent 1px);
  background-size: 18px 18px;
  overflow: hidden;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

// 地图层：承载所有地图内容，通过 CSS transform 实现平移+缩放
.canvas-map-layer {
  position: absolute;
  left: 170px;
  top: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  pointer-events: none;
}

.map-layer-image {
  position: absolute;
  width: 800px;
  height: 600px;
  transform: translate(-50%, -50%);
}

.map-layer-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  overflow: visible;
}

.preview-konva-layer {
  position: absolute;
  left: 0;
  top: 0;
  overflow: visible;
  pointer-events: none;
}

.canvas-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.canvas-empty {
  position: absolute;
  inset: 0;
  left: 170px;
  display: grid;
  place-items: center;
}

// 坐标轴（在地图层内部，随层一起缩放；与编辑器同一 Konva 约定，不再二次 scaleY）
.layer-axis {
  position: absolute;
  left: 0;
  top: 0;
}

.axis-origin {
  position: absolute;
  left: 6px;
  top: -18px;
  font-size: 10px;
  color: #6b7280;
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
}

.axis-line {
  position: absolute;
  left: 0;
  top: 0;
}

.axis-x {
  height: 2px;
  width: 120px;
  background: #2563eb;
  transform: translateY(-50%);
}

.axis-x::before {
  content: "";
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-left: 8px solid #2563eb;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.axis-x::after {
  content: "X";
  position: absolute;
  right: 0;
  bottom: calc(100% + 2px);
  font-size: 11px;
  font-weight: bold;
  color: #2563eb;
}

/* 与 useCanvasAxis 一致：Y 臂沿 Konva 负 y 方向（屏幕向上） */
.axis-y {
  position: absolute;
  left: 0;
  top: -120px;
  width: 2px;
  height: 120px;
  background: #ef4444;
  transform: translateX(-50%);
}

.axis-y::before {
  content: "";
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom: 8px solid #ef4444;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.axis-y::after {
  content: "Y";
  position: absolute;
  left: 8px;
  top: 0;
  font-size: 11px;
  font-weight: bold;
  color: #ef4444;
}

.canvas-footer {
  position: absolute;
  left: 184px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.canvas-floating-controls {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 11;

  .floating-slot {
    width: 36px;
    display: flex;
    justify-content: center;
  }

  .floating-btn {
    width: 36px;
    height: 36px;
    min-width: 36px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #dcdfe6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    &.is-active {
      border-color: #3388ff;
      color: #3388ff;
    }

    &.floating-btn--layer {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }

  .floating-layer-icon {
    width: 18px;
    height: 18px;
    display: block;
    object-fit: contain;
  }

  .mono-btn {
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
  }
}

.layer-visibility-menu {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  min-width: 200px;
}

.layer-visibility-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  transition: background 0.15s ease;

  &:hover {
    background: #f5f7fa;
  }

  .layer-visibility-menu__icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .layer-visibility-menu__text {
    line-height: 1.35;
  }

  &:not(.is-off) {
    .layer-visibility-menu__icon,
    .layer-visibility-menu__text {
      color: #3388ff;
    }
  }

  &.is-off {
    .layer-visibility-menu__icon,
    .layer-visibility-menu__text {
      color: #a0a0a0;
    }

    .layer-visibility-menu__text {
      text-decoration: line-through;
    }
  }
}

.footer-sep {
  color: #9ca3af;
}

.zoom-indicator {
  color: #409eff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.stage2-actions {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

.stage2-left {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 170px;
  background: rgba(255, 255, 255, 0.92);
  border-right: 1px solid #e6e8ee;
  z-index: 2;
}

.stage2-left-inner {
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.scene-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.scene-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 8px;
  background: transparent;
  cursor: pointer;
  color: #2b2f36;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba(64, 158, 255, 0.06);
    border-color: rgba(64, 158, 255, 0.22);
  }

  &.active {
    background: rgba(64, 158, 255, 0.1);
    border-color: rgba(64, 158, 255, 0.32);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.add {
    margin-top: 4px;
    border-style: dashed;
    border-color: rgba(64, 158, 255, 0.4);
    background: rgba(64, 158, 255, 0.04);

    &:hover:not(:disabled) {
      background: rgba(64, 158, 255, 0.1);
      border-color: rgba(64, 158, 255, 0.6);
    }
  }
}

.scene-icon {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(
    135deg,
    rgba(64, 158, 255, 0.9),
    rgba(56, 189, 248, 0.9)
  );
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: "";
    width: 6px;
    height: 5px;
    border: 1.5px solid white;
    border-radius: 1px;
  }
}

.scene-plus {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px dashed rgba(64, 158, 255, 0.7);
  background: rgba(64, 158, 255, 0.1);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: "+";
    font-size: 12px;
    color: rgba(64, 158, 255, 0.9);
    font-weight: bold;
    line-height: 1;
  }
}

.scene-name {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-origin-info {
  font-size: 10px;
  color: #909399;
  font-weight: 400;
  flex-shrink: 0;
}

.left-empty {
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
}

.map-position-inputs {
  display: flex;
  align-items: center;
  gap: 16px;

  .position-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .label {
      font-size: 12px;
      color: #606266;
      white-space: nowrap;
    }
  }
}

/* ═══════ 地图原点坐标轴（虚线，保持与实线相同的尺寸/定位，只替换背景为虚线渐变） ═══════ */
.map-origin-axis {
  .axis-x {
    background: repeating-linear-gradient(
      to right,
      #2563eb 0,
      #2563eb 5px,
      transparent 5px,
      transparent 10px
    );
  }

  .axis-x::before {
    border-left-color: #2563eb;
  }

  .axis-y {
    background: repeating-linear-gradient(
      to bottom,
      #ef4444 0,
      #ef4444 5px,
      transparent 5px,
      transparent 10px
    );
  }

  .axis-y::before {
    border-top-color: #ef4444;
  }
}

/* 橙色拖拽手柄（与地图编辑器一致） */
.origin-drag-handle {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(249, 115, 22, 0.4);
  border: none;
  cursor: move;
  transform: translate(-50%, 50%);
  z-index: 15;
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease;

  &.active {
    background: rgba(249, 115, 22, 0.55);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
  }

  &:hover {
    background: rgba(249, 115, 22, 0.55);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
  }

  &:active {
    background: rgba(249, 115, 22, 0.65);
    box-shadow: 0 0 0 5px rgba(249, 115, 22, 0.15);
  }
}

.map-origin-tag {
  position: absolute;
  transform: translate(8px, 8px);
  font-size: 10px;
  color: #909399;
  white-space: nowrap;
  pointer-events: none;

  &.active {
    color: #f97316;
    font-weight: 600;
  }
}

/* ═══════ 原点编辑浮层面板 ═══════ */
.origin-edit-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border: 1px solid #e6e8ee;
  padding: 14px 16px;
  min-width: 220px;
}

.origin-edit-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.origin-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: #606266;
    width: 16px;
    text-align: right;
  }

  .el-input-number {
    flex: 1;
  }
}

.origin-edit-hint {
  font-size: 11px;
  color: #909399;
  margin-bottom: 10px;
}

.origin-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 浮层过渡动画 */
.origin-panel-enter-active,
.origin-panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.origin-panel-enter-from,
.origin-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
