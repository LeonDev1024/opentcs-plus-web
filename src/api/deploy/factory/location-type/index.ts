import { AxiosPromise } from 'axios';
import { LocationVO, LocationForm, LocationQuery } from '@/api/deploy/factory/location-type/types';

const removedLocationTypeApiError = () => Promise.reject(new Error('位置类型接口已移除'));

/**
 * 查询位置类型列表（分页，用于管理页）
 * @param query
 * @returns {*}
 */
export const listLocation = (query?: LocationQuery): AxiosPromise<{ rows: LocationVO[]; total: number }> => {
  return Promise.resolve({ rows: [], total: 0 }) as any;
};

/**
 * 获取位置类型列表（用于下拉选择，如地图编辑器）
 * @returns 位置类型列表
 */
export const getLocationTypeListForSelect = (): Promise<LocationVO[]> => {
  return Promise.resolve([]);
};

/**
 * 查询位置类型详细
 * @param id
 */
export const getLocation = (id: string | number): AxiosPromise<LocationVO> => {
  return removedLocationTypeApiError() as AxiosPromise<LocationVO>;
};

/**
 * 新增位置类型
 * @param data
 */
export const addLocation = (data: LocationForm) => {
  return removedLocationTypeApiError();
};

/**
 * 修改位置类型
 * @param data
 */
export const updateLocation = (data: LocationForm) => {
  return removedLocationTypeApiError();
};

/**
 * 删除位置类型
 * @param id
 */
export const delLocation = (id: string | number | Array<string | number>) => {
  return removedLocationTypeApiError();
};
