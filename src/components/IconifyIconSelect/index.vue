<template>
  <div class="iconify-icon-select">
    <el-input v-model="displayValue" readonly placeholder="点击选择图标或手动输入" @click="showPicker = !showPicker">
      <template #prepend>
        <div v-if="displayValue" class="icon-preview">
          <svg-icon v-if="isLocationSymbol(displayValue)" :icon-class="`location_symbols-${displayValue}`" style="font-size: 18px;" />
          <Icon v-else-if="isIconifyIcon(displayValue)" :icon="displayValue" :width="20" :height="20" />
          <span v-else class="text-icon">{{ displayValue }}</span>
        </div>
      </template>
      <template #append>
        <el-button @click.stop="showPicker = !showPicker" icon="Search" />
      </template>
    </el-input>
    
    <el-input
      v-if="showPicker"
      v-model="filterValue"
      placeholder="搜索图标或输入自定义文本（如：L, P, W等）"
      class="mt-2"
      clearable
      @input="handleFilter"
    >
      <template #append>
        <el-button @click="handleUseText">使用文本</el-button>
      </template>
    </el-input>

    <el-drawer v-model="showPicker" title="选择图标" size="500px" direction="rtl">
      <div class="icon-picker-content">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="位置符号" name="location">
            <el-input
              v-model="filterValue"
              placeholder="搜索位置符号"
              class="mb-3"
              clearable
              @input="handleLocationFilter"
            />
            <el-scrollbar height="calc(100vh - 200px)">
              <div class="icon-grid">
                <div
                  v-for="icon in filteredLocationIcons"
                  :key="icon"
                  :class="['icon-item', { active: modelValue === icon }]"
                  @click="selectLocationIcon(icon)"
                >
                  <svg-icon :icon-class="`location_symbols-${icon}`" style="font-size: 24px;" />
                  <div class="icon-name">{{ icon }}</div>
                </div>
              </div>
              <div v-if="filteredLocationIcons.length === 0" class="empty-tip">
                <el-empty description="未找到匹配的图标" :image-size="100" />
              </div>
            </el-scrollbar>
          </el-tab-pane>
          <el-tab-pane label="Iconify图标" name="iconify">
            <el-input
              v-model="filterValue"
              placeholder="搜索图标（如：mdi:home, carbon:user等）"
              class="mb-3"
              clearable
              @input="handleFilter"
            />
            <el-scrollbar height="calc(100vh - 200px)">
              <div class="icon-grid">
                <div
                  v-for="icon in filteredIcons"
                  :key="icon"
                  :class="['icon-item', { active: modelValue === icon }]"
                  @click="selectIcon(icon)"
                >
                  <Icon :icon="icon" :width="24" :height="24" />
                  <div class="icon-name">{{ icon }}</div>
                </div>
              </div>
              <div v-if="filteredIcons.length === 0" class="empty-tip">
                <el-empty description="未找到匹配的图标" :image-size="100" />
              </div>
            </el-scrollbar>
          </el-tab-pane>
          <el-tab-pane label="自定义文本" name="text">
            <el-input
              v-model="textValue"
              placeholder="输入自定义文本，如：L, P, W, C等"
              maxlength="10"
              show-word-limit
            />
            <div class="text-preview mt-3">
              <div class="preview-label">预览：</div>
              <div class="preview-text">{{ textValue || '示例文本' }}</div>
            </div>
            <el-button type="primary" class="mt-3" @click="selectText">确认使用文本</el-button>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { Search } from '@element-plus/icons-vue';
import { propTypes } from '@/utils/propTypes';
import SvgIcon from '@/components/SvgIcon/index.vue';

const props = defineProps({
  modelValue: propTypes.string.def(''),
  width: propTypes.string.def('100%')
});

const emit = defineEmits(['update:modelValue']);

const showPicker = ref(false);
const filterValue = ref('');
const activeTab = ref('location');
const textValue = ref('');
const displayValue = computed(() => props.modelValue);

// 加载 location_symbols 文件夹中的 SVG 图标
const locationSymbolIcons = ref<string[]>([]);
const filteredLocationIcons = ref<string[]>([]);

// 动态加载 location_symbols 文件夹中的图标
const loadLocationSymbols = () => {
  const modules = import.meta.glob('@/assets/location_symbols/*.svg');
  const icons: string[] = [];
  for (const path in modules) {
    const iconName = path.split('location_symbols/')[1]?.split('.svg')[0];
    if (iconName) {
      icons.push(iconName);
    }
  }
  locationSymbolIcons.value = icons.sort();
  filteredLocationIcons.value = icons;
};

// 初始化加载
onMounted(() => {
  loadLocationSymbols();
});

