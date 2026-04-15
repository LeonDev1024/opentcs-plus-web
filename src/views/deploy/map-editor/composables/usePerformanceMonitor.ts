/**
 * 性能监控 composable
 */
export function usePerformanceMonitor() {
  // 性能指标
  const metrics = reactive({
    frameRate: 0,
    renderTime: 0,
    pointCount: 0,
    pathCount: 0,
    locationCount: 0,
    selectedCount: 0,
    lastUpdate: 0
  });

  // FPS 计算
  let frameCount = 0;
  let lastFpsUpdate = 0;
  let animationFrameId: number | null = null;

  // 开始帧率监控
  const startFpsMonitor = () => {
    const measureFps = () => {
      frameCount++;
      const now = performance.now();

      if (now - lastFpsUpdate >= 1000) {
        metrics.frameRate = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      animationFrameId = requestAnimationFrame(measureFps);
    };

    lastFpsUpdate = performance.now();
    animationFrameId = requestAnimationFrame(measureFps);
  };

  // 停止帧率监控
  const stopFpsMonitor = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  // 记录渲染时间
  const measureRenderTime = (startTime: number) => {
    metrics.renderTime = Math.round(performance.now() - startTime);
    metrics.lastUpdate = Date.now();
  };

  // 更新元素计数
  const updateElementCounts = (
    points: any[],
    paths: any[],
    locations: any[],
    selectedCount: number
  ) => {
    metrics.pointCount = points.length;
    metrics.pathCount = paths.length;
    metrics.locationCount = locations.length;
    metrics.selectedCount = selectedCount;
  };

  // 获取性能报告
  const getPerformanceReport = () => {
    const memory = (performance as any).memory;
    return {
      fps: metrics.frameRate,
      renderTime: metrics.renderTime,
      elementCounts: {
        points: metrics.pointCount,
        paths: metrics.pathCount,
        locations: metrics.locationCount
      },
      selectedCount: metrics.selectedCount,
      memory: memory ? {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576) + ' MB'
      } : null,
      lastUpdate: new Date(metrics.lastUpdate).toLocaleTimeString()
    };
  };

  // 性能评估
  const evaluatePerformance = () => {
    const issues: string[] = [];

    if (metrics.frameRate < 30) {
      issues.push('帧率过低 (< 30 FPS)');
    }

    if (metrics.renderTime > 100) {
      issues.push('渲染时间过长 (> 100ms)');
    }

    if (metrics.pointCount > 1000) {
      issues.push('点位数量过多 (> 1000)');
    }

    if (metrics.pathCount > 2000) {
      issues.push('路径数量过多 (> 2000)');
    }

    return {
      status: issues.length === 0 ? 'good' : issues.length === 1 ? 'warning' : 'poor',
      issues
    };
  };

  return {
    metrics,
    startFpsMonitor,
    stopFpsMonitor,
    measureRenderTime,
    updateElementCounts,
    getPerformanceReport,
    evaluatePerformance
  };
}
