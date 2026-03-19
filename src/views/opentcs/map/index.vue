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
      </div>

      <div class="rcs-stage2">
        <div
          class="stage2-canvas"
          @mousedown="startDragOrigin"
          @mousemove="onDragOrigin"
          @mouseup="endDragOrigin"
          @mouseleave="endDragOrigin"
        >
          <div v-if="activeMap?.rasterUrl" class="canvas-image">
            <img class="canvas-img" :src="activeMap.rasterUrl" alt="地图底图" />
          </div>
          <!-- 地图元素渲染 -->
          <div v-else-if="activeMap && (mapElements.points.length > 0 || mapElements.paths.length > 0)" class="canvas-elements">
            <svg width="100%" height="100%" :viewBox="svgViewBox">
              <!-- 使用 SVG transform 实现元素随原点移动 -->
              <g :transform="`translate(${-originPosition.x / 100 * svgWidth}, ${originPosition.y / 100 * svgHeight})`">
                <!-- 路径 -->
                <g v-for="path in processedPaths" :key="path.id">
                  <line
                    v-if="path.startPoint && path.endPoint"
                    :x1="path.startPoint.x * SCALE"
                    :y1="path.startPoint.y * SCALE"
                    :x2="path.endPoint.x * SCALE"
                    :y2="path.endPoint.y * SCALE"
                    stroke="#409eff"
                    stroke-width="2"
                  />
                </g>
                <!-- 点位 -->
                <g v-for="point in mapElements.points" :key="point.id">
                  <circle
                    :cx="point.x * SCALE"
                    :cy="point.y * SCALE"
                    :r="point.editorProps?.radius || 8"
                    :fill="point.editorProps?.color || '#409eff'"
                    stroke="#fff"
                    stroke-width="2"
                  />
                  <text
                    v-if="point.editorProps?.labelVisible && point.name"
                    :x="point.x * SCALE"
                    :y="point.y * SCALE - 12"
                    fill="#666"
                    font-size="10"
                    text-anchor="middle"
                  >{{ point.name }}</text>
                </g>
                <!-- 位置 -->
                <g v-for="location in mapElements.locations" :key="location.id">
                  <rect
                    :x="(location.x - (location.editorProps?.width || 20) / 2) * SCALE"
                    :y="(location.y - (location.editorProps?.height || 20) / 2) * SCALE"
                    :width="(location.editorProps?.width || 20) * SCALE"
                    :height="(location.editorProps?.height || 20) * SCALE"
                    :fill="location.editorProps?.color || '#67c23a'"
                    stroke="#fff"
                    stroke-width="1"
                  />
                  <text
                    v-if="location.editorProps?.labelVisible && location.name"
                    :x="location.x * SCALE"
                    :y="location.y * SCALE - 12"
                    fill="#666"
                    font-size="10"
                    text-anchor="middle"
                  >{{ location.name }}</text>
                </g>
              </g>
            </svg>
          </div>
          <div v-else-if="activeMap" class="canvas-empty">
            <div class="muted">该地图暂无元素</div>
          </div>
          <div v-else class="canvas-empty">
            <div v-if="!selectedFactoryId" class="muted">请选择工厂</div>
            <div v-else-if="filteredMaps.length === 0" class="muted">当前工厂暂无地图，请先新建地图</div>
            <div v-else class="muted">请选择左侧一张地图</div>
          </div>

          <!-- 坐标轴 -->
          <div class="canvas-axis">
            <div
              class="axis-line axis-x"
              :style="{ left: originPosition.x + '%', bottom: originPosition.y + '%' }"
            />
            <div
              class="axis-line axis-y"
              :style="{ left: originPosition.x + '%', bottom: originPosition.y + '%' }"
            />
            <div
              class="axis-origin"
              :style="{ left: originPosition.x + '%', bottom: originPosition.y + '%' }"
              @mousedown.stop="startDragOrigin"
            >
              O(0,0)
            </div>
          </div>

          <div class="canvas-footer">
            <span class="muted">预览模式</span>
            <span class="footer-sep">，</span>
            <span class="muted">地图ID：</span>
            <span class="mono">{{ activeMap?.mapId || '-' }}</span>
          </div>

          <div class="stage2-actions">
            <el-button type="primary" icon="Plus" :disabled="!selectedFactoryId" @click="handleAdd">
              新建地图
            </el-button>
            <el-button type="primary" plain icon="EditPen" :disabled="!activeMap" @click="activeMap && handleEdit(activeMap)">
              地图编辑
            </el-button>
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
                :class="{ active: String(m.id) === selectedMapId }"
                @click="selectMap(m)"
                @dblclick="handleEdit(m)"
              >
                <span class="scene-icon" />
                <span class="scene-name">{{ m.name }}</span>
              </button>

              <button type="button" class="scene-item add" :disabled="!selectedFactoryId" @click="handleAdd">
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
import { watch } from 'vue';

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
const SCALE = 0.1; // 将坐标转换为画布上的像素（假设画布宽度1000px对应10000mm）

