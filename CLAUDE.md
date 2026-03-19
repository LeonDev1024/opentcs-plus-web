# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在本项目中工作时提供指导。

## 项目简介

这是一个 OpenTCS（开放运输控制系统）Web 前端，基于 Vue 3、TypeScript 和 Element Plus 构建。它提供了一个现代化的 AGV（自动导引车）调度管理界面，包含实时监控和强大的地图编辑器功能。

## 开发命令

```bash
# 安装依赖（国内建议使用镜像源）
npm install --registry=https://registry.npmmirror.com

# 启动开发服务器（默认端口 80）
npm run dev

# 构建生产环境
npm run build:prod

# 构建开发环境
npm run build:dev

# 预览生产构建
npm run preview

# ESLint 代码检查
npm run lint:eslint

# 自动修复 ESLint 问题
npm run lint:eslint:fix

# Prettier 代码格式化
npm run prettier
```

## 项目架构

### 目录结构
- `/src/api` - API 层，包含类型定义和 Axios 请求
- `/src/store/modules` - Pinia 状态管理 stores
- `/src/views` - 页面组件，按功能模块组织
- `/src/views/opentcs` - OpenTCS 相关视图（地图、车辆、订单、仿真）
- `/src/components` - 可复用 UI 组件
- `/src/layout` - 应用布局组件
- `/src/utils` - 工具函数
- `/src/router` - Vue Router 配置

### 技术栈
- **框架**: Vue 3.5 + TypeScript 5.8
- **UI 组件库**: Element Plus 2.9
- **状态管理**: Pinia 3.0
- **地图渲染**: Konva.js + vue-konva
- **构建工具**: Vite 6.3
- **实时通信**: SSE（Server-Sent Events）

### 状态管理
主要 Pinia stores 位于 `/src/store/modules`:
- `app.ts` - 应用级状态
- `user.ts` - 用户认证状态
- `permission.ts` - 路由/权限管理
- `mapEditor.ts` - 地图编辑器状态（核心模块，处理画布操作）
- `dict.ts` - 字典数据
- `settings.ts` - 用户偏好设置

### 地图编辑器
地图编辑器是核心功能，位于 `/src/views/opentcs/map/editor/`:
- 使用 Konva.js 进行画布渲染
- 核心组件：`MapCanvas.vue`、`ComponentsPanel.vue`、`PropertyPanel.vue`、`LayerPanel.vue`
- 支持点位、路径、区域编辑及跨楼层连接

### API 层
API 按领域分类在 `/src/api` 下:
- `/src/api/system/` - 系统管理（用户、角色、菜单、配置等）
- `/src/api/opentcs/` - OpenTCS 相关 API（车辆、订单、地图、仿真）
- `/src/api/monitor/` - 监控 API（缓存、登录信息、操作日志）

### 路由配置
- 动态路由基于用户权限加载
- 关键路由:
  - `/map/mapeditor` - 地图编辑器（隐藏，通过菜单访问）
  - `/opentcs/map/location` - 位置类型管理
  - `/opentcs/simulation` - 仿真模块

## 环境配置

开发和生产环境变量文件:
- `.env.development` - 开发环境配置（端口 80，API 前缀 `/dev-api`，启用加密）
- `.env.production` - 生产环境配置

关键变量:
- `VITE_APP_BASE_API` - API 前缀
- `VITE_APP_CONTEXT_PATH` - 应用上下文路径
- `VITE_APP_PORT` - 开发服务器端口
- `VITE_APP_ENCRYPT` - API 加密开关

## 开发规范

- 使用 `@` 别名指向 `/src` 目录（如 `@/views`、`@/api`）
- 采用 Vue 3 组合式 API + `<script setup lang="ts">`
- 新文件使用 TypeScript
- API 类型定义与 API 模块放在一起
- 地图编辑器状态集中在 `store/modules/mapEditor.ts`

## 代码优化记录

### 已完成的优化

#### Week 1-2: 基础清理与类型安全
- ✅ 清理所有 console.log 调试代码（14处）
- ✅ 定义 API 响应类型（MapEditorResponse, VisualLayoutData, MapEditorSaveData）
- ✅ 更新 API 函数签名，替换 any 为具体类型
- ✅ 优化 Store 类型定义，使用 Record<string, any> 替代 any

#### Week 3-4: 架构与性能优化
- ✅ 抽象重复代码 - 新增 deleteElement 通用函数
- ✅ 计算属性 Map 缓存优化 - 元素查找从 O(n) 优化为 O(1)
- ✅ 新增 pointsMap/pathsMap/locationsMap 计算属性

#### Week 5-6: 样式与模块拆分
- ✅ 全局样式优化 - 统一管理 Element Plus 表单样式覆盖
- ✅ Request 模块拆分 - 创建独立的下载功能模块

#### Week 9: 事件节流优化
- ✅ 鼠标位置更新节流 - 使用 requestAnimationFrame 限制更新频率（60fps）

### 待优化项（风险较高，需谨慎处理）

- ⚠️ MapCanvas.vue 大型组件拆分（3095行，建议分阶段提取 composables）
- ⚠️ mapEditor.ts Store 拆分（1086行，建议按功能模块分离，使用 composables）

### 项目技术债务

- 部分组件仍使用 scoped 样式覆盖 Element Plus，建议统一在全局样式文件管理
- 部分 API 响应类型仍需完善

