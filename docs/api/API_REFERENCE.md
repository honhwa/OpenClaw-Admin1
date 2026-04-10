# OpenClaw Admin API 参考文档

**版本**: v0.3.0  
**最后更新**: 2026-04-11  
**基础 URL**: `http://localhost:3000`

---

## 目录

1. [认证 API](#认证-api)
2. [Cron 任务管理 API](#cron-任务管理-api)
3. [WebSocket RPC 协议](#websocket-rpc-协议)
4. [设备身份 API](#设备身份-api)
5. [HTTP 客户端](#http-客户端)

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

---

## Cron 任务管理 API

### 获取所有任务

**GET** `/api/cron/tasks`

获取所有 cron 任务列表。

**查询参数**:
- `status` (可选): `enabled` | `disabled` | `all`
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

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

---

## 模板管理 API

### 获取所有模板

**GET** `/api/cron/templates`

获取所有 cron 模板（包括内置和自定义）。

**响应**:
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": 1,
        "name": "每分钟",
        "description": "每分钟执行一次",
        "cron_expression": "* * * * *",
        "command_template": "./script.sh",
        "is_builtin": true
      },
      {
        "id": 2,
        "name": "每小时",
        "description": "每小时执行一次",
        "cron_expression": "0 * * * *",
        "command_template": "./script.sh",
        "is_builtin": true
      }
    ]
  }
}
```

### 创建模板

**POST** `/api/cron/templates`

创建自定义模板。

**请求体**:
```json
{
  "name": "自定义模板",
  "description": "我的自定义 cron 模板",
  "cron_expression": "30 2 * * 1",
  "command_template": "./weekly-task.sh"
}
```

---

## 执行历史 API

### 获取任务执行历史

**GET** `/api/cron/tasks/:id/history`

获取指定任务的执行历史记录。

**查询参数**:
- `limit` (可选): 返回数量，默认 20
- `offset` (可选): 偏移量，默认 0
- `status` (可选): `success` | `failed` | `all`

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

### 清理执行历史

**DELETE** `/api/cron/history`

清理执行历史记录。

**请求体**:
```json
{
  "older_than": "2026-03-01T00:00:00Z",
  "task_id": 1
}
```

---

## WebSocket RPC 协议

### 连接

建立 WebSocket 连接到服务器。

**URL**: `ws://localhost:3000/ws`

**连接参数**:
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

### 发送 RPC 请求

**格式**:
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

### 接收 RPC 响应

**成功响应**:
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

**失败响应**:
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

**订阅事件**:
```json
{
  "type": "sub",
  "event": "session.created"
}
```

**接收事件**:
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

---

## 设备身份 API

### 设备身份管理

设备身份用于安全认证和设备指纹识别。

**设备身份结构**:
```typescript
interface DeviceIdentity {
  deviceId: string;      // SHA-256 公钥指纹
  publicKey: string;     // Base64Url 编码的公钥
  privateKey: string;    // Base64Url 编码的私钥
}
```

### 加载或创建设备身份

**客户端 API**:
```typescript
import { loadOrCreateDeviceIdentity } from './api/device-identity'

const identity = await loadOrCreateDeviceIdentity()
console.log(identity.deviceId)  // 设备 ID
```

### 签名设备 Payload

**客户端 API**:
```typescript
import { signDevicePayload } from './api/device-identity'

const payload = 'device-auth-payload'
const signature = await signDevicePayload(privateKey, payload)
```

---

## HTTP 客户端

### ApiClient 类

**文件**: `src/api/http-client.ts`

**功能**: 封装 HTTP 请求，支持自动重连、认证、超时处理。

**使用示例**:
```typescript
import { ApiClient } from './http-client'

const client = new ApiClient({
  baseUrl: 'http://localhost:3000',
  getToken: () => localStorage.getItem('auth-token'),
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
})

// 发送 RPC 请求
const result = await client.rpc('session.list', { limit: 20 })
```

### 事件监听

**可用事件**:
- `stateChange`: 连接状态变化
- `reconnecting`: 正在重连
- `connected`: 已连接
- `disconnected`: 已断开
- `error`: 发生错误
- `failed`: 重连失败

**使用示例**:
```typescript
client.on('stateChange', (state) => {
  console.log('Connection state:', state)
})

client.on('connected', () => {
  console.log('Connected to server')
})
```

---

## 错误码

| 错误码 | 描述 | HTTP 状态码 |
|--------|------|------------|
| `UNAUTHORIZED` | 未授权或 token 无效 | 401 |
| `FORBIDDEN` | 权限不足 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `VALIDATION_ERROR` | 参数验证失败 | 400 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

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

### 响应格式

所有 API 响应遵循统一格式:

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

失败响应:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```
