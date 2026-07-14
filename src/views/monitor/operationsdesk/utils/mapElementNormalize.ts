/**
 * 监控页地图元素归一化工具
 *
 * 与 src/views/deploy/factory/map/index.vue 中的归一化逻辑同源。
 * 目的：把后端原始的 points / paths / locations 转换成 MapRenderer 可直接消费的形态。
 *
 * 一个原始点位可能用 x / xposition / xPosition / position.x / pose.x / coordinate.x ……
 * 任意一种字段表达坐标；不归一化就会全部按 (0,0) 渲染，地图整张图只剩坐标轴。
 */

// ============================================================================
// 基础解析工具
// ============================================================================

export function toFiniteNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const normalized = String(raw).trim().replace(',', '.');
  if (normalized.length === 0) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function pickCoordinate(target: any, axis: 'x' | 'y'): number | undefined {
  const upper = axis.toUpperCase();
  const candidates = [
    target?.[axis],
    target?.[`${axis}Position`],
    target?.[`${axis}position`],
    target?.[`${upper}Position`],
    target?.[`${upper}position`],
    target?.[`position${upper}`],
    target?.position?.[axis],
    target?.pose?.[axis],
    target?.coordinate?.[axis],
    target?.coords?.[axis]
  ];
  for (const c of candidates) {
    const n = toFiniteNumber(c);
    if (n !== undefined) return n;
  }
  return undefined;
}

