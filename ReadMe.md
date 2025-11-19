## 平台简介
现代化的 OpenTCS 前端界面，基于 Vue 3、TypeScript 和 Element Plus 构建，集成了强大的地图编辑器和实时监控功能。

**特性**
- 🚀 现代化技术栈: 使用 Vue 3、TypeScript 和 Element Plus，提供优秀的开发体验和性能。

- 🗺️ 强大的地图编辑器: 基于 Konva.js 构建，支持点位、路径、区域的可视化编辑，图层管理，以及跨楼层连接。

- 📱 响应式设计: 适配桌面和移动端，提供一致的用户体验。

- 🎨 美观的UI: 基于 Element Plus 的组件库，提供丰富的界面组件和主题定制。

- 🔗 实时通信: 通过 WebSocket 实现与后端的实时数据同步，监控车辆状态和订单执行。

- 📊 数据可视化: 集成图表库，展示系统运行状态和性能指标。

- 🔧 开发者友好: 完整的 TypeScript 类型定义，代码规范检查，以及自动化构建部署。

**技术栈**
- 前端框架: Vue 3
- 开发语言: TypeScript

- UI 组件库: Element Plus

- 地图渲染: Konva.js

- 状态管理: Pinia

- 路由管理: Vue Router

- 构建工具: Vite

- 包管理器: pnpm (推荐) 或 npm

## 分支说明

- ts分支(稳定发布主分支 生产可用)
- dev分支(开发分支 开发过程中使用)

## 前端运行

```bash
# 安装依赖
npm install --registry=https://registry.npmmirror.com

# 启动服务
npm run dev

# 构建生产环境
npm run build:prod

# 前端访问地址 http://localhost:80
```

