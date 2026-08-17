import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { TaskTemplateForm, TaskTemplateQuery, TaskTemplateVO } from './types';

export const listTaskTemplate = (query?: TaskTemplateQuery): AxiosPromise<TaskTemplateVO[]> => {
  return request({
    url: '/task/template/list',
    method: 'get',
    params: query
  });
};

/** 启用模板下拉（创建任务用） */
export const listTaskTemplateAll = (): AxiosPromise<TaskTemplateVO[]> => {
  return request({
    url: '/task/template/all',
    method: 'get'
  });
};

export const getTaskTemplate = (id: string | number): AxiosPromise<TaskTemplateVO> => {
  return request({
    url: '/task/template/' + id,
    method: 'get'
  });
};

export const addTaskTemplate = (data: TaskTemplateForm) => {
  return request({
    url: '/task/template/add',
    method: 'post',
    data
  });
};

export const updateTaskTemplate = (data: TaskTemplateForm) => {
  return request({
    url: '/task/template/edit',
    method: 'put',
    data
  });
};

export const delTaskTemplate = (id: string | number | Array<string | number>) => {
  return request({
    url: '/task/template/' + id,
    method: 'delete'
  });
};

export const changeTaskTemplateStatus = (data: TaskTemplateForm) => {
  return request({
    url: '/task/template/changeStatus',
    method: 'put',
    data
  });
};
