import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { LocationVO, LocationForm, LocationQuery } from '@/api/opentcs/location/types';

/**
 * 查询位置列表
 * @param query
 * @returns {*}
 */
export const listLocation = (query?: LocationQuery): AxiosPromise<LocationVO[]> => {
  return request({
    url: '/opentcs/location/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询位置详细
 * @param id
 */
export const getLocation = (id: string | number): AxiosPromise<LocationVO> => {
  return request({
    url: '/opentcs/location/' + id,
    method: 'get'
  });
};

/**
 * 新增位置
 * @param data
 */
export const addLocation = (data: LocationForm) => {
  return request({
    url: '/opentcs/location',
    method: 'post',
    data: data
  });
};

/**
 * 修改位置
 * @param data
 */
export const updateLocation = (data: LocationForm) => {
  return request({
    url: '/opentcs/location',
    method: 'put',
    data: data
  });
};

/**
 * 删除位置
 * @param id
 */
export const delLocation = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/location/' + id,
    method: 'delete'
  });
};

