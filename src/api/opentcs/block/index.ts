import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { BlockVO, BlockForm, BlockQuery } from '@/api/opentcs/block/types';

/**
 * 查询区块列表
 * @param query
 * @returns {*}
 */
export const listBlock = (query?: BlockQuery): AxiosPromise<BlockVO[]> => {
  return request({
    url: '/opentcs/block/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询区块详细
 * @param id
 */
export const getBlock = (id: string | number): AxiosPromise<BlockVO> => {
  return request({
    url: '/opentcs/block/' + id,
    method: 'get'
  });
};

/**
 * 新增区块
 * @param data
 */
export const addBlock = (data: BlockForm) => {
  return request({
    url: '/opentcs/block',
    method: 'post',
    data: data
  });
};

/**
 * 修改区块
 * @param data
 */
export const updateBlock = (data: BlockForm) => {
  return request({
    url: '/opentcs/block',
    method: 'put',
    data: data
  });
};

/**
 * 删除区块
 * @param id
 */
export const delBlock = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/block/' + id,
    method: 'delete'
  });
};

