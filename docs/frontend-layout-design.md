# OpenTCS Plus Web 前端布局设计方案

## 1. 设计理念

### 1.1 角色划分
菜单按角色职责划分，满足不同用户的工作需求：

| 角色 | 职责 | 主要菜单 |
|-----|------|---------|
| **部署工程师** | 车辆配置、地图配置、任务配置 | 模型管理 |
| **运维工程师** | 设备运维、异常处理、任务下发 | 运维管理 |
| **运营人员** | 监控态势、任务查看 | 运维管理 |
| **调度员** | 任务调度、仿真 | 运维管理 |
| **管理员** | 系统管理 | 系统管理 |

### 1.2 设计原则
- **扁平化**：菜单层级尽量扁平（2级为主）
- **功能域清晰**：按业务域划分菜单
- **角色匹配**：菜单与职责匹配
- **业界术语**：采用业界通用命名（配置、监控、运维）

### 1.3 业界参考

| 厂商 | 菜单结构 | 特点 |
|-----|---------|------|
| 极智嘉 | 系统管理/模型配置/任务管理/调度中心/运维管理 | 功能域清晰 |
| 海康机器人 | 基础配置/车辆配置/任务配置/监控中心/运维管理 | 配置集中 |
| 快仓 | 系统配置/地图配置/车辆配置/任务配置/监控中心/运维中心 | 监控独立 |
| 牧星智能 | 配置管理/车辆管理/任务管理/监控告警 | 配置集中 |

**共性**：
- 业界普遍采用 **2级侧边菜单**（顶级 + 二级）
- "配置"、"监控"、"运维"是核心关键词

---

## 2. 顶部导航设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Logo   │   首页    │   模型管理    │    运维管理    │    系统管理    │
└─────────┴───────────┴──────────────┴───────────────┴───────────────┘
```

### 2.1 技术实现

菜单通过后端API动态加载，存储于 `sys_menu` 表。前端启用顶部导航模式：

```typescript
// src/settings.ts
export default {
  topNav: true,  // 启用顶部导航
}
```

### 2.2 顶部菜单项

| 菜单 | 说明 | 角色 |
|-----|------|------|
| 首页 | 系统首页，快速入口 | 全部 |
| 模型管理 | 车辆配置、地图配置、任务配置 | 部署工程师 |
| 运维管理 | 监控中心、任务调度、设备运维 | 运营/运维/调度 |
| 系统管理 | 用户、角色、菜单、字典等 | 管理员 |

---

## 3. 菜单结构详细设计

### 3.1 模型管理（部署工程师）

```
┌─────────────────────────────────────────────────────────────────────┐
│                       模型管理                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ▼ 车辆配置                                                         │
│      ├── 品牌管理           /opentcs/agv-brand                      │
│      ├── 车型管理           /opentcs/agv-model                       │
│      └── 车辆管理           /opentcs/agv-vehicle                    │
│                                                                      │
│  ▼ 地图配置                                                         │
│      ├── 地图管理           /opentcs/factory                         │
│      │   └── 导航地图       /opentcs/factory/{id}/maps              │
│      ├── 站点管理           /opentcs/map/points                     │
│      ├── 路线管理           /opentcs/map/paths                     │
│      ├── 区域管理           /opentcs/map/zones                      │
│      ├── 跨层连接           /opentcs/connections                    │
│      └── 位置类型           /opentcs/location-type                   │
│                                                                      │
│  ▼ 任务配置                                                         │
│      └── 任务模板           /opentcs/task-template                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 车辆配置

| 菜单 | 路由 | 功能说明 |
|-----|------|---------|
| 品牌管理 | `/opentcs/agv-brand` | AMR厂商管理 |
| 车型管理 | `/opentcs/agv-model` | AMR型号/参数配置 |
| 车辆管理 | `/opentcs/agv-vehicle` | 具体AMR车辆CRUD |

#### 地图配置

| 菜单 | 路由 | 功能说明 |
|-----|------|---------|
| 地图管理 | `/opentcs/factory` | 工厂CRUD、包含导航地图列表 |
| 导航地图 | `/opentcs/factory/{id}/maps` | 具体地图管理 |
| 站点管理 | `/opentcs/map/points` | 点位配置/状态 |
| 路线管理 | `/opentcs/map/paths` | 路径配置/状态 |
| 区域管理 | `/opentcs/map/zones` | 区域配置 |
| 跨层连接 | `/opentcs/connections` | 电梯/传送带管理 |
| 位置类型 | `/opentcs/location-type` | 全局位置类型配置 |

#### 任务配置

| 菜单 | 路由 | 功能说明 |
|-----|------|---------|
| 任务模板 | `/opentcs/task-template` | 运输任务模板定义 |

---

### 3.2 运维管理（运营/运维/调度）

