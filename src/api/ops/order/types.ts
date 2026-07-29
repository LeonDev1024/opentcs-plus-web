export interface OrderVO {
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

export interface OrderForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 外部订单号（可选）
   */
  externalOrderNo?: string;

  /**
   * 任务号（系统自动生成，展示用）
   */
  taskNo?: string;

  /**
   * 任务模板号
   */
  templateCode?: string;

  /**
   * 起点点位 ID（由模板带出）
   */
  sourcePoint?: string;

  /**
   * 终点点位 ID（由模板带出）
   */
  destPoint?: string;

  /**
   * 指定执行 AMR 名称（可选）
   */
  intendedVehicle?: string;

  /**
   * 任务预约时间
   */
  appointmentTime?: string;

  /**
   * 优先级，越大越优先（可选）
   */
  priority?: number;

  /**
   * 备注（可选，最长 200）
   */
  remark?: string;
}

/** 创建运输订单命令（对齐后端 CreateOrderCommand） */
export interface CreateOrderCommand {
  name?: string;
  externalOrderNo?: string;
  sourcePoint: string;
  destPoint: string;
  intendedVehicle?: string;
  priority?: number;
  deadline?: number;
  remark?: string;
  templateCode?: string;
}

export interface OrderQuery extends PageQuery {
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
   * 车辆VIN码
   */
  vehicleVin?: string;

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

