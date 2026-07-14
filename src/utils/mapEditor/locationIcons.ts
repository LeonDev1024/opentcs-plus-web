import { shallowRef } from "vue";
import type { MapLocation } from "@/types/mapEditor";

// ==================== Location Icons ====================

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

async function initLocationTypeList() {
  return;
}

// 初始化所有资源
async function initAll() {
  initLocationIconUrls();
  await initLocationTypeList();
}

// 导出
export {
  locationIconUrlMap,
  iconCache,
  getSymbolForLocationTypeId,
  getLocationIconConfig,
  ensureIconLoaded,
  initLocationIconUrls,
  initLocationTypeList,
  initAll,
};
