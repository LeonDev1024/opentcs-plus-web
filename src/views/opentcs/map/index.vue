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
            {{ isEditingOrigin ? '退出原点编辑' : '原点编辑' }}
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
            <!-- 地图元素（编辑模式下隐藏，只展示坐标轴） -->
            <div v-if="!isEditingOrigin && activeMap?.rasterUrl" class="map-layer-image">
              <img class="canvas-img" :src="activeMap.rasterUrl" alt="地图底图" />
            </div>
            <svg v-else-if="!isEditingOrigin && activeMap && (mapElements.points.length > 0 || mapElements.paths.length > 0)"
              class="map-layer-svg"
            >
              <g v-for="path in processedPaths" :key="path.id">
                <line
                  v-if="path.startPoint && path.endPoint"
                  :x1="path.startPoint.x * SCALE"
                  :y1="-path.startPoint.y * SCALE"
                  :x2="path.endPoint.x * SCALE"
                  :y2="-path.endPoint.y * SCALE"
                  stroke="#409eff"
                  stroke-width="2"
                />
              </g>
              <g v-for="point in mapElements.points" :key="point.id">
                <circle
                  :cx="point.x * SCALE"
                  :cy="-point.y * SCALE"
                  :r="point.editorProps?.radius || 8"
                  :fill="point.editorProps?.color || '#409eff'"
                  stroke="#fff"
                  stroke-width="2"
                />
                <text
                  v-if="point.editorProps?.labelVisible && point.name"
                  :x="point.x * SCALE"
                  :y="-point.y * SCALE - 12"
                  fill="#666"
                  font-size="10"
                  text-anchor="middle"
                >{{ point.name }}</text>
              </g>
              <g v-for="location in mapElements.locations" :key="location.id">
                <rect
                  :x="(location.x - (location.editorProps?.width || 20) / 2) * SCALE"
                  :y="(-location.y - (location.editorProps?.height || 20) / 2) * SCALE"
                  :width="(location.editorProps?.width || 20) * SCALE"
                  :height="(location.editorProps?.height || 20) * SCALE"
                  :fill="location.editorProps?.color || '#67c23a'"
                  stroke="#fff"
                  stroke-width="1"
                />
              </g>
            </svg>

            <!-- 普通模式：工厂坐标轴 O(0,0)（实线）+ 地图原点虚线 -->
            <template v-if="!isEditingOrigin">
              <div class="layer-axis">
                <div class="axis-line axis-x" />
                <div class="axis-line axis-y" />
                <div class="axis-origin">O(0,0)</div>
              </div>
              <div
                v-if="activeMap && !isMapOriginAtFactory"
                class="layer-axis map-origin-axis"
                :style="mapOriginLayerStyle"
              >
                <div class="axis-line axis-x" />
                <div class="axis-line axis-y" />
              </div>
            </template>

            <!-- 原点编辑模式：工厂原点实线坐标轴 + 所有地图原点虚线坐标轴 -->
            <template v-if="isEditingOrigin">
              <div class="layer-axis">
                <div class="axis-line axis-x" />
                <div class="axis-line axis-y" />
                <div class="axis-origin">O(0,0)</div>
              </div>
              <div
                v-for="m in filteredMaps"
                :key="'axis-' + m.mapId"
                class="layer-axis map-origin-axis"
                :style="getMapLayerOffset(m)"
              >
                <div class="axis-line axis-x" />
                <div class="axis-line axis-y" />
              </div>
            </template>
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
            <div v-else-if="filteredMaps.length === 0" class="muted">当前工厂暂无地图，请先新建地图</div>
            <div v-else class="muted">请选择左侧一张地图</div>
          </div>
          <div class="canvas-footer">
            <template v-if="isEditingOrigin">
              <span class="muted" style="color: #e6a23c;">拓扑原点编辑模式</span>
              <span class="footer-sep">·</span>
              <span class="muted">共 {{ filteredMaps.length }} 张地图</span>
            </template>
            <template v-else>
              <span class="muted">预览模式</span>
              <span class="footer-sep">，</span>
              <span class="muted">地图ID：</span>
              <span class="mono">{{ activeMap?.mapId || '-' }}</span>
            </template>
            <span class="footer-sep">·</span>
            <span class="zoom-indicator" @click="resetView">
              {{ Math.round(canvasScale * 100) }}%
            </span>
          </div>

          <div class="stage2-actions" v-if="!isEditingOrigin">
            <el-button type="primary" icon="Plus" :disabled="!selectedFactoryId" @click="handleAdd">
              新建地图
            </el-button>
            <el-button type="primary" plain icon="EditPen" :disabled="!activeMap" @click="activeMap && handleEdit(activeMap)">
              地图编辑
            </el-button>
          </div>

          <!-- 原点编辑模式：右上角显示选中地图的坐标编辑面板 -->
          <div v-if="isEditingOrigin && originEditingMapId" class="origin-edit-panel">
            <div class="origin-edit-title">{{ originEditingMapName }} 原点坐标 (mm)</div>
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
            <div class="origin-edit-hint">拖拽画布中该地图的橙色圆圈可移动原点</div>
            <div class="origin-edit-actions">
              <el-button type="primary" size="small" :loading="originSaving" @click="saveAllOrigins">全部保存</el-button>
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
                    : String(m.mapId) === selectedMapId
                }"
                @click="isEditingOrigin ? selectOriginMap(String(m.mapId)) : selectMap(m)"
                @dblclick="!isEditingOrigin && handleEdit(m)"
              >
                <span class="scene-icon" />
                <span class="scene-name">{{ m.name }}</span>
              </button>

              <button v-if="!isEditingOrigin" type="button" class="scene-item add" :disabled="!selectedFactoryId" @click="handleAdd">
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
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="700px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="地图ID" prop="mapId">
          <el-input v-model="form.mapId" placeholder="请输入地图ID，如：map_001" />
        </el-form-item>
        <el-form-item label="地图名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入地图名称，如：一楼车间" />
        </el-form-item>
        <el-form-item label="所属楼层" prop="floorNumber">
          <el-input-number v-model="form.floorNumber" :placeholder="'-1表示地下楼层，0表示1楼'" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="AMR型号" prop="amrModel">
          <el-select v-model="form.amrModel" placeholder="请选择AMR型号" style="width: 100%;">
            <el-option v-for="type in amrTypeList" :key="type.id" :label="type.name" :value="type.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="地图原点坐标">
          <div class="map-position-inputs">
            <div class="position-item">
              <span class="label">X坐标(mm)</span>
              <el-input-number v-model="form.originX" :step="100" :precision="0" controls-position="right" style="width: 120px;" />
            </div>
            <div class="position-item">
              <span class="label">Y坐标(mm)</span>
              <el-input-number v-model="form.originY" :step="100" :precision="0" controls-position="right" style="width: 120px;" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="地图旋转角度">
          <div class="map-position-inputs">
            <div class="position-item">
              <span class="label">旋转角度(°)</span>
              <el-input-number v-model="form.rotation" :step="1" :min="-180" :max="180" controls-position="right" style="width: 120px;" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
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
          <el-button type="primary" :loading="dialog.loading" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listMapsByFactory, addNavigationMap, updateNavigationMap, delNavigationMap } from '@/api/opentcs/factory/map';
