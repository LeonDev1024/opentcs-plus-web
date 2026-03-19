// Workflow task API stub
import request from '@/utils/request';
import { FlowTaskVO, TaskOperationBo, FlowCopyVo, TaskNode } from './types';

export function getTask(taskId: string | number): Promise<any> {
  return request({
    url: '/workflow/task/get/' + taskId,
    method: 'get'
  });
}

export function completeTask(data: TaskOperationBo): Promise<any> {
  return request({
    url: '/workflow/task/complete',
    method: 'post',
    data
  });
}

export function backProcess(data: TaskOperationBo): Promise<any> {
  return request({
    url: '/workflow/task/back',
    method: 'post',
    data
  });
}

export function taskOperation(data: TaskOperationBo, operation?: string): Promise<any> {
  return request({
    url: '/workflow/task/operation',
    method: 'post',
    params: operation ? { operation } : {},
    data
  });
}

export function terminationTask(data: TaskOperationBo): Promise<any> {
  return request({
    url: '/workflow/task/termination',
    method: 'post',
    data
  });
}

export function getBackTaskNode(taskId: string | number): Promise<any> {
  return request({
    url: '/workflow/task/back/node',
    method: 'get',
    params: { taskId }
  });
}

export function currentTaskAllUser(taskId: string | number): Promise<any> {
  return request({
    url: '/workflow/task/allUser',
    method: 'get',
    params: { taskId }
  });
}

export function getNextNodeList(data: any): Promise<any> {
  return request({
    url: '/workflow/task/nextNodeList',
    method: 'post',
    data
  });
}

export function delegateTask(data: TaskOperationBo): Promise<any> {
  return request({
    url: '/workflow/task/delegate',
    method: 'post',
    data
  });
}

export function transferTask(data: TaskOperationBo): Promise<any> {
  return request({
    url: '/workflow/task/transfer',
    method: 'post',
    data
  });
}

export function addMultiInstanceUser(data: TaskOperationBo): Promise<any> {
  return request({
    url: '/workflow/task/addMultiInstance',
    method: 'post',
    data
  });
}

export function deleteMultiInstanceUser(data: any): Promise<any> {
  return request({
    url: '/workflow/task/deleteMultiInstance',
    method: 'post',
    data
  });
}

export function copyTask(data: FlowCopyVo): Promise<any> {
  return request({
    url: '/workflow/task/copy',
    method: 'post',
    data
  });
}
