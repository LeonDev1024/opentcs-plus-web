const icons: string[] = [];
// 加载 assets/icons/svg 目录下的图标
const svgModules = import.meta.glob('./../../assets/icons/svg/*.svg');
for (const path in svgModules) {
  const p = path.split('assets/icons/svg/')[1].split('.svg')[0];
  icons.push(p);
}
// 加载 assets/location 目录下的图标（工作站位置图标）
// 注意：这些图标在数据库中存储时使用原始名称（如 "bettery"），
// SvgIcon 组件会自动添加 "location-" 前缀来匹配 symbolId
const locationModules = import.meta.glob('./../../assets/location/*.svg');
for (const path in locationModules) {
  const p = path.split('assets/location/')[1].split('.svg')[0];
  // 直接使用原始名称，不添加前缀，这样数据库中存储的就是简单名称
  icons.push(p);
}
export default icons;