// SVG 画布大小（基于地图范围）
const svgWidth = ref(1000);
const svgHeight = ref(800);

const selectedFactoryId = ref<number | undefined>(undefined);
const selectedMapId = ref<string>('');

// 原点拖动状态
const originPosition = reactive({ x: 20, y: 20 });
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const originStart = reactive({ x: 0, y: 0 });

// 开始拖动
const startDragOrigin = (e: MouseEvent) => {
  isDragging.value = true;
  // 记录当前原点位置
  originStart.x = originPosition.x;
  originStart.y = originPosition.y;

  // 获取鼠标位置
  const canvasEl = document.querySelector('.stage2-canvas') as HTMLElement;
  if (!canvasEl) return;

  const rect = canvasEl.getBoundingClientRect();
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  document.body.style.cursor = 'move';
};

// 拖动中
const onDragOrigin = (e: MouseEvent) => {
  if (!isDragging.value) return;

  const canvasEl = document.querySelector('.stage2-canvas') as HTMLElement;
  if (!canvasEl) return;

  const rect = canvasEl.getBoundingClientRect();
  const deltaX = (e.clientX - dragStart.x) / rect.width * 100;
  const deltaY = (dragStart.y - e.clientY) / rect.height * 100; // 反转Y方向

  originPosition.x = Math.max(0, Math.min(100, originStart.x + deltaX));
  originPosition.y = Math.max(0, Math.min(100, originStart.y + deltaY));
};

// 结束拖动
const endDragOrigin = () => {
  if (isDragging.value) {
    isDragging.value = false;
    document.body.style.cursor = '';
  }
};

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

const activeMap = computed(() => mapList.value.find(m => String(m.id) === selectedMapId.value));

// 计算地图元素的范围，确定 SVG viewBox
const mapBounds = computed(() => {
  const points = mapElements.value.points || [];
  if (points.length === 0) {
    return { minX: 0, minY: 0 };
  }
  let minX = Infinity, minY = Infinity;
  points.forEach(p => {
    const x = p.x || 0;
    const y = p.y || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  });
  return { minX, minY };
});

// SVG viewBox
const svgViewBox = computed(() => {
  const b = mapBounds.value;
  return `${b.minX * SCALE} ${b.minY * SCALE} ${svgWidth.value} ${svgHeight.value}`;
});

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
      selectedMapId.value = String(mapList.value[0].id);
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
      factoryModelId: selectedFactoryId.value ? String(selectedFactoryId.value) : undefined,
      mapId: undefined
    }
  });
  loadMaps();
};

