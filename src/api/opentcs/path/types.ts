export interface PathVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 路径名称
   */
  name: string;

  /**
   * 路径编码
   */
  code?: string;

  /**
   * 起始点位ID
   */
  startPointId?: string | number;

  /**
   * 起始点位名称
   */
  startPointName?: string;

  /**
   * 结束点位ID
   */
  endPointId?: string | number;

  /**
   * 结束点位名称
   */
  endPointName?: string;

  /**
   * 路径长度
   */
  length?: number;

  /**
   * 路径类型
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

export interface PathForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 路径名称
   */
  name?: string;

  /**
   * 路径编码
   */
  code?: string;

  /**
   * 起始点位ID
   */
  startPointId?: string | number;

  /**
   * 结束点位ID
   */
  endPointId?: string | number;

  /**
   * 路径长度
   */
  length?: number;

  /**
   * 路径类型
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

export interface PathQuery extends PageQuery {
  /**
   * 路径名称
   */
  name?: string;

  /**
   * 路径编码
   */
  code?: string;

  /**
   * 路径类型
   */
  type?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

