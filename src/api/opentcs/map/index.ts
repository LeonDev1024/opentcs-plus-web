import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  MapVO,
  MapForm,
  MapQuery,
  MapEditorResponse,
  MapEditorSaveData,
  MapEditorApiSavePayload
} from '@/api/opentcs/map/types';

// 查询地图模型列表
export function listMap(query?: MapQuery): AxiosPromise<MapVO[]> {
  return request({
    url: '/map/model/list',
    method: 'get',
    params: query
  });
}

/**
 * 查询地图模型详细
 * @param id
 */
export const getMap = (id: string | number): AxiosPromise<MapVO> => {
  return request({
    url: '/map/model/' + id,
    method: 'get'
  });
};

/**
 * 新增地图模型
 * @param data
 */
export const addMap = (data: MapForm) => {
  return request({
    url: '/map/model/create',
    method: 'post',
    data: data
  });
};

/**
 * 修改地图模型
 * @param data
 */
export const updateMap = (data: MapForm) => {
  return request({
    url: '/map/model/update',
    method: 'put',
    data: data
  });
};

/**
 * 删除地图模型
 * @param id
 */
export const delMap = (id: string | number | Array<string | number>) => {
  return request({
    url: '/map/model/' + id,
    method: 'delete'
  });
};

/**
 * 保存地图编辑器数据（保存到文件）
 * @param mapId 地图业务标识（mapId）
 * @param data 编辑器数据
 */
export const saveMapEditorData = (mapId: string | number, data: MapEditorSaveData) => {
  // 将编辑器数据序列化为 JSON
  const jsonData = JSON.stringify(data, null, 2);

  // 创建 FormData 上传文件
  const formData = new FormData();
  const blob = new Blob([jsonData], { type: 'application/json' });
  formData.append('file', blob, `map_${data.mapInfo?.mapVersion || '1.0'}.json`);

  return request({
    url: `/map/model/${mapId}/editor-data/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * 保存地图（保存语义数据到数据库 + 生成 JSON 快照）
 * @param data 地图编辑器数据
 */
export const saveMap = (data: MapEditorApiSavePayload) => {
  return request({
    url: '/map/editor/save',
    method: 'post',
    data
  });
};

/**
 * 加载地图编辑器数据
 * 后端返回标准响应包装：R<MapEditorBO>
 */
export const loadMapEditorData = (mapId: string | number): AxiosPromise<MapEditorResponse> => {
  return request({
    url: `/map/editor/load`,
    method: 'post',
    data: { mapId }
  });
};

/**
 * 发布地图
 * @param mapId 地图业务标识（mapId）
 */
export const publishMap = (mapId: string | number) => {
  return request({
    url: `/map/editor/publish/${mapId}`,
    method: 'post'
  });
};

/**
 * 导出地图模型文件（后端当前导出 PlantModel JSON）
 * @param modelId 地图模型ID
 */
export const exportMapFile = (modelId: string | number): Promise<Blob> => {
  return request<Blob>({
    url: `/map/model/export/${modelId}`,
    method: 'get',
    responseType: 'blob'
  }) as unknown as Promise<Blob>;
};

/**
 * 导入地图模型文件
 * @param file 地图文件
 */
export const importMapFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return request({
    url: `/map/model/import`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

