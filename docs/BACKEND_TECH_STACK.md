# 后端技术栈与架构设计

**版本**: 1.0.0  
**创建时间**: 2026-04-11  
**负责人**: 后端开发

---

## 1. 技术栈选型

### 1.1 核心框架
- **运行时**: Node.js v25.8.0
- **Web 框架**: Express.js v5.x
- **语言**: TypeScript 5.9.x

### 1.2 数据库
- **主数据库**: SQLite (better-sqlite3)
- **ORM**: 自定义轻量级 ORM
- **迁移工具**: 自定义迁移系统

### 1.3 认证授权
- **JWT**: @noble/ed25519 (Ed25519 签名)
- **密码哈希**: bcrypt (待集成)
- **会话管理**: 内存 + Redis (可选)

### 1.4 文件处理
- **上传**: multer
- **压缩**: archiver, tar
- **解压**: adm-zip, unzipper
- **PDF**: pdfjs-dist

### 1.5 终端模拟
- **PTY**: node-pty
- **终端**: @xterm/xterm + addons

### 1.6 实时通信
- **WebSocket**: ws

### 1.7 文档处理
- **Markdown**: markdown-it
- **代码高亮**: highlight.js
- **公式**: katex
- **HTML 净化**: dompurify

### 1.8 监控与日志
- **日志**: 自定义日志系统
- **监控**: 自定义健康检查

---

## 2. 项目架构

```
/www/wwwroot/ai-work/
├── server/                 # 后端代码
│   ├── index.js           # 入口文件
│   ├── auth.js            # 认证模块
│   ├── database.js        # 数据库模块
│   ├── gateway.js         # 网关模块
│   ├── notifications.js   # 通知模块
│   ├── office.js          # 办公集成
│   ├── myworld.js         # 我的世界集成
│   ├── automation-cron.js # 定时任务
│   └── routes/            # 路由定义
│
├── src/                   # 前端代码
│
├── config/                # 配置文件
│
├── db/                    # 数据库相关
│   ├── schema.sql         # 数据库 schema
│   └── migrations/        # 迁移文件
│
├── data/                  # 数据目录
│
├── logs/                  # 日志目录
│
└── scripts/               # 脚本工具
```

---

## 3. 目录结构规范

### 3.1 server/ 目录
```
server/
├── index.js              # 应用入口，初始化服务器
├── auth.js               # 认证授权逻辑
├── database.js           # 数据库连接与操作
├── gateway.js            # API 网关逻辑
├── routes/               # 路由定义
│   ├── index.js         # 路由聚合
│   ├── auth.js          # 认证路由
│   ├── users.js         # 用户路由
│   ├── projects.js      # 项目路由
│   └── files.js         # 文件路由
├── middleware/           # 中间件（待创建）
│   ├── auth.js          # 认证中间件
│   ├── rateLimit.js     # 限流中间件
│   └── errorHandler.js  # 错误处理中间件
├── services/             # 业务逻辑层（待创建）
│   ├── userService.js
│   ├── projectService.js
│   └── fileService.js
├── models/               # 数据模型（待创建）
│   ├── user.js
│   ├── project.js
│   └── file.js
└── utils/                # 工具函数（待创建）
    ├── logger.js
    ├── validator.js
    └── helper.js
```

---

## 4. 数据库设计

### 4.1 核心表结构

#### users 用户表
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  permissions TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
```

#### projects 项目表
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  tech_stack TEXT,
  status TEXT DEFAULT 'active',
  owner_id TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

#### tasks 任务表
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  assignee_id TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date INTEGER,
  completed_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);
```

#### files 文件表
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  path TEXT NOT NULL,
  uploader_id TEXT,
  created_at INTEGER,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);
```

#### audit_logs 审计日志表
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 5. 认证授权机制

### 5.1 JWT Token 结构
```javascript
{
  "header": {
    "alg": "EdDSA",
    "typ": "JWT"
  },
  "payload": {
    "userId": "user_id",
    "username": "username",
    "role": "role",
    "iat": 1712789200,
    "exp": 1712796400
  },
  "signature": "Ed25519 签名"
}
```

### 5.2 Token 生命周期
- **Access Token**: 2 小时过期
- **Refresh Token**: 7 天过期
- **Token 刷新**: 使用 refresh token 获取新的 access token

### 5.3 权限控制层级
1. **API 级别**: 路由级别的权限校验
2. **资源级别**: 数据级别的权限校验
3. **字段级别**: 敏感字段的数据脱敏

---

## 6. 安全策略

### 6.1 输入验证
- 所有输入参数必须验证
- 使用白名单机制
- SQL 注入防护（参数化查询）
- XSS 防护（HTML 净化）

### 6.2 输出编码
- JSON 响应自动转义
- 敏感数据脱敏
- 错误信息不泄露内部细节

### 6.3 速率限制
- IP 级别限流
- 用户级别限流
- API 级别限流

### 6.4 日志安全
- 不记录敏感信息（密码、token）
- 日志脱敏
- 审计日志完整记录

---

## 7. 部署配置

### 7.1 环境变量
```bash
# 服务器
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库
DB_PATH=./data/database.sqlite

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7200
JWT_REFRESH_EXPIRES_IN=604800

# 文件上传
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./data/uploads

# 日志
LOG_LEVEL=info
LOG_DIR=./logs
```

### 7.2 PM2 配置
```javascript
module.exports = {
  apps: [{
    name: 'openclaw-backend',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log'
  }]
};
```

---

## 8. 开发规范

### 8.1 代码规范
- 使用 ESLint + Prettier
- TypeScript 严格模式
- 函数式编程优先
- 不可变数据

### 8.2 错误处理
```javascript
// 统一错误格式
class AppError extends Error {
  constructor(code, message, data = null) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

// 错误处理中间件
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.code).json({
      code: err.code,
      message: err.message,
      data: err.data,
      timestamp: Date.now()
    });
  }
  // 未知错误
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    timestamp: Date.now()
  });
});
```

### 8.3 日志规范
```javascript
// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// 日志格式
// [TIMESTAMP] [LEVEL] [MODULE] MESSAGE
```

---

## 9. 性能优化

### 9.1 数据库优化
- 索引优化
- 查询缓存
- 连接池管理

### 9.2 API 优化
- 响应压缩
- 缓存控制
- 分页查询

### 9.3 文件优化
- 流式处理
- 分片上传
- CDN 加速（可选）

---

## 10. 监控与告警

### 10.1 健康检查
```
GET /health
GET /ready
```

### 10.2 监控指标
- CPU 使用率
- 内存使用率
- 磁盘使用率
- 请求延迟
- 错误率

### 10.3 告警策略
- CPU > 80% 持续 5 分钟
- 内存 > 90%
- 磁盘 > 85%
- 错误率 > 5%

---

**文档状态**: 初稿  
**下次更新**: 根据开发进展
