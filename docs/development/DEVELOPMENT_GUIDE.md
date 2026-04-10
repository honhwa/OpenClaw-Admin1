# OpenClaw Admin 开发指南

**版本**: v0.3.0  
**最后更新**: 2026-04-11  
**适用开发者**: 前端开发、后端开发、全栈开发

---

## 目录

1. [项目概述](#项目概述)
2. [开发环境搭建](#开发环境搭建)
3. [项目架构](#项目架构)
4. [前端开发](#前端开发)
5. [后端开发](#后端开发)
6. [数据库设计](#数据库设计)
7. [API 开发规范](#api-开发规范)
8. [测试指南](#测试指南)
9. [代码规范](#代码规范)
10. [调试技巧](#调试技巧)

---

## 项目概述

OpenClaw Admin 是一个基于 Vue 3 + Express 的 AI 智能体管理平台，提供 Web 界面管理 OpenClaw Gateway 的核心功能。

### 技术栈

#### 前端
- **框架**: Vue 3.5.x (Composition API)
- **语言**: TypeScript 5.x
- **UI 库**: Naive UI 2.43.x
- **路由**: Vue Router 4.x
- **状态管理**: Pinia 3.x
- **构建工具**: Vite 7.x
- **图表**: ECharts 6.x
- **终端**: XTerm.js 6.x

#### 后端
- **框架**: Express 5.x
- **语言**: JavaScript (ES2022)
- **数据库**: better-sqlite3 12.x
- **WebSocket**: ws 8.x
- **终端**: node-pty 1.x + ssh2 1.x

### 核心功能模块

| 模块 | 说明 | 主要文件 |
|------|------|---------|
| 认证 | 用户登录、会话管理 | `server/auth.js`, `src/stores/auth.ts` |
| 会话 | AI 会话管理、消息记录 | `server/gateway.js`, `src/stores/session.ts` |
| Cron | 定时任务管理 | `server/automation-cron.js`, `src/views/cron/` |
| 模型 | 模型配置管理 | `server/index.js`, `src/stores/model.ts` |
| 频道 | 多渠道配置 | `server/index.js`, `src/stores/channel.ts` |
| 记忆 | 智能体文档管理 | `server/index.js`, `src/stores/memory.ts` |
| 监控 | 系统资源监控 | `src/views/system/`, `src/stores/monitor.ts` |

---

## 开发环境搭建

### 环境要求

```bash
# Node.js 版本
node -v  # >= 18.0.0, 推荐 20.x

# npm 版本
npm -v   # >= 9.0.0
```

### 安装步骤

```bash
# 1. 克隆仓库
git clone <repository-url>
cd ai-work

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 4. 启动开发环境
npm run dev:all  # 同时启动前后端
# 或分别启动
npm run dev      # 前端开发服务器
npm run dev:server  # 后端服务
```

### 环境变量配置

```env
# 应用配置
NODE_ENV=development
PORT=3001
DEV_PORT=3000

# OpenClaw Gateway 连接
OPENCLAW_WS_URL=ws://localhost:18789
OPENCLAW_AUTH_TOKEN=your-token
OPENCLAW_AUTH_PASSWORD=your-password

# 认证配置
AUTH_USERNAME=admin
AUTH_PASSWORD=your-password

# 其他配置
DEV_FRONTEND_URL=http://localhost:3000
MEDIA_DIR=./uploads
```

---

## 项目架构

### 目录结构

```
ai-work/
├── src/                      # 前端源码
│   ├── api/                  # API 层
│   │   ├── types/            # TypeScript 类型
│   │   ├── connect.ts        # 连接管理
│   │   ├── http-client.ts    # HTTP 客户端
│   │   └── websocket.ts      # WebSocket 封装
│   ├── assets/               # 静态资源
│   │   └── styles/           # 样式文件
│   ├── components/           # 组件
│   │   ├── common/           # 通用组件
│   │   ├── layout/           # 布局组件
│   │   └── office/           # 办公场景组件
│   ├── composables/          # 组合式函数
│   ├── i18n/                 # 国际化
│   ├── layouts/              # 布局
│   ├── router/               # 路由配置
│   ├── stores/               # Pinia Store
│   ├── utils/                # 工具函数
│   ├── views/                # 页面视图
│   ├── App.vue               # 根组件
│   └── main.ts               # 入口文件
│
├── server/                   # 后端源码
│   ├── routes/               # 路由定义
│   ├── models/               # 数据模型
│   ├── services/             # 业务逻辑
│   ├── middleware/           # 中间件
│   ├── utils/                # 工具函数
│   ├── auth.js               # 认证模块
│   ├── database.js           # 数据库模块
│   ├── gateway.js            # Gateway 连接
│   ├── automation-cron.js    # 定时任务
│   └── index.js              # 服务入口
│
├── config/                   # 配置文件
├── data/                     # 数据文件
├── dist/                     # 构建输出
├── docs/                     # 文档
├── tests/                    # 测试文件
└── scripts/                  # 脚本工具
```

### 架构设计

```
┌─────────────────────────────────────────────┐
│              前端 (Vue 3)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  页面   │  │  组件   │  │  Store  │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │          │
│       └────────────┴────────────┘          │
│                    │                       │
│              ┌─────▼─────┐                 │
│              │  HTTP/RPC │                 │
│              └─────┬─────┘                 │
└────────────────────┼───────────────────────┘
                     │
┌────────────────────▼───────────────────────┐
│              后端 (Express)                  │
│  ┌─────────────────────────────────────┐   │
│  │           中间件层                    │   │
│  │  (auth, cors, error, rate-limit)    │   │
│  └────────────────┬────────────────────┘   │
│                   │                         │
│  ┌────────────────▼────────────────────┐   │
│  │            路由层                     │   │
│  │  (auth, cron, config, session...)   │   │
│  └────────────────┬────────────────────┘   │
│                   │                         │
│  ┌────────────────▼────────────────────┐   │
│  │           业务逻辑层                  │   │
│  │     (Gateway 通信、数据库操作)          │   │
│  └────────────────┬────────────────────┘   │
│                   │                         │
│  ┌────────────────▼────────────────────┐   │
│  │           数据访问层                  │   │
│  │         (SQLite、WebSocket)          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │OpenClaw     │
              │Gateway      │
              └─────────────┘
```

---

## 前端开发

### 组件开发

#### 组件模板

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PropType } from 'vue'

// Props 定义
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// Emits 定义
interface Emits {
  (e: 'update', value: number): void
  (e: 'click'): void
}

const emit = defineEmits<Emits>()

// 状态
const localCount = ref(props.count)

// 计算属性
const doubled = computed(() => localCount.value * 2)

// 方法
const handleClick = () => {
  emit('click')
}

// 生命周期
onMounted(() => {
  console.log('Component mounted')
})
</script>

<template>
  <div class="component-name">
    <h3>{{ title }}</h3>
    <p>Count: {{ localCount }}</p>
    <p>Doubled: {{ doubled }}</p>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<style scoped>
.component-name {
  padding: 16px;
}
</style>
```

### Store 开发

#### Store 模板

```typescript
// src/stores/example.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExampleStore = defineStore('example', () => {
  // State
  const items = ref<string[]>([])
  const loading = ref(false)

  // Getters
  const itemCount = computed(() => items.value.length)

  // Actions
  const fetchItems = async () => {
    loading.value = true
    try {
      // API call
      items.value = ['item1', 'item2']
    } finally {
      loading.value = false
    }
  }

  const addItem = (item: string) => {
    items.value.push(item)
  }

  return {
    items,
    loading,
    itemCount,
    fetchItems,
    addItem
  }
})
```

### 路由配置

```typescript
// src/router/routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: 'cron',
        name: 'Cron',
        component: () => import('@/views/cron/CronPage.vue')
      }
    ]
  }
]
```

### 状态管理最佳实践

1. **按功能划分 Store**: 每个主要功能模块独立 Store
2. **使用 Computed**: 派生状态使用 computed
3. **Action 异步处理**: 异步操作封装在 action 中
4. **类型安全**: 使用 TypeScript 定义类型

---

## 后端开发

### 路由开发

#### 路由模板

```javascript
// server/routes/cron.js
import express from 'express'
import { authenticate } from '../middleware/auth.js'
import * as cronService from '../services/cronService.js'

const router = express.Router()

// 获取所有任务
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const result = await cronService.getTasks({ status, page, limit })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 创建任务
router.post('/tasks', authenticate, async (req, res) => {
  try {
    const task = await cronService.createTask(req.body)
    res.status(201).json({ success: true, data: task })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

export default router
```

### 服务层开发

```javascript
// server/services/cronService.js
import db from '../database.js'

export async function getTasks({ status, page, limit }) {
  const offset = (page - 1) * limit
  
  let query = 'SELECT * FROM cron_tasks'
  let countQuery = 'SELECT COUNT(*) as total FROM cron_tasks'
  
  if (status && status !== 'all') {
    query += ' WHERE status = ?'
    countQuery += ' WHERE status = ?'
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  
  const [tasks] = await db.query(query, status && status !== 'all' ? [status, limit, offset] : [limit, offset])
  const [countResult] = await db.query(countQuery, status && status !== 'all' ? [status] : [])
  
  return {
    tasks,
    total: countResult.total,
    page: parseInt(page),
    limit: parseInt(limit)
  }
}

export async function createTask(data) {
  const { name, description, cron_expression, command } = data
  
  const result = await db.query(
    'INSERT INTO cron_tasks (name, description, cron_expression, command, status) VALUES (?, ?, ?, ?, ?)',
    [name, description, cron_expression, command, 'enabled']
  )
  
  return {
    id: result.lastInsertRowid,
    name,
    description,
    cron_expression,
    command,
    status: 'enabled',
    created_at: new Date().toISOString()
  }
}
```

### 中间件开发

```javascript
// server/middleware/auth.js
import jwt from 'jsonwebtoken'

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    next()
  }
}
```

---

## 数据库设计

### 数据表结构

#### cron_tasks 表

```sql
CREATE TABLE cron_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT DEFAULT 'enabled',
  template_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_executed_at DATETIME,
  next_executed_at DATETIME
)
```

#### cron_executions 表

```sql
CREATE TABLE cron_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,
  output TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (task_id) REFERENCES cron_tasks(id)
)
```

#### users 表

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'readonly',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  is_active INTEGER DEFAULT 1
)
```

### 数据库操作

```javascript
// server/database.js
import Database from 'better-sqlite3'

const db = new Database('./data/app.db')

// 启用外键
db.pragma('foreign_keys = ON')

// 查询
export function query(sql, params = []) {
  return db.prepare(sql).all(...params)
}

// 单条查询
export function get(sql, params = []) {
  return db.prepare(sql).get(...params)
}

// 插入
export function insert(sql, params = []) {
  const result = db.prepare(sql).run(...params)
  return {
    lastInsertRowid: result.lastInsertRowid,
    changes: result.changes
  }
}

// 事务
export function transaction(fn) {
  return db.transaction(fn)
}

export default db
```

---

## API 开发规范

### 响应格式

所有 API 响应遵循统一格式：

```json
// 成功响应
{
  "success": true,
  "data": {
    // 数据内容
  },
  "message": "操作成功"
}

// 失败响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 错误码规范

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 请求验证

```javascript
// server/utils/validation.js
export function validateTaskData(data) {
  const errors = []
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('任务名称不能为空')
  }
  
  if (!data.cron_expression) {
    errors.push('Cron 表达式不能为空')
  }
  
  if (!data.command || data.command.trim().length === 0) {
    errors.push('执行命令不能为空')
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '))
  }
}
```

---

## 测试指南

### 单元测试

```typescript
// tests/unit/cron.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as cronService from '../../server/services/cronService.js'

describe('Cron Service', () => {
  beforeEach(() => {
    // 清理测试数据
  })

  it('should create a new task', async () => {
    const taskData = {
      name: 'Test Task',
      cron_expression: '* * * * *',
      command: 'echo hello'
    }
    
    const task = await cronService.createTask(taskData)
    
    expect(task).toHaveProperty('id')
    expect(task.name).toBe('Test Task')
    expect(task.status).toBe('enabled')
  })

  it('should get tasks with pagination', async () => {
    const result = await cronService.getTasks({ page: 1, limit: 10 })
    
    expect(result).toHaveProperty('tasks')
    expect(result).toHaveProperty('total')
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
  })
})
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

---

## 代码规范

### TypeScript 规范

```typescript
// ✅ 推荐
interface User {
  id: number
  name: string
  email?: string  // 可选属性
}

const users: User[] = []

// ❌ 避免
let users = []
const user = { id: 1, name: 'test' }  // 隐式 any
```

### Vue 组件规范

```vue
<!-- ✅ 推荐 -->
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
}

const props = defineProps<Props>()
</script>

<!-- ❌ 避免 -->
<script>
export default {
  props: ['title']
}
</script>
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `Dashboard.vue` |
| 路由页面 | \*Page.vue | `CronPage.vue` |
| Store | camelCase | `session.ts` |
| Composable | use\* | `useTheme.ts` |
| 事件 | kebab-case | `@update-count` |
| 变量/函数 | camelCase | `fetchTasks` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

---

## 调试技巧

### 前端调试

```typescript
// 使用 Vue DevTools
// 1. 安装 Vue DevTools 浏览器扩展
// 2. 查看组件树、状态、事件

// 开发环境日志
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
}
```

### 后端调试

```javascript
// 开发环境日志
const debug = process.env.NODE_ENV === 'development'

if (debug) {
  console.log('Request body:', req.body)
  console.log('Query result:', result)
}

// 错误堆栈
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, error: 'Internal error' })
})
```

### WebSocket 调试

```javascript
// 启用 WebSocket 日志
ws.on('message', (message) => {
  console.log('Received:', message.toString())
})

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
})
```

---

## 附录

### 常用命令

```bash
# 开发
npm run dev          # 前端
npm run dev:server   # 后端
npm run dev:all      # 前后端同时

# 构建
npm run build        # 生产构建
npm run preview      # 预览构建结果

# 测试
npm test             # 运行测试
npm run test:watch   # 监听模式

# 代码质量
npm run lint         # 代码检查
```

### 开发资源

- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Naive UI 文档](https://www.naiveui.com/)
- [Express 文档](https://expressjs.com/)
- [Vite 文档](https://vitejs.dev/)

---

**文档维护**: 技术文档工程师  
**联系方式**: 飞书群 "开发团队"  
**更新时间**: 2026-04-11
