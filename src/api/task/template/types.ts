export interface TaskTemplateVO {
  id: string | number;
  code: string;
  name: string;
  navigationMapId?: number;
  sourcePoint: string;
  destPoint: string;
  priority?: number;
  enabled: boolean;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface TaskTemplateForm {
  id?: string | number;
  code?: string;
  name?: string;
  navigationMapId?: number;
  sourcePoint?: string;
  destPoint?: string;
  priority?: number;
  enabled?: boolean;
  remark?: string;
}

export interface TaskTemplateQuery extends PageQuery {
  keyword?: string;
  enabled?: boolean;
}
