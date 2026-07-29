/**
 * 监控大屏 - 实时数据（轮询 MVP，后续可换 WebSocket）
 */
import { ref } from 'vue';

export function useRealtimeData(intervalMs = 4000) {
  const isActive = ref(false);
  const currentFactoryId = ref<number | undefined>(undefined);
  /** 最近一次成功 fetch 完成的时间戳（毫秒，本地时间） */
  const lastUpdated = ref<number | null>(null);
  let timer: number | undefined;
  let fetchFnRef: ((factoryId: number) => void | Promise<void>) | null = null;

  const stop = () => {
    isActive.value = false;
    if (timer != null) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  const tick = async () => {
    if (!fetchFnRef || currentFactoryId.value == null || !currentFactoryId.value) return;
    try {
      await fetchFnRef(currentFactoryId.value);
      lastUpdated.value = Date.now();
      isActive.value = true;
    } catch (e) {
      console.error('[realtime] fetch error:', e);
    }
  };

  const start = async (
    fetchFn: (factoryId: number) => void | Promise<void>,
    factoryId: number
  ) => {
    stop();
    fetchFnRef = fetchFn;
    currentFactoryId.value = factoryId;
    await tick();
    timer = window.setInterval(tick, intervalMs);
  };

  const updateFactoryId = (factoryId: number) => {
    currentFactoryId.value = factoryId;
  };

  return { isActive, lastUpdated, start, stop, updateFactoryId, currentFactoryId };
}
