# OpenClaw-Admin 技术架构设计方案

> 文档版本：v1.0
> 作者：系统架构师
> 日期：2026-04-10
> 基于产品需求分析：PRODUCT_ANALYSIS.md (2026-04-09)

---

## 一、需求规格审查

### 1.1 本次设计覆盖范围（P0）

| 需求编号 | 需求名称 | 优先级 |
|---------|---------|--------|
| R-01 | 多用户 + RBAC 权限体系 | P0 |
| R-02 | 通知中心 + 告警渠道 | P0 |
| R-03 | 完善 Office 智能体工坊 | P0 |
| R-04 | 完善 MyWorld 虚拟公司 | P0 |

### 1.2 现有能力盘点

| 模块 | 当前状态 | 架构基础 |
|-----|---------|---------|
| 认证 Auth | 基础单用户密码 + Session | ✅ Express Session + bcrypt |
| RBAC | 前端 store 已实现，后端未集成 | ⚠️ schema 存在，未联通 |
| 审计日志 | SQL schema 存在 | ⚠️ 需要后端完整实现 |
| 通知中心 | 前端 store 已实现 | ⚠️ 仅有前端 UI，需后端推送 |
| Office | 前端 store + 页面，server/office.js | ⚠️ 路由已注册，需完善 |
| MyWorld | 前端 store + 页面，server/myworld.js | ⚠️ 路由已注册，需完善 |
| 数据库 | better-sqlite3（SQLite） | ⚠️ 迁移脚本用了 MySQL 语法 |

### 1.3 关键约束

1. **单数据库**：继续使用 `better-sqlite3`（SQLite），不得引入 MySQL 依赖
2. **向后兼容**：现有 WebSocket RPC 协议不变，新增 API 走 RESTful HTTP
3. **增量开发**：已实现功能不可破坏，最小闭环优先
4. **安全默认**：凭证永不明文，所有 API 需要鉴权

---

