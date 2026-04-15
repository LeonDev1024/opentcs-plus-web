/** 顶部一级导航（与 AGV 调度领域划分对齐：首页 / 部署管理 / 运维管理 / 运营分析 / 系统管理） */
export type TopNavCategoryId = 'home' | 'deploy' | 'ops' | 'analytics' | 'system';

export type TopNavCategoryDef = {
  id: TopNavCategoryId;
  title: string;
  icon: string;
  /** 当前路由归属该分类的路径前缀（按顺序匹配） */
  pathPrefixes: string[];
};

export const TOP_NAV_CATEGORIES: TopNavCategoryDef[] = [
  { id: 'home',      title: '首页',   icon: 'dashboard', pathPrefixes: ['/dashboard'] },
  { id: 'deploy',    title: '部署管理', icon: 'build',     pathPrefixes: ['/deploy', '/map-editor'] },
  { id: 'ops',       title: '运维管理', icon: 'guide',     pathPrefixes: ['/ops', '/live'] },
  { id: 'analytics', title: '运营分析', icon: 'chart',     pathPrefixes: ['/analytics'] },
  { id: 'system',    title: '系统管理', icon: 'system',    pathPrefixes: ['/system'] }
];

export function resolveNavCategory(path: string): TopNavCategoryId {
  const p = path || '/';

  if (p === '/' || p.startsWith('/dashboard')) return 'home';
  if (p.startsWith('/user/profile'))        return 'system';

  for (const cat of TOP_NAV_CATEGORIES) {
    if (cat.id === 'home') continue;
    if (cat.pathPrefixes.some((prefix) => p.startsWith(prefix))) {
      return cat.id;
    }
  }

  return 'system';
}
