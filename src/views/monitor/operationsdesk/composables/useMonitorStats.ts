/**
 * 监控大屏 - 统计与快照应用
 *
 * 提供：
 * - vehicles：车辆运行时列表（地图标记、机器人面板共用）
 * - amrStats：AMR 聚合统计（顶栏 KPI 用）
 * - factoryList：工厂下拉选项
 * - currentFactoryId：当前选中工厂
 * - fetchStats / applySnapshot / init：数据加载
 *
 * 说明：amrStats 优先取 snapshot 聚合结果；
 *       若后端暂未返回，前端会基于 vehicles 状态本地兜底统计。
 */
import { ref, computed } from 'vue';
import {
  monitorApi,
  type VehicleRuntimeVO,
  type AmrStats,
  type MonitorSnapshotVO
} from '@/api/ops/monitor';
import { listFactoryModel } from '@/api/deploy/factory/model';
import type { FactoryModelVO } from '@/api/deploy/factory/model/types';

interface FactoryInfo {
  id: number;
  name: string;
}

const EMPTY_AMR_STATS: AmrStats = {
  totalVehicles: 0,
  idleVehicles: 0,
  executingVehicles: 0,
  chargingVehicles: 0,
  errorVehicles: 0,
  offlineVehicles: 0
};

function unwrap<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null;
  const body = res as Record<string, unknown>;
  if (body.data !== undefined) return body.data as T;
  return body as T;
}

export function useMonitorStats() {
  const vehicles = ref<VehicleRuntimeVO[]>([]);
  const factoryList = ref<FactoryInfo[]>([]);
  const loading = ref(false);
  const alarmCount = ref(0);

  /** 后端返回的 AMR 聚合统计 */
  const remoteAmrStats = ref<AmrStats | null>(null);

  /** 当前工厂 ID */
  const currentFactoryId = ref<number>(0);

  /**
   * 顶栏使用的 AMR 统计：
   * 1. 优先后端聚合
   * 2. 后端无数据时按 vehicles 列表本地兜底
   */
  const amrStats = computed<AmrStats>(() => {
    if (remoteAmrStats.value) return remoteAmrStats.value;
    const list = vehicles.value;
    const isExecuting = (s?: string) => s === 'WORKING' || s === 'EXECUTING' || s === 'WAITING' || s === 'PAUSED';
    const isOffline = (s?: string) => s === 'UNKNOWN' || s === 'UNAVAILABLE' || s === 'OFFLINE';
    return {
      totalVehicles: list.length,
      idleVehicles: list.filter((v) => v.state === 'IDLE').length,
      executingVehicles: list.filter((v) => isExecuting(v.state)).length,
      chargingVehicles: list.filter((v) => v.state === 'CHARGING').length,
      errorVehicles: list.filter((v) => v.state === 'ERROR').length,
      offlineVehicles: list.filter((v) => isOffline(v.state)).length
    };
  });

  const applySnapshot = (snapshot: MonitorSnapshotVO | null | undefined) => {
    if (!snapshot) return;
    if (snapshot.type === 'heartbeat' || snapshot.type === 'pong') {
      if (typeof snapshot.alarmCount === 'number') {
        alarmCount.value = snapshot.alarmCount;
      }
      return;
    }
    if (Array.isArray(snapshot.vehicles)) {
      vehicles.value = snapshot.vehicles;
    }
    if (snapshot.amrStats) {
      remoteAmrStats.value = snapshot.amrStats;
    }
    if (typeof snapshot.alarmCount === 'number') {
      alarmCount.value = snapshot.alarmCount;
    }
  };

  /** 加载数据（静默刷新时不闪 loading） */
  const fetchStats = async (factoryId: number, silent = false) => {
    if (!silent) loading.value = true;
    currentFactoryId.value = factoryId;
    try {
      const res = await monitorApi.getSnapshot(factoryId);
      applySnapshot(unwrap<MonitorSnapshotVO>(res));
    } finally {
      if (!silent) loading.value = false;
    }
  };

  // 初始化：加载工厂列表
  const init = async () => {
    try {
      const res: any = await listFactoryModel({ pageNum: 1, pageSize: 100 });
      const rows: FactoryModelVO[] = Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

      factoryList.value = rows.map((item) => ({
        id: item.id as number,
        name: item.name as string
      }));

      if (factoryList.value.length > 0) {
        const firstId = factoryList.value[0].id;
        currentFactoryId.value = firstId;
        await fetchStats(firstId);
      } else {
        currentFactoryId.value = 0;
      }
    } catch (e) {
      console.error('load factory error:', e);
    }
  };

  return {
    vehicles,
    amrStats,
    factoryList,
    loading,
    alarmCount,
    fetchStats,
    applySnapshot,
    init,
    currentFactoryId,
    EMPTY_AMR_STATS
  };
}
