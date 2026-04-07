export interface BrandVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 品牌名称
   */
  name: string;

  /**
   * 品牌缩写代码
   */
  code: string;

  /**
   * Logo URL
   */
  logo?: string;

  /**
   * 官网地址
   */
  website?: string;

  /**
   * 品牌描述
   */
  description?: string;

  /**
   * 联系方式
   */
  contact?: string;

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 排序
   */
  sort: number;

  /**
   * 创建时间
   */
  createTime?: string;

  /**
   * 更新时间
   */
  updateTime?: string;
}

export interface BrandForm {
  /**
   * id
   */
  id?: string | number;

  /**
   * 品牌名称
   */
  name?: string;

  /**
   * 品牌缩写代码
   */
  code?: string;

  /**
   * Logo URL
   */
  logo?: string;

  /**
   * 官网地址
   */
  website?: string;

  /**
   * 品牌描述
   */
  description?: string;

  /**
   * 联系方式
   */
  contact?: string;

  /**
   * 是否启用
   */
  enabled?: boolean;

  /**
   * 排序
   */
  sort?: number;
}

export interface BrandQuery extends PageQuery {
  /**
   * 品牌名称
   */
  name?: string;

  /**
   * 品牌Code
   */
  code?: string;

  /**
   * 是否启用
   */
  enabled?: boolean;
}
