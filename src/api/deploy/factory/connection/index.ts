import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { CrossLayerConnectionVO, CrossLayerConnectionForm, CrossLayerConnectionQuery } from './types';

// 查询跨层连接列表
export function listCrossLayerConnection(query?: CrossLayerConnectionQuery): AxiosPromise<CrossLayerConnectionVO[]> {
  return request({
    url: '/factory/connection/list',
    method: 'get',
    params: query
  });
}

// 查询工厂下所有跨层连接
export function listConnectionsByFactory(factoryModelId: number | string): AxiosPromise<CrossLayerConnectionVO[]> {
  return request({
    url: '/factory/connection/list/' + factoryModelId,
    method: 'get'
  });
}

// 查询可用跨层连接
export function listAvailableConnections(factoryModelId: number | string): AxiosPromise<CrossLayerConnectionVO[]> {
  return request({
    url: '/factory/connection/available/' + factoryModelId,
    method: 'get'
  });
}

// 查询跨层连接详情
export function getCrossLayerConnection(id: number | string): AxiosPromise<CrossLayerConnectionVO> {
  return request({
    url: '/factory/connection/' + id,
    method: 'get'
  });
}

// 新增跨层连接
export function addCrossLayerConnection(data: CrossLayerConnectionForm) {
  return request({
    url: '/factory/connection/create',
    method: 'post',
    data: data
  });
}

// 修改跨层连接
export function updateCrossLayerConnection(data: CrossLayerConnectionForm) {
  return request({
    url: '/factory/connection/update',
    method: 'put',
    data: data
  });
}

// 删除跨层连接
export function delCrossLayerConnection(id: number | string) {
  return request({
    url: '/factory/connection/' + id,
    method: 'delete'
  });
}

// 预留电梯
export function reserveConnection(connectionId: string, vehicleId?: string) {
  return request({
    url: '/factory/connection/' + connectionId + '/reserve',
    method: 'post',
    data: { vehicleId }
  });
}

// 释放电梯
export function releaseConnection(connectionId: string) {
  return request({
    url: '/factory/connection/' + connectionId + '/release',
    method: 'post'
  });
}
