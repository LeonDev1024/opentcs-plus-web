export interface BlockVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 区块名称
   */
  name: string;

  /**
   * 区块编码
   */
  code?: string;

  /**
   * 区块类型
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

export interface BlockForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 区块名称
   */
  name?: string;

  /**
   * 区块编码
   */
  code?: string;

  /**
   * 区块类型
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

export interface BlockQuery extends PageQuery {
  /**
   * 区块名称
   */
  name?: string;

  /**
   * 区块编码
   */
  code?: string;

  /**
   * 区块类型
   */
  type?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

