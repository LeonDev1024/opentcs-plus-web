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
   * 车辆编码
   */
  code?: string;

  /**
   * 车辆类型ID
   */
  vehicleTypeId?: string | number;

  /**
   * 车辆类型名称
   */
  vehicleTypeName?: string;

  /**
   * 车牌号
   */
  licensePlate?: string;

  /**
   * 车辆状态（0空闲 1工作中 2维护中）
   */
  status: string;

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
   * 车辆编码
   */
  code?: string;

  /**
   * 车辆类型ID
   */
  vehicleTypeId?: string | number;

  /**
   * 车牌号
   */
  licensePlate?: string;

  /**
   * 车辆状态（0空闲 1工作中 2维护中）
   */
  status?: string;

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
   * 车辆编码
   */
  code?: string;

  /**
   * 车辆类型ID
   */
  vehicleTypeId?: string | number;

  /**
   * 车牌号
   */
  licensePlate?: string;

  /**
   * 车辆状态（0空闲 1工作中 2维护中）
   */
  status?: string;
}

