export interface PointVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 点位名称
   */
  name: string;

  /**
   * 点位编码
   */
  code?: string;

  /**
   * X坐标
   */
  x?: number;

  /**
   * Y坐标
   */
  y?: number;

  /**
   * Z坐标
   */
  z?: number;

  /**
   * 点位类型
   */
  type?: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 状态（0正常 1停用）
   */
  status: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

export interface PointForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 点位名称
   */
  name?: string;

  /**
   * 点位编码
   */
  code?: string;

  /**
   * X坐标
   */
  x?: number;

  /**
   * Y坐标
   */
  y?: number;

  /**
   * Z坐标
   */
  z?: number;

  /**
   * 点位类型
   */
  type?: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

export interface PointQuery extends PageQuery {
  /**
   * 点位名称
   */
  name?: string;

  /**
   * 点位编码
   */
  code?: string;

  /**
   * 点位类型
   */
  type?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

