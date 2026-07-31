import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { VehicleVO, VehicleForm, VehicleQuery, PageResult } from '@/api/deploy/device/types';

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

/** 连接驱动 */
export const connectVehicle = (id: string | number) => {
  return request({
    url: '/vehicle/connect/' + id,
    method: 'post'
  });
};

/** 断开驱动 */
export const disconnectVehicle = (id: string | number) => {
  return request({
    url: '/vehicle/disconnect/' + id,
    method: 'post'
  });
};

/** 激活车辆（可接单） */
export const activateVehicle = (id: string | number) => {
  return request({
    url: '/vehicle/activate/' + id,
    method: 'post'
  });
};

/** 停用车辆 */
export const deactivateVehicle = (id: string | number) => {
  return request({
    url: '/vehicle/deactivate/' + id,
    method: 'post'
  });
};

/** 设置初始点 */
export const setVehiclePosition = (id: string | number, pointId: string) => {
  return request({
    url: `/vehicle/${id}/position`,
    method: 'put',
    data: { pointId }
  });
};

