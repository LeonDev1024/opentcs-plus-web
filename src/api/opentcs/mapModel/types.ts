export interface MapModelVO {
  /**
   * id
   */
  id: string | number;

  /**
   * 地图模型名称
   */
  name: string;

  /**
   * 地图模型描述
   */
  description?: string;


  /**
   * 地图模型版本
   */
  modelVersion?: string;

  /**
   * 地图id
   */
  mapId?: string | number;


  /**
   * 状态（0正常 1停用）
   */
  status: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

export interface MapModelForm extends BaseEntity {
  /**
   * id
   */
  id?: string | number;

  /**
   * 地图模型名称
   */
  name?: string;

  /**
   * 地图模型描述
   */
  description?: string;

  /**
   * 地图模型文件路径
   */
  filePath?: string;

  /**
   * 地图模型版本
   */
  version?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

export interface MapModelQuery extends PageQuery {
  /**
   * 地图模型名称
   */
  name?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

