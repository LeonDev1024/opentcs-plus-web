import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { PathVO, PathForm, PathQuery } from '@/api/opentcs/path/types';

/**
 * 查询路径列表
 * @param query
 * @returns {*}
 */
export const listPath = (query?: PathQuery): AxiosPromise<PathVO[]> => {
  return request({
    url: '/opentcs/path/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询路径详细
 * @param id
 */
export const getPath = (id: string | number): AxiosPromise<PathVO> => {
  return request({
    url: '/opentcs/path/' + id,
    method: 'get'
  });
};

/**
 * 新增路径
 * @param data
 */
export const addPath = (data: PathForm) => {
  return request({
    url: '/opentcs/path',
    method: 'post',
    data: data
  });
};

/**
 * 修改路径
 * @param data
 */
export const updatePath = (data: PathForm) => {
  return request({
    url: '/opentcs/path',
    method: 'put',
    data: data
  });
};

/**
 * 删除路径
 * @param id
 */
export const delPath = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/path/' + id,
    method: 'delete'
  });
};

