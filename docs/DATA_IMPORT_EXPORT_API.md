# 数据导入导出功能 API 文档

## 概述

数据导入导出功能提供完整的数据备份、恢复能力，支持全量备份和增量导入。

## 导出 API

### 1. 完整数据导出

**端点**: `GET /api/export/full`

**权限**: 需要 `system:export` 权限

**请求示例**:
```bash
curl -X GET http://localhost:3001/api/export/full \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "export_id": "uuid",
    "file_name": "backup_1712812800000_abc123.zip",
    "file_size": 1024000,
    "download_url": "/api/export/file/backup_1712812800000_abc123.zip",
    "metadata": {
      "export_id": "uuid",
      "export_type": "full_backup",
      "timestamp": "2026-04-11T15:00:00.000Z",
      "version": "1.0",
      "tables": [
        { "name": "users", "record_count": 100 },
        { "name": "crons", "record_count": 50 }
      ],
      "total_tables": 12
    }
  }
}
```

### 2. 资源导出

**端点**: `GET /api/export/resource/:resourceType`

**参数**:
- `resourceType`: 资源类型 (users, tasks, scenarios, crons 等)
- `ids`: 可选，导出的记录 ID 列表，逗号分隔
- `fields`: 可选，导出的字段列表，逗号分隔
- `format`: 可选，导出格式 (json, csv)，默认 json

**请求示例**:
```bash
curl -X GET "http://localhost:3001/api/export/resource/crons?ids=1,2,3&fields=id,title,enabled&format=json" \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "export_id": "uuid",
    "file_name": "crons_1712812800000_xyz789.json",
    "file_size": 5120,
    "download_url": "/api/export/file/crons_1712812800000_xyz789.json",
    "record_count": 3
  }
}
```

### 3. 获取导出历史

**端点**: `GET /api/export/history`

**参数**:
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 50

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1",
        "export_type": "full_backup",
        "file_name": "backup_1712812800000_abc123.zip",
        "file_size": 1024000,
        "record_count": 150,
        "status": "completed",
        "created_at": 1712812800000
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### 4. 下载导出文件

**端点**: `GET /api/export/file/:fileName`

**响应**: 文件下载

## 导入 API

### 1. 完整数据导入

**端点**: `POST /api/import/full`

**权限**: 需要 `system:import` 权限

**请求体**:
```json
{
  "filePath": "/path/to/backup.zip",
  "mode": "merge"
}
```

**参数说明**:
- `filePath`: 备份文件路径 (必填)
- `mode`: 导入模式
  - `merge`: 保留现有数据，跳过重复记录
  - `replace`: 清空现有数据，完全覆盖

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/import/full \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/tmp/backup_1712812800000_abc123.zip",
    "mode": "merge"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "import_id": "uuid",
    "mode": "merge",
    "tables": [
      { "table": "users", "imported": 100, "skipped": 5, "errors": [] },
      { "table": "crons", "imported": 50, "skipped": 0, "errors": [] }
    ],
    "total_imported": 150,
    "total_skipped": 5,
    "errors": []
  }
}
```

### 2. 资源导入

**端点**: `POST /api/import/resource/:resourceType`

**权限**: 需要 `system:import` 权限

**请求体**:
```json
{
  "filePath": "/path/to/data.json",
  "mode": "merge"
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/import/resource/crons \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/tmp/crons_data.json",
    "mode": "replace"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "import_id": "uuid",
    "table": "crons",
    "imported": 50,
    "skipped": 0,
    "errors": []
  }
}
```

### 3. 获取导入历史

**端点**: `GET /api/import/history`

**参数**:
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 50

**响应**: 同导出历史格式

## 数据模型

### 导出文件结构

```
backup_timestamp_uuid.zip
├── metadata.json          # 元数据
├── users.json            # 用户表数据
├── sessions.json         # 会话表数据
├── audit_logs.json       # 审计日志
├── crons.json            # Cron 任务
├── cron_runs.json        # 运行历史
├── waf_rules.json        # WAF 规则
├── waf_logs.json         # WAF 日志
├── cicd_scans.json       # CI/CD 扫描
├── cicd_scan_results.json # 扫描结果
└── ...                   # 其他表
```

### metadata.json 格式

```json
{
  "export_id": "uuid",
  "export_type": "full_backup",
  "timestamp": "2026-04-11T15:00:00.000Z",
  "version": "1.0",
  "system_info": {
    "node_version": "v25.8.0",
    "platform": "linux"
  },
  "tables": [
    { "name": "users", "record_count": 100 },
    { "name": "crons", "record_count": 50 }
  ],
  "total_tables": 12,
  "created_at": 1712812800000
}
```

## 导入顺序

导入时按照以下顺序处理表（考虑外键依赖）:

1. users
2. roles
3. permissions
4. user_roles
5. role_permissions
6. sessions
7. audit_logs
8. two_factor_auth
9. waf_rules
10. waf_logs
11. cicd_scans
12. cicd_scan_results
13. crons
14. cron_runs
15. env_configs

## 错误处理

### 常见错误

| 错误码 | 错误信息 | 说明 |
|-------|---------|------|
| 400 | 无效的请求参数 | 缺少必填参数或参数格式错误 |
| 401 | 未授权 | 缺少或无效的认证令牌 |
| 403 | 权限不足 | 没有执行操作的权限 |
| 404 | 文件不存在 | 导出的文件已被删除 |
| 500 | 服务器错误 | 导入/导出过程中发生错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "details": "详细错误信息（可选）"
}
```

## 安全建议

1. **权限控制**: 导入/导出功能需要特殊权限，仅限管理员使用
2. **数据加密**: 敏感数据在导出时会自动脱敏
3. **文件清理**: 定期清理过期的导出文件
4. **审计日志**: 所有导入导出操作都会记录到审计日志
5. **文件大小**: 建议单次导出不超过 100MB

## 性能优化

1. **批量操作**: 支持批量导入/导出，减少 API 调用次数
2. **异步处理**: 大数据量导出采用异步处理
3. **增量导出**: 支持只导出变更数据（未来功能）
4. **压缩存储**: 导出文件自动压缩，节省存储空间

## 使用示例

### 完整备份流程

```bash
# 1. 导出完整备份
curl -X GET http://localhost:3001/api/export/full \
  -H "Authorization: Bearer <token>" \
  -o backup.zip

# 2. 下载文件
curl -O http://localhost:3001/api/export/file/backup_1712812800000_abc123.zip

# 3. 导入恢复
curl -X POST http://localhost:3001/api/import/full \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/backup.zip",
    "mode": "merge"
  }'
```

### 导出特定资源

```bash
# 导出所有 Cron 任务
curl -X GET "http://localhost:3001/api/export/resource/crons?format=json" \
  -H "Authorization: Bearer <token>" \
  -o crons.json

# 导出指定的用户
curl -X GET "http://localhost:3001/api/export/resource/users?ids=1,2,3&fields=id,username,email" \
  -H "Authorization: Bearer <token>" \
  -o users.json
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-11  
**维护者**: 后端开发团队
