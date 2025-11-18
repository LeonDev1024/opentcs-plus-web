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
   * 位置类型编码
   */
  code?: string;

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
   * 位置类型编码
   */
  code?: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

export interface LocationTypeQuery extends PageQuery {
  /**
   * 位置类型名称
   */
  name?: string;

  /**
   * 位置类型编码
   */
  code?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

