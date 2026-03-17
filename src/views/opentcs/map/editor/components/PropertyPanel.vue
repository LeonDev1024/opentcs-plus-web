<template>
  <div class="property-panel">
    <div class="panel-content">
      <!-- Layout 属性（与 openTCS 一致：选中布局时显示） -->
      <div v-if="selectedType === 'layout'" class="layout-properties">
        <div class="element-title">Layout</div>
        <table class="kv-table">
          <thead>
            <tr>
              <th class="kv-header-key">Attribute</th>
              <th class="kv-header-value">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="kv-key">Name</td>
              <td class="kv-value">
                <el-input v-model="layoutForm.name" size="small" @change="updateLayout" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Scale of x-axis</td>
              <td class="kv-value">
                <el-input-number v-model="layoutForm.scaleX" size="small" :min="0.1" :step="1" :precision="1" @change="updateLayout" />
                <span class="kv-unit"> mm</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Scale of y-axis</td>
              <td class="kv-value">
                <el-input-number v-model="layoutForm.scaleY" size="small" :min="0.1" :step="1" :precision="1" @change="updateLayout" />
                <span class="kv-unit"> mm</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Miscellaneous</td>
              <td class="kv-value"><span class="kv-readonly">-</span></td>
            </tr>
            <tr>
              <td class="kv-key">Layers</td>
              <td class="kv-value"><span class="kv-readonly">{{ defaultLayerName }}</span></td>
            </tr>
            <tr>
              <td class="kv-key">Layer groups</td>
              <td class="kv-value"><span class="kv-readonly">{{ defaultLayerGroupName }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 无选择状态 -->
      <div v-else-if="!selectedElement" class="no-selection">
        <el-empty description="请选择一个元素或布局" />
      </div>

      <!-- 点属性编辑：Key / Value 表格形式（对齐 openTCS Point 属性） -->
      <div v-else-if="selectedType === 'point'" class="point-properties">
        <div class="element-title">Point</div>
        <table class="kv-table">
          <thead>
            <tr>
              <th class="kv-header-key">Attribute</th>
              <th class="kv-header-value">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="kv-key">Name</td>
              <td class="kv-value">
                <el-input v-model="pointForm.name" size="small" @change="updatePoint" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">x-position</td>
              <td class="kv-value">
                <el-input-number v-model="pointForm.x" size="small" :step="1" @change="updatePoint" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">y-position</td>
              <td class="kv-value">
                <el-input-number v-model="pointForm.y" size="small" :step="1" @change="updatePoint" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Type</td>
              <td class="kv-value">
                <el-select v-model="pointForm.type" size="small" placeholder="Type" @change="updatePoint">
                  <el-option label="Halt point" value="Halt point" />
                  <el-option label="Park point" value="Park point" />
                </el-select>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Locked</td>
              <td class="kv-value">
                <el-switch v-model="pointForm.locked" size="small" @change="togglePointLock" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Angle</td>
              <td class="kv-value">
                <span class="kv-readonly">NaN deg</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Vehicle envelopes</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Maximum vehicle body length</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Miscellaneous</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Label x offset</td>
              <td class="kv-value">
                <span class="kv-readonly">0</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Label y offset</td>
              <td class="kv-value">
                <span class="kv-readonly">0</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Label orientation angle</td>
              <td class="kv-value">
                <span class="kv-readonly">0</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Layer</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getLayerName(pointForm.layerId) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Link 属性编辑：Key / Value 表格形式（对齐 openTCS Link 属性） -->
      <div v-else-if="selectedType === 'path' && isCurrentPathLink" class="path-properties">
        <div class="element-title">Link</div>
        <table class="kv-table">
          <thead>
            <tr>
              <th class="kv-header-key">Attribute</th>
              <th class="kv-header-value">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="kv-key">Name</td>
              <td class="kv-value">
                <el-input v-model="pathForm.name" size="small" @change="updatePath" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Actions</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Start component</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getComponentName(pathForm.startPointId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">End component</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getComponentName(pathForm.endPointId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Layer</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getLayerName(pathForm.layerId) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Path 属性编辑：Key / Value 表格形式（对齐 openTCS Path 属性） -->
      <div v-else-if="selectedType === 'path'" class="path-properties">
        <div class="element-title">Path</div>
        <table class="kv-table">
          <thead>
            <tr>
              <th class="kv-header-key">Attribute</th>
              <th class="kv-header-value">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="kv-key">Name</td>
              <td class="kv-value">
                <el-input v-model="pathForm.name" size="small" @change="updatePath" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Locked</td>
              <td class="kv-value">
                <el-switch v-model="pathForm.locked" size="small" @change="togglePathLock" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Length</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ formatPathLength(pathForm) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Maximum velocity</td>
              <td class="kv-value">
                <span class="kv-readonly">0.0 mm/s</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Maximum reverse velocity</td>
              <td class="kv-value">
                <span class="kv-readonly">0.0 mm/s</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Path connection type</td>
              <td class="kv-value">
                <el-select v-model="pathForm.type" size="small" placeholder="Path connection type" @change="updatePath">
                  <el-option label="Direct" value="direct" />
                  <el-option label="Orthogonal" value="orthogonal" />
                  <el-option label="Curve" value="curve" />
                </el-select>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Path control points</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ pathForm.geometry.controlPoints.length }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Start component</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getPointName(pathForm.startPointId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">End component</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getPointName(pathForm.endPointId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Layer</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getLayerName(pathForm.layerId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Locked</td>
              <td class="kv-value">
                <span class="kv-readonly">false</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Peripheral operations</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Vehicle envelopes</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Miscellaneous</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Location 属性编辑：Key / Value 表格形式（对齐 openTCS Location 属性） -->
      <div v-else-if="selectedType === 'location'" class="location-properties">
        <div class="element-title">Location</div>
        <table class="kv-table">
          <thead>
            <tr>
              <th class="kv-header-key">Attribute</th>
              <th class="kv-header-value">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="kv-key">Name</td>
              <td class="kv-value">
                <el-input v-model="locationForm.name" size="small" @change="updateLocation" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">Locked</td>
              <td class="kv-value">
                <el-switch v-model="locationForm.locked" size="small" @change="toggleLocationLock" />
              </td>
            </tr>
            <tr>
              <td class="kv-key">x-Position</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ formatLocationX(locationForm) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">y-Position</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ formatLocationY(locationForm) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Type</td>
              <td class="kv-value">
                <el-select
                  v-model="locationForm.locationTypeId"
                  size="small"
                  placeholder="选择位置类型"
                  clearable
                  filterable
                  style="width: 100%"
                  @change="updateLocation"
                >
                  <el-option
                    v-for="item in locationTypeOptions"
                    :key="String(item.id)"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Locked</td>
              <td class="kv-value">
                <span class="kv-readonly">false</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Symbol</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getSymbolForLocationType(locationForm.locationTypeId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Label x offset</td>
              <td class="kv-value">
                <span class="kv-readonly">0</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Label y offset</td>
              <td class="kv-value">
                <span class="kv-readonly">0</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Label orientation angle</td>
              <td class="kv-value">
                <span class="kv-readonly">0</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Layer</td>
              <td class="kv-value">
                <span class="kv-readonly">{{ getLayerName(locationForm.layerId) }}</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Reservation token</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Peripheral state</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Processing state</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Peripheral job</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
            <tr>
              <td class="kv-key">Miscellaneous</td>
              <td class="kv-value">
                <span class="kv-readonly">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';
import { getLocationTypeListForSelect } from '@/api/opentcs/map/location';
import type { LocationVO } from '@/api/opentcs/map/location/types';

const mapEditorStore = useMapEditorStore();

// 位置类型下拉选项（来自接口）
const locationTypeOptions = ref<LocationVO[]>([]);

const loadLocationTypes = async () => {
  try {
    locationTypeOptions.value = await getLocationTypeListForSelect();
  } catch (e) {
    console.error('加载位置类型列表失败', e);
  }
};

onMounted(() => {
  loadLocationTypes();
});

const getLayerName = (layerId: string) => {
  if (!layerId) return '';
  const layer = mapEditorStore.layers.find(l => l.id === layerId);
  return layer?.name || '';
};

const getPointName = (pointId: string | number | undefined) => {
  if (pointId === undefined || pointId === null) return '';
  const normalizedId = String(pointId);
  const point = mapEditorStore.points.find(p => String(p.id) === normalizedId);
  return point?.name || normalizedId;
};

const getComponentName = (id: string | number | undefined) => {
  if (id === undefined || id === null) return '';
  const normalizedId = String(id);
  const point = mapEditorStore.points.find(p => String(p.id) === normalizedId);
  if (point) return point.name || normalizedId;
  const location = mapEditorStore.locations.find(l => String(l.id) === normalizedId);
  return location?.name || normalizedId;
};

// 根据选中的 locationTypeId 取该位置类型 properties 中 name 为 symbol 的 value
const getSymbolForLocationType = (locationTypeId: string | number | undefined): string => {
  if (locationTypeId === undefined || locationTypeId === null) return '-';
  const type = locationTypeOptions.value.find(t => String(t.id) === String(locationTypeId));
  if (!type?.properties || !Array.isArray(type.properties)) return '-';
  const p = type.properties.find((x: any) => x && (x.name === 'symbol' || x.name === 'Symbol'));
  return (p && p.value) ? String(p.value) : '-';
};

// 选中类型
const selectedType = computed(() => mapEditorStore.selection.selectedType);

// 选中的元素（单选时）
const selectedElement = computed<MapPoint | MapPath | MapLocation | null>(() => {
  const selectedIds = mapEditorStore.selection.selectedIds;
  if (!selectedType.value || selectedIds.size !== 1) {
    return null;
  }
  if (selectedType.value === 'layout') return null;
  const id = Array.from(selectedIds)[0];
  if (selectedType.value === 'point') {
    return mapEditorStore.points.find(p => p.id === id) || null;
  } else if (selectedType.value === 'path') {
    return mapEditorStore.paths.find(p => p.id === id) || null;
  } else if (selectedType.value === 'location') {
    return mapEditorStore.locations.find(l => l.id === id) || null;
  }
  return null;
});

// Layout 表单（与 openTCS 一致）
const layoutForm = ref({ name: '', scaleX: 50, scaleY: 50 });
const defaultLayerName = computed(() => mapEditorStore.layers[0]?.name || 'Default layer');
const defaultLayerGroupName = computed(() => mapEditorStore.layerGroups[0]?.name || 'Default layer group');

watch(
  () => [selectedType.value, mapEditorStore.mapData] as const,
  () => {
    if (selectedType.value === 'layout' && mapEditorStore.mapData) {
      const info = mapEditorStore.mapData.mapInfo;
      const vl = mapEditorStore.mapData.visualLayout;
      layoutForm.value = {
        name: vl?.name ?? info?.name ?? 'Layout VLayout-01',
        scaleX: Number(info?.scaleX ?? vl?.scaleX ?? 50),
        scaleY: Number(info?.scaleY ?? vl?.scaleY ?? 50)
      };
    }
  },
  { immediate: true }
);

const updateLayout = () => {
  mapEditorStore.updateLayoutProperties({
    name: layoutForm.value.name,
    scaleX: layoutForm.value.scaleX,
    scaleY: layoutForm.value.scaleY
  });
};

// 点表单数据
const pointForm = ref<MapPoint>({
  id: '',
  layerId: '',
  name: '',
  x: 0,
  y: 0,
  status: '0',
  locked: false,
  editorProps: {
    radius: 5,
    color: '#8c8c8c',
    strokeColor: '#d9d9d9',
    labelVisible: true
  }
});

// 路径表单数据
const pathForm = ref<MapPath>({
  id: '',
  layerId: '',
  name: '',
  status: '0',
  locked: false,
  geometry: {
    controlPoints: [],
    pathType: 'line'
  },
  editorProps: {
    strokeColor: '#73c0ff',
    strokeWidth: 2,
    lineStyle: 'solid',
    arrowVisible: true,
    labelVisible: true
  }
});

// 位置表单数据
const locationForm = ref<MapLocation>({
  id: '',
  layerId: '',
  name: '',
  status: '0',
  locked: false,
  geometry: {
    vertices: [],
    closed: true
  },
  editorProps: {
    fillColor: '#ffffff',
    fillOpacity: 1,
    strokeColor: '#000000',
    strokeWidth: 2,
    labelVisible: true
  }
});

// 选中元素变化时同步表单
watch(selectedElement, (newElement) => {
  if (!newElement || !selectedType.value) return;

  if (selectedType.value === 'point') {
    pointForm.value = { ...(newElement as MapPoint) };
  } else if (selectedType.value === 'path') {
    pathForm.value = { ...(newElement as MapPath) };
  } else if (selectedType.value === 'location') {
    locationForm.value = { ...(newElement as MapLocation) };
  }
});

// 按需回写到 store（由表格控件的 @change 触发）
const updatePoint = () => {
  if (selectedType.value === 'point' && selectedElement.value) {
    mapEditorStore.updatePoint((selectedElement.value as MapPoint).id, pointForm.value);
  }
};

// 计算路径长度（简单使用控制点距离之和）
const formatPathLength = (path: MapPath) => {
  const cps = path.geometry.controlPoints;
  if (!cps || cps.length < 2) return '0.0 mm';
  let len = 0;
  for (let i = 0; i < cps.length - 1; i++) {
    const p1 = cps[i];
    const p2 = cps[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return `${len.toFixed(1)} mm`;
};

// 计算 Location 中心点
const getLocationCenter = (loc: MapLocation) => {
  const vertices = loc.geometry?.vertices || [];
  if (vertices.length === 0) {
    return {
      x: loc.x ?? 0,
      y: loc.y ?? 0
    };
  }
  let sumX = 0;
  let sumY = 0;
  vertices.forEach(v => {
    sumX += v.x;
    sumY += v.y;
  });
  return {
    x: sumX / vertices.length,
    y: sumY / vertices.length
  };
};

const formatLocationX = (loc: MapLocation) => {
  const center = getLocationCenter(loc);
  return `${center.x.toFixed(1)} mm`;
};

const formatLocationY = (loc: MapLocation) => {
  const center = getLocationCenter(loc);
  return `${center.y.toFixed(1)} mm`;
};

const formatLocationType = (loc: MapLocation) => {
  if (loc.description) return loc.description;
  if (loc.locationTypeId !== undefined && loc.locationTypeId !== null) {
    return String(loc.locationTypeId);
  }
  return '';
};

// 判断当前选中路径是否为 Link（根据图层组名称或名称前缀）
const isCurrentPathLink = computed(() => {
  if (selectedType.value !== 'path') return false;
  const layer = mapEditorStore.layers.find(l => l.id === pathForm.value.layerId);
  if (!layer) return false;
  const group = mapEditorStore.layerGroups.find(g => g.id === layer.layerGroupId);
  if (group && group.name === 'Links') return true;
  return !!pathForm.value.name && pathForm.value.name.startsWith('Link');
});

// 更新路径属性
const updatePath = () => {
  if (selectedType.value === 'path' && selectedElement.value) {
    mapEditorStore.updatePath((selectedElement.value as MapPath).id, pathForm.value);
  }
};

// 更新位置属性
const updateLocation = () => {
  if (selectedType.value === 'location' && selectedElement.value) {
    mapEditorStore.updateLocation((selectedElement.value as MapLocation).id, locationForm.value);
  }
};

// 切换点锁定状态
const togglePointLock = () => {
  if (selectedType.value === 'point' && selectedElement.value) {
    mapEditorStore.togglePointLock((selectedElement.value as MapPoint).id);
  }
};

// 切换路径锁定状态
const togglePathLock = () => {
  if (selectedType.value === 'path' && selectedElement.value) {
    mapEditorStore.togglePathLock((selectedElement.value as MapPath).id);
  }
};

// 切换位置锁定状态
const toggleLocationLock = () => {
  if (selectedType.value === 'location' && selectedElement.value) {
    mapEditorStore.toggleLocationLock((selectedElement.value as MapLocation).id);
  }
};
</script>

<style scoped lang="scss">
.property-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  
  .panel-header {
    height: 30px;
    padding: 0 12px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    
    .panel-title {
      font-size: 12px;
      color: #606266;
      line-height: 1;
      font-weight: 500;
    }
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
    /* 去掉左侧内边距，使表格贴边左对齐 */
    padding: 12px 12px 12px 0;
    
    .no-selection {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kv-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin: 0;

      .kv-header-key,
      .kv-header-value {
        padding: 4px 8px;
        background: #ebeef5;
        color: #606266;
        border: 1px solid #dcdfe6;
        font-weight: 500;
        text-align: left;
      }

      .kv-key {
        width: 50%;
        padding: 4px 8px;
        background: #f5f7fa;
        color: #606266;
        border: 1px solid #ebeef5;
        white-space: nowrap;
      }

      .kv-value {
        padding: 4px 8px;
        border: 1px solid #ebeef5;

        :deep(.el-input),
        :deep(.el-input-number),
        :deep(.el-select) {
          width: 100%;
        }
      }

      .kv-readonly {
        color: #303133;
      }

      .kv-unit {
        color: #909399;
        margin-left: 2px;
        font-size: 12px;
      }
    }

    .kv-actions {
      margin-top: 8px;
      text-align: right;
    }

    .element-title {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #303133;
    }

    .element-legend {
      margin-top: 12px;
      font-size: 12px;
      color: #909399;
    }
    
    .el-form-item {
      margin-bottom: 16px;
      
      .el-form-item__label {
        font-size: 12px;
        color: #606266;
        margin-bottom: 4px;
      }
      
      .el-input,
      .el-select,
      .el-input-number,
      .el-color-picker,
      .el-switch {
        width: 100%;
        margin-bottom: 8px;
      }
      
      .el-textarea {
        width: 100%;
      }
    }
  }
}
</style>