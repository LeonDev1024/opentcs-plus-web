/**
 * 监控大屏 - 实时数据（轮询）
 *
 * 暴露：
 * - isActive：是否处于轮询中
 * - lastUpdated：最近一次成功完成 fetch 的时间戳（毫秒），用于顶栏「上次刷新」显示
 * - start / stop / updateFactoryId：生命周期控制
 */
import { ref, onUnmounted } from 'vue';

export const POLL_INTERVAL = 5000; // 5 秒

export function useRealtimeData() {
  const timerId = ref<ReturnType<typeof setInterval> | null>(null);
  const isActive = ref(false);
  const currentFactoryId = ref<number | undefined>(undefined);
  /** 最近一次成功 fetch 完成的时间戳（毫秒，本地时间） */
  const lastUpdated = ref<number | null>(null);

  /** 包装 fetchFn：fetch 成功后更新 lastUpdated */
  const wrap = async (
    fetchFn: (factoryId: number) => void | Promise<void>,
    factoryId: number
  ) => {
    try {
      await fetchFn(factoryId);
      lastUpdated.value = Date.now();
    } catch (e) {
      // 即使失败也保留上一次成功时间，避免 UI 抖动
      console.error('[realtime] fetch error:', e);
    }
  };

  // fetchFn 接收 factoryId 参数
  const start = (
    fetchFn: (factoryId: number) => void | Promise<void>,
    factoryId: number
  ) => {
    if (isActive.value) return;
    isActive.value = true;
    currentFactoryId.value = factoryId;
    wrap(fetchFn, factoryId); // 立即执行一次
    timerId.value = setInterval(() => {
      if (currentFactoryId.value) {
        wrap(fetchFn, currentFactoryId.value);
      }
    }, POLL_INTERVAL);
  };

  const stop = () => {
    if (timerId.value !== null) {
      clearInterval(timerId.value);
      timerId.value = null;
    }
    isActive.value = false;
  };

  const updateFactoryId = (factoryId: number) => {
    currentFactoryId.value = factoryId;
  };

  onUnmounted(() => {
    stop();
  });

  return { isActive, lastUpdated, start, stop, updateFactoryId, currentFactoryId };
}
