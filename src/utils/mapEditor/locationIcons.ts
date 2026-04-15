import { shallowRef, ref } from "vue";
import type { MapLocation } from "@/types/mapEditor";
import { getLocationTypeListForSelect } from "@/api/deploy/factory/location-type";
import type { LocationVO } from "@/api/deploy/factory/location-type/types";

// ==================== Location Icons ====================

const locationTypeList = ref<LocationVO[]>([]);
const locationIconUrlMap: Record<string, string> = {};
const iconCache = shallowRef<Record<string, HTMLImageElement>>({});

// 初始化图标 URL 映射
function initLocationIconUrls() {
  const modules = import.meta.glob("@/assets/location/*.svg", {
    eager: true,
    as: "url",
  }) as Record<string, string | { default: string }>;
  Object.keys(modules).forEach((path) => {
    const match = path.match(/location[\/\\]([^\/\\]+)\.svg$/);
    if (!match) return;
    const v = modules[path];
    const url = typeof v === "string" ? v : v?.default;
    if (url) locationIconUrlMap[match[1]] = url;
  });
}

// 确保图标已加载
function ensureIconLoaded(symbol: string) {
  if (!symbol) return;
  const url = locationIconUrlMap[symbol];
  if (!url || iconCache.value[symbol]) return;
  const img = new Image();
  img.onload = () => {
    iconCache.value = { ...iconCache.value, [symbol]: img };
  };
  img.src = url;
}

// 获取位置类型的符号
function getSymbolForLocationTypeId(
  locationTypeId: string | number | undefined,
): string {
  if (locationTypeId === undefined || locationTypeId === null) return "";
  const id = String(locationTypeId);
  const type = locationTypeList.value.find((t) => String(t.id) === id);
  if (!type?.properties) return "";
  try {
    const arr =
      typeof type.properties === "string"
        ? JSON.parse(type.properties)
        : type.properties;
    if (Array.isArray(arr)) {
      const item = arr.find((p: any) => p?.name === "symbol");
      return String(item?.value ?? "");
    }
  } catch {
    return "";
  }
  return "";
}

// 获取位置图标配置
function getLocationIconConfig(location: MapLocation) {
  const symbol =
    getSymbolForLocationTypeId((location as any).locationTypeId) ||
    String(location.editorProps?.icon || "");
  if (!symbol) return null;
  ensureIconLoaded(symbol);
  const iconImg = iconCache.value[symbol];
  if (!iconImg) return null;
  return {
    image: iconImg,
    width: 18,
    height: 18,
    offsetX: 9,
    offsetY: 9,
  };
}

// 初始化位置类型列表
async function initLocationTypeList() {
  if (locationTypeList.value.length > 0) return;
  try {
    locationTypeList.value = await getLocationTypeListForSelect();
  } catch {
    locationTypeList.value = [];
  }
}

// 初始化所有资源
async function initAll() {
  initLocationIconUrls();
  await initLocationTypeList();
}

// 导出
export {
  locationTypeList,
  locationIconUrlMap,
  iconCache,
  getSymbolForLocationTypeId,
  getLocationIconConfig,
  ensureIconLoaded,
  initLocationIconUrls,
  initLocationTypeList,
  initAll,
};
