import { ref, computed } from 'vue';

/**
 * 地图验证 composable
 */
export function useMapValidation() {
  // 验证结果
  const validationIssues = ref<{
    type: 'error' | 'warning';
    category: string;
    message: string;
    elementId?: string;
    elementType?: 'point' | 'path';
    position?: { x: number; y: number };
  }[]>([]);

  // 验证地图
  const validateMap = (
    points: any[],
    paths: any[]
  ) => {
    const issues: typeof validationIssues.value = [];

    // 1. 检测孤立点（未连接到任何路径）
    const connectedPointIds = new Set<string>();
    paths.forEach(path => {
      if (path.startPointId) connectedPointIds.add(String(path.startPointId));
      if (path.endPointId) connectedPointIds.add(String(path.endPointId));
    });

    points.forEach(point => {
      if (!connectedPointIds.has(String(point.id))) {
        issues.push({
          type: 'warning',
          category: '断连检测',
          message: `点位 "${point.name || point.id}" 未连接到任何路径`,
          elementId: point.id,
          elementType: 'point',
          position: { x: point.x, y: point.y }
        });
      }
    });

    // 2. 检测路径交叉（简单检测）
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const pathA = paths[i];
        const pathB = paths[j];

        // 跳过共享端点的路径
        if (
          pathA.startPointId === pathB.startPointId ||
          pathA.startPointId === pathB.endPointId ||
          pathA.endPointId === pathB.startPointId ||
          pathA.endPointId === pathB.endPointId
        ) {
          continue;
        }

        // 获取路径端点
        const pathAPoints = getPathPoints(pathA, points);
        const pathBPoints = getPathPoints(pathB, points);

        // 检测线段相交
        if (doLinesIntersect(pathAPoints.start, pathAPoints.end, pathBPoints.start, pathBPoints.end)) {
          const intersectX = (pathAPoints.end.x + pathBPoints.end.x) / 2;
          const intersectY = (pathAPoints.end.y + pathBPoints.end.y) / 2;

          issues.push({
            type: 'error',
            category: '路径交叉',
            message: `路径 "${pathA.name || pathA.id}" 与 "${pathB.name || pathB.id}" 存在交叉`,
            elementId: pathA.id,
            elementType: 'path',
            position: { x: intersectX, y: intersectY }
          });
        }
      }
    }

    // 3. 检测转弯角度过大的路径
    paths.forEach(path => {
      const controlPoints = path.geometry?.controlPoints || [];
      if (controlPoints.length < 3) return;

      for (let i = 1; i < controlPoints.length - 1; i++) {
        const prev = controlPoints[i - 1];
        const curr = controlPoints[i];
        const next = controlPoints[i + 1];

        // 计算转向角
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);

        // 规范化到 0-180
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        if (angleDiff > 90) {
          issues.push({
            type: 'warning',
            category: '转弯半径',
            message: `路径 "${path.name || path.id}" 转弯角度过大 (${angleDiff.toFixed(1)}°)`,
            elementId: path.id,
            elementType: 'path',
            position: { x: curr.x, y: curr.y }
          });
        }
      }
    });

    validationIssues.value = issues;
    return issues;
  };

  // 辅助函数：获取路径端点
  const getPathPoints = (path: any, points: any[]) => {
    const startPointId = String(path.startPointId);
    const endPointId = String(path.endPointId);

    const startPoint = points.find(p => String(p.id) === startPointId);
    const endPoint = points.find(p => String(p.id) === endPointId);

    // 如果找不到绑定点，使用控制点
    const controlPoints = path.geometry?.controlPoints || [];
    return {
      start: startPoint ? { x: startPoint.x, y: startPoint.y } : controlPoints[0] || { x: 0, y: 0 },
      end: endPoint ? { x: endPoint.x, y: endPoint.y } : controlPoints[controlPoints.length - 1] || { x: 0, y: 0 }
    };
  };

  // 辅助函数：检测两条线段是否相交
  const doLinesIntersect = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ) => {
    const CCW = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };

    return (
      CCW(p1, p3, p4) !== CCW(p2, p3, p4) &&
      CCW(p1, p2, p3) !== CCW(p1, p2, p4)
    );
  };

  // 获取问题图标配置
  const getIssueMarkerConfig = (issue: typeof validationIssues.value[0]) => {
    if (!issue.position) return null;

    const isError = issue.type === 'error';

    return {
      x: issue.position.x,
      y: issue.position.y,
      text: isError ? '❌' : '⚠️',
      fontSize: 16,
      listening: false,
      offsetX: 8,
      offsetY: -8
    };
  };

  return {
    validationIssues,
    validateMap,
    getIssueMarkerConfig
  };
}
