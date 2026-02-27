import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { OrderVO, OrderForm, OrderQuery } from '@/api/opentcs/order/types';

/**
 * 查询运输订单列表
 * @param query
 * @returns {*}
 */
export const listOrder = (query?: OrderQuery): AxiosPromise<OrderVO[]> => {
  return request({
    url: '/transport-order/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询运输订单详细
 * @param id
 */
export const getOrder = (id: string | number): AxiosPromise<OrderVO> => {
  return request({
    url: '/transport-order/' + id,
    method: 'get'
  });
};

/**
 * 新增运输订单
 * @param data
 */
export const addOrder = (data: OrderForm) => {
  return request({
    url: '/transport-order',
    method: 'post',
    data: data
  });
};

/**
 * 修改运输订单
 * @param data
 */
export const updateOrder = (data: OrderForm) => {
  return request({
    url: '/transport-order',
    method: 'put',
    data: data
  });
};

/**
 * 删除运输订单
 * @param id
 */
export const delOrder = (id: string | number | Array<string | number>) => {
  return request({
    url: '/transport-order/' + id,
    method: 'delete'
  });
};

/**
 * 分配订单到车辆
 * @param id 订单ID
 * @param vehicleId 车辆ID
 */
export const assignOrder = (id: string | number, vehicleId: string | number) => {
  return request({
    url: '/transport-order/assign/' + id,
    method: 'post',
    params: {
      vehicleId
    }
  });
};

/**
 * 取消订单
 * @param id 订单ID
 */
export const cancelOrder = (id: string | number) => {
  return request({
    url: '/transport-order/cancel/' + id,
    method: 'post'
  });
};

