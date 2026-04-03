import type { NavigationMapVO } from "@/api/opentcs/factory/map/types";

export interface ParsedNavigationMapOrigin {
  originX: number;
  originY: number;
  rotation: number;
}

/** 与后端 mapInfo / 导航地图 VO 共用的原点字段（含字符串数值） */
export interface MapOriginLike {
  mapOrigin?: string;
  map_origin?: string;
  originX?: number | string;
  originY?: number | string;
  rotation?: number | string;
}

/**
 * 地图在工厂/场景中的位姿（毫米、度）。
 * 优先解析 `mapOrigin` / `map_origin`（JSON 数组 [x,y,θ]，与地图编辑器 load 一致），
 * 否则回退到扁平 originX / originY / rotation（兼容字符串数字）。
 */
export function parseMapOriginFields(
  m: MapOriginLike | null | undefined,
): ParsedNavigationMapOrigin {
  if (!m) {
    return { originX: 0, originY: 0, rotation: 0 };
  }
  const raw = m.map_origin ?? m.mapOrigin;
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && arr.length >= 2) {
        return {
          originX: Number(arr[0]) || 0,
          originY: Number(arr[1]) || 0,
          rotation:
            arr.length >= 3
              ? Number(arr[2]) || 0
              : Number(m.rotation ?? 0) || 0,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return {
    originX: Number(m.originX ?? 0) || 0,
    originY: Number(m.originY ?? 0) || 0,
    rotation: Number(m.rotation ?? 0) || 0,
  };
}

/**
 * 工厂导航地图列表（NavigationMapVO）上的原点解析。
 */
export function parseNavigationMapOrigin(
  m: NavigationMapVO | null | undefined,
): ParsedNavigationMapOrigin {
  return parseMapOriginFields(m);
}

/** 与后端 `map_origin` 字段对齐的序列化（保存时与扁平字段一并提交，便于迁移） */
export function serializeNavigationMapOrigin(
  originX: number,
  originY: number,
  rotation: number,
): string {
  return JSON.stringify([originX, originY, rotation]);
}
