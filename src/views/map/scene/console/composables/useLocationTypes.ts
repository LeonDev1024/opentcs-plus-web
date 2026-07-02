import { ref } from 'vue'
import type { LocationVO } from '@/api/deploy/factory/location-type/types'
import type { useMapEditorStore } from '@/store/modules/mapEditor'

/**
 * 位置类型加载与图标缓存
 */
export function useLocationTypes(mapEditorStore: ReturnType<typeof useMapEditorStore>) {
  const locationTypeList = ref<LocationVO[]>([])

  // assets/location/*.svg 的 URL 映射（symbol 名称 -> url），在模块加载时静态构建
  const locationIconUrlMap: Record<string, string> = {}
  try {
    const modules = import.meta.glob('@/assets/location/*.svg', {
      eager: true,
      as: 'url',
    }) as Record<string, string | { default: string }>
    Object.keys(modules).forEach((path) => {
      const match = path.match(/location[/\\]([^/\\]+)\.svg$/)
      if (!match || !match[1]) return
      const v = modules[path]
      const url = typeof v === 'string' ? v : v && (v as { default: string }).default
      if (url) locationIconUrlMap[match[1]] = url
    })
  } catch (_) {}

  // 已加载的图标图片缓存（symbol -> HTMLImageElement），用于 Konva.Image
  const locationIconImageCache = ref<Record<string, HTMLImageElement>>({})

  const preloadLocationIconImages = () => {
    const symbols = new Set<string>()
    locationTypeList.value.forEach((t) => {
      if (!t.properties || !Array.isArray(t.properties)) return
      const p = t.properties.find((x: any) => x && (x.name === 'symbol' || x.name === 'Symbol'))
      if (p && p.value) symbols.add(String(p.value))
    })
    symbols.forEach((symbol) => {
      if (locationIconImageCache.value[symbol] || !locationIconUrlMap[symbol]) return
      const img = new Image()
      img.onload = () => {
        locationIconImageCache.value = { ...locationIconImageCache.value, [symbol]: img }
      }
      img.src = locationIconUrlMap[symbol]
    })
  }

  const loadLocationTypes = async () => {
    try {
      locationTypeList.value = await mapEditorStore.fetchLocationTypeList()
      preloadLocationIconImages()
    } catch (e) {
      console.error('加载位置类型列表失败', e)
    }
  }

  // 从位置类型的 properties 中取 name 为 symbol 的 value
  const getSymbolForLocationTypeId = (locationTypeId: string | number | undefined): string => {
    if (locationTypeId === undefined || locationTypeId === null) return ''
    const id = String(locationTypeId)
    const type = locationTypeList.value.find((t) => String(t.id) === id)
    if (!type?.properties || !Array.isArray(type.properties)) return ''
    const symbolProp = type.properties.find(
      (p: any) => p && (p.name === 'symbol' || p.name === 'Symbol'),
    )
    return symbolProp && symbolProp.value ? String(symbolProp.value) : ''
  }

  return {
    locationTypeList,
    locationIconImageCache,
    loadLocationTypes,
    getSymbolForLocationTypeId,
  }
}
