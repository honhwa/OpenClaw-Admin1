# 前端架构设计文档

**版本**: 1.0.0  
**创建时间**: 2026-04-11  
**负责人**: 系统架构师  
**状态**: 已批准，待开发

---

## 1. 技术架构总览

### 1.1 核心技术栈

| 类别 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **框架** | Vue 3 | 3.5 | Composition API + Script Setup 语法 |
| **语言** | TypeScript | 5.9 | 严格模式，全项目类型安全 |
| **构建工具** | Vite | 7.3 | 极速开发体验，ESBuild 打包 |
| **UI 框架** | Naive UI | 2.43 | 完整组件库，支持主题定制 |
| **状态管理** | Pinia | 3.0 | Vue 官方推荐，轻量级 |
| **路由** | Vue Router | 4.6 | 官方路由，支持懒加载 |
| **HTTP 客户端** | Axios | 1.9 | 拦截器、请求取消、重试机制 |
| **图表库** | ECharts | 6.0 | 企业级数据可视化 |
| **国际化** | Vue I18n | 9.0 | 多语言支持 |
| **代码规范** | ESLint + Prettier | - | 统一代码风格 |

### 1.2 技术选型理由

#### Vue 3 + Composition API
- ✅ 更好的 TypeScript 支持
- ✅ 逻辑复用（Composables）优于 Mixins
- ✅ 更小的打包体积
- ✅ 更好的性能优化

#### Naive UI
- ✅ 完整的 TypeScript 类型定义
- ✅ 主题定制能力强（CSS Variables）
- ✅ 组件丰富，覆盖 90% 业务场景
- ✅ 按需加载，支持 Tree Shaking

#### Pinia
- ✅ 比 Vuex 更轻量（1KB vs 20KB）
- ✅ 更好的 TypeScript 支持
- ✅ Setup 语法友好
- ✅ DevTools 集成完善

#### Vite
- ✅ HMR 热更新 < 50ms
- ✅ 按需编译，启动秒开
- ✅ 生产构建使用 Rollup，优化完善
- ✅ 开箱即用的 TS、CSS、JSON 支持

---

## 2. 项目目录结构

```
/www/wwwroot/ai-work/
├── src/                              # 前端源代码
│   ├── api/                          # API 层
│   │   ├── http-client.ts            # HTTP 客户端封装
│   │   ├── rpc-client.ts             # RPC 客户端封装
│   │   ├── websocket.ts              # WebSocket 封装
│   │   ├── connect.ts                # 连接管理
│   │   └── types/                    # API 类型定义
│   ├── assets/                       # 静态资源
│   │   ├── styles/                   # 全局样式
│   │   ├── images/                   # 图片资源
│   │   └── fonts/                    # 字体文件
│   ├── components/                   # 组件层
│   │   ├── common/                   # 通用基础组件
│   │   ├── layout/                   # 布局组件
│   │   ├── business/                 # 业务组件（按模块划分）
│   │   └── charts/                   # 图表组件
│   ├── composables/                  # 组合式函数
│   ├── layouts/                      # 布局模板
│   ├── router/                       # 路由配置
│   ├── stores/                       # 状态管理（Pinia）
│   ├── utils/                        # 工具函数
│   ├── views/                        # 页面组件
│   ├── App.vue                       # 根组件
│   ├── main.ts                       # 入口文件
│   └── env.d.ts                      # 环境类型声明
├── server/                           # 后端服务代码
├── config/                           # 配置文件
├── designs/                          # UI 设计稿
├── dist/                             # 构建产物
├── public/                           # 公共资源
├── tests/                            # 测试文件
├── package.json                      # 依赖配置
├── vite.config.ts                    # Vite 配置
├── tsconfig.json                     # TypeScript 配置
└── README.md                         # 项目说明
```

---

## 3. 状态管理设计

### 3.1 Store 划分原则

| Store 名称 | 职责 | 持久化 |
|-----------|------|--------|
| `app` | 应用全局状态（语言、主题、布局） | ✅ |
| `user` | 用户信息、个人资料 | ✅ |
| `auth` | 认证状态、Token | ✅ |
| `theme` | 主题配置（亮色/暗色/自定义） | ✅ |
| `permission` | 权限列表、角色信息 | ✅ |
| `search` | 搜索历史、筛选条件 | ✅ |
| `batch` | 批量选择状态 | ❌ |
| `notification` | 通知列表、未读数 | ✅ |
| `terminal` | 终端会话状态 | ❌ |
| `config` | 系统配置 | ✅ |

### 3.2 Store 示例代码

```typescript
// src/stores/theme.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark' | 'auto'>('light')
  const primaryColor = ref('#18a058')

  const isDark = computed(() => {
    if (theme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })

  function setTheme(newTheme: 'light' | 'dark' | 'auto') {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
  }

  watch(isDark, (isDark) => {
    document.documentElement.classList.toggle('dark', isDark)
  }, { immediate: true })

  return { theme, primaryColor, isDark, setTheme }
})
```

---

## 4. 路由设计

