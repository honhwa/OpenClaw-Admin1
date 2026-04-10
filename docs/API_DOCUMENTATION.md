# OpenClaw-Admin API 接口文档

**版本**: 1.0.0  
**最后更新**: 2026-04-11  
**基础路径**: `/api`

---

## 目录

1. [批量操作接口](#1-批量操作接口)
2. [搜索与筛选接口](#2-搜索与筛选接口)
3. [数据可视化接口](#3-数据可视化接口)
4. [权限管理接口](#4-权限管理接口)
5. [主题配置接口](#5-主题配置接口)

---

## 1. 批量操作接口

### 1.1 批量删除

**接口**: `DELETE /api/batch/:resource`

**描述**: 批量删除指定资源类型的多条记录

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| resource | string | 资源类型 (users/tasks/scenarios/audit-logs) |

**请求体**:
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

**响应**:
```json
{
  "success": true,
  "deleted_count": 3,
  "failed_ids": []
}
```

**权限要求**: `resource:delete` (如 `users:delete`, `tasks:delete`)

---

### 1.2 批量更新状态

**接口**: `PATCH /api/batch/:resource/status`

**描述**: 批量更新指定资源的状态

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| resource | string | 资源类型 |

**请求体**:
```json
{
  "ids": ["id1", "id2", "id3"],
  "status": "active"
}
```

**响应**:
```json
{
  "success": true,
  "updated_count": 3,
  "failed_ids": []
}
```

---

### 1.3 批量导出

**接口**: `POST /api/batch/:resource/export`

**描述**: 批量导出指定资源为 CSV/Excel 格式

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| resource | string | 资源类型 |

**请求体**:
```json
{
  "ids": ["id1", "id2", "id3"],
  "format": "csv",
  "fields": ["id", "name", "status", "created_at"]
}
```

**响应**:
```json
{
  "success": true,
  "file_url": "/api/downloads/export_20260411_123456.csv",
  "file_size": 1024
}
```

---

### 1.4 批量分配

**接口**: `PATCH /api/batch/:resource/assign`

**描述**: 批量分配资源给指定用户

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| resource | string | 资源类型 |

**请求体**:
```json
{
  "ids": ["id1", "id2", "id3"],
  "assignee_id": "user_123"
}
```

---

## 2. 搜索与筛选接口

### 2.1 全局搜索

**接口**: `GET /api/search/global`

**描述**: 跨资源类型全局搜索

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| q | string | 搜索关键词 |
| types | string | 资源类型列表 (逗号分隔) |
| page | number | 页码 (默认 1) |
| limit | number | 每页数量 (默认 20) |

**响应**:
```json
{
  "items": [
    {
      "type": "user",
      "id": "user_123",
      "title": "张三",
      "description": "用户名：zhangsan",
      "match_fields": ["display_name", "username"]
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

### 2.2 高级筛选

**接口**: `POST /api/:resource/filter`

**描述**: 对指定资源进行高级筛选

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| resource | string | 资源类型 |

**请求体**:
```json
{
  "filters": [
    {
      "field": "status",
      "operator": "in",
      "value": ["active", "pending"]
    },
    {
      "field": "created_at",
      "operator": "gte",
      "value": "2026-04-01T00:00:00Z"
    }
  ],
  "sort": [
    { "field": "created_at", "order": "desc" }
  ],
  "page": 1,
  "limit": 20
}
```

**支持的运算符**:
- `eq` - 等于
- `neq` - 不等于
- `gt` - 大于
- `gte` - 大于等于
- `lt` - 小于
- `lte` - 小于等于
- `in` - 包含在数组中
- `contains` - 包含字符串
- `like` - 模糊匹配

**响应**:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 2.3 搜索建议

**接口**: `GET /api/search/suggest`

**描述**: 获取搜索建议

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| q | string | 搜索关键词 |
| type | string | 资源类型 |
| limit | number | 建议数量 (默认 5) |

**响应**:
```json
{
  "suggestions": [
    "张三",
    "张四",
    "管理员"
  ]
}
```

---

## 3. 数据可视化接口

### 3.1 统计概览

**接口**: `GET /api/stats/overview`

**描述**: 获取系统统计概览

**响应**:
```json
{
  "total_users": 150,
  "active_users": 120,
  "total_tasks": 500,
  "pending_tasks": 50,
  "completed_tasks": 400,
  "total_scenarios": 30,
  "active_sessions": 5
}
```

---

### 3.2 用户统计

**接口**: `GET /api/stats/users`

**描述**: 获取用户相关统计

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| period | string | 统计周期 (day/week/month) |

**响应**:
```json
{
  "user_growth": [
    { "date": "2026-04-01", "count": 10 },
    { "date": "2026-04-02", "count": 15 }
  ],
  "role_distribution": [
    { "role": "admin", "count": 10 },
    { "role": "operator", "count": 30 },
    { "role": "viewer", "count": 110 }
  ],
  "status_distribution": [
    { "status": "active", "count": 120 },
    { "status": "inactive", "count": 20 },
    { "status": "suspended", "count": 10 }
  ]
}
```

---

### 3.3 任务统计

**接口**: `GET /api/stats/tasks`

**描述**: 获取任务相关统计

**响应**:
```json
{
  "task_status": [
    { "status": "pending", "count": 50 },
    { "status": "in_progress", "count": 100 },
    { "status": "completed", "count": 300 },
    { "status": "failed", "count": 50 }
  ],
  "task_priority": [
    { "priority": "high", "count": 100 },
    { "priority": "medium", "count": 250 },
    { "priority": "low", "count": 150 }
  ],
  "completion_rate": [
    { "date": "2026-04-01", "rate": 0.85 },
    { "date": "2026-04-02", "rate": 0.90 }
  ]
}
```

---

### 3.4 审计统计

**接口**: `GET /api/stats/audit`

**描述**: 获取审计日志统计

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| period | string | 统计周期 |
| group_by | string | 分组字段 (user/action/resource) |

**响应**:
```json
{
  "action_distribution": [
    { "action": "login", "count": 500 },
    { "action": "create", "count": 200 },
    { "action": "update", "count": 150 },
    { "action": "delete", "count": 50 }
  ],
  "user_activity": [
    { "user_id": "user_123", "username": "admin", "action_count": 100 },
    { "user_id": "user_456", "username": "operator", "action_count": 80 }
  ]
}
```

---

## 4. 权限管理接口

### 4.1 权限列表

**接口**: `GET /api/rbac/permissions`

**描述**: 获取所有权限列表

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| resource | string | 按资源过滤 |
| page | number | 页码 |
| limit | number | 每页数量 |

**响应**:
```json
{
  "items": [
    {
      "id": "perm_123",
      "resource": "users",
      "action": "manage",
      "description": "管理用户",
      "created_at": 1712774400000
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### 4.2 创建权限

**接口**: `POST /api/rbac/permissions`

**描述**: 创建新权限

**请求体**:
```json
{
  "resource": "reports",
  "action": "export",
  "description": "导出报表"
}
```

---

### 4.3 角色列表

**接口**: `GET /api/rbac/roles`

**描述**: 获取所有角色列表

**响应**:
```json
{
  "items": [
    {
      "id": "role_123",
      "name": "admin",
      "description": "系统管理员",
      "permissions": [...],
      "created_at": 1712774400000
    }
  ],
  "total": 5
}
```

---

### 4.4 创建角色

**接口**: `POST /api/rbac/roles`

**描述**: 创建新角色

**请求体**:
```json
{
  "name": "custom_role",
  "description": "自定义角色",
  "permission_ids": ["perm_123", "perm_456"]
}
```

---

### 4.5 更新角色权限

**接口**: `PUT /api/rbac/roles/:id/permissions`

**描述**: 更新角色的权限分配

**请求体**:
```json
{
  "permission_ids": ["perm_123", "perm_456", "perm_789"]
}
```

---

### 4.6 用户权限

**接口**: `GET /api/rbac/users/:id/permissions`

**描述**: 获取用户的所有权限（通过角色聚合）

**响应**:
```json
{
  "direct_permissions": [...],
  "inherited_permissions": [...],
  "all_permissions": [...]
}
```

---

### 4.7 权限检查

**接口**: `POST /api/rbac/check`

**描述**: 检查用户是否拥有指定权限

**请求体**:
```json
{
  "user_id": "user_123",
  "permission": "users:manage"
}
```

**响应**:
```json
{
  "has_permission": true
}
```

---

## 5. 主题配置接口

### 5.1 获取主题列表

**接口**: `GET /api/themes`

**描述**: 获取所有可用主题

**响应**:
```json
{
  "items": [
    {
      "id": "light",
      "name": "亮色主题",
      "type": "system",
      "preview_url": "/themes/light/preview.png"
    },
    {
      "id": "dark",
      "name": "暗色主题",
      "type": "system",
      "preview_url": "/themes/dark/preview.png"
    },
    {
      "id": "custom_1",
      "name": "自定义主题 1",
      "type": "custom",
      "preview_url": "/themes/custom/preview.png"
    }
  ]
}
```

---

### 5.2 获取主题详情

**接口**: `GET /api/themes/:id`

**描述**: 获取指定主题的详细配置

**响应**:
```json
{
  "id": "dark",
  "name": "暗色主题",
  "type": "system",
  "colors": {
    "primary": "#1890ff",
    "background": "#141414",
    "surface": "#1f1f1f",
    "text": "#ffffff",
    "textSecondary": "#bfbfbf"
  },
  "settings": {
    "borderRadius": 6,
    "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI'",
    "compactMode": false
  }
}
```

---

### 5.3 创建自定义主题

**接口**: `POST /api/themes/custom`

**描述**: 创建新的自定义主题

**请求体**:
```json
{
  "name": "我的主题",
  "colors": {
    "primary": "#52c41a",
    "background": "#000000",
    "surface": "#1a1a1a"
  },
  "settings": {
    "borderRadius": 8
  }
}
```

**响应**:
```json
{
  "id": "custom_abc123",
  "name": "我的主题",
  "created_at": 1712774400000
}
```

---

### 5.4 更新主题

**接口**: `PUT /api/themes/:id`

**描述**: 更新主题配置

**请求体**:
```json
{
  "name": "更新后的主题名",
  "colors": {
    "primary": "#722ed1"
  }
}
```

---

### 5.5 删除主题

**接口**: `DELETE /api/themes/:id`

**描述**: 删除自定义主题（系统主题不可删除）

---

### 5.6 用户主题偏好

**接口**: `GET /api/user/theme-preference`

**描述**: 获取当前用户的主题偏好

**响应**:
```json
{
  "current_theme": "dark",
  "auto_switch": true,
  "preferred_themes": ["dark", "custom_1"]
}
```

---

### 5.7 更新用户主题偏好

**接口**: `PUT /api/user/theme-preference`

**描述**: 更新用户的主题偏好

**请求体**:
```json
{
  "current_theme": "dark",
  "auto_switch": false
}
```

---

## 错误码说明

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 验证失败 |
| 500 | 服务器内部错误 |

---

## 认证说明

所有需要认证的接口都需要在请求头中携带 JWT Token:

```
Authorization: Bearer <token>
```

---

## 速率限制

- 普通请求：100 次/分钟
- 搜索请求：30 次/分钟
- 导出请求：10 次/分钟

超过限制将返回 `429 Too Many Requests`。
