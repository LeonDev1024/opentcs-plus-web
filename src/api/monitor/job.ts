import request from '@/utils/request';

export interface Job {
  jobId?: number;
  jobName: string;
  jobGroup: string;
  invokeTarget: string;
  cronExpression: string;
  misfirePolicy: string;
  concurrent: string;
  status: string;
  remark?: string;
  createTime?: string;
}

export interface JobQuery {
  jobName?: string;
  jobGroup?: string;
  status?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface JobLog {
  jobLogId: number;
  jobName: string;
  jobGroup: string;
  invokeTarget: string;
  jobMessage: string;
  status: string;
  exceptionInfo?: string;
  createTime: string;
}

export interface JobLogQuery {
  jobName?: string;
  jobGroup?: string;
  status?: string;
  pageNum?: number;
  pageSize?: number;
}

export const listJob = (params?: JobQuery) => request.get<any>('/schedule/list', { params });

export const getJob = (jobId: number) => request.get<any>(`/schedule/${jobId}`);

export const addJob = (data: Job) => request.post<any>('/schedule', data);

export const updateJob = (data: Job) => request.put<any>('/schedule', data);

export const delJob = (jobId: number) => request.delete<any>(`/schedule/${jobId}`);

export const changeJobStatus = (jobId: number, status: string) =>
  request.put<any>('/schedule/changeStatus', { jobId, status });

export const runJob = (jobId: number, jobGroup: string) =>
  request.put<any>('/schedule/run', { jobId, jobGroup });

export const checkCron = (cronExpression: string) =>
  request.get<any>('/schedule/checkCron', { params: { cronExpression } });

export const nextTriggerTime = (cronExpression: string, count = 3) =>
  request.get<any>('/schedule/nextTriggerTime', { params: { cronExpression, count } });

export const listJobLog = (params?: JobLogQuery) => request.get<any>('/schedule/log/list', { params });

export const cleanJobLog = () => request.delete<any>('/schedule/log/clean');

export const delJobLog = (logId: number) => request.delete<any>(`/schedule/log/${logId}`);
