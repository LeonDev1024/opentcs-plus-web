export interface TransportOrderVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 订单编号
   */
  orderNo: string;

  /**
   * 订单名称
   */
  name?: string;

  /**
   * 车辆ID
   */
  vehicleId?: string | number;

  /**
   * 车辆名称
   */
  vehicleName?: string;

  /**
   * 起始位置ID
   */
  startLocationId?: string | number;

  /**
   * 起始位置名称
   */
  startLocationName?: string;

  /**
   * 目标位置ID
   */
  targetLocationId?: string | number;

  /**
   * 目标位置名称
   */
  targetLocationName?: string;

  /**
   * 订单状态（0待分配 1已分配 2运输中 3已完成 4已取消）
   */
  status: string;

  /**
   * 优先级（0低 1中 2高）
   */
  priority?: string;

  /**
   * 预计开始时间
   */
  plannedStartTime?: string;

  /**
   * 预计完成时间
   */
  plannedEndTime?: string;

  /**
   * 实际开始时间
   */
  actualStartTime?: string;

  /**
   * 实际完成时间
   */
  actualEndTime?: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

export interface TransportOrderForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 订单编号
   */
  orderNo?: string;

  /**
   * 订单名称
   */
  name?: string;

  /**
   * 车辆ID
   */
  vehicleId?: string | number;

  /**
   * 起始位置ID
   */
  startLocationId?: string | number;

  /**
   * 目标位置ID
   */
  targetLocationId?: string | number;

  /**
   * 订单状态（0待分配 1已分配 2运输中 3已完成 4已取消）
   */
  status?: string;

  /**
   * 优先级（0低 1中 2高）
   */
  priority?: string;

  /**
   * 预计开始时间
   */
  plannedStartTime?: string;

  /**
   * 预计完成时间
   */
  plannedEndTime?: string;

  /**
   * 描述
   */
  description?: string;
}

export interface TransportOrderQuery extends PageQuery {
  /**
   * 订单编号
   */
  orderNo?: string;

  /**
   * 订单名称
   */
  name?: string;

  /**
   * 车辆ID
   */
  vehicleId?: string | number;

  /**
   * 起始位置ID
   */
  startLocationId?: string | number;

  /**
   * 目标位置ID
   */
  targetLocationId?: string | number;

  /**
   * 订单状态（0待分配 1已分配 2运输中 3已完成 4已取消）
   */
  status?: string;

  /**
   * 优先级（0低 1中 2高）
   */
  priority?: string;
}

