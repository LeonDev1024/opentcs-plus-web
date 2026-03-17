import { ref, computed } from 'vue';

/**
 * 网格系统 composable
 */
export function useGridSystem() {
  // 网格设置
  const gridSize = ref(50); // 默认网格大小 50px
  const gridColor = ref('#e8e8e8'); // 默认网格颜色
  const gridVisible = ref(true); // 是否显示网格

  // 中心线配置
  const centerLineConfig = computed(() => {
    const width = 10000;
    const height = 10000;

    return {
      horizontal: {
        points: [-width / 2, 0, width / 2, 0],
        stroke: '#c0c0c0',
        strokeWidth: 1,
        dash: [5, 5],
        listening: false
      },
      vertical: {
        points: [0, -height / 2, 0, height / 2],
        stroke: '#c0c0c0',
        strokeWidth: 1,
        dash: [5, 5],
        listening: false
      }
    };
  });

  // 生成网格线
  const gridLines = computed(() => {
    if (!gridVisible.value) return [];

    const lines: any[] = [];
    const gridSizeVal = gridSize.value;
    const gridColorVal = gridColor.value;
    const range = 2500; // 画布范围

    // 垂直线
    for (let x = -range; x <= range; x += gridSizeVal) {
      lines.push({
        points: [x, -range, x, range],
        stroke: gridColorVal,
        strokeWidth: x === 0 ? 2 : 1,
        dash: x === 0 ? [] : [2, 2],
        listening: false
      });
    }

    // 水平线
    for (let y = -range; y <= range; y += gridSizeVal) {
      lines.push({
        points: [-range, y, range, y],
        stroke: gridColorVal,
        strokeWidth: y === 0 ? 2 : 1,
        dash: y === 0 ? [] : [2, 2],
        listening: false
      });
    }

    return lines;
  });

  // 中心点配置
  const centerPointConfig = computed(() => ({
    x: 0,
    y: 0,
    radius: 3,
    fill: '#ff0000',
    stroke: '#ffffff',
    strokeWidth: 1,
    listening: false
  }));

  // 设置网格
  const setGridSettings = (settings: { size?: number; color?: string; visible?: boolean }) => {
    if (settings.size !== undefined) gridSize.value = settings.size;
    if (settings.color !== undefined) gridColor.value = settings.color;
    if (settings.visible !== undefined) gridVisible.value = settings.visible;
  };

  return {
    gridSize,
    gridColor,
    gridVisible,
    centerLineConfig,
    gridLines,
    centerPointConfig,
    setGridSettings
  };
}
