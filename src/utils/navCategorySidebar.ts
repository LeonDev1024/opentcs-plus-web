import type { RouteRecordRaw } from 'vue-router';
import type { TopNavCategoryId } from '@/settings/navCategories';
import { getNormalPath } from '@/utils/ruoyi';

/** 从后端路由根节点中找到路径匹配的顶级路由（跳过 hidden 的常量路由） */
function findTopRoute(routes: RouteRecordRaw[], rootPath: string): RouteRecordRaw | undefined {
  const want = getNormalPath(rootPath.startsWith('/') ? rootPath : `/${rootPath}`);
  return routes.find((r) => {
    if (r.hidden) return false;
    const rp = getNormalPath(r.path.startsWith('/') ? r.path : `/${r.path}`);
    return rp === want;
  });
}

/**
 * 仅将【直接子节点】的路径绝对化，子孙节点保持相对路径不动。
 *
 * 若依 SidebarItem.resolvePath 是字符串拼接：
 *   getNormalPath(basePath + '/' + routePath)
 * 顶层 Sidebar 用 route.path 作为 basePath 传入 SidebarItem。
 *
 * 因此：
 *  - 直接子节点需要绝对路径，这样它自己成为后代的 basePath 时是正确的前缀
 *  - 子孙节点保持相对路径，由 SidebarItem 逐层拼接即可
 *  - 若递归绝对化所有层级，子孙路径会被二次拼接，出现 /a/b/a/b/c 的双倍路径
 */
function absolutifyFirstLevel(routes: RouteRecordRaw[], parentPath: string): RouteRecordRaw[] {
  return routes.map((r) => {
    const seg = (r.path as string) || '';
    const fullPath = seg.startsWith('/') ? seg : getNormalPath(`${parentPath}/${seg}`);
    return { ...r, path: fullPath } as RouteRecordRaw;
  });
}

/**
 * 根据顶部导航分类，从数据库动态路由中筛选出对应的侧边栏路由。
 *
 * 返回的是目标分类的直接子菜单（不含顶级节点自身），
 * 路径已全部转为绝对路径，可直接交给 sidebar 渲染。
 */
export function buildSidebarRoutesForCategory(
  category: TopNavCategoryId,
  backendRoots: RouteRecordRaw[]
): RouteRecordRaw[] {
  switch (category) {
    case 'home':
      return [];

    case 'deploy': {
      const deploy = findTopRoute(backendRoots, '/deploy');
      if (!deploy?.children) return [];
      return absolutifyFirstLevel(deploy.children, deploy.path as string);
    }

    case 'ops': {
      const ops = findTopRoute(backendRoots, '/ops');
      if (!ops?.children) return [];
      return absolutifyFirstLevel(ops.children, ops.path as string);
    }

    case 'analytics': {
      const analytics = findTopRoute(backendRoots, '/analytics');
      if (!analytics?.children) return [];
      return absolutifyFirstLevel(analytics.children, analytics.path as string);
    }

    case 'system': {
      const system = findTopRoute(backendRoots, '/system');
      if (!system?.children) return [];
      return absolutifyFirstLevel(system.children, system.path as string);
    }

    default:
      return [];
  }
}
