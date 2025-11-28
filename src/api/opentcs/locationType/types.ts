export interface LocationTypeVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 位置类型名称
   */
  name: string;

  /**
   * 允许的操作列表：LOAD, UNLOAD, NOP等
   */
  allowedOperations?: string;

  /**
   * 允许的外围设备操作
   */
  allowedPeripheralOperations?: string;

  /**
   * 扩展属性（JSON字符串，可能包含Symbol图标等）
   */
  properties?: string;

  /**
   * 创建时间
   */
  createTime?: string;

  /**
   * 更新时间
   */
  updateTime?: string;
}

export interface LocationTypeForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 位置类型名称
   */
  name?: string;

  /**
   * 允许的操作列表：LOAD, UNLOAD, NOP等（逗号分隔）
   */
  allowedOperations?: string;

  /**
   * 允许的外围设备操作（逗号分隔）
   */
  allowedPeripheralOperations?: string;

  /**
   * 扩展属性（JSON字符串，可能包含Symbol图标等）
   */
  properties?: string;
}

export interface LocationTypeQuery extends PageQuery {
  /**
   * 位置类型名称
   */
  name?: string;
}

