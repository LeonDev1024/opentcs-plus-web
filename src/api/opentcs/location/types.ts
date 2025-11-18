export interface LocationVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 位置名称
   */
  name: string;

  /**
   * 位置编码
   */
  code?: string;

  /**
   * 位置类型ID
   */
  locationTypeId?: string | number;

  /**
   * 位置类型名称
   */
  locationTypeName?: string;

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
   * 区块ID
   */
  blockId?: string | number;

  /**
   * 区块名称
   */
  blockName?: string;

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

export interface LocationForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 位置名称
   */
  name?: string;

  /**
   * 位置编码
   */
  code?: string;

  /**
   * 位置类型ID
   */
  locationTypeId?: string | number;

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
   * 区块ID
   */
  blockId?: string | number;

  /**
   * 描述
   */
  description?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

export interface LocationQuery extends PageQuery {
  /**
   * 位置名称
   */
  name?: string;

  /**
   * 位置编码
   */
  code?: string;

  /**
   * 位置类型ID
   */
  locationTypeId?: string | number;

  /**
   * 区块ID
   */
  blockId?: string | number;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