```
┌─────────────────────────────────────────────────────────────────────┐
│                       运维管理                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ▼ 监控中心                                                         │
│      ├── 监控大屏           /opentcs/monitor                        │
│      └── 车辆监控           /opentcs/vehicle/monitor                │
│                                                                      │
│  ▼ 任务调度                                                         │
│      ├── 任务订单           /opentcs/order                          │
│      └── 仿真调度           /opentcs/simulation                    │
│                                                                      │
│  ▼ 设备运维                                                         │
│      ├── 车辆控制           /opentcs/agv/control                    │
│      ├── 任务下发           /opentcs/agv/task                       │
│      └── 资源锁定           /opentcs/agv/lock                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 监控中心

| 菜单 | 路由 | 功能说明 |
|-----|------|---------|
| 监控大屏 | `/opentcs/monitor` | 全局态势总览 |
| 车辆监控 | `/opentcs/vehicle/monitor` | AMR实时状态 |

#### 任务调度

| 菜单 | 路由 | 功能说明 |
|-----|------|---------|
| 任务订单 | `/opentcs/order` | 运输任务列表 |
| 仿真调度 | `/opentcs/simulation` | 仿真模拟 |

#### 设备运维

| 菜单 | 路由 | 功能说明 |
|-----|------|---------|
| 车辆控制 | `/opentcs/agv/control` | 启停、模式切换 |
| 任务下发 | `/opentcs/agv/task` | 下发充电/调度任务 |
| 资源锁定 | `/opentcs/agv/lock` | 强制解锁资源 |

---

### 3.3 系统管理

```
▼ 系统管理
    ├── 用户管理           /system/user
    ├── 角色管理           /system/role
    ├── 菜单管理           /system/menu
    └── 字典管理           /system/dict

▼ 系统监控
    ├── 在线设备           /monitor/online
    ├── 操作日志           /monitor/operlog
    └── 登录日志           /monitor/logininfor
```

---

## 4. 页面层级关系

```
首页 (/)
    │
    ├── 模型管理 (/opentcs)
    │   ├── 车辆配置
    │   │   ├── 品牌管理 (/opentcs/agv-brand)
    │   │   ├── 车型管理 (/opentcs/agv-model)
    │   │   └── 车辆管理 (/opentcs/agv-vehicle)
    │   │
    │   ├── 地图配置
    │   │   ├── 地图管理 (/opentcs/factory)
    │   │   │   └── 导航地图 (/opentcs/factory/{id}/maps)
    │   │   ├── 站点管理 (/opentcs/map/points)
    │   │   ├── 路线管理 (/opentcs/map/paths)
    │   │   ├── 区域管理 (/opentcs/map/zones)
    │   │   ├── 跨层连接 (/opentcs/connections)
    │   │   └── 位置类型 (/opentcs/location-type)
    │   │
    │   └── 任务配置
    │       └── 任务模板 (/opentcs/task-template)
    │
    ├── 运维管理 (/opentcs/ops)
    │   ├── 监控中心
    │   │   ├── 监控大屏 (/opentcs/monitor)
    │   │   └── 车辆监控 (/opentcs/vehicle/monitor)
    │   │
    │   ├── 任务调度
    │   │   ├── 任务订单 (/opentcs/order)
    │   │   └── 仿真调度 (/opentcs/simulation)
    │   │
    │   └── 设备运维
    │       ├── 车辆控制 (/opentcs/agv/control)
    │       ├── 任务下发 (/opentcs/agv/task)
    │       └── 资源锁定 (/opentcs/agv/lock)
    │
    └── 系统管理 (/system)
        ├── 系统管理
        │   ├── 用户管理 (/system/user)
        │   ├── 角色管理 (/system/role)
        │   ├── 菜单管理 (/system/menu)
        │   └── 字典管理 (/system/dict)
        │
        └── 系统监控
            ├── 在线设备 (/monitor/online)
            ├── 操作日志 (/monitor/operlog)
            └── 登录日志 (/monitor/logininfor)
