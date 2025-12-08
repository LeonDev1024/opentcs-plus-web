import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { LocationVO, LocationForm, LocationQuery } from '@/api/opentcs/map/location/types';

/**
 * 查询位置类型列表
 * @param query
 * @returns {*}
 */
export const listLocation = (query?: LocationQuery): AxiosPromise<LocationVO[]> => {
  return request({
    url: '/map/locationType/list',
    method: 'get',
    params: query
  });
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