// 常用图标列表（可以根据需要扩展）
const commonIcons = [
  'mdi:home',
  'mdi:map-marker',
  'mdi:warehouse',
  'mdi:package-variant',
  'mdi:factory',
  'mdi:car',
  'mdi:truck',
  'mdi:robot',
  'mdi:palette',
  'mdi:star',
  'mdi:heart',
  'mdi:flag',
  'carbon:location',
  'carbon:location-filled',
  'carbon:warehouse',
  'carbon:package',
  'carbon:building',
  'carbon:car',
  'carbon:truck',
  'carbon:robot',
  'carbon:circle',
  'carbon:square',
  'carbon:triangle',
  'carbon:hexagon',
  'ep:location',
  'ep:location-filled',
  'ep:house',
  'ep:shop',
  'ep:office-building',
  'ep:truck',
  'ep:car',
  'ep:circle',
  'ep:square',
  'ep:star',
  'ep:flag',
  'material-symbols:location-on',
  'material-symbols:warehouse',
  'material-symbols:factory',
  'material-symbols:local-shipping',
  'material-symbols:home',
  'material-symbols:store',
  'material-symbols:circle',
  'material-symbols:square',
  'material-symbols:star',
  'material-symbols:flag'
];

const filteredIcons = ref<string[]>(commonIcons);

// 判断是否是 Iconify 图标格式（包含冒号）
const isIconifyIcon = (value: string): boolean => {
  return value.includes(':');
};

// 判断是否是位置符号（在 locationSymbolIcons 中）
const isLocationSymbol = (value: string): boolean => {
  return locationSymbolIcons.value.includes(value);
};

// 筛选位置符号
const handleLocationFilter = () => {
  if (!filterValue.value) {
    filteredLocationIcons.value = locationSymbolIcons.value;
    return;
  }
  filteredLocationIcons.value = locationSymbolIcons.value.filter(icon => 
    icon.toLowerCase().includes(filterValue.value.toLowerCase())
  );
};

// 筛选图标
const handleFilter = () => {
  if (!filterValue.value) {
    filteredIcons.value = commonIcons;
    return;
  }
  
  // 如果输入包含冒号，说明是 Iconify 格式，直接搜索
  if (filterValue.value.includes(':')) {
    filteredIcons.value = commonIcons.filter(icon => 
      icon.toLowerCase().includes(filterValue.value.toLowerCase())
    );
  } else {
    // 否则在所有图标中搜索
    filteredIcons.value = commonIcons.filter(icon => 
      icon.toLowerCase().includes(filterValue.value.toLowerCase())
    );
  }
};

// 选择位置符号
const selectLocationIcon = (icon: string) => {
  emit('update:modelValue', icon);
  showPicker.value = false;
  filterValue.value = '';
};

// 选择图标
const selectIcon = (icon: string) => {
  emit('update:modelValue', icon);
  showPicker.value = false;
  filterValue.value = '';
};

// 选择文本
const selectText = () => {
  if (textValue.value) {
    emit('update:modelValue', textValue.value);
    showPicker.value = false;
    textValue.value = '';
    activeTab.value = 'iconify';
  }
};

// 使用文本按钮
const handleUseText = () => {
  if (filterValue.value && !filterValue.value.includes(':')) {
    emit('update:modelValue', filterValue.value);
    showPicker.value = false;
    filterValue.value = '';
  } else {
    activeTab.value = 'text';
    textValue.value = filterValue.value;
  }
};

// 监听显示状态，重置状态
watch(showPicker, (visible) => {
  if (visible) {
    filterValue.value = '';
    const currentValue = props.modelValue;
    textValue.value = currentValue && !isIconifyIcon(currentValue) && !isLocationSymbol(currentValue) ? currentValue : '';
    // 根据当前值确定默认标签页
    if (isLocationSymbol(currentValue)) {
      activeTab.value = 'location';
    } else if (isIconifyIcon(currentValue)) {
      activeTab.value = 'iconify';
    } else {
      activeTab.value = 'text';
    }
  }
});
</script>

<style scoped lang="scss">
.iconify-icon-select {
  width: 100%;
  
  .icon-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    
    .text-icon {
      font-size: 14px;
      font-weight: bold;
      color: var(--el-text-color-regular);
    }
  }
}

.icon-picker-content {
  padding: 10px;
  
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 10px;
    padding: 10px 0;
    
    .icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        border-color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
      }
      
      &.active {
        border-color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-8);
      }
      
      .icon-name {
        margin-top: 6px;
        font-size: 10px;
        color: var(--el-text-color-secondary);
        text-align: center;
        word-break: break-all;
        max-width: 100%;
      }
    }
  }
  
  .empty-tip {
    padding: 40px 0;
    text-align: center;
  }
  
  .text-preview {
    padding: 20px;
    background-color: var(--el-bg-color-page);
    border-radius: 4px;
    border: 1px solid var(--el-border-color);
    
    .preview-label {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
    }
    
    .preview-text {
      font-size: 24px;
      font-weight: bold;
      color: var(--el-text-color-regular);
      text-align: center;
    }
  }
}
</style>

