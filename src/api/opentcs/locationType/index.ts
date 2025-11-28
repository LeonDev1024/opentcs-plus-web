import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { LocationTypeVO, LocationTypeForm, LocationTypeQuery } from '@/api/opentcs/locationType/types';

/**
 * 查询位置类型列表
 * @param query
 * @returns {*}
 */
export const listLocationType = (query?: LocationTypeQuery): AxiosPromise<LocationTypeVO[]> => {
  return request({
    url: '/opentcs/locationType/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询位置类型详细
 * @param id
 */
export const getLocationType = (id: string | number): AxiosPromise<LocationTypeVO> => {
  return request({
    url: '/opentcs/locationType/' + id,
    method: 'get'
  });
};

/**
 * 新增位置类型
 * @param data
 */
export const addLocationType = (data: LocationTypeForm) => {
  return request({
    url: '/opentcs/locationType',
    method: 'post',
    data: data
  });
};

/**
 * 修改位置类型
 * @param data
 */
export const updateLocationType = (data: LocationTypeForm) => {
  return request({
    url: '/opentcs/locationType',
    method: 'put',
    data: data
  });
};

/**
 * 删除位置类型
 * @param id
 */
export const delLocationType = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/locationType/' + id,
    method: 'delete'
  });
};

