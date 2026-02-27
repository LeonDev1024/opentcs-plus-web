import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { VehicleVO, VehicleForm, VehicleQuery, PageResult } from '@/api/opentcs/vehicle/types';

/**
 * 查询车辆列表
 * @param query
 * @returns {*}
 */
export const listVehicle = (query?: VehicleQuery): AxiosPromise<PageResult<VehicleVO>> => {
  return request({
    url: '/vehicle/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询车辆详细
 * @param id
 */
export const getVehicle = (id: string | number): AxiosPromise<VehicleVO> => {
  return request({
    url: '/vehicle/' + id,
    method: 'get'
  });
};

/**
 * 新增车辆
 * @param data
 */
export const addVehicle = (data: VehicleForm) => {
  return request({
    url: '/vehicle/create',
    method: 'post',
    data: data
  });
};

/**
 * 修改车辆
 * @param data
 */
export const updateVehicle = (data: VehicleForm) => {
  return request({
    url: '/vehicle/update',
    method: 'put',
    data: data
  });
};

/**
 * 删除车辆
 * @param id
 */
export const delVehicle = (id: string | number | Array<string | number>) => {
  return request({
    url: '/vehicle/delete/' + id,
    method: 'delete'
  });
};

