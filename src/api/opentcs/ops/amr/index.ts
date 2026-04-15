import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { VehicleQuery } from '@/api/opentcs/vehicle/types';
import {
  GoChargeRequest,
  MapSwitchRequest,
  ModeSwitchRequest,
  MoveRequest,
  OpsActionRecord,
  OpsActionResult,
  OpsAmrVehicle
} from './types';

export const listOpsVehicles = (query?: VehicleQuery): AxiosPromise<{ rows: OpsAmrVehicle[]; total: number }> => {
  return request({
    url: '/vehicle/list',
    method: 'get',
    params: query
  });
};

export const switchMode = (vehicleName: string, data: ModeSwitchRequest): AxiosPromise<OpsActionResult> => {
  return request({
    url: `/ops/amr/${vehicleName}/mode/switch`,
    method: 'post',
    data
  });
};

export const switchMap = (vehicleName: string, data: MapSwitchRequest): AxiosPromise<OpsActionResult> => {
  return request({
    url: `/ops/amr/${vehicleName}/map/switch`,
    method: 'post',
    data
  });
};

export const goCharge = (vehicleName: string, data: GoChargeRequest): AxiosPromise<OpsActionResult> => {
  return request({
    url: `/ops/amr/${vehicleName}/charge/go`,
    method: 'post',
    data
  });
};

export const moveVehicle = (vehicleName: string, data: MoveRequest): AxiosPromise<OpsActionResult> => {
  return request({
    url: `/ops/amr/${vehicleName}/move`,
    method: 'post',
    data
  });
};

export const listActionRecords = (vehicleName?: string): AxiosPromise<OpsActionRecord[]> => {
  return request({
    url: '/ops/amr/actions',
    method: 'get',
    params: { vehicleName }
  });
};
