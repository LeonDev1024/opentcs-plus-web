// Workflow task API types stub
export interface FlowTaskVO {
  id?: string | number;
  taskId?: string | number;
  taskName?: string;
  taskDefKey?: string;
  procDefId?: string;
  procInstId?: string;
  procExecId?: string;
  flowName?: string;
  flowCode?: string;
  flowStatus?: string;
  nodeName?: string;
  nodeCode?: string;
  nodeRatio?: string;
  createTime?: string;
  updateTime?: string;
  instanceId?: string;
  version?: string;
  businessId?: string;
  buttonList?: any[];
  copyList?: any[];
  varList?: any[];
  [key: string]: any; // Allow additional properties
}

export interface TaskOperationBo {
  id?: string | number;
  taskId?: string | number;
  userIds?: string[];
  userId?: string;
  userName?: string;
  operation?: string;
  message?: string;
  assigneeMap?: Record<string, string>;
  fileId?: string | number;
}

export interface FlowCopyVo {
  id?: string | number;
  userIds?: string[];
  userId?: string;
  userName?: string;
  message?: string;
  fileId?: string | number;
  messageType?: string[];
}

export interface TaskNode {
  nodeCode: string;
  nodeName: string;
}
