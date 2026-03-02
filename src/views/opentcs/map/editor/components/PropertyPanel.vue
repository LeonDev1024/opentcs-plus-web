<template>
  <div class="property-panel">
    <div class="panel-header">
      <span class="panel-title">属性</span>
    </div>
    <div class="panel-content">
      <!-- 无选择状态 -->
      <div v-if="!selectedElement" class="no-selection">
        <el-empty description="请选择一个元素" />
      </div>
      
      <!-- 点属性编辑 -->
      <div v-else-if="selectedElement.type === 'point'" class="point-properties">
        <el-form label-position="top" size="small">
          <el-form-item label="基本属性">
            <el-input v-model="pointForm.name" placeholder="名称" />
            <el-input v-model="pointForm.code" placeholder="编码" />
            <el-select v-model="pointForm.type" placeholder="类型">
              <el-option label="临时停车点" value="Halt point" />
              <el-option label="长时间停车点" value="Park point" />
            </el-select>
            <el-input v-model="pointForm.description" placeholder="描述" type="textarea" />
          </el-form-item>
          
          <el-form-item label="位置">
            <div class="coordinate-inputs">
              <el-input-number v-model="pointForm.x" placeholder="X" :step="1" />
              <el-input-number v-model="pointForm.y" placeholder="Y" :step="1" />
            </div>
          </el-form-item>
          
          <el-form-item label="样式">
            <el-color-picker v-model="pointForm.editorProps.color" show-alpha />
            <el-color-picker v-model="pointForm.editorProps.strokeColor" show-alpha />
            <el-input-number v-model="pointForm.editorProps.radius" placeholder="半径" :min="1" :max="50" :step="1" />
            <el-switch v-model="pointForm.editorProps.labelVisible" label="显示标签" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" size="small" @click="updatePoint">保存</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 路径属性编辑 -->
      <div v-else-if="selectedElement.type === 'path'" class="path-properties">
        <el-form label-position="top" size="small">
          <el-form-item label="基本属性">
            <el-input v-model="pathForm.name" placeholder="名称" />
            <el-input v-model="pathForm.code" placeholder="编码" />
            <el-select v-model="pathForm.type" placeholder="类型">
              <el-option label="直接连线" value="direct" />
              <el-option label="直角连线" value="orthogonal" />
              <el-option label="圆角连线" value="curve" />
            </el-select>
            <el-input v-model="pathForm.description" placeholder="描述" type="textarea" />
          </el-form-item>
          
          <el-form-item label="样式">
            <el-color-picker v-model="pathForm.editorProps.strokeColor" show-alpha />
            <el-input-number v-model="pathForm.editorProps.strokeWidth" placeholder="线宽" :min="1" :max="10" :step="0.5" />
            <el-select v-model="pathForm.editorProps.lineStyle" placeholder="线型">
              <el-option label="实线" value="solid" />
              <el-option label="虚线" value="dashed" />
              <el-option label="点线" value="dotted" />
            </el-select>
            <el-switch v-model="pathForm.editorProps.arrowVisible" label="显示箭头" />
            <el-switch v-model="pathForm.editorProps.labelVisible" label="显示标签" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" size="small" @click="updatePath">保存</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 位置属性编辑 -->
      <div v-else-if="selectedElement.type === 'location'" class="location-properties">
        <el-form label-position="top" size="small">
          <el-form-item label="基本属性">
            <el-input v-model="locationForm.name" placeholder="名称" />
            <el-input v-model="locationForm.code" placeholder="编码" />
            <el-input v-model="locationForm.description" placeholder="描述" type="textarea" />
          </el-form-item>
          
          <el-form-item label="样式">
            <el-color-picker v-model="locationForm.editorProps.fillColor" show-alpha />
            <el-input-number v-model="locationForm.editorProps.fillOpacity" placeholder="填充透明度" :min="0" :max="1" :step="0.1" />
            <el-color-picker v-model="locationForm.editorProps.strokeColor" show-alpha />
            <el-input-number v-model="locationForm.editorProps.strokeWidth" placeholder="线宽" :min="1" :max="10" :step="0.5" />
            <el-switch v-model="locationForm.editorProps.labelVisible" label="显示标签" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" size="small" @click="updateLocation">保存</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';

const mapEditorStore = useMapEditorStore();

// 选中的元素
const selectedElement = computed(() => {
  const selectedIds = mapEditorStore.selection.selectedIds;
  const selectedType = mapEditorStore.selection.selectedType;
  
  if (!selectedType || selectedIds.size !== 1) {
    return null;
  }
  
  const id = Array.from(selectedIds)[0];
  
  if (selectedType === 'point') {
    return mapEditorStore.points.find(p => p.id === id) as MapPoint & { type: 'point' };
  } else if (selectedType === 'path') {
    return mapEditorStore.paths.find(p => p.id === id) as MapPath & { type: 'path' };
  } else if (selectedType === 'location') {
    return mapEditorStore.locations.find(l => l.id === id) as MapLocation & { type: 'location' };
  }
  
  return null;
});

// 点表单数据
const pointForm = ref<MapPoint>({
  id: '',
  layerId: '',
  name: '',
  x: 0,
  y: 0,
  status: '0',
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

// 监听选中元素变化，更新表单数据
watch(selectedElement, (newElement) => {
  if (!newElement) return;
  
  if (newElement.type === 'point') {
    pointForm.value = { ...newElement };
  } else if (newElement.type === 'path') {
    pathForm.value = { ...newElement };
  } else if (newElement.type === 'location') {
    locationForm.value = { ...newElement };
  }
}, { deep: true });

// 更新点属性
const updatePoint = () => {
  if (selectedElement.value?.type === 'point') {
    mapEditorStore.updatePoint(selectedElement.value.id, pointForm.value);
  }
};

// 更新路径属性
const updatePath = () => {
  if (selectedElement.value?.type === 'path') {
    mapEditorStore.updatePath(selectedElement.value.id, pathForm.value);
  }
};

// 更新位置属性
const updateLocation = () => {
  if (selectedElement.value?.type === 'location') {
    mapEditorStore.updateLocation(selectedElement.value.id, locationForm.value);
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
    padding: 12px;
    
    .no-selection {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .coordinate-inputs {
      display: flex;
      gap: 8px;
      
      .el-input-number {
        flex: 1;
      }
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