import type { NavigationMapVO, NavigationMapForm, NavigationMapQuery } from '@/api/opentcs/factory/map/types';
import { listFactoryModel } from '@/api/opentcs/factory/model';
import type { FactoryModelVO } from '@/api/opentcs/factory/model/types';
import { listType } from '@/api/opentcs/vehicle/type';
import type { TypeVO } from '@/api/opentcs/vehicle/type/types';
import { loadMapEditorData } from '@/api/opentcs/map';
import type { MapEditorResponse } from '@/api/opentcs/map/types';
import { useMapEditorTabsStore } from '@/store/modules/mapEditorTabs';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { watch, onBeforeUnmount } from 'vue';

const router = useRouter();
const mapEditorTabsStore = useMapEditorTabsStore();

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
const elementsLoading = ref(false);

// 画布缩放比例（1px = 1mm）
// 将 mm 坐标直接映射到屏幕像素：1mm -> 1px
const SCALE = 1;


const selectedFactoryId = ref<number | undefined>(undefined);
const selectedMapId = ref<string>('');

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
 * 地图层 CSS transform：
 * - 以画布内容区左下角为坐标系原点
 * - translate 定位工厂原点 O(0,0)
 * - scale 缩放地图层
 * - Y 轴翻转（CSS Y 向下，世界 Y 向上）
 */
const mapLayerStyle = computed(() => {
  const { h } = getCanvasRect();
  return {
    transform: `translate(${viewOffset.x}px, ${h - viewOffset.y}px) scale(${canvasScale.value}, ${-canvasScale.value})`
  };
});

/**
 * 地图原点在地图层本地坐标系中的偏移。
 * 因为 canvas-map-layer 已使用 scaleY(-1) 翻转 Y 轴，
 * 本地 top 为正值时视觉方向向上（世界 Y-up），无需取反。
 */
