import request from '@/utils/request';
import { AxiosPromise } from 'axios';

/**
 * 查询路径列表（分页）
 * @param query 包含 factoryModelId, navigationMapId, name 等筛选条件
 */
export const listPath = (query?: {
  pageNum?: number;
  pageSize?: number;
  factoryModelId?: number;
  navigationMapId?: number;
  name?: string;
}): AxiosPromise<{ rows: any[]; total: number }> => {
  return request({
    url: '/path/list',
    method: 'get',
    params: query
  });
};

/**
 * 根据工厂ID查询路径列表
 * @param factoryId 工厂ID
 */
export const listPathByFactory = (factoryId: number): AxiosPromise<any[]> => {
  return request({
    url: `/path/listByFactory/${factoryId}`,
    method: 'get'
  });
};

/**
 * 根据导航地图ID查询路径列表
 * @param mapId 导航地图ID
 */
export const listPathByMap = (mapId: number): AxiosPromise<any[]> => {
  return request({
    url: `/path/listByMap/${mapId}`,
    method: 'get'
  });
};

/**
 * 查询路径详情
 * @param id 路径ID
 */
export const getPath = (id: number): AxiosPromise<any> => {
  return request({
    url: `/path/${id}`,
    method: 'get'
  });
};
