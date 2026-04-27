/**
 * 监控大屏 - 实时数据
 *
 * 当前：仅初次加载，不轮询（后续改为 WebSocket 长连接）
 *
 * 暴露：
 * - isActive：是否已完成初次加载
 * - lastUpdated：最近一次成功完成 fetch 的时间戳（毫秒）
 * - start / stop / updateFactoryId：生命周期控制
 */
import { ref } from 'vue';

export function useRealtimeData() {
  const isActive = ref(false);
  const currentFactoryId = ref<number | undefined>(undefined);
  /** 最近一次成功 fetch 完成的时间戳（毫秒，本地时间） */
  const lastUpdated = ref<number | null>(null);

  const start = async (
    fetchFn: (factoryId: number) => void | Promise<void>,
    factoryId: number
  ) => {
    if (isActive.value) return;
    currentFactoryId.value = factoryId;
    try {
      await fetchFn(factoryId);
      lastUpdated.value = Date.now();
      isActive.value = true;
    } catch (e) {
      console.error('[realtime] fetch error:', e);
    }
  };

  const stop = () => {
    isActive.value = false;
  };

  const updateFactoryId = (factoryId: number) => {
    currentFactoryId.value = factoryId;
  };

  return { isActive, lastUpdated, start, stop, updateFactoryId, currentFactoryId };
}
