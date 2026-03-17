import { reactive, ref } from 'vue';

/**
 * 剪贴板管理 composable
 */
export function useClipboard() {
  const clipboard = reactive<{
    points: any[];
    paths: any[];
    locations: any[];
  }>({
    points: [],
    paths: [],
    locations: []
  });

  // 复制元素
  const copyElements = (
    points: any[],
    paths: any[],
    locations: any[],
    selectedIds: Set<string>,
    selectedType: string | null
  ) => {
    if (selectedType === 'point') {
      clipboard.points = points.filter(p => selectedIds.has(p.id));
    } else if (selectedType === 'path') {
      clipboard.paths = paths.filter(p => selectedIds.has(p.id));
    } else if (selectedType === 'location') {
      clipboard.locations = locations.filter(l => selectedIds.has(l.id));
    }
  };

  // 粘贴元素（带偏移）
  const pasteElements = (
    offsetX: number = 20,
    offsetY: number = 20,
    layerId: string,
    generateId: () => string
  ) => {
    const newPoints = clipboard.points.map(p => ({
      ...p,
      id: generateId(),
      x: p.x + offsetX,
      y: p.y + offsetY,
      layerId
    }));

    const newPaths = clipboard.paths.map(p => ({
      ...p,
      id: generateId(),
      layerId
    }));

    const newLocations = clipboard.locations.map(l => ({
      ...l,
      id: generateId(),
      x: (l.x || 0) + offsetX,
      y: (l.y || 0) + offsetY,
      layerId
    }));

    return { newPoints, newPaths, newLocations };
  };

  // 清除剪贴板
  const clearClipboard = () => {
    clipboard.points = [];
    clipboard.paths = [];
    clipboard.locations = [];
  };

  // 检查剪贴板是否为空
  const isClipboardEmpty = () => {
    return clipboard.points.length === 0 &&
           clipboard.paths.length === 0 &&
           clipboard.locations.length === 0;
  };

  return {
    clipboard,
    copyElements,
    pasteElements,
    clearClipboard,
    isClipboardEmpty
  };
}

/**
 * 选择状态管理 composable
 */
export function useSelection() {
  const selection = reactive({
    selectedIds: new Set<string>(),
    selectedType: null as string | null
  });

  // 选择单个元素
  const selectElement = (
    id: string,
    type: string,
    multiSelect: boolean = false,
    shiftSelect: boolean = false
  ) => {
    if (shiftSelect || multiSelect) {
      if (selection.selectedIds.has(id)) {
        selection.selectedIds.delete(id);
      } else {
        selection.selectedIds.add(id);
      }
    } else {
      selection.selectedIds.clear();
      selection.selectedIds.add(id);
    }
    selection.selectedType = type;
  };

  // 选择多个元素
  const selectElements = (
    ids: string[],
    type: string,
    append: boolean = false
  ) => {
    if (!append) {
      selection.selectedIds.clear();
    }
    ids.forEach(id => selection.selectedIds.add(id));
    selection.selectedType = type;
  };

  // 全选
  const selectAll = (allIds: string[], type: string) => {
    selection.selectedIds.clear();
    allIds.forEach(id => selection.selectedIds.add(id));
    selection.selectedType = type;
  };

  // 清除选择
  const clearSelection = () => {
    selection.selectedIds.clear();
    selection.selectedType = null;
  };

  // 获取选中数量
  const selectedCount = () => selection.selectedIds.size;

  // 是否有选中
  const hasSelection = () => selection.selectedIds.size > 0;

  return {
    selection,
    selectElement,
    selectElements,
    selectAll,
    clearSelection,
    selectedCount,
    hasSelection
  };
}
