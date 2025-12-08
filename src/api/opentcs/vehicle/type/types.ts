export interface TypeVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 车辆类型名称
   */
  name: string;

  /**
   * 长度（米）
   */
  length?: number;

  /**
   * 宽度（米）
   */
  width?: number;

  /**
   * 高度（米）
   */
  height?: number;

  /**
   * 最大速度（米/秒）
   */
  maxVelocity?: number;

  /**
   * 最大倒车速度（米/秒）
   */
  maxReverseVelocity?: number;

  /**
   * 能量等级
   */
  energyLevel?: number;

  /**
   * 允许的订单类型：数组格式，如 ["TRANSPORT", "CHARGE"]
   */
  allowedOrders?: string[];

  /**
   * 允许的外设操作：数组格式，如 ["LIFT_UP", "LIFT_DOWN"]
   */
  allowedPeripheralOperations?: string[];

  /**
   * 扩展属性（JSON对象）
   */
  properties?: Record<string, any>;

  /**
   * 创建时间
   */
  createTime?: string;

  /**
   * 更新时间
   */
  updateTime?: string;
}

export interface TypeForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 车辆类型名称
   */
  name?: string;

  /**
   * 长度（米）
   */
  length?: number;

  /**
   * 宽度（米）
   */
  width?: number;

  /**
   * 高度（米）
   */
  height?: number;

  /**
   * 最大速度（米/秒）
   */
  maxVelocity?: number;

  /**
   * 最大倒车速度（米/秒）
   */
  maxReverseVelocity?: number;

  /**
   * 能量等级
   */
  energyLevel?: number;

  /**
   * 允许的订单类型：数组格式
   */
  allowedOrders?: string[];

  /**
   * 允许的外设操作：数组格式
   */
  allowedPeripheralOperations?: string[];

  /**
   * 扩展属性（JSON对象）
   */
  properties?: Record<string, any>;
}

export interface TypeQuery extends PageQuery {
  /**
   * 车辆类型名称
   */
  name?: string;
}

