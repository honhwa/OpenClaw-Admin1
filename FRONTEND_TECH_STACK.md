# 前端技术栈与项目架构

## 技术栈选型

### 核心框架
- **Vue 3.5** - 渐进式 JavaScript 框架，使用 Composition API
- **TypeScript 5.9** - 类型安全，提升代码可维护性
- **Vite 7.3** - 下一代前端构建工具

### UI 组件库
- **Naive UI 2.43** - 完整的 Vue 组件库，支持 TypeScript 和主题定制
- **FontAwesome 7.2** - 图标库

### 状态管理
- **Pinia 3.0** - Vue 官方推荐状态管理库

### 路由
- **Vue Router 4.6** - 官方路由解决方案

### 国际化
- **Vue I18n 9.0** - 多语言支持

### 数据可视化
- **ECharts 6.0** - 强大的图表库
- **Vue-ECharts 8.0** - ECharts 的 Vue 封装

### 终端组件
- **XTerm.js 6.0** - 终端模拟器
- 相关插件：fit, web-links

### 工具库
- **VueUse 14.2** - Vue 组合式 API 工具集
- **DOMPurify 3.3** - XSS 防护
- **Highlight.js 11.11** - 代码高亮
- **KaTeX 0.16** - 数学公式渲染
- **Markdown-it 14.1** - Markdown 解析

### 后端服务（Node.js）
- **Express 5.2** - Web 框架
- **Better-SQLite3 12.6** - SQLite 数据库
- **WS 8.19** - WebSocket 支持
- **Node-pty 1.1.0** - 伪终端

### 测试
- **Vitest 4.1** - Vite 原生测试框架
- **Vue Test Utils 2.4** - Vue 组件测试
- **Playwright 1.58** - E2E 测试

## 项目架构

```
/www/wwwroot/ai-work/
├── src/                          # 前端源代码
│   ├── App.vue                   # 根组件
│   ├── main.ts                   # 入口文件
│   ├── api/                      # API 请求封装
│   ├── assets/                   # 静态资源
│   ├── backend/                  # 后端相关代码
│   ├── components/               # 公共组件
│   │   ├── common/               # 通用组件
│   │   ├── layout/               # 布局组件
│   │   └── business/             # 业务组件
│   ├── composables/              # 组合式函数
│   ├── i18n/                     # 国际化配置
│   ├── layouts/                  # 布局模板
│   ├── router/                   # 路由配置
│   ├── stores/                   # Pinia 状态管理
│   ├── utils/                    # 工具函数
│   └── views/                    # 页面组件
│       ├── dashboard/            # 仪表板
│       ├── batch-operation/      # 批量操作
│       ├── search/               # 搜索模块
│       ├── visualization/        # 数据可视化
│       ├── permission/           # 权限管理
│       ├── theme/                # 主题切换
│       └── mobile/               # 移动端/PWA
├── server/                       # 后端服务代码
├── config/                       # 配置文件
├── designs/                      # UI 设计稿
│   ├── BATCH_OPERATION_UI.md
│   ├── SMART_SEARCH_UI.md
│   ├── DATA_VISUALIZATION_UI.md
│   ├── PERMISSION_MANAGEMENT_UI.md
│   ├── THEME_SWITCHER_UI.md
│   └── PWA_MOBILE_UI.md
├── dist/                         # 构建产物
├── package.json                  # 依赖配置
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
└── HEARTBEAT.md                 # 项目状态同步
```

## 组件库规划

### 核心组件
1. **批量操作栏** - 支持全选、批量删除、批量状态变更
2. **智能搜索框** - 全局搜索、历史记录、搜索建议
3. **高级筛选器** - 多条件组合筛选、筛选标签
4. **数据可视化** - 图表组件、数据卡片、进度条
5. **权限管理** - 角色选择器、权限配置面板
6. **主题切换** - 主题选择器、自定义主题配置
7. **移动端适配** - PWA 支持、手势导航

### 工具函数
- API 请求封装（axios/fetch）
- 本地存储管理
- 权限验证工具
- 数据格式化
- 日期时间处理
- 文件上传下载

## 开发规范

### 代码规范
- 使用 TypeScript 严格模式
- ESLint + Prettier 代码格式化
- 组件命名：PascalCase
- 文件命名：kebab-case

### 提交规范
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试

### 分支管理
- main - 生产环境
- develop - 开发环境
- feature/* - 功能分支
- hotfix/* - 紧急修复

## 开发命令

```bash
# 开发模式（仅前端）
npm run dev

# 开发模式（仅后端）
npm run dev:server

# 开发模式（前后端同时）
npm run dev:all

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 运行测试
npm run test

# 测试监控
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

## 下一步计划

1. ✅ 技术栈已确定，项目骨架已完成
2. ⏭️ 等待 UI 设计师输出高保真设计稿
3. ⏭️ 根据设计稿实现组件
4. ⏭️ 实现核心功能模块
5. ⏭️ 集成测试与优化

---

**技术栈版本**: 2026-04-11  
**负责人**: 前端开发
