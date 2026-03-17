import FileSaver from 'file-saver';
import { ElLoading } from 'element-plus';
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading';
import { tansParams, blobValidate } from '@/utils/ruoyi';
import { errorCode } from '@/utils/errorCode';
import { ElMessage } from 'element-plus';
import service from './axiosInstance';

let downloadLoadingInstance: LoadingInstance;

/**
 * 通用文件下载方法
 * @param url 请求地址
 * @param params 请求参数
 * @param fileName 文件名
 */
export function download(url: string, params: unknown, fileName: string) {
  downloadLoadingInstance = ElLoading.service({
    text: '正在下载数据，请稍候',
    background: 'rgba(0, 0, 0, 0.7)'
  });

  return service
    .post(url, params, {
      transformRequest: [
        (params: unknown) => {
          return tansParams(params);
        }
      ],
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'blob'
    })
    .then(async (resp: unknown) => {
      const isLogin = await blobValidate(resp);
      if (isLogin) {
        const blob = new Blob([resp as BlobPart]);
        FileSaver.saveAs(blob, fileName);
      } else {
        const blob = new Blob([resp as BlobPart]);
        const resText = await blob.text();
        const rspObj = JSON.parse(resText);
        const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode.default;
        ElMessage.error(errMsg);
      }
      downloadLoadingInstance.close();
    })
    .catch((r: unknown) => {
      console.error(r);
      ElMessage.error('下载文件出现错误，请联系管理员！');
      downloadLoadingInstance.close();
    });
}
