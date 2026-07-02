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
   * 英文名称
   */
  englishName?: string;

  /**
   * 品牌编码
   */
  code: string;

  /**
   * 品牌缩略图（Base64 Data URL）
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
   * 是否启用
   */
  enabled: boolean;

  /**
   * 排序
   */
  sort?: number;

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
   * 英文名称
   */
  englishName?: string;

  /**
   * 品牌编码
   */
  code?: string;

  /**
   * 品牌缩略图（Base64 Data URL）
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
   * 品牌编码或名称（模糊搜索）
   */
  keyword?: string;

  /**
   * 是否启用
   */
  enabled?: boolean;
}
