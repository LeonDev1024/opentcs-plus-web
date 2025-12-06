export interface ModelVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 车辆类型名称
   */
  name: string;

  /**
   * 车辆类型编码
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

export interface ModelForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 车辆类型名称
   */
  name?: string;

  /**
   * 车辆类型编码
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

export interface ModelQuery extends PageQuery {
  /**
   * 车辆类型名称
   */
  name?: string;

  /**
   * 车辆类型编码
   */
  code?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

// 兼容旧命名
export type VehicleTypeVO = ModelVO;
export type VehicleTypeForm = ModelForm;
export type VehicleTypeQuery = ModelQuery;

