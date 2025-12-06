<template>
  <div class="property-panel">
    <div class="panel-header">
      <h3>{{ selectedType ? getTypeLabel(selectedType) : (selectedElements.length === 0 ? 'Layout' : '属性') }}</h3>
    </div>
    
    <div class="panel-content">
      <div v-if="selectedElements.length === 0" class="property-table">
        <el-table
          :data="modelPropertyData"
          border
          size="small"
          :show-header="true"
          style="width: 100%"
        >
          <el-table-column prop="attribute" label="属性" width="140" />
          <el-table-column prop="value" label="值">
            <template #default="{ row }">
              <span class="value-text">{{ row.value }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div v-else-if="selectedElements.length === 1" class="property-table">
        <el-table
          :data="propertyData"
          border
          size="small"
          :show-header="true"
          style="width: 100%"
        >
          <el-table-column prop="attribute" label="属性" width="140" />
          <el-table-column prop="value" label="值">
            <template #default="{ row }">
              <span class="value-text">{{ row.value }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div v-else class="multi-select">
        <el-alert
          title="已选择多个元素"
          :description="`已选择 ${selectedElements.length} 个元素`"
          type="info"
          :closable="false"
        />
        <el-button
          type="danger"
          style="margin-top: 16px; width: 100%"
          @click="handleDeleteSelected"
        >
          删除选中元素
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';

const mapEditorStore = useMapEditorStore();

const selectedElements = computed(() => mapEditorStore.selectedElements);
const selectedType = computed(() => mapEditorStore.selection.selectedType);

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    point: '点',
    path: '路径',
    location: '位置'
  };
  return labels[type] || '属性';
};

// 模型属性数据（当没有选中元素时显示）
const modelPropertyData = computed(() => {
  const data: Array<{ attribute: string; value: string }> = [];
  const mapInfo = mapEditorStore.mapData?.mapInfo;
  
  if (mapInfo) {
    // Name
    data.push({ 
      attribute: 'Name', 
      value: mapInfo.name || '新地图' 
    });
    
    // Scale of x-axis
    data.push({ 
      attribute: 'Scale of x-axis', 
      value: `${mapInfo.scaleX || 50.0} mm` 
    });
    
    // Scale of y-axis
    data.push({ 
      attribute: 'Scale of y-axis', 
      value: `${mapInfo.scaleY || 50.0} mm` 
    });
    
    // Layers - 显示默认图层名称
    const defaultLayer = mapEditorStore.layers.find(l => l.name === 'Default layer');
    data.push({ 
      attribute: 'Layers', 
      value: defaultLayer ? defaultLayer.name : (mapEditorStore.layers[0]?.name || 'Default layer')
    });
    
    // Layer groups - 显示默认图层组名称
    const defaultLayerGroup = mapEditorStore.layerGroups.find(g => g.name === 'Default layer group');
    data.push({ 
      attribute: 'Layer groups', 
      value: defaultLayerGroup ? defaultLayerGroup.name : (mapEditorStore.layerGroups[0]?.name || 'Default layer group')
    });
  }
  
  return data;
});

