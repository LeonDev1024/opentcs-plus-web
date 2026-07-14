import { AxiosPromise } from 'axios';

/**
 * 查询位置列表（分页）
 * @param query 包含 factoryModelId, navigationMapId, name 等筛选条件
 */
export const listLocation = (query?: {
  pageNum?: number;
  pageSize?: number;
  factoryModelId?: number;
  navigationMapId?: number;
  name?: string;
}): AxiosPromise<{ rows: any[]; total: number }> => {
  return Promise.resolve({ rows: [], total: 0 }) as any;
};

/**
 * 根据工厂ID查询位置列表
 * @param factoryId 工厂ID
 */
export const listLocationByFactory = (factoryId: number): AxiosPromise<any[]> => {
  return Promise.resolve([]) as any;
};

/**
 * 根据导航地图ID查询位置列表
 * @param mapId 导航地图ID
 */
export const listLocationByMap = (mapId: number): AxiosPromise<any[]> => {
  return Promise.resolve([]) as any;
};

/**
 * 查询位置详情
 * @param id 位置ID
 */
export const getLocation = (id: number): AxiosPromise<any> => {
  return Promise.reject(new Error('位置接口已移除')) as AxiosPromise<any>;
};
