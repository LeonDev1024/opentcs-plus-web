import { ref } from 'vue';
import { POINT_TYPE_RADIUS } from '@/utils/mapEditor/mapVisualTokens';

/**
 * 点位类型配置 composable
 */
export function usePointTypeConfig() {
  // 点位类型常量
  const POINT_TYPE = {
    HALT: 'Halt point',
    PARK: 'Park point',
    STATION: 'Station',
    CHARGE: 'Charge point'
  } as const;

  // 点位类型配置
  const POINT_TYPE_CONFIG: Record<string, { fill: string; stroke: string; glyph: string; glyphColor: string; radius: number }> = {
    [POINT_TYPE.HALT]: {
      fill: '#409EFF',      // 蓝色 - 临时停车点
      stroke: '#096DD9',
      glyph: undefined,     // Halt点不显示字母
      glyphColor: '#FFFFFF',
      radius: POINT_TYPE_RADIUS[POINT_TYPE.HALT]
    },
    [POINT_TYPE.PARK]: {
      fill: '#67C23A',      // 绿色 - 长时间停车点
      stroke: '#237804',
      glyph: 'P',
      glyphColor: '#FFFFFF',
      radius: POINT_TYPE_RADIUS[POINT_TYPE.PARK]
    },
    [POINT_TYPE.STATION]: {
      fill: '#E6A23C',      // 橙色 - 工作站点
      stroke: '#D48806',
      glyph: 'S',
      glyphColor: '#FFFFFF',
      radius: POINT_TYPE_RADIUS[POINT_TYPE.STATION]
    },
    [POINT_TYPE.CHARGE]: {
      fill: '#F56C6C',      // 红色 - 充电点
      stroke: '#C21F1F',
      glyph: '⚡',
      glyphColor: '#FFFFFF',
      radius: POINT_TYPE_RADIUS[POINT_TYPE.CHARGE]
    }
  };

  // 获取点位配置
  const getPointConfig = (point: any) => {
    const type = point.type || POINT_TYPE.HALT;
    const config = POINT_TYPE_CONFIG[type] || POINT_TYPE_CONFIG[POINT_TYPE.HALT];
    const radius = point.editorProps?.radius ?? config.radius;

    return {
      x: point.x,
      y: point.y,
      radius: radius,
      fill: point.editorProps?.color || config.fill,
      stroke: point.editorProps?.strokeColor || config.stroke,
      strokeWidth: 2,
      draggable: true,
      id: point.id,
      shadowColor: '#ff0000',
      shadowBlur: point.locked ? 10 : 0,
      shadowOpacity: point.locked ? 0.5 : 0
    };
  };

  // 获取点位标签配置
  const getPointLabelConfig = (point: any, isSelected: boolean) => {
    const type = point.type || POINT_TYPE.HALT;
    const config = POINT_TYPE_CONFIG[type] || POINT_TYPE_CONFIG[POINT_TYPE.HALT];

    return {
      x: point.x,
      y: point.y - (point.editorProps?.radius ?? config.radius) - 15,
      text: point.name || point.id,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: isSelected ? '#ff0000' : '#666666',
      align: 'center',
      listening: false
    };
  };

  // 获取点位类型图标配置
  const getPointGlyphConfig = (point: any) => {
    const type = point.type || POINT_TYPE.HALT;
    const config = POINT_TYPE_CONFIG[type] || POINT_TYPE_CONFIG[POINT_TYPE.HALT];

    if (!config.glyph) return null;

    return {
      x: point.x,
      y: point.y,
      text: config.glyph,
      fontSize: 10,
      fontFamily: 'Arial',
      fill: config.glyphColor,
      align: 'center',
      verticalAlign: 'middle',
      listening: false,
      offsetX: 5,
      offsetY: 0
    };
  };

  return {
    POINT_TYPE,
    POINT_TYPE_CONFIG,
    getPointConfig,
    getPointLabelConfig,
    getPointGlyphConfig
  };
}
