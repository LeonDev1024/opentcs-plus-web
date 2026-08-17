import request from '@/utils/request';
import { AxiosPromise } from 'axios';

export interface MapPointOption {
  id?: string | number;
  pointId: string;
  name?: string;
  type?: string;
  xPosition?: number;
  yPosition?: number;
}

/** 按导航地图主键查询导航点 */
export const listPointsByMap = (mapId: string | number): AxiosPromise<MapPointOption[]> => {
  return request({
    url: `/point/listByMap/${mapId}`,
    method: 'get'
  });
};
