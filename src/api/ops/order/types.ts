export interface OrderVO {
  id: string | number;
  /** 任务号 */
  name?: string;
  /** 内核订单 ID */
  orderNo: string;
  /** 外部订单号（创建表单「订单号」） */
  externalOrderNo?: string;
  /** 任务模板号 */
  templateCode?: string;
  /** 备注 */
  remark?: string;
  /** 内核状态：RAW / ACTIVE / RECOVERING / FINISHED / FAILED / CANCELLED */
  state?: string;
  /**
   * 业务展示状态：
   * PENDING 待执行 / DISPATCHING 寻车中 / EXECUTING 执行中 /
   * FINISHED 已完成 / CANCELLED 已取消 / PAUSED 暂停中 / FAILED 失败
   */
  displayState?: string;
  intendedVehicle?: string;
  processingVehicle?: string;
  vehicleName?: string;
  vehicleVin?: string;
  destinations?: string;
  sourcePoint?: string;
  destPoint?: string;
  priority?: number;
  creationTime?: string;
  createTime?: string;
  finishedTime?: string;
  /** 预约时间 */
  deadline?: string;
  properties?: string;
}

export interface OrderForm extends BaseEntity {
  id?: string | number;
  /** 外部订单号（可选） */
  externalOrderNo?: string;
  /** 任务号（系统自动生成，展示用） */
  taskNo?: string;
  /** 任务模板号 */
  templateCode?: string;
  /** 起点点位 ID（由模板带出） */
  sourcePoint?: string;
  /** 终点点位 ID（由模板带出） */
  destPoint?: string;
  /** 指定执行 AMR 名称（可选） */
  intendedVehicle?: string;
  /** 任务预约时间 */
  appointmentTime?: string;
  /** 优先级，越大越优先（可选） */
  priority?: number;
  /** 备注（可选，最长 200） */
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
  orderNo?: string;
  name?: string;
  /** 机器人编码/名称（匹配执行车或指定车） */
  vehicleVin?: string;
  /** 内核状态（兼容） */
  state?: string;
  /**
   * 业务展示状态：
   * PENDING / DISPATCHING / EXECUTING / FINISHED / CANCELLED / PAUSED / FAILED
   */
  displayState?: string;
}
