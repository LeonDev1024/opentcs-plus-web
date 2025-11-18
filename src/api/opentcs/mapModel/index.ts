import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { MapModelVO, MapModelForm, MapModelQuery } from '@/api/opentcs/mapModel/types';

/**
 * 查询地图模型列表
 * @param query
 * @returns {*}
 */
export const listMapModel = (query?: MapModelQuery): AxiosPromise<MapModelVO[]> => {
  return request({
    url: '/opentcs/mapModel/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询地图模型详细
 * @param id
 */
export const getMapModel = (id: string | number): AxiosPromise<MapModelVO> => {
  return request({
    url: '/opentcs/mapModel/' + id,
    method: 'get'
  });
};

/**
 * 新增地图模型
 * @param data
 */
export const addMapModel = (data: MapModelForm) => {
  return request({
    url: '/opentcs/mapModel',
    method: 'post',
    data: data
  });
};

/**
 * 修改地图模型
 * @param data
 */
export const updateMapModel = (data: MapModelForm) => {
  return request({
    url: '/opentcs/mapModel',
    method: 'put',
    data: data
  });
};

/**
 * 删除地图模型
 * @param id
 */
export const delMapModel = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/mapModel/' + id,
    method: 'delete'
  });
};

/**
 * 加载地图模型
 * @param id
 */
export const loadMapModel = (id: string | number) => {
  return request({
    url: '/opentcs/mapModel/load/' + id,
    method: 'post'
  });
};

