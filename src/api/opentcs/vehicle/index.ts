import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { VehicleVO, VehicleForm, VehicleQuery } from '@/api/opentcs/vehicle/types';

/**
 * 查询车辆列表
 * @param query
 * @returns {*}
 */
export const listVehicle = (query?: VehicleQuery): AxiosPromise<VehicleVO[]> => {
  return request({
    url: '/opentcs/vehicle/list',
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
    url: '/opentcs/vehicle/' + id,
    method: 'get'
  });
};

/**
 * 新增车辆
 * @param data
 */
export const addVehicle = (data: VehicleForm) => {
  return request({
    url: '/opentcs/vehicle',
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
    url: '/opentcs/vehicle',
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
    url: '/opentcs/vehicle/' + id,
    method: 'delete'
  });
};