function mapOriginOffset(ox: number, oy: number) {
  return {
    left: ox * SCALE + 'px',
    top: oy * SCALE + 'px'
  };
}

const mapOriginLayerStyle = computed(() => {
  if (!activeMap.value) return {};
  return mapOriginOffset(activeMap.value.originX ?? 0, activeMap.value.originY ?? 0);
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
  if ((e.target as HTMLElement).closest('.origin-drag-handle')) return;
  isDragging.value = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  viewStart.x = viewOffset.x;
  viewStart.y = viewOffset.y;
  document.body.style.cursor = 'grabbing';
  document.addEventListener('mousemove', onPan);
  document.addEventListener('mouseup', endPan);
}

function onPan(e: MouseEvent) {
  if (!isDragging.value) return;
  viewOffset.x = viewStart.x + (e.clientX - dragStart.x);
  viewOffset.y = viewStart.y - (e.clientY - dragStart.y);
}

function endPan() {
  if (isDragging.value) {
    isDragging.value = false;
    document.body.style.cursor = '';
  }
  document.removeEventListener('mousemove', onPan);
  document.removeEventListener('mouseup', endPan);
}

// ═══════ 地图原点编辑（工厂级拓扑视图） ══════════════════════════════════════
const isEditingOrigin = ref(false);
const originSaving = ref(false);
/** 当前选中编辑的地图 mapId */
const originEditingMapId = ref<string>('');
const editOriginX = ref(0);
const editOriginY = ref(0);

/** 编辑模式下每张地图的临时原点数据 */
const originDrafts = ref<Map<string, { originX: number; originY: number }>>(new Map());

const originEditingMapName = computed(() => {
  const m = filteredMaps.value.find(m => String(m.mapId) === originEditingMapId.value);
  return m?.name ?? '';
});

/** 普通模式：当前选中地图的原点是否与工厂原点重合 */
const isMapOriginAtFactory = computed(() => {
  if (!activeMap.value) return true;
  return Number(activeMap.value.originX || 0) === 0 && Number(activeMap.value.originY || 0) === 0;
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
    left: (170 + viewOffset.x + ox * SCALE * canvasScale.value) + 'px',
    bottom: (viewOffset.y + oy * SCALE * canvasScale.value) + 'px'
  };
}

function toggleOriginEditing() {
  if (isEditingOrigin.value) {
    isEditingOrigin.value = false;
    originEditingMapId.value = '';
    originDrafts.value.clear();
    return;
  }
  if (!selectedFactoryId.value || filteredMaps.value.length === 0) return;
  // 初始化每张地图的草稿
  const drafts = new Map<string, { originX: number; originY: number }>();
  filteredMaps.value.forEach(m => {
    drafts.set(String(m.mapId), { originX: m.originX ?? 0, originY: m.originY ?? 0 });
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
    originY: editOriginY.value
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
      const m = filteredMaps.value.find(m => String(m.mapId) === mapId);
      if (!m) return;
      if (draft.originX === (m.originX ?? 0) && draft.originY === (m.originY ?? 0)) return;
      promises.push(
        updateNavigationMap({
          id: m.id,
          factoryModelId: m.factoryModelId,
          mapId: m.mapId,
          name: m.name,
          originX: draft.originX,
          originY: draft.originY
        })
      );
      // 同步本地数据
      const idx = mapList.value.findIndex(ml => ml.id === m.id);
      if (idx >= 0) {
        mapList.value[idx].originX = draft.originX;
        mapList.value[idx].originY = draft.originY;
      }
    });
    if (promises.length > 0) {
      await Promise.all(promises);
      ElMessage.success(`已保存 ${promises.length} 张地图原点`);
    } else {
      ElMessage.info('无修改需要保存');
    }
  } catch (e) {
    ElMessage.error('保存失败');
  } finally {
    originSaving.value = false;
  }
}

// ═══════ 画布拖拽：场景原点 + 地图原点 ══════════════════════════════════════
const isDraggingMapOrigin = ref(false);
const draggingMapId = ref('');
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
  document.body.style.cursor = 'move';
  document.addEventListener('mousemove', onDragMapOrigin);
  document.addEventListener('mouseup', endDragMapOrigin);
  e.preventDefault();
  e.stopPropagation();
}

function onDragMapOrigin(e: MouseEvent) {
  if (!isDraggingMapOrigin.value || !draggingMapId.value) return;
  const pxPerMm = SCALE * canvasScale.value;
  const deltaXPx = e.clientX - mapOriginDragStart.x;
  const deltaYPx = e.clientY - mapOriginDragStart.y;
  editOriginX.value = Math.round(mapOriginEditStart.x + deltaXPx / pxPerMm);
  editOriginY.value = Math.round(mapOriginEditStart.y - deltaYPx / pxPerMm);
  originDrafts.value.set(draggingMapId.value, {
    originX: editOriginX.value,
    originY: editOriginY.value
  });
}

