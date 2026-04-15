import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { LocationVO, LocationForm, LocationQuery } from '@/api/deploy/factory/location-type/types';

/**
 * 查询位置类型列表（分页，用于管理页）
 * @param query
 * @returns {*}
 */
export const listLocation = (query?: LocationQuery): AxiosPromise<{ rows: LocationVO[]; total: number }> => {
  return request({
    url: '/map/locationType/list',
    method: 'get',
    params: query
  }) as AxiosPromise<{ rows: LocationVO[]; total: number }>;
};

/**
 * 获取位置类型列表（用于下拉选择，如地图编辑器）
 * @returns 位置类型列表
 */
export const getLocationTypeListForSelect = (): Promise<LocationVO[]> => {
  return request({
    url: '/map/locationType/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 500 }
  }).then((res: any) => (res?.rows ? res.rows : []));
};

/**
 * 查询位置类型详细
 * @param id
 */
export const getLocation = (id: string | number): AxiosPromise<LocationVO> => {
  return request({
    url: '/map/locationType/' + id,
    method: 'get'
  });
};

/**
 * 新增位置类型
 * @param data
 */
export const addLocation = (data: LocationForm) => {
  return request({
    url: '/map/locationType/create',
    method: 'post',
    data: data
  });
};

/**
 * 修改位置类型
 * @param data
 */
export const updateLocation = (data: LocationForm) => {
  return request({
    url: '/map/locationType/update',
    method: 'put',
    data: data
  });
};

/**
 * 删除位置类型
 * @param id
 */
export const delLocation = (id: string | number | Array<string | number>) => {
  return request({
    url: '/map/locationType/' + id,
    method: 'delete'
  });
};

