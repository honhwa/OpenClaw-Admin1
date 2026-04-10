# 后端 API 接口规范

**版本**: 1.0.0  
**创建时间**: 2026-04-11  
**负责人**: 后端开发

---

## 1. API 设计原则

### 1.1 RESTful 架构风格
- 使用 HTTP 方法表达操作语义（GET/POST/PUT/PATCH/DELETE）
- 资源命名使用复数名词，小写，连字符分隔
- 使用 HTTP 状态码表达结果
- 支持版本控制（/api/v1/...）

### 1.2 响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1712789200000
}
```

### 1.3 错误响应
```json
{
  "code": 4001,
  "message": "参数错误",
  "data": {
    "field": "username",
    "reason": "不能为空"
  },
  "timestamp": 1712789200000
}
```

---

## 2. 认证与授权

### 2.1 JWT Token 认证
- **登录接口**: `POST /api/v1/auth/login`
- **刷新 Token**: `POST /api/v1/auth/refresh`
- **登出**: `POST /api/v1/auth/logout`
- **Header**: `Authorization: Bearer <token>`

### 2.2 权限控制
- RBAC（基于角色的访问控制）
- 资源级权限控制
- API 级别权限校验

---

## 3. 核心 API 接口

### 3.1 用户管理

#### 3.1.1 用户登录
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "******"
}

Response:
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 7200,
    "user": {
      "id": "1",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

#### 3.1.2 获取当前用户信息
```
GET /api/v1/users/me
Authorization: Bearer <token>

Response:
{
  "code": 200,
  "data": {
    "id": "1",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "permissions": ["read", "write", "delete"]
  }
}
```

#### 3.1.3 用户列表
```
GET /api/v1/users?page=1&pageSize=20
Authorization: Bearer <token>

Response:
{
  "code": 200,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 3.1.4 创建用户
```
POST /api/v1/users
Authorization: Bearer <token>

{
  "username": "newuser",
  "password": "******",
  "email": "newuser@example.com",
  "role": "user"
}
```

#### 3.1.5 更新用户
```
PUT /api/v1/users/:id
Authorization: Bearer <token>

{
  "email": "updated@example.com",
  "role": "admin"
}
```

#### 3.1.6 删除用户
```
DELETE /api/v1/users/:id
Authorization: Bearer <token>
```

---

### 3.2 项目管理

#### 3.2.1 项目列表
```
GET /api/v1/projects?page=1&pageSize=20&status=active
Authorization: Bearer <token>
```

#### 3.2.2 创建项目
```
POST /api/v1/projects
Authorization: Bearer <token>

{
  "name": "新项目",
  "description": "项目描述",
  "type": "web",
  "techStack": ["nodejs", "vue"]
}
```

#### 3.2.3 项目详情
```
GET /api/v1/projects/:id
Authorization: Bearer <token>
```

#### 3.2.4 更新项目
```
PUT /api/v1/projects/:id
Authorization: Bearer <token>
```

#### 3.2.5 删除项目
```
DELETE /api/v1/projects/:id
Authorization: Bearer <token>
```

---

### 3.3 任务管理

#### 3.3.1 任务列表
```
GET /api/v1/tasks?projectId=1&status=pending&assignee=user1
Authorization: Bearer <token>
```

#### 3.3.2 创建任务
```
POST /api/v1/tasks
Authorization: Bearer <token>

{
  "title": "任务标题",
  "description": "任务描述",
  "projectId": "1",
  "assigneeId": "2",
  "priority": "high",
  "dueDate": "2026-04-20T00:00:00+08:00"
}
```

#### 3.3.3 更新任务状态
```
PATCH /api/v1/tasks/:id/status
Authorization: Bearer <token>

{
  "status": "completed",
  "completedAt": "2026-04-11T10:00:00+08:00"
}
```

---

### 3.4 文件管理

#### 3.4.1 上传文件
```
POST /api/v1/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

#### 3.4.2 下载文件
```
GET /api/v1/files/:id/download
Authorization: Bearer <token>
```

#### 3.4.3 删除文件
```
DELETE /api/v1/files/:id
Authorization: Bearer <token>
```

---

### 3.5 系统管理

#### 3.5.1 获取系统状态
```
GET /api/v1/system/status
Authorization: Bearer <token>

Response:
{
  "code": 200,
  "data": {
    "version": "0.2.7",
    "uptime": 86400,
    "diskUsage": {
      "total": 107374182400,
      "used": 21474836480,
      "free": 85899345920
    },
    "memoryUsage": {
      "total": 8589934592,
      "used": 4294967296,
      "free": 4294967296
    }
  }
}
```

#### 3.5.2 获取日志
```
GET /api/v1/system/logs?level=error&limit=100
Authorization: Bearer <token>
```

---

## 4. 分页规范

所有列表接口支持分页参数：
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20，最大 100）
- `sortBy`: 排序字段
- `sortOrder`: 排序方向（asc/desc）

---

## 5. 过滤器与搜索

支持查询参数过滤：
- `status`: 状态过滤
- `type`: 类型过滤
- `dateFrom`/`dateTo`: 时间范围
- `keyword`: 关键词搜索

---

## 6. 速率限制

- 默认限制：100 次/分钟/IP
- 认证用户：500 次/分钟/IP
- 超出限制返回 429 状态码

---

## 7. CORS 配置

允许的来源：
- 开发环境：http://localhost:5173
- 生产环境：配置的生产域名

允许的方法：GET, POST, PUT, PATCH, DELETE, OPTIONS
允许的头：Authorization, Content-Type, X-Requested-With

---

## 8. API 版本控制

- URL 路径版本：`/api/v1/...`
- 未来版本：`/api/v2/...`
- 废弃策略：保留至少 2 个版本

---

**文档状态**: 初稿  
**下次更新**: 根据开发进展
