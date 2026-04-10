# OpenClaw Admin API 参考文档

**版本**: v0.3.0  
**最后更新**: 2026-04-11  
**基础 URL**: `http://localhost:3000`

---

## 目录

1. [认证 API](#认证-api)
2. [Cron 任务管理 API](#cron-任务管理-api)
3. [会话管理 API](#会话管理-api)
4. [模型管理 API](#模型管理-api)
5. [频道管理 API](#频道管理-api)
6. [记忆管理 API](#记忆管理-api)
7. [WebSocket RPC 协议](#websocket-rpc-协议)
8. [系统监控 API](#系统监控-api)
9. [错误码](#错误码)

---

## 认证 API

### 登录

**POST** `/api/auth/login`

用户登录并获取会话 token。

**请求体**:
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    },
    "expiresAt": "2026-04-12T02:07:00Z"
  }
}
```

### 登出

**POST** `/api/auth/logout`

用户登出，使当前 token 失效。

**响应**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 会话检查

**GET** `/api/auth/check`

验证当前会话是否有效。

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 修改密码

**POST** `/api/auth/change-password`

修改当前用户密码。

**请求体**:
```json
{
  "oldPassword": "old-password",
  "newPassword": "new-password"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Cron 任务管理 API

### 获取所有任务

**GET** `/api/cron/tasks`

获取所有 cron 任务列表。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | enabled/disabled/all |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "name": "每日健康检查",
        "description": "每天检查系统健康状态",
        "cron_expression": "0 8 * * *",
        "command": "./health-check.sh",
        "status": "enabled",
        "created_at": "2026-04-10T00:00:00Z",
        "updated_at": "2026-04-10T00:00:00Z",
        "last_executed_at": "2026-04-11T00:00:00Z",
        "next_executed_at": "2026-04-12T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### 创建任务

**POST** `/api/cron/tasks`

创建新的 cron 任务。

**请求体**:
```json
{
  "name": "每日备份",
  "description": "每天凌晨备份数据库",
  "cron_expression": "0 0 * * *",
  "command": "./backup.sh",
  "template_id": 3
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "每日备份",
    "description": "每天凌晨备份数据库",
    "cron_expression": "0 0 * * *",
    "command": "./backup.sh",
    "status": "enabled",
    "created_at": "2026-04-11T02:07:00Z"
  }
}
```

### 获取任务详情

**GET** `/api/cron/tasks/:id`

获取指定任务的详细信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "每日健康检查",
    "description": "每天检查系统健康状态",
    "cron_expression": "0 8 * * *",
    "command": "./health-check.sh",
    "status": "enabled",
    "created_at": "2026-04-10T00:00:00Z",
    "updated_at": "2026-04-10T00:00:00Z",
    "last_executed_at": "2026-04-11T00:00:00Z",
    "next_executed_at": "2026-04-12T00:00:00Z",
    "execution_count": 5,
    "success_count": 5,
    "failed_count": 0
  }
}
```

### 更新任务

**PUT** `/api/cron/tasks/:id`

更新任务信息。

**请求体**:
```json
{
  "name": "每小时健康检查",
  "cron_expression": "0 * * * *",
  "description": "每小时检查系统健康状态"
}
```

### 删除任务

**DELETE** `/api/cron/tasks/:id`

删除指定任务。

**响应**:
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

### 启用/禁用任务

**PATCH** `/api/cron/tasks/:id/toggle`

切换任务的启用/禁用状态。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "disabled"
  }
}
```

### 立即执行任务

**POST** `/api/cron/execute/:id`

立即执行指定任务（不等待 cron 时间）。

**响应**:
```json
{
  "success": true,
  "data": {
    "execution_id": 123,
    "status": "running",
    "started_at": "2026-04-11T02:07:00Z"
  }
}
```

### 获取执行历史

**GET** `/api/cron/tasks/:id/history`

获取指定任务的执行历史记录。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| limit | number | 返回数量，默认 20 |
| offset | number | 偏移量，默认 0 |
| status | string | success/failed/all |

**响应**:
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": 1,
        "task_id": 1,
        "executed_at": "2026-04-11T00:00:00Z",
        "status": "success",
        "output": "Health check passed\nCPU: 25%\nMemory: 60%\nDisk: 45%",
        "error_message": null,
        "duration_ms": 1250
      }
    ],
    "total": 10,
    "page": 1
  }
}
```

---

## 会话管理 API

### 获取会话列表

**GET** `/api/sessions`

获取所有会话列表。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| agent_id | string | 智能体 ID 筛选 |
| channel | string | 渠道筛选 |
| status | string | 状态筛选 |
| limit | number | 每页数量 |
| offset | number | 偏移量 |

### 获取会话详情

**GET** `/api/sessions/:id`

获取指定会话的详细信息。

### 创建会话

**POST** `/api/sessions`

创建新的会话。

**请求体**:
```json
{
  "agent_id": "agent-123",
  "model_id": "model-456",
  "initial_message": "你好"
}
```

### 重置会话

**POST** `/api/sessions/:id/reset`

重置会话上下文。

### 删除会话

**DELETE** `/api/sessions/:id`

删除指定会话。

---

## 模型管理 API

### 获取模型列表

**GET** `/api/models`

获取所有配置的模型。

**响应**:
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "model-123",
        "name": "qwen-plus",
        "provider": "aliyun",
        "type": "llm",
        "status": "enabled",
        "token_usage": 15000
      }
    ]
  }
}
```

### 添加模型

**POST** `/api/models`

添加新的模型配置。

### 更新模型

**PUT** `/api/models/:id`

更新模型配置。

### 删除模型

**DELETE** `/api/models/:id`

删除模型配置。

### 测试模型连接

**POST** `/api/models/:id/test`

测试模型 API 连接。

---

## 频道管理 API

### 获取频道状态

**GET** `/api/channels/status`

获取所有频道的状态。

**响应**:
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "id": "feishu-123",
        "type": "feishu",
        "status": "connected",
        "last_heartbeat": "2026-04-11T02:07:00Z"
      }
    ]
  }
}
```

### 配置频道

**POST** `/api/channels/config`

配置频道参数。

### 频道认证

**POST** `/api/channels/auth/:id`

执行频道认证。

### 频道配对

**POST** `/api/channels/pair/:id`

执行频道配对。

---

## 记忆管理 API

### 获取记忆文档列表

**GET** `/api/memory/docs`

获取智能体记忆文档列表。

**响应**:
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "name": "AGENTS.md",
        "path": "agents/agent-123/AGENTS.md",
        "size": 1024,
        "updated_at": "2026-04-11T02:00:00Z"
      }
    ]
  }
}
```

