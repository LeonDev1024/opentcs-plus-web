// 工厂模型类型定义

export interface FactoryModelVO {
  id: number;
  factoryId: string;
  name: string;
  modelVersion: string;
  scale: number;
  coordinateSystem: string;
  lengthUnit: string;
  properties?: string;
  description?: string;
  status: string;
  createTime?: string;
  updateTime?: string;
}

export interface FactoryModelForm {
  id?: number;
  factoryId?: string;
  name: string;
  modelVersion?: string;
  scale?: number;
  coordinateSystem?: string;
  lengthUnit?: string;
  properties?: string;
  description?: string;
  status?: string;
}

export interface FactoryModelQuery {
  pageNum?: number;
  pageSize?: number;
  name?: string;
  factoryId?: string;
  status?: string;
}
