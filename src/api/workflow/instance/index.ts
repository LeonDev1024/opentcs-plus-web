// Workflow instance API stub
import request from '@/utils/request';

export function flowHisTaskList(insId: string | number) {
  return request({
    url: '/workflow/instance/historyTaskList',
    method: 'get',
    params: { insId }
  });
}

export function getIns(insId: string | number) {
  return request({
    url: '/workflow/instance/get/' + insId,
    method: 'get'
  });
}

export function getFlowViewer(insId: string | number) {
  return request({
    url: '/workflow/instance/flowViewer',
    method: 'get',
    params: { insId }
  });
}
