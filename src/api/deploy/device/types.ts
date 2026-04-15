export interface VehicleVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 车辆名称
   */
  name: string;

  /**
   * 车辆VIN码
   */
  vinCode?: string;

  /**
   * 车辆类型ID
   */
  vehicleTypeId?: string | number;

  /**
   * 车辆类型名称
   */
  vehicleTypeName?: string;

  /**
   * 车辆状态：UNKNOWN, UNAVAILABLE, IDLE, CHARGING, WORKING, ERROR
   */
  state: string;

  /**
   * 当前位置ID
   */
  currentLocationId?: string | number;

  /**
   * 当前位置名称
   */
  currentLocationName?: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

/**
 * 分页响应结构
 */
export interface PageResult<T> {
  /**
   * 总记录数
   */
  total: number;
  /**
   * 分页数据
   */
  rows: T[];
  /**
   * 状态码
   */
  code: number;
  /**
   * 消息
   */
  msg: string;
}

export interface VehicleForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 车辆名称
   */
  name?: string;

  /**
   * 车辆VIN码
   */
  vinCode?: string;

  /**
   * 车辆类型ID
   */
  vehicleTypeId?: string | number;

  /**
   * 车辆状态：UNKNOWN, UNAVAILABLE, IDLE, CHARGING, WORKING, ERROR
   */
  state?: string;

  /**
   * 当前位置ID
   */
  currentLocationId?: string | number;

  /**
   * 描述
   */
  description?: string;
}

export interface VehicleQuery extends PageQuery {
  /**
   * 车辆名称
   */
  name?: string;

  /**
   * 车辆VIN码
   */
  vinCode?: string;

  /**
   * 车辆类型ID
   */
  vehicleTypeId?: string | number;

  /**
   * 车辆状态：UNKNOWN, UNAVAILABLE, IDLE, CHARGING, WORKING, ERROR
   */
  state?: string;
}