### 获取记忆文档内容

**GET** `/api/memory/docs/:agent_id/:filename`

获取指定文档内容。

### 更新记忆文档

**PUT** `/api/memory/docs/:agent_id/:filename`

更新文档内容。

**请求体**:
```json
{
  "content": "# 新的文档内容"
}
```

---

## WebSocket RPC 协议

### 连接

建立 WebSocket 连接到服务器。

**URL**: `ws://localhost:3000/ws`

**连接请求**:
```json
{
  "type": "connect",
  "minProtocol": 3,
  "maxProtocol": 3,
  "client": {
    "id": "web-client",
    "version": "0.3.0",
    "platform": "web",
    "mode": "ui"
  },
  "role": "operator",
  "scopes": ["operator.read", "operator.write"],
  "caps": ["tool-events"],
  "auth": {
    "token": "your-auth-token"
  }
}
```

### RPC 请求格式

```json
{
  "type": "req",
  "id": "req-123",
  "method": "session.list",
  "params": {
    "limit": 20
  }
}
```

### RPC 响应格式

**成功**:
```json
{
  "type": "res",
  "id": "req-123",
  "ok": true,
  "payload": {
    "sessions": [...]
  }
}
```

**失败**:
```json
{
  "type": "res",
  "id": "req-123",
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token"
  }
}
```

### 事件订阅

**订阅请求**:
```json
{
  "type": "sub",
  "event": "session.created"
}
```

**事件通知**:
```json
{
  "type": "event",
  "event": "session.created",
  "payload": {
    "session_id": "sess-123",
    "created_at": "2026-04-11T02:07:00Z"
  }
}
```

### 可用 RPC 方法

| 方法 | 说明 |
|------|------|
| `config.get` | 获取配置 |
| `config.patch` | 更新配置 |
| `sessions.list` | 列出会话 |
| `sessions.get` | 获取会话详情 |
| `sessions.reset` | 重置会话 |
| `sessions.delete` | 删除会话 |
| `sessions.spawn` | 创建会话 |
| `agents.list` | 列出智能体 |
| `agents.create` | 创建智能体 |
| `models.list` | 列出模型 |
| `cron.list` | 列出任务 |
| `cron.add` | 添加任务 |
| `cron.update` | 更新任务 |
| `cron.delete` | 删除任务 |
| `health` | 健康检查 |
| `status` | 状态查询 |

---

## 系统监控 API

### 健康检查

**GET** `/health`

系统健康检查端点。

**响应**:
```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "0.3.0",
  "timestamp": "2026-04-11T02:07:00Z"
}
```

### 系统状态

**GET** `/api/system/status`

获取系统运行状态。

**响应**:
```json
{
  "success": true,
  "data": {
    "cpu_usage": 25.5,
    "memory_usage": 60.2,
    "disk_usage": 45.8,
    "active_sessions": 10,
    "uptime": 3600
  }
}
```

---

## 错误码

| 错误码 | HTTP 状态码 | 描述 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未授权或 token 无效 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `GATEWAY_ERROR` | 502 | Gateway 连接错误 |
| `RATE_LIMITED` | 429 | 请求频率过高 |

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "详细的错误描述",
    "details": {}
  }
}
```

---

## 附录

### Cron 表达式参考

| 表达式 | 说明 |
|--------|------|
| `* * * * *` | 每分钟 |
| `0 * * * *` | 每小时 |
| `0 0 * * *` | 每天凌晨 0 点 |
| `0 8 * * *` | 每天早上 8 点 |
| `0 3 * * 0` | 每周日凌晨 3 点 |
| `0 9 1 * *` | 每月 1 号上午 9 点 |
| `*/5 * * * *` | 每 5 分钟 |
| `0 */2 * * *` | 每 2 小时 |

### 速率限制

| 接口 | 限制 |
|------|------|
| 登录 | 10 次/分钟 |
| API 调用 | 100 次/分钟 |
| WebSocket | 50 条/分钟 |

---

**文档维护**: 技术文档工程师  
**联系方式**: 飞书群 "开发团队"  
**更新时间**: 2026-04-11
