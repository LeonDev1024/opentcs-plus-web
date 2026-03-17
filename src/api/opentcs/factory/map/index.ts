import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { NavigationMapVO, NavigationMapForm, NavigationMapQuery } from './types';

// 查询导航地图列表
export function listNavigationMap(query?: NavigationMapQuery): AxiosPromise<NavigationMapVO[]> {
  return request({
    url: '/factory/map/list',
    method: 'get',
    params: query
  });
}

// 查询工厂下所有导航地图
export function listMapsByFactory(factoryModelId: number | string): AxiosPromise<NavigationMapVO[]> {
  return request({
    url: '/factory/map/list/' + factoryModelId,
    method: 'get'
  });
}

// 查询导航地图详情
export function getNavigationMap(id: number | string): AxiosPromise<NavigationMapVO> {
  return request({
    url: '/factory/map/' + id,
    method: 'get'
  });
}

// 根据楼层获取地图
export function getMapByFloor(factoryModelId: number | string, floorNumber: number): AxiosPromise<NavigationMapVO> {
  return request({
    url: '/factory/map/floor/' + factoryModelId + '/' + floorNumber,
    method: 'get'
  });
}

// 新增导航地图
export function addNavigationMap(data: NavigationMapForm) {
  return request({
    url: '/factory/map/create',
    method: 'post',
    data: data
  });
}

// 修改导航地图
export function updateNavigationMap(data: NavigationMapForm) {
  return request({
    url: '/factory/map/update',
    method: 'put',
    data: data
  });
}

// 删除导航地图
export function delNavigationMap(id: number | string) {
  return request({
    url: '/factory/map/' + id,
    method: 'delete'
  });
}