```

---

## 5. 特殊交互说明

### 5.1 地图编辑器
- 入口：模型管理 → 地图配置 → 地图管理 → 点击地图卡片
- 打开方式：新浏览器标签页
- 路由：`/map/mapeditor?id={mapId}&name={mapName}`

### 5.2 权限控制
- 不同角色登录后，默认展开对应菜单
- 支持首页配置常用功能卡片

---

## 6. 路由配置对照表

| 顶部 | 侧边1级 | 侧边2级 | 路由 |
|-----|--------|--------|------|
| 首页 | - | - | `/index` |
| **模型管理** | 车辆配置 | 品牌管理 | `/opentcs/agv-brand` |
| | | 车型管理 | `/opentcs/agv-model` |
| | | 车辆管理 | `/opentcs/agv-vehicle` |
| | 地图配置 | 地图管理 | `/opentcs/factory` |
| | | 导航地图 | `/opentcs/factory/{id}/maps` |
| | | 站点管理 | `/opentcs/map/points` |
| | | 路线管理 | `/opentcs/map/paths` |
| | | 区域管理 | `/opentcs/map/zones` |
| | | 跨层连接 | `/opentcs/connections` |
| | | 位置类型 | `/opentcs/location-type` |
| | 任务配置 | 任务模板 | `/opentcs/task-template` |
| **运维管理** | 监控中心 | 监控大屏 | `/opentcs/monitor` |
| | | 车辆监控 | `/opentcs/vehicle/monitor` |
| | 任务调度 | 任务订单 | `/opentcs/order` |
| | | 仿真调度 | `/opentcs/simulation` |
| | 设备运维 | 车辆控制 | `/opentcs/agv/control` |
| | | 任务下发 | `/opentcs/agv/task` |
| | | 资源锁定 | `/opentcs/agv/lock` |
| **系统管理** | 系统管理 | 用户管理 | `/system/user` |
| | | 角色管理 | `/system/role` |
| | | 菜单管理 | `/system/menu` |
| | | 字典管理 | `/system/dict` |
| | 系统监控 | 在线设备 | `/monitor/online` |
| | | 操作日志 | `/monitor/operlog` |
| | | 登录日志 | `/monitor/logininfor` |

---

## 7. 菜单结构对比（方案演进）

| 阶段 | 方案 | 说明 |
|-----|------|------|
| v1 | 功能模块划分 | 按功能模块划分 |
| v2 | 角色划分初版 | 部署/运维/运营分离 |
| v3 | 业界参考优化 | 采用业界术语（配置/监控/运维） |
| v4 | **最终版** | 模型管理（配置）+ 运维管理（监控/调度/运维） |

### 演进说明

1. **v1**: 初始按功能模块划分
2. **v2**: 引入角色概念，部署/运维/运营分离
3. **v3**: 参考业界，"部署"改为"配置"，更专业
4. **v4**: 顶部菜单统一为"模型管理"，包含所有配置类工作

---

## 8. 后端菜单配置说明

### 8.1 sys_menu 表结构

菜单通过后端 `sys_menu` 表配置，需要配置以下顶级菜单：

| menu_id | menu_name | parent_id | path | component | menu_type |
|---------|-----------|-----------|------|-----------|-----------|
| 1 | 首页 | 0 | /index | views/index | C |
| 100 | 模型管理 | 0 | /opentcs | Layout | M |
| 200 | 运维管理 | 0 | /opentcs/ops | Layout | M |
| 300 | 系统管理 | 0 | /system | Layout | M |

### 8.2 完整菜单ID规划

```
模型管理 (100)
├── 车辆配置 (101)
│   ├── 品牌管理 (1011) - /opentcs/agv-brand
│   ├── 车型管理 (1012) - /opentcs/agv-model
│   └── 车辆管理 (1013) - /opentcs/agv-vehicle
│
├── 地图配置 (102)
│   ├── 地图管理 (1021) - /opentcs/factory
│   ├── 导航地图 (1022) - /opentcs/factory/{id}/maps
│   ├── 站点管理 (1023) - /opentcs/map/points
│   ├── 路线管理 (1024) - /opentcs/map/paths
│   ├── 区域管理 (1025) - /opentcs/map/zones
│   ├── 跨层连接 (1026) - /opentcs/connections
│   └── 位置类型 (1027) - /opentcs/location-type
│
└── 任务配置 (103)
    └── 任务模板 (1031) - /opentcs/task-template


运维管理 (200)
├── 监控中心 (201)
│   ├── 监控大屏 (2011) - /opentcs/monitor
│   └── 车辆监控 (2012) - /opentcs/vehicle/monitor
│
├── 任务调度 (202)
│   ├── 任务订单 (2021) - /opentcs/order
│   └── 仿真调度 (2022) - /opentcs/simulation
│
└── 设备运维 (203)
    ├── 车辆控制 (2031) - /opentcs/agv/control
    ├── 任务下发 (2032) - /opentcs/agv/task
    └── 资源锁定 (2033) - /opentcs/agv/lock
```

---

## 9. 设计版本

| 版本 | 日期 | 说明 |
|-----|------|------|
| v1.0 | 2026-03-16 | 初始设计方案 |
| v1.1 | 2026-03-16 | 优化菜单结构，采用业界术语 |
| v1.2 | 2026-03-16 | 确认最终版：模型管理+运维管理 |

---

## 10. 待办事项

- [x] 顶部导航已启用 (topNav: true)
- [ ] 后端菜单数据配置
- [ ] 前端页面开发