### 4.1 路由结构

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { title: '仪表板', requiresAuth: true } },
      { path: 'batch-operation', name: 'BatchOperation', component: () => import('@/views/batch-operation/BatchListView.vue'), meta: { title: '批量操作', requiresAuth: true, permission: 'batch:manage' } },
      { path: 'search', name: 'Search', component: () => import('@/views/search/SearchView.vue'), meta: { title: '智能搜索', requiresAuth: true } },
      { path: 'visualization', name: 'Visualization', component: () => import('@/views/visualization/ChartView.vue'), meta: { title: '数据可视化', requiresAuth: true } },
      { path: 'permission', name: 'Permission', component: () => import('@/views/permission/RoleListView.vue'), meta: { title: '权限管理', requiresAuth: true, permission: 'admin:manage' } },
      { path: 'theme', name: 'Theme', component: () => import('@/views/theme/ThemeView.vue'), meta: { title: '主题设置', requiresAuth: true } }
    ]
  },
  { path: '/login', name: 'Login', component: () => import('@/views/auth/LoginView.vue'), meta: { requiresAuth: false } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/error/NotFoundView.vue'), meta: { requiresAuth: false } }
]
```

### 4.2 路由守卫

```typescript
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - OpenClaw` : 'OpenClaw'
  
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.permission) {
    const permissionStore = usePermissionStore()
    if (!permissionStore.hasPermission(to.meta.permission)) {
      next({ name: 'NotFound' })
      return
    }
  }

  next()
})
```

---

## 5. API 层设计

### 5.1 HTTP 客户端封装

```typescript
// src/api/http-client.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const httpClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

httpClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default httpClient
```

---

## 6. 开发规范

### 6.1 代码规范

#### 文件命名
- 组件：`PascalCase.vue`（如 `UserProfile.vue`）
- 工具函数：`kebab-case.ts`（如 `format-date.ts`）
- Store：`camelCase.ts`（如 `userStore.ts`）
- 类型定义：`PascalCase.ts`（如 `channelTypes.ts`）

#### 组件结构
```vue
<template>
  <!-- 模板 -->
</template>

<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue'

// 2. Props
interface Props { title: string; count?: number }
const props = withDefaults(defineProps<Props>(), { count: 0 })

// 3. Emits
interface Emits { (e: 'update', value: string): void }
const emit = defineEmits<Emits>()

// 4. State
const localData = ref<string[]>([])

// 5. Computed
const formattedCount = computed(() => props.count.toLocaleString())

// 6. Methods
const handleUpdate = (value: string) => emit('update', value)
</script>

<style scoped>
/* 样式 */
</style>
```

### 6.2 Git 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`

**示例**:
```
feat(batch): 添加批量删除功能

- 实现批量删除确认弹窗
- 添加删除进度提示
- 支持批量删除后刷新列表

Closes #123
```

---

## 7. 构建与部署方案

### 7.1 开发环境

```bash
npm run dev         # 仅前端开发
npm run dev:server  # 仅后端开发
npm run dev:all     # 前后端同时开发
```

### 7.2 生产构建

```bash
npm run build       # 生产构建
npm run preview     # 预览构建结果
npm run build:analyze  # 构建分析
```

### 7.3 部署方案

#### Nginx 静态部署
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /www/wwwroot/ai-work/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Docker 部署
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 7.4 CI/CD 流程

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - uses: appleboy/ssh-action@v1.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /www/wwwroot/ai-work
            rm -rf dist
            mv $GITHUB_WORKSPACE/dist .
            systemctl reload nginx
```

---

## 8. 性能优化策略

### 8.1 代码分割
- 路由懒加载
- 组件异步加载
- 第三方库分块（vue-vendor, ui-vendor, chart-vendor）

### 8.2 资源优化
- 图片 WebP 格式
- SVG 图标雪碧图
- CSS/JS 压缩
- Gzip/Brotli 压缩

### 8.3 缓存策略
- 静态资源长期缓存（contenthash）
- API 响应缓存
- Service Worker 离线缓存

### 8.4 渲染优化
- 虚拟列表（大数据量）
- 防抖/节流
- 懒加载图片/组件

---

## 9. 安全规范

### 9.1 XSS 防护
- DOMPurify 清理 HTML
- 避免 v-html，使用 textContent
- Content Security Policy

### 9.2 CSRF 防护
- SameSite Cookie
- CSRF Token 验证

### 9.3 敏感信息
- 环境变量管理
- Token 安全存储（HttpOnly Cookie）
- 日志脱敏

---

## 10. 测试策略

### 10.1 单元测试
```bash
npm run test          # 运行测试
npm run test:watch    # 监听模式
npm run test:coverage # 覆盖率报告
```

**覆盖率要求**:
- 行覆盖率 ≥ 80%
- 分支覆盖率 ≥ 70%
- 函数覆盖率 ≥ 85%

### 10.2 E2E 测试
```bash
npm run test:e2e      # 运行 E2E 测试
npm run test:e2e:ui   # E2E 测试 UI
```

---

## 11. 开发工作流

### 11.1 功能开发流程
```
1. 创建功能分支 (feature/xxx)
2. 编写组件/功能代码
3. 编写单元测试
4. 本地测试验证
5. 提交代码 (遵循 commit 规范)
6. 创建 Pull Request
7. Code Review
8. 合并到 develop
```

### 11.2 代码审查清单
- [ ] 代码符合 ESLint 规范
- [ ] 包含必要的注释
- [ ] 单元测试覆盖
- [ ] 无控制台警告
- [ ] 响应式布局正常
- [ ] 国际化文案完整
- [ ] 性能无瓶颈

---

## 12. 附录

### 12.1 常用命令
```bash
# 开发
npm run dev          # 启动开发服务器
npm run dev:server   # 仅后端
npm run dev:all      # 前后端同时

# 构建
npm run build        # 生产构建
npm run preview      # 预览构建结果

# 测试
npm run test         # 单元测试
npm run test:e2e     # E2E 测试
npm run lint         # 代码检查

# 其他
npm run format       # 格式化代码
npm run type-check   # 类型检查
```

### 12.2 性能指标
- First Contentful Paint (FCP) < 1.5s
- Time to Interactive (TTI) < 3.5s
- Cumulative Layout Shift (CLS) < 0.1
- Largest Contentful Paint (LCP) < 2.5s

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-11  
**维护者**: 系统架构师  
**状态**: ✅ 已批准