const propertyData = computed(() => {
  if (selectedElements.value.length !== 1) {
    return [];
  }
  
  const element = selectedElements.value[0];
  const data: Array<{ attribute: string; value: string }> = [];
  
  if (selectedType.value === 'point') {
    const point = element as MapPoint;
    data.push({ attribute: '名称', value: point.name || '' });
    data.push({ attribute: '编码', value: point.code || '' });
    data.push({ attribute: 'X坐标', value: `${point.x.toFixed(1)} mm` });
    data.push({ attribute: 'Y坐标', value: `${point.y.toFixed(1)} mm` });
    data.push({ attribute: 'Z坐标', value: point.z ? `${point.z.toFixed(1)} mm` : 'NaN mm' });
    data.push({ attribute: '角度', value: 'NaN deg' });
    data.push({ attribute: '类型', value: point.type || 'Halt point' });
    data.push({ attribute: '半径', value: `${point.editorProps.radius} px` });
    data.push({ attribute: '颜色', value: point.editorProps.color || '#1890ff' });
    data.push({ attribute: '状态', value: point.status || '0' });
    if (point.description) {
      data.push({ attribute: '描述', value: point.description });
    }
  } else if (selectedType.value === 'path') {
    const path = element as MapPath;
    data.push({ attribute: '名称', value: path.name || '' });
    data.push({ attribute: '编码', value: path.code || '' });
    data.push({ attribute: '长度', value: path.length ? `${path.length.toFixed(2)} mm` : 'NaN mm' });
    data.push({ attribute: '类型', value: path.type || 'Line' });
    data.push({ attribute: '线条颜色', value: path.editorProps.strokeColor || '#52c41a' });
    data.push({ attribute: '线条宽度', value: `${path.editorProps.strokeWidth} px` });
    data.push({ attribute: '线条样式', value: path.editorProps.lineStyle || 'solid' });
    data.push({ attribute: '状态', value: path.status || '0' });
    if (path.description) {
      data.push({ attribute: '描述', value: path.description });
    }
  } else if (selectedType.value === 'location') {
    const location = element as MapLocation;
    data.push({ attribute: '名称', value: location.name || '' });
    data.push({ attribute: '编码', value: location.code || '' });
    data.push({ attribute: '位置类型', value: location.locationTypeId ? String(location.locationTypeId) : 'NaN' });
    data.push({ attribute: '区块ID', value: location.blockId ? String(location.blockId) : 'NaN' });
    data.push({ attribute: 'X坐标', value: location.x ? `${location.x.toFixed(1)} mm` : 'NaN mm' });
    data.push({ attribute: 'Y坐标', value: location.y ? `${location.y.toFixed(1)} mm` : 'NaN mm' });
    data.push({ attribute: 'Z坐标', value: location.z ? `${location.z.toFixed(1)} mm` : 'NaN mm' });
    data.push({ attribute: '填充颜色', value: location.editorProps.fillColor || '#1890ff' });
    data.push({ attribute: '填充透明度', value: String(location.editorProps.fillOpacity || 0.3) });
    data.push({ attribute: '边框颜色', value: location.editorProps.strokeColor || '#1890ff' });
    data.push({ attribute: '边框宽度', value: `${location.editorProps.strokeWidth} px` });
    data.push({ attribute: '状态', value: location.status || '0' });
    if (location.description) {
      data.push({ attribute: '描述', value: location.description });
    }
  }
  
  return data;
});

// 删除选中元素
const handleDeleteSelected = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedElements.value.length} 个元素吗？`,
      '提示',
      { type: 'warning' }
    );
    
    selectedElements.value.forEach(element => {
      if (selectedType.value === 'point') {
        mapEditorStore.deletePoint(element.id);
      } else if (selectedType.value === 'path') {
        mapEditorStore.deletePath(element.id);
      } else if (selectedType.value === 'location') {
        mapEditorStore.deleteLocation(element.id);
      }
    });
    
    mapEditorStore.clearSelection();
    ElMessage.success('删除成功');
  } catch (error) {
    // 用户取消
  }
};
</script>

<style scoped lang="scss">
.property-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .panel-header {
    padding: 8px 12px;
    border-bottom: 1px solid #e4e7ed;
    background: #fff;
    
    h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 400;
      color: #909399;
    }
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    
    .property-table {
      :deep(.el-table) {
        font-size: 12px;
        
        .el-table__header {
          th {
            background: #f5f7fa;
            color: #606266;
            font-weight: 500;
            padding: 8px 0;
          }
        }
        
        .el-table__body {
          td {
            padding: 6px 0;
            
            .value-text {
              color: #409eff;
              cursor: pointer;
              
              &:hover {
                text-decoration: underline;
              }
            }
          }
        }
      }
    }
    
    .multi-select {
      padding: 16px 0;
    }
  }
}
</style>

