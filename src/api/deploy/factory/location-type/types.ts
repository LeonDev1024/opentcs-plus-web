export interface LocationVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 位置类型名称
   */
  name: string;

  /**
   * 允许的操作列表：对象数组格式，如 [{ "name": "LOAD" }]
   */
  allowedOperations?: Array<{ name: string }>;

  /**
   * 允许的外围设备操作：对象数组格式，如 [{ "name": "LIFT_UP" }]
   */
  allowedPeripheralOperations?: Array<{ name: string }>;

  /**
   * 扩展属性（数组类型，可能包含Symbol图标等）
   */
  properties?: Array<Record<string, any>>;

  /**
   * 创建时间
   */
  createTime?: string;

  /**
   * 更新时间
   */
  updateTime?: string;
}

export interface LocationForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 位置类型名称
   */
  name?: string;

  /**
   * 允许的操作列表：对象数组格式，如 [{ "name": "LOAD" }]
   */
  allowedOperations?: Array<{ name: string }>;

  /**
   * 允许的外围设备操作：对象数组格式，如 [{ "name": "LIFT_UP" }]
   */
  allowedPeripheralOperations?: Array<{ name: string }>;

  /**
   * 扩展属性（数组类型，可能包含Symbol图标等）
   */
  properties?: Array<Record<string, any>>;
}

export interface LocationQuery extends PageQuery {
  /**
   * 位置类型名称
   */
  name?: string;
}

