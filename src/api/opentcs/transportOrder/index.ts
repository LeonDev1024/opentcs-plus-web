import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { TransportOrderVO, TransportOrderForm, TransportOrderQuery } from '@/api/opentcs/transportOrder/types';

/**
 * 查询运输订单列表
 * @param query
 * @returns {*}
 */
export const listTransportOrder = (query?: TransportOrderQuery): AxiosPromise<TransportOrderVO[]> => {
  return request({
    url: '/opentcs/transportOrder/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询运输订单详细
 * @param id
 */
export const getTransportOrder = (id: string | number): AxiosPromise<TransportOrderVO> => {
  return request({
    url: '/opentcs/transportOrder/' + id,
    method: 'get'
  });
};

/**
 * 新增运输订单
 * @param data
 */
export const addTransportOrder = (data: TransportOrderForm) => {
  return request({
    url: '/opentcs/transportOrder',
    method: 'post',
    data: data
  });
};

/**
 * 修改运输订单
 * @param data
 */
export const updateTransportOrder = (data: TransportOrderForm) => {
  return request({
    url: '/opentcs/transportOrder',
    method: 'put',
    data: data
  });
};

/**
 * 删除运输订单
 * @param id
 */
export const delTransportOrder = (id: string | number | Array<string | number>) => {
  return request({
    url: '/opentcs/transportOrder/' + id,
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
    url: '/opentcs/transportOrder/assign',
    method: 'post',
    data: {
      id,
      vehicleId
    }
  });
};

/**
 * 开始运输
 * @param id 订单ID
 */
export const startTransport = (id: string | number) => {
  return request({
    url: '/opentcs/transportOrder/start/' + id,
    method: 'post'
  });
};

/**
 * 完成订单
 * @param id 订单ID
 */
export const completeOrder = (id: string | number) => {
  return request({
    url: '/opentcs/transportOrder/complete/' + id,
    method: 'post'
  });
};

/**
 * 取消订单
 * @param id 订单ID
 */
export const cancelOrder = (id: string | number) => {
  return request({
    url: '/opentcs/transportOrder/cancel/' + id,
    method: 'post'
  });
};

