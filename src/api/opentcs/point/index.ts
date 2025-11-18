import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { PointVO, PointForm, PointQuery } from '@/api/opentcs/point/types';

/**
 * 查询点位列表
 * @param query
 * @returns {*}
 */
export const listPoint = (query?: PointQuery): AxiosPromise<PointVO[]> => {
  return request({
    url: '/opentcs/point/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询点位详细
 * @param id
 */
export const getPoint = (id: string | number): AxiosPromise<PointVO> => {
  return request({
    url: '/opentcs/point/' + id,
    method: 'get'
  });
};

/**
 * 新增点位
 * @param data
 */
export const addPoint = (data: PointForm) => {
  return request({
    url: '/opentcs/point',
    method: 'post',
    data: data
  });
};

/**
 * 修改点位
 * @param data
 */
export const updatePoint = (data: PointForm) => {
  return request({
    url: '/opentcs/point',
    method: 'put',
    data: data
  });
};

/**
 * 删除点位
 * @param id
 */
export const delPoint = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/point/' + id,
    method: 'delete'
  });
};

