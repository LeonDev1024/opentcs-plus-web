import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { TypeVO, TypeForm, TypeQuery } from '@/api/opentcs/vehicle/type/types';

/**
 * 查询车辆类型列表
 * @param query
 * @returns {*}
 */
export const listType = (query?: TypeQuery): AxiosPromise<TypeVO[]> => {
  return request({
    url: '/opentcs/vehicleType/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询车辆类型详细
 * @param id
 */
export const getType = (id: string | number): AxiosPromise<TypeVO> => {
  return request({
    url: '/opentcs/vehicleType/' + id,
    method: 'get'
  });
};

/**
 * 新增车辆类型
 * @param data
 */
export const addType = (data: TypeForm) => {
  return request({
    url: '/opentcs/vehicleType',
    method: 'post',
    data: data
  });
};

/**
 * 修改车辆类型
 * @param data
 */
export const updateType = (data: TypeForm) => {
  return request({
    url: '/opentcs/vehicleType',
    method: 'put',
    data: data
  });
};

/**
 * 删除车辆类型
 * @param id
 */
export const delType = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/vehicleType/' + id,
    method: 'delete'
  });
};

