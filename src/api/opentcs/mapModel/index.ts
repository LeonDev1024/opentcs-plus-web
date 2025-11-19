import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { MapModelVO, MapModelForm, MapModelQuery } from '@/api/opentcs/mapModel/types';

// 查询地图模型列表
export function listMapModel(query?: MapModelQuery): AxiosPromise<MapModelVO[]> {
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
export const getMapModel = (id: string | number): AxiosPromise<MapModelVO> => {
  return request({
    url: '/map/model/' + id,
    method: 'get'
  });
};

/**
 * 新增地图模型
 * @param data
 */
export const addMapModel = (data: MapModelForm) => {
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
export const updateMapModel = (data: MapModelForm) => {
  return request({
    url: '/map/model',
    method: 'put',
    data: data
  });
};

/**
 * 删除地图模型
 * @param id
 */
export const delMapModel = (id: string | number | Array<string | number>) => {
  return request({
    url: '/map/model/' + id,
    method: 'delete'
  });
};

/**
 * 加载地图模型
 * @param id
 */
export const loadMapModel = (id: string | number) => {
  return request({
    url: '/map/model/load/' + id,
    method: 'post'
  });
};

/**
 * 保存地图编辑器数据（保存到文件）
 * @param mapModelId 地图模型ID
 * @param data 编辑器数据
 */
export const saveMapEditorData = (mapModelId: string | number, data: any) => {
  // 将编辑器数据序列化为 JSON
  const jsonData = JSON.stringify(data, null, 2);
  
  // 创建 FormData 上传文件
  const formData = new FormData();
  const blob = new Blob([jsonData], { type: 'application/json' });
  formData.append('file', blob, `map_${data.mapInfo?.version || '1.0'}.json`);
  
  return request({
    url: `/map/model/${mapModelId}/editor-data/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * 加载地图编辑器数据（从文件加载）
 * @param mapModelId 地图模型ID
 */
export const loadMapEditorData = async (mapModelId: string | number): Promise<any> => {
  try {
    // 当 responseType 为 'blob' 时，响应拦截器会直接返回 Blob 对象
    const blob = await request({
      url: `/map/model/${mapModelId}/editor-data/download`,
      method: 'get',
      responseType: 'blob'
    });
    
    // 验证是否为有效的 Blob
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('响应数据格式错误');
    }
    
    // 检查是否是错误响应（通常是 JSON 格式的错误信息）
    const blobText = await blob.text();
    
    // 尝试解析 JSON
    try {
      const data = JSON.parse(blobText);
      
      // 如果解析成功但包含错误信息，抛出错误
      if (data.code && data.code !== 200) {
        throw new Error(data.msg || '加载地图失败');
      }
      
      return {
        data: data
      };
    } catch (parseError) {
      // 如果解析失败，可能是真正的 Blob 数据，但这里应该是 JSON
      throw new Error('地图数据格式错误：' + blobText.substring(0, 100));
    }
  } catch (error: any) {
    // 如果是 Blob 格式的错误响应，尝试解析错误信息
    if (error instanceof Blob) {
      try {
        const errorText = await error.text();
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.msg || '加载地图失败');
      } catch {
        throw new Error('加载地图失败');
      }
    }
    throw error;
  }
};

/**
 * 导出地图文件
 * @param mapModelId 地图模型ID
 * @param format 导出格式：json 或 xml
 */
export const exportMapFile = (mapModelId: string | number, format: 'json' | 'xml' = 'json') => {
  return request({
    url: `/map/model/${mapModelId}/export`,
    method: 'get',
    params: { format },
    responseType: 'blob'
  });
};

/**
 * 导入地图文件
 * @param mapModelId 地图模型ID
 * @param file 地图文件
 */
export const importMapFile = (mapModelId: string | number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return request({
    url: `/map/model/${mapModelId}/import`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

