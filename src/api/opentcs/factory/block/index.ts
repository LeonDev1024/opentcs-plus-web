import request from '@/utils/request';
import { AxiosPromise } from 'axios';

/**
 * 查询区域列表（分页）
 * @param query 包含 factoryModelId, navigationMapId, type, name 等筛选条件
 */
export const listBlock = (query?: {
  pageNum?: number;
  pageSize?: number;
  factoryModelId?: number;
  navigationMapId?: number;
  type?: string;
  name?: string;
}): AxiosPromise<{ rows: any[]; total: number }> => {
  return request({
    url: '/block/list',
    method: 'get',
    params: query
  });
};

/**
 * 根据工厂ID查询区域列表
 * @param factoryId 工厂ID
 */
export const listBlockByFactory = (factoryId: number): AxiosPromise<any[]> => {
  return request({
    url: `/block/listByFactory/${factoryId}`,
    method: 'get'
  });
};

/**
 * 根据工厂ID和类型查询区域列表
 * @param factoryId 工厂ID
 * @param type 区域类型
 */
export const listBlockByFactoryAndType = (factoryId: number, type: string): AxiosPromise<any[]> => {
  return request({
    url: `/block/listByFactoryAndType/${factoryId}/${type}`,
    method: 'get'
  });
};

/**
 * 查询区域详情
 * @param id 区域ID
 */
export const getBlock = (id: number): AxiosPromise<any> => {
  return request({
    url: `/block/${id}`,
    method: 'get'
  });
};

/**
 * 创建区域
 * @param data 区域数据
 */
export const createBlock = (data: any): AxiosPromise<any> => {
  return request({
    url: '/block/create',
    method: 'post',
    data: data
  });
};

/**
 * 更新区域
 * @param data 区域数据
 */
export const updateBlock = (data: any): AxiosPromise<any> => {
  return request({
    url: '/block/update',
    method: 'put',
    data: data
  });
};

/**
 * 删除区域
 * @param id 区域ID
 */
export const deleteBlock = (id: number): AxiosPromise<any> => {
  return request({
    url: `/block/${id}`,
    method: 'delete'
  });
};

/**
 * 获取区域类型枚举
 */
export const getBlockTypes = (): AxiosPromise<string[]> => {
  return request({
    url: '/block/types',
    method: 'get'
  });
};
