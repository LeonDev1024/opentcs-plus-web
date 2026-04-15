import type { RouteRecordRaw } from 'vue-router';
import { getNormalPath } from '@/utils/ruoyi';

function joinSeg(base: string, seg: string): string {
  if (!seg || seg === '') return base || '/';
  if (seg.startsWith('/')) return getNormalPath(seg);
  if (!base || base === '/') return getNormalPath('/' + seg);
  return getNormalPath(base + '/' + seg);
}

/** 侧边栏树中第一个可点击菜单对应的全路径（深度优先） */
export function pickFirstSidebarPath(routes: RouteRecordRaw[], basePath = ''): string | null {
  for (const node of routes) {
    if (node.hidden) continue;
    const seg = (node.path as string) || '';
    const here = joinSeg(basePath, seg);

    if (node.children?.length) {
      const sub = pickFirstSidebarPath(node.children, here);
      if (sub) return sub;
    }

    if (node.meta?.title) {
      return here;
    }
  }
  return null;
}
