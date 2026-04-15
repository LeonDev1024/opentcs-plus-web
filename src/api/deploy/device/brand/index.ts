import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { BrandVO, BrandForm, BrandQuery } from '@/api/deploy/device/brand/types';

/**
 * 查询品牌列表
 * @param query
 * @returns {*}
 */
export const listBrand = (query?: BrandQuery): AxiosPromise<BrandVO[]> => {
  return request({
    url: '/vehicle/brand/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询所有启用的品牌（下拉选择用）
 * @returns {*}
 */
export const listBrandAll = (): AxiosPromise<BrandVO[]> => {
  return request({
    url: '/vehicle/brand/all',
    method: 'get'
  });
};

/**
 * 查询品牌详细
 * @param id
 */
export const getBrand = (id: string | number): AxiosPromise<BrandVO> => {
  return request({
    url: '/vehicle/brand/' + id,
    method: 'get'
  });
};

/**
 * 新增品牌
 * @param data
 */
export const addBrand = (data: BrandForm) => {
  return request({
    url: '/vehicle/brand/add',
    method: 'post',
    data: data
  });
};

/**
 * 修改品牌
 * @param data
 */
export const updateBrand = (data: BrandForm) => {
  return request({
    url: '/vehicle/brand/edit',
    method: 'put',
    data: data
  });
};

/**
 * 删除品牌
 * @param id
 */
export const delBrand = (id: string | number | Array<string | number>) => {
  return request({
    url: '/vehicle/brand/' + id,
    method: 'delete'
  });
};

/**
 * 启用/禁用品牌
 * @param data
 */
export const changeBrandStatus = (data: BrandForm) => {
  return request({
    url: '/vehicle/brand/changeStatus',
    method: 'put',
    data: data
  });
};
