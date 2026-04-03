import request from '@/utils/request';
import { AxiosPromise } from 'axios';

export interface OssUploadResult {
  url: string;
  fileName: string;
  ossId: string;
}

/**
 * 上传文件到 OSS
 * @param file 文件
 */
export function uploadOss(file: File): AxiosPromise<OssUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  return request({
    url: '/resource/oss/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}