## 二、系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Vue 3)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │ Login   │ │Dashboard│ │ Office │ │MyWorld │ │ Settings│     │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘     │
│       │           │           │           │           │          │
│  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐   │
│  │                    Pinia Stores                          │   │
│  │  authStore | rbacStore | notificationStore | officeStore │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │ HTTP + WebSocket                   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    Express Backend (Node.js)                     │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │                   REST API Routes                         │   │
│  │  /api/auth/*  /api/users/*  /api/rbac/*  /api/notifs/*  │   │
│  │  /api/office/*  /api/myworld/*  /api/audit/*           │   │
│  └────┬──────────────┬──────────────┬──────────────┬────────┘   │
│       │              │              │              │            │
│  ┌────┴──────────────┴──────────────┴──────────────┴────────┐   │
│  │                  Service Layer                          │   │
│  │  AuthService | UserService | RBACService | NotifyService │   │
│  │  OfficeService | MyWorldService | AuditService           │   │
│  └────┬──────────────┬──────────────┬──────────────┬────────┘   │
│       │              │              │              │            │
│  ┌────┴──────────────┴──────────────┴──────────────┴────────┐   │
│  │               better-sqlite3 (SQLite)                    │   │
│  │  wizard.db  [users, roles, permissions, audit_logs]       │   │
│  │             [office_agents, office_scenes, office_tasks]  │   │
│  │             [myworld_companies, myworld_members]         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           WebSocket ↔ OpenClaw Gateway                    │  │
│  │  现有 RPC 协议不变：sessions.*, agents.*, channels.* 等    │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、数据库设计（SQLite）

> 修复 002_office_myworld.sql 的 MySQL 语法，改为 SQLite 兼容

### 3.1 现有表（已有 schema）

```sql
-- users（已存在）
CREATE TABLE IF NOT EXISTS users (
    id            TEXT    PRIMARY KEY,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    display_name  TEXT,
    role          TEXT    DEFAULT 'viewer',
    status        TEXT    DEFAULT 'active',
    email         TEXT,
    avatar        TEXT,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    last_login_at INTEGER
);

-- audit_logs（已存在）
CREATE TABLE IF NOT EXISTS audit_logs (
    id             TEXT    PRIMARY KEY,
    user_id        TEXT,
    username       TEXT,
    action         TEXT    NOT NULL,
    resource       TEXT,
    resource_id    TEXT,
    details        TEXT    DEFAULT '{}',
    ip_address     TEXT,
    user_agent     TEXT,
    status         TEXT    DEFAULT 'success',
    error_message  TEXT,
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

### 3.2 新增表（Office 智能体工坊）

```sql
-- office_scenes：协作场景
CREATE TABLE IF NOT EXISTS office_scenes (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    description   TEXT,
    config        TEXT    DEFAULT '{}',  -- JSON
    status        TEXT    DEFAULT 'draft',  -- draft | active | paused | completed
    created_by    TEXT    NOT NULL,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- office_agents：场景内的 Agent 配置
CREATE TABLE IF NOT EXISTS office_agents (
    id            TEXT    PRIMARY KEY,
    scene_id      TEXT    NOT NULL,
    agent_id      TEXT    NOT NULL,       -- 关联 OpenClaw Agent ID
    agent_name    TEXT    NOT NULL,
    agent_role    TEXT    DEFAULT 'worker',  -- coordinator | worker | reviewer
    config        TEXT    DEFAULT '{}',  -- JSON: 系统提示词补充、工具权限等
    status        TEXT    DEFAULT 'idle',  -- idle | busy | offline
    sort_order    INTEGER DEFAULT 0,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (scene_id) REFERENCES office_scenes(id) ON DELETE CASCADE
);

-- office_tasks：委派任务
CREATE TABLE IF NOT EXISTS office_tasks (
    id            TEXT    PRIMARY KEY,
    scene_id      TEXT    NOT NULL,
    title         TEXT    NOT NULL,
    description   TEXT,
    status        TEXT    DEFAULT 'pending',  -- pending | assigned | in_progress | completed | failed
    priority      TEXT    DEFAULT 'normal',  -- low | normal | high | urgent
    assigned_to   TEXT,                       -- office_agents.id
    created_by    TEXT    NOT NULL,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    completed_at  INTEGER,
    result        TEXT    DEFAULT '{}',
    FOREIGN KEY (scene_id) REFERENCES office_scenes(id) ON DELETE CASCADE
);

-- office_messages：Agent 间消息传递
CREATE TABLE IF NOT EXISTS office_messages (
    id            TEXT    PRIMARY KEY,
    scene_id      TEXT    NOT NULL,
    task_id       TEXT,
    from_agent    TEXT    NOT NULL,  -- office_agents.id
    to_agent      TEXT,              -- office_agents.id，null 表示广播
    content       TEXT    NOT NULL,
    type          TEXT    DEFAULT 'text',  -- text | command | result | error
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (scene_id) REFERENCES office_scenes(id) ON DELETE CASCADE
);
```

### 3.3 新增表（MyWorld 虚拟公司）

```sql
-- myworld_companies：虚拟公司
CREATE TABLE IF NOT EXISTS myworld_companies (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    description   TEXT,
    settings      TEXT    DEFAULT '{}',  -- JSON: 背景、区域配置等
    owner_id      TEXT    NOT NULL,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- myworld_members：成员
CREATE TABLE IF NOT EXISTS myworld_members (
    id            TEXT    PRIMARY KEY,
    company_id    TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    display_name  TEXT    NOT NULL,
    avatar_url    TEXT,
    role          TEXT    DEFAULT 'member',  -- owner | manager | member
    position      TEXT    DEFAULT '{}',  -- JSON: {area: 'reception', desk: 'A1'}
    status        TEXT    DEFAULT 'online',  -- online | away | offline
    last_active   INTEGER,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (company_id) REFERENCES myworld_companies(id) ON DELETE CASCADE
);

-- myworld_areas：公司区域
CREATE TABLE IF NOT EXISTS myworld_areas (
    id            TEXT    PRIMARY KEY,
    company_id    TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    type          TEXT    NOT NULL,  -- meeting_room | office | lounge | reception
    position      TEXT    DEFAULT '{}',  -- JSON: {x, y, width, height}
    config        TEXT    DEFAULT '{}',
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (company_id) REFERENCES myworld_companies(id) ON DELETE CASCADE
);
```

### 3.4 新增表（通知与告警）

```sql
-- notifications：通知持久化
CREATE TABLE IF NOT EXISTS notifications (
    id            TEXT    PRIMARY KEY,
    user_id       TEXT    NOT NULL,
    title         TEXT    NOT NULL,
    message       TEXT,
    level         TEXT    DEFAULT 'info',  -- info | warning | error | success
    source        TEXT,  -- system | cron | agent | billing
    link          TEXT,
    is_read       INTEGER DEFAULT 0,
    is_persistent INTEGER DEFAULT 0,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- alert_channels：告警渠道配置
CREATE TABLE IF NOT EXISTS alert_channels (
    id            TEXT    PRIMARY KEY,
    user_id       TEXT    NOT NULL,
    channel_type  TEXT    NOT NULL,  -- feishu | dingtalk | email | webhook
    name          TEXT    NOT NULL,
    config        TEXT    NOT NULL,  -- JSON: webhook_url / email / token 等
    enabled       INTEGER DEFAULT 1,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- alert_rules：告警规则
CREATE TABLE IF NOT EXISTS alert_rules (
    id            TEXT    PRIMARY KEY,
    user_id       TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    event_type     TEXT    NOT NULL,  -- gateway_disconnect | cron_failed | agent_crash | token_threshold
    condition     TEXT    NOT NULL,  -- JSON: {threshold: 80, period: 'month'}
    channel_ids   TEXT    DEFAULT '[]',  -- JSON array of alert_channels.id
    enabled       INTEGER DEFAULT 1,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

---

## 四、API 接口设计

### 4.1 认证相关 `/api/auth/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| POST | `/api/auth/login` | 登录 | 否 |
| POST | `/api/auth/logout` | 登出 | 是 |
| GET | `/api/auth/me` | 当前用户信息 | 是 |
| POST | `/api/auth/change-password` | 修改密码 | 是 |

```typescript
// POST /api/auth/login
Request:  { username: string, password: string }
Response: { token: string, user: { id, username, display_name, role, avatar } }

// GET /api/auth/me
Response: { id, username, display_name, role, email, avatar, created_at }
```

### 4.2 用户管理 `/api/users/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/users` | 用户列表 | admin |
| POST | `/api/users` | 创建用户 | admin |
| GET | `/api/users/:id` | 用户详情 | admin |
| PATCH | `/api/users/:id` | 更新用户 | admin |
| DELETE | `/api/users/:id` | 删除用户 | admin |

```typescript
// POST /api/users
Request:  { username: string, password: string, display_name?: string, role: 'admin'|'operator'|'viewer' }
Response: { id, username, display_name, role, status, created_at }

// PATCH /api/users/:id
Request:  Partial<{ display_name, role, status, email }>
```

### 4.3 RBAC `/api/rbac/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/rbac/permissions` | 所有权限列表 | 登录 |
| GET | `/api/rbac/roles` | 角色列表 | admin |
| POST | `/api/rbac/roles` | 创建角色 | admin |
| GET | `/api/rbac/roles/:id` | 角色详情（含权限） | admin |
| PUT | `/api/rbac/roles/:id/permissions` | 分配权限 | admin |

### 4.4 通知中心 `/api/notifications/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/notifications` | 通知列表 | 登录 |
| POST | `/api/notifications/mark-read` | 标记已读 | 登录 |
| POST | `/api/notifications/mark-all-read` | 全部已读 | 登录 |
| DELETE | `/api/notifications/:id` | 删除通知 | 登录 |

### 4.5 告警渠道 `/api/alert-channels/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/alert-channels` | 渠道列表 | admin |
| POST | `/api/alert-channels` | 创建渠道 | admin |
| PATCH | `/api/alert-channels/:id` | 更新渠道 | admin |
| DELETE | `/api/alert-channels/:id` | 删除渠道 | admin |
| POST | `/api/alert-channels/:id/test` | 测试发送 | admin |

### 4.6 审计日志 `/api/audit/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/audit` | 日志列表 | admin |
| GET | `/api/audit/export` | 导出 CSV | admin |

```typescript
// GET /api/audit?page=1&limit=20&user_id=&action=&start_time=&end_time=
Response: {
  items: AuditLog[],
  total: number,
  page: number,
  limit: number
}
```

### 4.7 Office `/api/office/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/office/scenes` | 场景列表 | 登录 |
| POST | `/api/office/scenes` | 创建场景 | operator+ |
| GET | `/api/office/scenes/:id` | 场景详情 | 登录 |
| PATCH | `/api/office/scenes/:id` | 更新场景 | operator+ |
| DELETE | `/api/office/scenes/:id` | 删除场景 | admin |
| POST | `/api/office/scenes/:id/tasks` | 创建任务 | operator+ |
| POST | `/api/office/scenes/:id/execute` | 触发场景执行 | operator+ |
| GET | `/api/office/scenes/:id/messages` | 消息历史 | 登录 |

### 4.8 MyWorld `/api/myworld/*`

| Method | Path | 说明 | 鉴权 |
|-------|------|-----|------|
| GET | `/api/myworld/companies` | 公司列表 | 登录 |
| POST | `/api/myworld/companies` | 创建公司 | admin |
| GET | `/api/myworld/companies/:id` | 公司详情 | 登录 |
| PATCH | `/api/myworld/companies/:id` | 更新公司 | admin |
| GET | `/api/myworld/companies/:id/members` | 成员列表 | 登录 |
| POST | `/api/myworld/companies/:id/join` | 加入公司 | 登录 |
| PATCH | `/api/myworld/members/:id/position` | 更新位置 | 登录 |

---

## 五、前端组件结构

### 5.1 新增页面

```
src/views/
├── office/
│   └── OfficePage.vue          # 已有，需要完善
├── myworld/
│   └── MyWorldPage.vue         # 已有，需要完善
├── users/
│   ├── UsersPage.vue           # 用户管理页面
│   └── UserDialog.vue          # 用户新增/编辑弹窗
├── rbac/
│   ├── RolesPage.vue           # 角色管理页面
│   └── PermissionsPage.vue    # 权限配置页面
├── audit/
│   └── AuditPage.vue          # 审计日志页面
├── alerts/
│   ├── AlertChannelsPage.vue   # 告警渠道管理
│   └── AlertRulesPage.vue      # 告警规则配置
└── notifications/
    └── NotificationsPage.vue   # 通知中心页面
```

### 5.2 新增 Store

| Store | 文件 | 职责 |
|-------|------|-----|
| useUserStore | user.ts | 用户 CRUD 状态 |
| useRbacStore | rbac.ts | 已存在，补充后端联动 |
| useAuditStore | audit.ts | 审计日志查询状态 |
| useAlertChannelStore | alert-channel.ts | 告警渠道管理 |
| useOfficeSceneStore | office-scene.ts | 场景管理（补充） |

### 5.3 通用组件

```
src/components/
├── common/
│   ├── DataTable.vue           # 通用数据表格（分页/筛选/排序）
│   ├── ConfirmDialog.vue        # 确认对话框（敏感操作二次确认）
│   ├── RoleTag.vue              # 角色标签展示
│   ├── NotificationBell.vue     # 通知铃铛（下拉列表）
│   └── PermissionGuard.vue      # 权限守卫组件（v-if 替代）
```

### 5.4 路由守卫（Router Middleware）

```typescript
// src/router/guards.ts
// 1. 鉴权守卫：未登录 → Login
// 2. 权限守卫：用户角色 → 页面所需权限，无权限 → 403 或首页
// 3. 操作守卫：危险操作（删除/重置）→ ConfirmDialog 确认
```

### 5.5 WebSocket 事件集成

```typescript
// 通知推送：后端通过 WebSocket 推送通知事件
// 前端监听 'notification' 事件，自动 add 到 notificationStore

// office 执行状态：通过 WebSocket 推送 task 状态变更
// myworld 成员位置：通过 WebSocket 推送 member 位置更新
```

---

## 六、技术栈与实现要点

### 6.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 前端框架 | Vue 3 | ^3.5 | Composition API + `<script setup>` |
| 状态管理 | Pinia | ^3.0 | 现有 store 体系不变 |
| UI 库 | Naive UI | ^2.43 | 现有组件复用 |
| 构建工具 | Vite | ^7.3 | 现有配置不变 |
| 后端框架 | Express | ^5.2 | 现有 index.js 扩展 |
| 数据库 | better-sqlite3 | ^12.6 | 现有 wizard.db |
| 认证 | bcrypt + JWT | -- | Session + Token 双模式 |
| 实时通信 | WebSocket | ws ^8 | 复用现有 gateway.js |

### 6.2 认证实现要点

**Session + Token 双轨认证**：
- Web 管理端使用 Session Cookie（现有机制）
- API Token 用于程序化调用（/api/*）
- JWT 作为 Session 的载体，过期时间 24h

**密码安全**：
- bcrypt 哈希（cost factor 12）
- 登录失败锁定：5 次失败后锁定 15 分钟
- 审计日志记录所有登录事件

### 6.3 RBAC 实现要点

**权限模型**：
```
User (N:M) Role (N:M) Permission
```
- 内置 3 个角色：admin / operator / viewer
- 权限粒度：resource + action（如 `agents:manage`）
- 路由级别守卫 + 组件级别 v-if 双保险

**数据库权限检查**（server/auth.js 扩展）：
```javascript
// 每次 API 请求前检查
async function requirePermission(resource, action) {
  // 1. 从 session 获取 user_id
  // 2. 查询 users 表获取 role
  // 3. 查询 roles → role_permissions → permissions
  // 4. 匹配 resource + action
  // 5. 不匹配返回 403
}
```

### 6.4 通知中心实现要点

**推送通道**：
1. WebSocket 实时推送（主要，Web 端）
2. Webhook 转发（通用，支持用户自建路由）
3. 飞书/钉钉/邮件（第一期先做 Webhook，用户自行转发）

**告警规则引擎**（简化版）：
- 规则存储在 `alert_rules` 表
- 事件类型固定：gateway_disconnect / cron_failed / agent_crash / token_threshold
- 后端在相关事件触发时，查询 alert_rules 匹配并发送

### 6.5 Office 智能体工坊实现要点

**最小闭环流程**：
1. 创建场景（scene）→ 配置参与 Agent
2. 创建任务（task）→ 指定负责 Agent
3. 触发执行 → 通过 RPC 调用 OpenClaw Agent
4. 消息记录 → Agent 间消息通过 office_messages 存储
5. 结果汇总 → 任务完成状态 + 结果 JSON

**RPC 编排**：
```javascript
// 场景执行时，通过 sessions.spawn 创建子会话
// 各 Agent 通过 sessions.send 传递任务
// 主控 Agent 负责任务分发和结果汇总
```

### 6.6 MyWorld 实现要点

**核心交互**：
- 用户加入公司 → 生成 myworld_members 记录
- 位置移动 → PATCH /api/myworld/members/:id/position
- WebSocket 广播 → 成员位置变更推送给同公司其他人
- 区域交互 → 点击区域触发对应功能（会议/聊天）

**状态同步**：
- 成员在线状态：WebSocket 心跳（30s 超时判定离线）
- 位置更新：防抖 500ms，避免过于频繁的数据库写入

---

## 七、数据流与关键流程

### 7.1 登录流程

```
用户输入用户名/密码
  → POST /api/auth/login
  → 后端验证密码 (bcrypt)
  → 创建 Session + JWT Token
  → 写入 audit_logs (login)
  → 返回 { token, user }
  → 前端存储 token，跳转 Dashboard
  → 同时加载 rbacStore.currentUser
```

### 7.2 敏感操作审计流程

```
用户点击「删除 Agent」
  → ConfirmDialog 二次确认
  → 前端 POST /api/agents/:id (soft delete)
  → 后端 requirePermission('agents', 'delete')
  → 写入 audit_logs (agent.delete, details={旧值})
  → 执行删除操作
  → 返回 success
  → 前端刷新列表
```

### 7.3 Office 场景执行流程

```
用户在 Office 页面点击「执行场景」
  → POST /api/office/scenes/:id/execute
  → 后端加载场景配置 (office_agents)
  → 遍历 agents，通过 RPC sessions.spawn 创建子会话
  → 循环调用 sessions.send 传递任务内容
  → Agent 回复 → 写入 office_messages
  → 任务状态更新 → office_tasks
  → WebSocket 推送执行进度
  → 主控 Agent 汇总结果 → 场景状态 → completed
```

### 7.4 告警触发流程

```
OpenClaw Gateway 断开连接 (WebSocket close 事件)
  → server/index.js 捕获
  → 查询 alert_rules WHERE event_type = 'gateway_disconnect' AND enabled = 1
  → 遍历匹配规则
    → 查 alert_channels 获取投递地址
    → 发送 Webhook POST (或飞书/钉钉/邮件)
    → 写入 notifications 表
  → WebSocket 推送 'notification' 事件到前端
  → 前端 notificationStore.add() → 铃铛红点
```

---

## 八、安全设计

### 8.1 认证与鉴权

- 所有 `/api/*` 接口需要有效 Session 或 Token
- 密码使用 bcrypt（cost=12）存储，永不明文
- Session Token 存储在 HttpOnly Cookie，防止 XSS
- CORS 仅允许配置的域名

### 8.2 审计全覆盖

所有写操作（POST/PUT/PATCH/DELETE）均写入 audit_logs：
- 记录：user_id, action, resource, resource_id, details(JSON), ip, status
- details 包含变更前后的值（用于回溯）
- 日志保留 90 天

### 8.3 凭证安全

- API Key / Token 在数据库中加密存储（AES-256-GCM）
- 前端仅显示掩码（`sk-****xxxx`）
- 新值提交时后端解密验证，不回显原值

### 8.4 SQL 注入防护

- 所有用户输入参数使用参数化查询（better-sqlite3 的 `db.prepare()` + `?`）
- 禁止拼接 SQL 字符串

---

## 九、文件结构

```
server/
├── index.js              # 扩展：注册新路由、中间件
├── auth.js               # 扩展：权限检查中间件
├── database.js           # 扩展：审计日志写入
├── notifications.js      # 扩展：告警规则引擎
├── office.js             # 扩展：场景执行编排
├── myworld.js            # 扩展：成员状态同步
├── routes/
│   ├── auth.routes.js    # 认证路由
│   ├── user.routes.js    # 用户管理路由
│   ├── rbac.routes.js    # RBAC 路由
│   ├── notification.routes.js  # 通知路由
│   ├── alert.routes.js   # 告警路由
│   ├── audit.routes.js   # 审计路由
│   ├── office.routes.js  # Office 路由
│   └── myworld.routes.js # MyWorld 路由
├── middleware/
│   ├── requireAuth.js    # 认证中间件
│   ├── requirePermission.js  # 权限中间件
│   └── auditLog.js       # 审计中间件
└── services/
    ├── AlertService.js   # 告警规则引擎
    ├── OfficeService.js # Office 业务逻辑
    └── MyWorldService.js # MyWorld 业务逻辑
```

---

## 十、测试要点

### 10.1 单元测试覆盖

- RBAC 权限判断逻辑（admin / operator / viewer 各角色）
- 审计日志写入（验证 details JSON 完整性）
- 告警规则匹配（多个规则同时触发）

### 10.2 集成测试场景

- 登录 → Session 有效 → 访问受保护 API
- 无权限用户 → 访问 admin API → 403
- Office 场景创建 → 执行 → 消息记录完整
- 告警触发 → Webhook 发送 → 通知写入

### 10.3 手工测试清单

1. admin 用户：创建 operator 用户 → operator 登录 → 创建 Office 场景 → admin 删除
2. viewer 用户：登录 → 尝试删除 session → 操作被拦截
3. 审计日志：执行一系列操作 → 访问 /api/audit → 验证完整链路
4. Office 执行：创建含 2 个 Agent 的场景 → 触发执行 → 验证任务状态变化

---

## 十一、后续迭代建议

本设计仅覆盖 P0 需求。P1/P2 的技术决策：

| 需求 | 技术方案 |
|-----|---------|
| R-05 自定义时间范围 | ECharts 支持动态时间参数，API 增加 start_time/end_time 参数 |
| R-06 Cron 可视化编辑器 | 引入 cron-parser 库解析表达式 + cronstrue 生成人类可读描述 |
| R-07 批量操作 | API 支持 POST /api/sessions/batch-delete，body 传 id 数组 |
| R-08 模型配置测试 | POST /api/models/test → 后端调用 models.probe RPC |
| R-09 Webhook | 通用 webhook 投递（POST JSON），用户配置 URL + 签名密钥 |
| R-13 审计日志导出 | Streaming CSV 生成，避免大文件内存溢出 |

---

*文档版本：v1.0 | 状态：待评审*
