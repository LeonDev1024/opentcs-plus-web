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
   * 当前位置点位 ID
   */
  currentPosition?: string;

  /**
   * 当前位置ID（兼容旧字段）
   */
  currentLocationId?: string | number;

  /**
   * 当前位置名称
   */
  currentLocationName?: string;

  /**
   * 驱动类型：LOOPBACK / VDA5050
   */
  driverType?: string;

  /**
   * 驱动是否已连接
   */
  driverConnected?: boolean;

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
   * 驱动类型：LOOPBACK / VDA5050
   */
  driverType?: string;

  /**
   * 当前位置点位 ID
   */
  currentPosition?: string;

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

