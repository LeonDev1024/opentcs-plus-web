import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { FactoryModelVO, FactoryModelForm, FactoryModelQuery } from './types';

// 查询工厂模型列表
export function listFactoryModel(query?: FactoryModelQuery): AxiosPromise<FactoryModelVO[]> {
  return request({
    url: '/factory/model/list',
    method: 'get',
    params: query
  });
}

// 查询工厂模型详情
export function getFactoryModel(id: number | string): AxiosPromise<FactoryModelVO> {
  return request({
    url: '/factory/model/' + id,
    method: 'get'
  });
}

// 新增工厂模型
export function addFactoryModel(data: FactoryModelForm) {
  return request({
    url: '/factory/model/create',
    method: 'post',
    data: data
  });
}

// 修改工厂模型
export function updateFactoryModel(data: FactoryModelForm) {
  return request({
    url: '/factory/model/update',
    method: 'put',
    data: data
  });
}

// 删除工厂模型
export function delFactoryModel(id: number | string) {
  return request({
    url: '/factory/model/' + id,
    method: 'delete'
  });
}
