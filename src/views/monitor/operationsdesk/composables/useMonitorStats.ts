/**
 * 监控大屏 - 统计业务逻辑
 *
 * 提供：
 * - vehicles：车辆运行时列表（地图标记、机器人面板共用）
 * - amrStats：AMR 聚合统计（顶栏 KPI 用）
 * - factoryList：工厂下拉选项
 * - currentFactoryId：当前选中工厂
 * - fetchStats / init：数据加载
 *
 * 说明：amrStats 优先取后端 /vehicle/statistics 的聚合结果；
 *       若后端暂未返回，前端会基于 vehicles 状态本地兜底统计，
 *       保证顶栏指标卡始终有可见数字，避免空白态。
 */
import { ref, computed } from 'vue';
import {
  monitorApi,
  type VehicleRuntimeVO,
  type AmrStats
} from '@/api/ops/monitor';
import { listFactoryModel } from '@/api/deploy/factory/model';
import type { FactoryModelVO } from '@/api/deploy/factory/model/types';

const { listVehicleRuntime, getVehicleStatistics } = monitorApi;

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

export function useMonitorStats() {
  const vehicles = ref<VehicleRuntimeVO[]>([]);
  const factoryList = ref<FactoryInfo[]>([]);
  const loading = ref(false);

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
    return {
      totalVehicles: list.length,
      idleVehicles: list.filter((v) => v.state === 'IDLE').length,
      executingVehicles: list.filter((v) => v.state === 'WORKING').length,
      chargingVehicles: list.filter((v) => v.state === 'CHARGING').length,
      errorVehicles: list.filter((v) => v.state === 'ERROR').length,
      offlineVehicles: list.filter(
        (v) => v.state === 'UNKNOWN' || v.state === 'UNAVAILABLE'
      ).length
    };
  });

  /** 加载数据 */
  const fetchStats = async (factoryId: number) => {
    loading.value = true;
    currentFactoryId.value = factoryId;
    try {
      const [statsRes, vehicleRes] = await Promise.all([
        getVehicleStatistics(factoryId),
        listVehicleRuntime(factoryId)
      ]);
      vehicles.value = vehicleRes.data || [];
      remoteAmrStats.value = statsRes?.data ?? null;
    } finally {
      loading.value = false;
    }
  };

  // 初始化：加载工厂列表
  const init = async () => {
    try {
      // 注意：项目 request 拦截器已拆包，runtime 拿到的就是响应体本身
      // 分页接口形态：{ code, msg, rows, total }，与 deploy/factory/map 保持一致
      const res: any = await listFactoryModel({ pageNum: 1, pageSize: 100 });

      // 防御性兜底：rows 优先（分页），其次 data，再次直接是数组
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

      // 默认选中第一个工厂场景，并立刻拉一次数据
      // —— 这样画布会自动加载工厂下所有地图，无需用户手动操作
      if (factoryList.value.length > 0) {
        const firstId = factoryList.value[0].id;
        currentFactoryId.value = firstId;
        await fetchStats(firstId);
      } else {
        // 工厂列表为空：保持 currentFactoryId=0，UI 会落到「暂无工厂」空态
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
    fetchStats,
    init,
    currentFactoryId,
    EMPTY_AMR_STATS
  };
}
