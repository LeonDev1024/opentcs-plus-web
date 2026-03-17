import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface MapEditorTab {
  id: string;           // 地图ID
  name: string;         // 地图名称
  mapModelId?: string;  // 车型模型ID（可选）
}

export const useMapEditorTabsStore = defineStore('mapEditorTabs', () => {
  // 打开的标签页列表
  const tabs = ref<MapEditorTab[]>([]);

  // 当前活动标签ID
  const activeTabId = ref<string | null>(null);

  // 是否已最大化（编辑器全屏）
  const isMaximized = ref(false);

  // 计算属性
  const activeTab = computed(() => {
    if (!activeTabId.value) return null;
    return tabs.value.find(t => t.id === activeTabId.value) || null;
  });

  const tabCount = computed(() => tabs.value.length);

  // 添加标签页
  const addTab = (tab: MapEditorTab) => {
    // 检查是否已存在
    const existing = tabs.value.find(t => t.id === tab.id);
    if (existing) {
      // 切换到已存在的标签
      activeTabId.value = tab.id;
      return;
    }

    // 添加新标签
    tabs.value.push(tab);
    activeTabId.value = tab.id;
  };

  // 移除标签页
  const removeTab = (tabId: string) => {
    const index = tabs.value.findIndex(t => t.id === tabId);
    if (index === -1) return;

    // 移除标签
    tabs.value.splice(index, 1);

    // 如果移除的是当前活动标签，切换到上一个或下一个
    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        // 切换到相邻的标签
        const newIndex = Math.min(index, tabs.value.length - 1);
        activeTabId.value = tabs.value[newIndex].id;
      } else {
        activeTabId.value = null;
      }
    }
  };

  // 切换标签页
  const setActiveTab = (tabId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      activeTabId.value = tabId;
    }
  };

  // 更新标签信息
  const updateTab = (tabId: string, updates: Partial<MapEditorTab>) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      Object.assign(tab, updates);
    }
  };

  // 关闭其他标签页
  const closeOtherTabs = (tabId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      tabs.value = [tab];
      activeTabId.value = tabId;
    }
  };

  // 关闭所有标签页
  const closeAllTabs = () => {
    tabs.value = [];
    activeTabId.value = null;
  };

  // 切换最大化状态
  const toggleMaximize = () => {
    isMaximized.value = !isMaximized.value;
  };

  // 检查标签是否已打开
  const isTabOpen = (tabId: string) => {
    return tabs.value.some(t => t.id === tabId);
  };

  return {
    tabs,
    activeTabId,
    activeTab,
    tabCount,
    isMaximized,
    addTab,
    removeTab,
    setActiveTab,
    updateTab,
    closeOtherTabs,
    closeAllTabs,
    toggleMaximize,
    isTabOpen
  };
});
