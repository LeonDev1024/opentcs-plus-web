import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { VehicleTypeVO, VehicleTypeForm, VehicleTypeQuery } from '@/api/opentcs/vehicleType/types';

/**
 * 查询车辆类型列表
 * @param query
 * @returns {*}
 */
export const listVehicleType = (query?: VehicleTypeQuery): AxiosPromise<VehicleTypeVO[]> => {
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
export const getVehicleType = (id: string | number): AxiosPromise<VehicleTypeVO> => {
  return request({
    url: '/opentcs/vehicleType/' + id,
    method: 'get'
  });
};

/**
 * 新增车辆类型
 * @param data
 */
export const addVehicleType = (data: VehicleTypeForm) => {
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
export const updateVehicleType = (data: VehicleTypeForm) => {
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
export const delVehicleType = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/vehicleType/' + id,
    method: 'delete'
  });
};

