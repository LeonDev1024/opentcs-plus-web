<template>
  <div class="relative" :style="{ 'width': width }">
    <el-input v-model="modelValue" readonly placeholder="点击选择图标" @click="visible = !visible">
      <template #prepend>
        <svg-icon :icon-class="modelValue" />
      </template>
    </el-input>

    <el-popover shadow="none" :visible="visible" placement="bottom-end" trigger="click" :width="450">
      <template #reference>
        <div class="cursor-pointer text-[#999] absolute right-[10px] top-0 height-[32px] leading-[32px]" @click="visible = !visible">
          <i-ep-caret-top v-show="visible"></i-ep-caret-top>
          <i-ep-caret-bottom v-show="!visible"></i-ep-caret-bottom>
        </div>
      </template>

      <el-input v-model="filterValue" class="p-2" placeholder="搜索图标" clearable @input="filterIcons" />

      <el-scrollbar height="w-[200px]">
        <ul class="icon-list">
          <el-tooltip v-for="(iconName, index) in iconNames" :key="index" :content="iconName" placement="bottom" effect="light">
            <li :class="['icon-item', { active: modelValue == iconName }]" @click="selectedIcon(iconName)">
              <svg-icon color="var(--el-text-color-regular)" :icon-class="iconName" style="font-size: 24px;" />
            </li>
          </el-tooltip>
        </ul>
        <div v-if="iconNames.length === 0" class="empty-tip">
          <el-empty description="未找到匹配的图标" :image-size="80" />
        </div>
      </el-scrollbar>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { propTypes } from '@/utils/propTypes';

const props = defineProps({
  modelValue: propTypes.string.isRequired,
  width: propTypes.string.def('400px')
});

const emit = defineEmits(['update:modelValue']);
const visible = ref(false);
const { modelValue, width } = toRefs(props);
const iconNames = ref<string[]>([]);
const allIcons = ref<string[]>([]);

const filterValue = ref('');

// 同步加载 assets/location 目录下的图标
const modules = import.meta.glob('@/assets/location/*.svg', { eager: false });
const icons: string[] = [];
for (const path in modules) {
  // 处理路径，支持多种格式：@/assets/location/xxx.svg 或 /path/to/assets/location/xxx.svg
  const match = path.match(/location[\/\\]([^\/\\]+)\.svg$/);
  if (match && match[1]) {
    icons.push(match[1]);
  }
}
allIcons.value = icons.sort();
iconNames.value = icons;

// 调试：输出加载的图标列表
console.log('Location icons loaded:', icons);

/**
 * 筛选图标
 */
const filterIcons = () => {
  if (filterValue.value) {
    iconNames.value = allIcons.value.filter((iconName) => 
      iconName.toLowerCase().includes(filterValue.value.toLowerCase())
    );
  } else {
    iconNames.value = allIcons.value;
  }
};

/**
 * 选择图标
 * @param iconName 选择的图标名称
 */
const selectedIcon = (iconName: string) => {
  emit('update:modelValue', iconName);
  visible.value = false;
};
</script>

<style lang="scss" scoped>
.el-scrollbar {
  max-height: calc(50vh - 100px) !important;
  overflow-y: auto;
}
.icon-list {
  display: flex;
  flex-wrap: wrap;
  padding-left: 10px;
  margin-top: 10px;

  .icon-item {
    cursor: pointer;
    width: 60px;
    height: 60px;
    margin: 0 10px 10px 0;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 4px;
    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      transition: all 0.2s;
      transform: scale(1.1);
    }
  }
  .active {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }
}
.empty-tip {
  padding: 20px;
  text-align: center;
}
</style>

