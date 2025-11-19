/**
 * 数据转换工具 - 编辑器数据与后端实体数据相互转换
 */
import type { MapPoint, MapPath, MapLocation } from '@/types/mapEditor';
import type { PointForm, PointVO } from '@/api/opentcs/point/types';
import type { PathForm, PathVO } from '@/api/opentcs/path/types';
import type { LocationForm, LocationVO } from '@/api/opentcs/location/types';

/**
 * 点数据转换器
 */
export class PointConverter {
  /**
   * 编辑器点数据 -> 后端表单数据
   */
  static toForm(point: MapPoint): PointForm {
    return {
      id: point.id,
      name: point.name,
      code: point.code,
      x: point.x,
      y: point.y,
      z: point.z,
      type: point.type,
      description: point.description,
      status: point.status
    };
  }

  /**
   * 后端VO数据 -> 编辑器点数据
   */
  static fromVO(vo: PointVO, layerId: string): MapPoint {
    return {
      id: String(vo.id),
      layerId,
      name: vo.name,
      code: vo.code,
      x: vo.x || 0,
      y: vo.y || 0,
      z: vo.z,
      type: vo.type,
      description: vo.description,
      status: vo.status,
      editorProps: {
        radius: 5,
        color: '#1890ff',
        labelVisible: true
      },
      createdAt: vo.createTime,
      updatedAt: vo.createTime
    };
  }
}

/**
 * 路径数据转换器
 */
export class PathConverter {
  /**
   * 计算路径长度
   */
  private static calculatePathLength(controlPoints: Array<{ x: number; y: number; z?: number }>): number {
    if (controlPoints.length < 2) {
      return 0;
    }

    let length = 0;
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const p1 = controlPoints[i];
      const p2 = controlPoints[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = (p2.z || 0) - (p1.z || 0);
      length += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return length;
  }

  /**
   * 编辑器路径数据 -> 后端表单数据
   */
  static toForm(path: MapPath): PathForm {
    const controlPoints = path.geometry.controlPoints;
    const startPoint = controlPoints[0];
    const endPoint = controlPoints[controlPoints.length - 1];

    return {
      id: path.id,
      name: path.name,
      code: path.code,
      startPointId: startPoint?.id,
      endPointId: endPoint?.id,
      length: this.calculatePathLength(controlPoints),
      type: path.type,
      description: path.description,
      status: path.status
    };
  }

  /**
   * 后端VO数据 -> 编辑器路径数据
   * 注意：后端可能只存储起点和终点，需要根据实际情况补充控制点
   */
  static fromVO(vo: PathVO, layerId: string, controlPoints?: Array<{ id: string; x: number; y: number; z?: number }>): MapPath {
    // 如果没有提供控制点，则根据起点和终点创建简单的两点路径
    const points = controlPoints || [
      { id: String(vo.startPointId || ''), x: 0, y: 0 },
      { id: String(vo.endPointId || ''), x: 100, y: 100 }
    ];

    return {
      id: String(vo.id),
      layerId,
      name: vo.name,
      code: vo.code,
      startPointId: vo.startPointId,
      endPointId: vo.endPointId,
      length: vo.length,
      type: vo.type,
      description: vo.description,
      status: vo.status,
      geometry: {
        controlPoints: points,
        pathType: 'line'
      },
      editorProps: {
        strokeColor: '#52c41a',
        strokeWidth: 2,
        lineStyle: 'solid',
        arrowVisible: false,
        labelVisible: true
      },
      createdAt: vo.createTime,
      updatedAt: vo.createTime
    };
  }
}

/**
 * 位置数据转换器
 */
export class LocationConverter {
  /**
   * 计算多边形中心点
   */
  private static calculatePolygonCenter(vertices: Array<{ x: number; y: number; z?: number }>): { x: number; y: number; z?: number } {
    if (vertices.length === 0) {
      return { x: 0, y: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let zCount = 0;

    for (const vertex of vertices) {
      sumX += vertex.x;
      sumY += vertex.y;
      if (vertex.z !== undefined) {
        sumZ += vertex.z;
        zCount++;
      }
    }

    const center = {
      x: sumX / vertices.length,
      y: sumY / vertices.length,
      z: zCount > 0 ? sumZ / zCount : undefined
    };

    return center;
  }

  /**
   * 编辑器位置数据 -> 后端表单数据
   */
  static toForm(location: MapLocation): LocationForm {
    const vertices = location.geometry.vertices;
    const center = this.calculatePolygonCenter(vertices);

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      locationTypeId: location.locationTypeId,
      x: center.x,
      y: center.y,
      z: center.z,
      blockId: location.blockId,
      description: location.description,
      status: location.status
    };
  }

  /**
   * 后端VO数据 -> 编辑器位置数据
   * 注意：后端可能只存储中心点，需要根据实际情况补充顶点数据
   */
  static fromVO(
    vo: LocationVO,
    layerId: string,
    vertices?: Array<{ id: string; x: number; y: number; z?: number }>
  ): MapLocation {
    // 如果没有提供顶点，则根据中心点创建一个默认的正方形
    const defaultVertices = vertices || (() => {
      const x = vo.x || 0;
      const y = vo.y || 0;
      const size = 50; // 默认大小
      return [
        { id: `${vo.id}_v1`, x: x - size, y: y - size, z: vo.z },
        { id: `${vo.id}_v2`, x: x + size, y: y - size, z: vo.z },
        { id: `${vo.id}_v3`, x: x + size, y: y + size, z: vo.z },
        { id: `${vo.id}_v4`, x: x - size, y: y + size, z: vo.z }
      ];
    })();

    return {
      id: String(vo.id),
      layerId,
      name: vo.name,
      code: vo.code,
      locationTypeId: vo.locationTypeId,
      x: vo.x,
      y: vo.y,
      z: vo.z,
      blockId: vo.blockId,
      description: vo.description,
      status: vo.status,
      geometry: {
        vertices: defaultVertices,
        closed: true
      },
      editorProps: {
        fillColor: '#1890ff',
        fillOpacity: 0.3,
        strokeColor: '#1890ff',
        strokeWidth: 2,
        labelVisible: true
      },
      createdAt: vo.createTime,
      updatedAt: vo.createTime
    };
  }
}

/**
 * 批量转换工具
 */
export class BatchConverter {
  /**
   * 批量转换点数据
   */
  static pointsToForm(points: MapPoint[]): PointForm[] {
    return points.map(point => PointConverter.toForm(point));
  }

  /**
   * 批量转换路径数据
   */
  static pathsToForm(paths: MapPath[]): PathForm[] {
    return paths.map(path => PathConverter.toForm(path));
  }

  /**
   * 批量转换位置数据
   */
  static locationsToForm(locations: MapLocation[]): LocationForm[] {
    return locations.map(location => LocationConverter.toForm(location));
  }
}