// 选择工厂
const selectFactory = (factory: FactoryModelVO) => {
  selectedFactoryId.value = factory.id;
  selectedMapId.value = '';
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
    id: String(row.id),
    name: row.name
  });
  // 跳转到地图编辑器页面（带查询参数）
  router.push({
    path: '/opentcs/map/mapeditor',
    query: { id: row.id, name: row.name }
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

// 监听地图元素变化，更新 SVG 画布大小
watch(
  () => mapElements.value.points,
  (points) => {
    if (!points || points.length === 0) {
      svgWidth.value = 1000;
      svgHeight.value = 800;
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      const x = p.x || 0;
      const y = p.y || 0;
      const r = p.editorProps?.radius || 10;
      minX = Math.min(minX, x - r);
      minY = Math.min(minY, y - r);
      maxX = Math.max(maxX, x + r);
      maxY = Math.max(maxY, y + r);
    });
    // 加上边距
    const padding = 100;
    svgWidth.value = (maxX - minX + padding * 2) * SCALE;
    svgHeight.value = (maxY - minY + padding * 2) * SCALE;
  },
  { immediate: true }
);

const selectMap = (row: NavigationMapVO) => {
  selectedMapId.value = String(row.id);
  // 重置原点到画布左下方中间
  originPosition.x = 20;
  originPosition.y = 20;
  router.replace({
    query: {
      ...router.currentRoute.value.query,
      factoryModelId: selectedFactoryId.value ? String(selectedFactoryId.value) : undefined,
      mapId: selectedMapId.value
    }
  });
  // 加载地图元素
  loadMapElements(row.id);
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

  const factoryIdFromQuery = Number(router.currentRoute.value.query.factoryModelId);
  const mapIdFromQuery = router.currentRoute.value.query.mapId ? String(router.currentRoute.value.query.mapId) : '';

  if (!Number.isNaN(factoryIdFromQuery) && factoryIdFromQuery > 0) {
    selectedFactoryId.value = factoryIdFromQuery;
    if (mapIdFromQuery) selectedMapId.value = mapIdFromQuery;
    loadMaps().then(() => {
      // 若 query 里的 mapId 在当前工厂不存在，则回退到第一张
      if (selectedMapId.value && !mapList.value.some(m => String(m.id) === selectedMapId.value)) {
        selectedMapId.value = mapList.value.length > 0 ? String(mapList.value[0].id) : '';
      }
      // 加载地图元素
      if (selectedMapId.value) {
        loadMapElements(selectedMapId.value);
      }
    });
  }
  // 如果 URL 没有 factoryModelId，getFactoryList 会自动选择第一个工厂
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
}

.canvas-image {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  cursor: crosshair;
}

.canvas-elements {
  position: absolute;
  left: 0;
  bottom: 0;
  overflow: hidden;
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
  display: grid;
  place-items: center;
}

// 坐标轴容器
.canvas-axis {
  position: absolute;
  left: 170px;
  bottom: 0;
  right: 0;
  top: 0;
  z-index: 10;
}

.axis-origin {
  position: absolute;
  transform: translate(4px, 4px);
  font-size: 10px;
  color: #6b7280;
  cursor: move;
  user-select: none;
  pointer-events: auto;
  padding: 4px;

  &:hover {
    color: #2563eb;
    font-weight: 500;
  }
}

.axis-line {
  position: absolute;
}

.axis-x {
  left: 0;
  bottom: 0;
  height: 2px;
  width: 20%;
  min-width: 80px;
  max-width: 200px;
  background: #2563eb;
}

.axis-x::before {
  content: '';
  position: absolute;
  right: 0;
  top: -4px;
  border-left: 6px solid #2563eb;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

.axis-x::after {
  content: 'X';
  position: absolute;
  right: 4px;
  top: -18px;
  font-size: 12px;
  font-weight: bold;
  color: #2563eb;
}

.axis-y {
  left: 0;
  bottom: 0;
  width: 2px;
  height: 20%;
  min-height: 80px;
  max-height: 200px;
  background: #ef4444;
}

.axis-y::before {
  content: '';
  position: absolute;
  top: 0;
  left: -4px;
  border-bottom: 6px solid #ef4444;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

.axis-y::after {
  content: 'Y';
  position: absolute;
  left: 6px;
  top: 4px;
  font-size: 12px;
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

.footer-sep {
  color: #9ca3af;
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
</style>
