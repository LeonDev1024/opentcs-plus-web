import request from '@/utils/request';
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
  return request({
    url: '/location/list',
    method: 'get',
    params: query
  });
};

/**
 * 根据工厂ID查询位置列表
 * @param factoryId 工厂ID
 */
export const listLocationByFactory = (factoryId: number): AxiosPromise<any[]> => {
  return request({
    url: `/location/listByFactory/${factoryId}`,
    method: 'get'
  });
};

/**
 * 根据导航地图ID查询位置列表
 * @param mapId 导航地图ID
 */
export const listLocationByMap = (mapId: number): AxiosPromise<any[]> => {
  return request({
    url: `/location/listByMap/${mapId}`,
    method: 'get'
  });
};

/**
 * 查询位置详情
 * @param id 位置ID
 */
export const getLocation = (id: number): AxiosPromise<any> => {
  return request({
    url: `/location/${id}`,
    method: 'get'
  });
};
