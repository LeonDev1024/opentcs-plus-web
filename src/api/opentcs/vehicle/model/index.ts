import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { ModelVO, ModelForm, ModelQuery, VehicleTypeVO, VehicleTypeForm, VehicleTypeQuery } from '@/api/opentcs/vehicle/model/types';

/**
 * 查询车辆类型列表
 * @param query
 * @returns {*}
 */
export const listModel = (query?: ModelQuery): AxiosPromise<ModelVO[]> => {
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
export const getModel = (id: string | number): AxiosPromise<ModelVO> => {
  return request({
    url: '/opentcs/vehicleType/' + id,
    method: 'get'
  });
};

/**
 * 新增车辆类型
 * @param data
 */
export const addModel = (data: ModelForm) => {
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
export const updateModel = (data: ModelForm) => {
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
export const delModel = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/vehicleType/' + id,
    method: 'delete'
  });
};

// 兼容旧命名
export const listVehicleType = listModel;
export const getVehicleType = getModel;
export const addVehicleType = addModel;
export const updateVehicleType = updateModel;
export const delVehicleType = delModel;