export function parsePropertiesPayload(raw: any): Record<string, any> {
  if (!raw) return {};
  const normalizeNameValueArray = (arr: any[]): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const key = item.name ?? item.key;
      if (!key) continue;
      out[String(key)] = item.value;
    }
    return out;
  };
  if (typeof raw === 'object') {
    if (Array.isArray(raw)) return normalizeNameValueArray(raw);
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      if (Array.isArray(parsed)) return normalizeNameValueArray(parsed);
      return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

export function parseLayoutJson(value: unknown): Record<string, any> {
  if (value == null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

// ============================================================================
// 响应外层解包 + 数组挑选
// ============================================================================

/**
 * 兼容 R<MapEditorBO> 与扁平 MapEditorBO 两种响应形态。
 */
export function unwrapAjaxMapPayload(raw: unknown): Record<string, any> {
  const r = raw as Record<string, any>;
  if (!r || typeof r !== 'object') return {};
  const inner = r.data as Record<string, any> | undefined;
  if (
    inner != null &&
    typeof inner === 'object' &&
    !Array.isArray(inner) &&
    (inner.mapId !== undefined ||
      inner.mapInfo?.mapId !== undefined ||
      inner.name !== undefined ||
      Array.isArray(inner.points) ||
      (inner.elements &&
        typeof inner.elements === 'object' &&
        !Array.isArray(inner.elements)) ||
      inner.mapInfo !== undefined)
  ) {
    return inner;
  }
  return r;
}

export function pickElementsArray<T>(
  a: T[] | undefined | null,
  b: T[] | undefined | null
): T[] {
  // 优先取「非空」数组，避免空 [] 短路掉真实的 elements
  if (Array.isArray(a) && a.length > 0) return a;
  if (Array.isArray(b) && b.length > 0) return b;
  if (Array.isArray(a)) return a;
  if (Array.isArray(b)) return b;
  return [];
}

// ============================================================================
// 元素归一化
// ============================================================================

export function normalizePoints(points: any[]): any[] {
  return (points || []).map((p, index) => {
    const propsPayload = parsePropertiesPayload(p?.properties);
    const pointFromProps = propsPayload?.point ?? {};
    const parsedEditorProps = propsPayload?.editorProps ?? {};
    const parsedLayout = parseLayoutJson(p?.layout);
    const parsedLayoutEditorProps =
      parsedLayout?.editorProps && typeof parsedLayout.editorProps === 'object'
        ? parsedLayout.editorProps
        : {};
    const x =
      pickCoordinate(p, 'x') ??
      pickCoordinate(parsedLayout, 'x') ??
      pickCoordinate(pointFromProps, 'x') ??
      0;
    const y =
      pickCoordinate(p, 'y') ??
      pickCoordinate(parsedLayout, 'y') ??
      pickCoordinate(pointFromProps, 'y') ??
      0;
    const radiusResolved =
      toFiniteNumber(parsedEditorProps?.radius) ??
      toFiniteNumber(parsedLayoutEditorProps?.radius) ??
      toFiniteNumber(p?.editorProps?.radius) ??
      toFiniteNumber(p?.radius) ??
      20;
    const stableId =
      p?.id != null && String(p.id) !== ''
        ? String(p.id)
        : p?.pointId != null && String(p.pointId) !== ''
        ? `pid-${String(p.pointId)}`
        : `p-${index}`;
    return {
      ...pointFromProps,
      ...p,
      id: stableId,
      pointId: p.pointId ?? p.id,
      x,
      y,
      editorProps: {
        color:
          parsedEditorProps?.color ??
          parsedLayoutEditorProps?.color ??
          p?.editorProps?.color,
        radius: radiusResolved,
        strokeColor:
          parsedEditorProps?.strokeColor ??
          parsedLayoutEditorProps?.strokeColor ??
          p?.editorProps?.strokeColor,
        textColor:
          parsedEditorProps?.textColor ??
          parsedLayoutEditorProps?.textColor ??
          p?.editorProps?.textColor,
        label:
          parsedEditorProps?.label ??
          parsedLayoutEditorProps?.label ??
          p?.editorProps?.label ??
          p?.label,
        labelVisible:
          parsedEditorProps?.labelVisible ??
          parsedLayoutEditorProps?.labelVisible ??
          p?.editorProps?.labelVisible ??
          p?.labelVisible ??
          true,
        labelOffset: {
          x:
            toFiniteNumber(parsedEditorProps?.labelOffset?.x) ??
            toFiniteNumber(parsedLayoutEditorProps?.labelOffset?.x) ??
            toFiniteNumber(p?.editorProps?.labelOffset?.x) ??
            -30,
          y:
            toFiniteNumber(parsedEditorProps?.labelOffset?.y) ??
            toFiniteNumber(parsedLayoutEditorProps?.labelOffset?.y) ??
            toFiniteNumber(p?.editorProps?.labelOffset?.y) ??
            -30
        }
      }
    };
  });
}

export function normalizePaths(paths: any[]): any[] {
  return (paths || []).map((p) => {
    const propsPayload = parsePropertiesPayload(p?.properties);
    const geometryFromProps = propsPayload?.geometry;
    const editorPropsFromProps = propsPayload?.editorProps;

    let layoutObj: any = null;
    let layoutCpFromJson: any[] = [];
    try {
      layoutObj =
        typeof p.layout === 'string' ? JSON.parse(p.layout) : p.layout;
      if (
        layoutObj?.controlPoints &&
        Array.isArray(layoutObj.controlPoints)
      ) {
        layoutCpFromJson = layoutObj.controlPoints.map(
          (cp: any, index: number) => ({
            id: `cp_${p.id}_${index}`,
            x: pickCoordinate(cp, 'x') ?? 0,
            y: pickCoordinate(cp, 'y') ?? 0
          })
        );
      }
    } catch {
      // ignore
    }

    const baseGeometry =
      p.geometry && typeof p.geometry === 'object' ? { ...p.geometry } : {};
    if (geometryFromProps && typeof geometryFromProps === 'object') {
      Object.assign(baseGeometry, geometryFromProps);
    }

    let controlPoints = Array.isArray(baseGeometry.controlPoints)
      ? [...baseGeometry.controlPoints]
      : [];
    const layoutCpTop = p.layoutControlPoints;
    const mergedLayout =
      Array.isArray(layoutCpTop) && layoutCpTop.length > 0
        ? layoutCpTop
        : layoutCpFromJson;

    if (
      controlPoints.length === 0 &&
      Array.isArray(mergedLayout) &&
      mergedLayout.length >= 2
    ) {
      controlPoints = mergedLayout.map((cp: any, index: number) => ({
        id: `cp_${p.id}_lp_${index}`,
        x: pickCoordinate(cp, 'x') ?? 0,
        y: pickCoordinate(cp, 'y') ?? 0
      }));
    }

    const pathType =
      baseGeometry.pathType ||
      layoutObj?.connectionType?.toLowerCase() ||
      'direct';

    return {
      ...(propsPayload?.path ?? {}),
      ...p,
      startPointId:
        p.startPointId ??
        p.sourcePointId ??
        p.sourcePoint?.id ??
        p.startPoint?.id,
      endPointId:
        p.endPointId ?? p.destPointId ?? p.destPoint?.id ?? p.endPoint?.id,
      geometry: {
        ...baseGeometry,
        controlPoints,
        pathType
      },
      editorProps: {
        ...(editorPropsFromProps && typeof editorPropsFromProps === 'object'
          ? editorPropsFromProps
          : {}),
        ...(p.editorProps ?? {})
      }
    };
  });
}

export function normalizeLocations(locations: any[]): any[] {
  return (locations || []).map((l, index) => {
    const propsPayload = parsePropertiesPayload(l?.properties);
    const geometryFromProps = propsPayload?.geometry;
    const editorPropsFromProps = propsPayload?.editorProps ?? {};
    const locationFromProps = propsPayload?.location ?? {};
    const parsedLayout = parseLayoutJson(l?.layout);
    const parsedLayoutEditorProps =
      parsedLayout?.editorProps && typeof parsedLayout.editorProps === 'object'
        ? parsedLayout.editorProps
        : {};
    const parsedLayoutGeometry =
      parsedLayout?.geometry && typeof parsedLayout.geometry === 'object'
        ? parsedLayout.geometry
        : undefined;

    const mergedGeometry: Record<string, any> = {
      ...(parsedLayoutGeometry ?? {}),
      ...(l.geometry && typeof l.geometry === 'object' ? l.geometry : {}),
      ...(geometryFromProps && typeof geometryFromProps === 'object'
        ? geometryFromProps
        : {})
    };

    const x =
      pickCoordinate(l, 'x') ??
      pickCoordinate(parsedLayout, 'x') ??
      pickCoordinate(locationFromProps, 'x') ??
      0;
    const y =
      pickCoordinate(l, 'y') ??
      pickCoordinate(parsedLayout, 'y') ??
      pickCoordinate(locationFromProps, 'y') ??
      0;

    const locStableId =
      l?.id != null && String(l.id) !== ''
        ? String(l.id)
        : l?.locationId != null && String(l.locationId) !== ''
        ? `lid-${String(l.locationId)}`
        : `loc-${index}`;

    if (
      !mergedGeometry.vertices ||
      !Array.isArray(mergedGeometry.vertices) ||
      mergedGeometry.vertices.length === 0
    ) {
      mergedGeometry.vertices = [
        { id: `v_${locStableId}_0`, x, y },
        { id: `v_${locStableId}_1`, x: x + 100, y },
        { id: `v_${locStableId}_2`, x: x + 100, y: y + 100 },
        { id: `v_${locStableId}_3`, x, y: y + 100 }
      ];
    }

    return {
      ...locationFromProps,
      ...l,
      id: locStableId,
      locationId: l.locationId ?? l.id,
      x,
      y,
      geometry: mergedGeometry,
      editorProps: {
        ...parsedLayoutEditorProps,
        ...editorPropsFromProps,
        ...(l.editorProps ?? {})
      }
    };
  });
}

// ============================================================================
// 路径控制点提取 + 负坐标裁切补偿 + Konva 画布尺寸
// （与 deploy/factory/map 同源，让监控页能正确处理跨地图叠加渲染）
// ============================================================================

export function extractPathControlPoints(path: any): any[] {
  if (!path) return [];
  const cps = path?.geometry?.controlPoints;
  if (Array.isArray(cps)) return cps;
  if (Array.isArray(path?.layoutControlPoints)) return path.layoutControlPoints;
  return [];
}

/** 计算一组元素的负坐标裁切补偿 */
export function computeClipForElements(
  points: any[],
  locations: any[],
  paths: any[]
): { x: number; y: number } {
  let minX = 0;
  let minY = 0;
  const push = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  };
  for (const p of points) {
    push(Number(p.x ?? p.xPosition ?? 0), Number(p.y ?? p.yPosition ?? 0));
  }
  for (const l of locations) {
    push(Number(l.x ?? l.xPosition ?? 0), Number(l.y ?? l.yPosition ?? 0));
    if (Array.isArray(l.geometry?.vertices)) {
      for (const v of l.geometry.vertices) {
        push(Number(v.x ?? v.xPosition ?? 0), Number(v.y ?? v.yPosition ?? 0));
      }
    }
  }
  for (const path of paths) {
    for (const cp of extractPathControlPoints(path)) {
      push(Number(cp.x ?? cp.xPosition ?? 0), Number(cp.y ?? cp.yPosition ?? 0));
    }
    if (path.startPoint) {
      push(
        Number(path.startPoint.x ?? path.startPoint.xPosition ?? 0),
        Number(path.startPoint.y ?? path.startPoint.yPosition ?? 0)
      );
    }
    if (path.endPoint) {
      push(
        Number(path.endPoint.x ?? path.endPoint.xPosition ?? 0),
        Number(path.endPoint.y ?? path.endPoint.yPosition ?? 0)
      );
    }
  }
  return {
    x: minX < 0 ? Math.ceil(-minX) + 8 : 0,
    y: minY < 0 ? Math.ceil(-minY) + 8 : 0
  };
}

/** Konva 画布尺寸（用于 MapRenderer width/height） */
export function computeMaxExtentForElements(
  points: any[],
  locations: any[],
  paths: any[],
  clip: { x: number; y: number }
): { maxX: number; maxY: number } {
  let maxX = 0;
  let maxY = 0;
  const push = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    maxX = Math.max(maxX, x + clip.x);
    maxY = Math.max(maxY, y + clip.y);
  };
  for (const p of points) {
    push(Number(p.x ?? p.xPosition ?? 0), Number(p.y ?? p.yPosition ?? 0));
  }
  for (const l of locations) {
    push(Number(l.x ?? l.xPosition ?? 0), Number(l.y ?? l.yPosition ?? 0));
    if (Array.isArray(l.geometry?.vertices)) {
      for (const v of l.geometry.vertices) {
        push(Number(v.x ?? v.xPosition ?? 0), Number(v.y ?? v.yPosition ?? 0));
      }
    }
  }
  for (const path of paths) {
    for (const cp of extractPathControlPoints(path)) {
      push(Number(cp.x ?? cp.xPosition ?? 0), Number(cp.y ?? cp.yPosition ?? 0));
    }
  }
  return { maxX, maxY };
}

// ============================================================================
// 一站式：从原始响应取出归一化后的 points/paths/locations
// ============================================================================

export interface NormalizedMapPayload {
  points: any[];
  paths: any[];
  locations: any[];
}

export function normalizeMapEditorPayload(
  raw: unknown
): NormalizedMapPayload {
  const payload = unwrapAjaxMapPayload(raw);
  const nested =
    payload.elements &&
    typeof payload.elements === 'object' &&
    !Array.isArray(payload.elements)
      ? (payload.elements as Record<string, any>)
      : null;
  const pointsRaw = pickElementsArray(payload.points, nested?.points);
  const pathsRaw = pickElementsArray(payload.paths, nested?.paths);
  const locationsRaw = pickElementsArray(
    payload.locations,
    nested?.locations
  );
  return {
    points: normalizePoints(pointsRaw),
    paths: normalizePaths(pathsRaw),
    locations: normalizeLocations(locationsRaw)
  };
}