function endDragMapOrigin() {
  if (isDraggingMapOrigin.value) {
    isDraggingMapOrigin.value = false;
    draggingMapId.value = '';
    document.body.style.cursor = '';
  }
  document.removeEventListener('mousemove', onDragMapOrigin);
  document.removeEventListener('mouseup', endDragMapOrigin);
}

// 保留 query 类型，便于后续扩展筛选/分页（P0 暂不使用）
const _queryParams = reactive<NavigationMapQuery>({});

const dialog = reactive({
  visible: false,
  title: '',
  loading: false
});

const form = reactive<NavigationMapForm>({
  id: undefined,
  factoryModelId: undefined as number | undefined,
  mapId: '',
  name: '',
  floorNumber: 0,
  amrModel: '',
  originX: 0,
  originY: 0,
  rotation: 0,
  description: '',
  status: '0'
});

const rules = {
  mapId: [{ required: true, message: '地图ID不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '地图名称不能为空', trigger: 'blur' }],
  amrModel: [{ required: true, message: '请选择AMR型号', trigger: 'change' }]
};

const formRef = ref<FormInstance>();

const activeMap = computed(() => mapList.value.find(m => String(m.mapId) === selectedMapId.value));



// 处理路径数据，添加端点坐标
const processedPaths = computed(() => {
  const pointsMap = new Map();
  mapElements.value.points?.forEach(p => {
    pointsMap.set(String(p.id), p);
  });

  return (mapElements.value.paths || []).map(path => {
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

const filteredMaps = computed(() => {
  return [...mapList.value].sort((a, b) => {
    const fa = a.floorNumber ?? 9999;
    const fb = b.floorNumber ?? 9999;
    if (fa !== fb) return fa - fb;
    return (a.name || '').localeCompare(b.name || '');
  });
});

const groupedMaps = computed(() => {
  const groups = new Map<string, { key: string; label: string; items: NavigationMapVO[] }>();
  for (const m of filteredMaps.value) {
    const floor = m.floorNumber !== null && m.floorNumber !== undefined ? m.floorNumber : null;
    const key = floor === null ? 'unknown' : String(floor);
    const label = floor === null ? '未设置楼层' : `${floor}楼`;
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(m);
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === 'unknown') return 1;
    if (b.key === 'unknown') return -1;
    return Number(a.key) - Number(b.key);
  });
});

const formatMapId = (mapId?: string) => {
  if (!mapId) return '-';
  if (mapId.length <= 14) return mapId;
  return `${mapId.slice(0, 6)}…${mapId.slice(-4)}`;
};

const noop = () => {};

const loadMaps = async () => {
  if (!selectedFactoryId.value) {
    mapList.value = [];
    selectedMapId.value = '';
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
  } finally {
    loading.value = false;
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
    console.error('获取工厂列表失败:', error);
  }
};

// 获取AMR型号列表
const getAmrTypeList = async () => {
  try {
    const res = await listType({ pageNum: 1, pageSize: 100 });
    amrTypeList.value = res.rows || [];
  } catch (error) {
    console.error('获取AMR型号列表失败:', error);
  }
};

const handleFactoryChange = () => {
  selectedMapId.value = '';
  router.replace({
    query: {
      ...router.currentRoute.value.query,
      factoryId: selectedFactoryId.value ? String(selectedFactoryId.value) : undefined,
      mapId: undefined
    }
  });
  loadMaps();
};

// 选择工厂
const selectFactory = (factory: FactoryModelVO) => {
  selectedFactoryId.value = factory.id;
  selectedMapId.value = '';
  viewOffset.x = 150;
  viewOffset.y = 150;
  canvasScale.value = 1;
  isEditingOrigin.value = false;
  originEditingMapId.value = '';
  originDrafts.value.clear();
  loadMaps();
};

// 新增
const handleAdd = () => {
  if (!selectedFactoryId.value) {
    ElMessage.warning('请先选择工厂');
    return;
  }
  reset();
  dialog.visible = true;
  dialog.title = '添加地图';
  if (selectedFactoryId.value) {
    form.factoryModelId = selectedFactoryId.value;
  }
};

// 编辑（打开地图编辑器标签页）
const handleEdit = (row: NavigationMapVO) => {
  // 使用标签页方式打开地图编辑器
  mapEditorTabsStore.addTab({
    id: String(row.mapId),
    name: row.name
  });
  // 跳转到地图编辑器页面（带查询参数）
  router.push({
    path: '/opentcs/map/mapeditor',
    query: { mapId: row.mapId }
  });
};

// 加载地图元素数据
const loadMapElements = async (mapId: string | number) => {
  elementsLoading.value = true;
  try {
    const res = await loadMapEditorData(mapId);
    const data = res as unknown as MapEditorResponse;
    mapElements.value = {
      points: data.points || [],
      paths: data.paths || [],
      locations: data.locations || []
    };
  } catch (error) {
    console.error('加载地图元素失败:', error);
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
      factoryId: selectedFactoryId.value ? String(selectedFactoryId.value) : undefined,
      mapId: selectedMapId.value
    }
  });
  // 加载地图元素
  loadMapElements(row.mapId);
};

// 提交
const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  dialog.loading = true;
  try {
    if (form.id) {
      await updateNavigationMap(form);
      ElMessage.success('修改成功');
    } else {
      await addNavigationMap(form);
      ElMessage.success('新增成功');
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
  form.mapId = '';
  form.name = '';
  form.floorNumber = 0;
  form.amrModel = '';
  form.originX = 0;
  form.originY = 0;
  form.rotation = 0;
  form.description = '';
  form.status = '0';
  formRef.value?.resetFields();
};

// 删除
const handleDelete = async (row: NavigationMapVO) => {
  try {
    await ElMessageBox.confirm('确认删除地图 "' + row.name + '" 吗？', '警告', { type: 'warning' });
    await delNavigationMap(row.id);
    ElMessage.success('删除成功');
    await loadMaps();
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  getFactoryList();
  getAmrTypeList();

  const factoryIdFromQuery = Number(router.currentRoute.value.query.factoryId);
  const mapIdFromQuery = router.currentRoute.value.query.mapId ? String(router.currentRoute.value.query.mapId) : '';

  if (!Number.isNaN(factoryIdFromQuery) && factoryIdFromQuery > 0) {
    selectedFactoryId.value = factoryIdFromQuery;
    if (mapIdFromQuery) selectedMapId.value = mapIdFromQuery;
    loadMaps().then(() => {
      // 若 query 里的 mapId 在当前工厂不存在，则回退到第一张
      if (selectedMapId.value && !mapList.value.some(m => String(m.mapId) === selectedMapId.value)) {
        selectedMapId.value = mapList.value.length > 0 ? String(mapList.value[0].mapId) : '';
      }
      // 加载地图元素
      if (selectedMapId.value) {
        loadMapElements(selectedMapId.value);
      }
    });
  }
  // 如果 URL 没有 factoryId，getFactoryList 会自动选择第一个工厂
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMapOrigin);
  document.removeEventListener('mouseup', endDragMapOrigin);
  document.removeEventListener('mousemove', onPan);
  document.removeEventListener('mouseup', endPan);
});
</script>

<style scoped lang="scss">
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
  background-image: linear-gradient(#eef0f4 1px, transparent 1px), linear-gradient(90deg, #eef0f4 1px, transparent 1px);
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
  width: 100000px;
  height: 100000px;
  left: -50000px;
  top: -50000px;
  overflow: visible;
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

// 坐标轴（在地图层内部，随层一起缩放）
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
  transform: scaleY(-1);
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
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-left: 8px solid #2563eb;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.axis-x::after {
  content: 'X';
  position: absolute;
  right: 0;
  bottom: calc(100% + 2px);
  font-size: 11px;
  font-weight: bold;
  color: #2563eb;
  transform: scaleY(-1);
}

.axis-y {
  width: 2px;
  height: 120px;
  background: #ef4444;
  transform: translateX(-50%);
}

.axis-y::before {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-top: 8px solid #ef4444;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.axis-y::after {
  content: 'Y';
  position: absolute;
  left: 8px;
  bottom: 0;
  font-size: 11px;
  font-weight: bold;
  color: #ef4444;
  transform: scaleY(-1);
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
  transition: background 0.15s ease, border-color 0.15s ease;

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
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.9), rgba(56, 189, 248, 0.9));
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
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
    content: '+';
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
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
    background: repeating-linear-gradient(to right, #2563eb 0, #2563eb 5px, transparent 5px, transparent 10px);
  }

  .axis-x::before {
    border-left-color: #2563eb;
  }

  .axis-y {
    background: repeating-linear-gradient(to bottom, #ef4444 0, #ef4444 5px, transparent 5px, transparent 10px);
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
  transition: background 0.15s ease, box-shadow 0.15s ease;

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
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.origin-panel-enter-from,
.origin-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
