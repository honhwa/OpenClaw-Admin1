# OpenClaw Admin 部署文档

**版本**: 1.0.0  
**最后更新**: 2026-04-11  
**项目路径**: `/www/wwwroot/ai-work`

---

## 📋 目录

1. [快速开始](#快速开始)
2. [环境要求](#环境要求)
3. [部署方式](#部署方式)
4. [CI/CD 流水线](#cicd-流水线)
5. [Docker 部署](#docker-部署)
6. [运维管理](#运维管理)
7. [故障排查](#故障排查)
8. [回滚指南](#回滚指南)

---

## 快速开始

### 方式一：一键部署（推荐）

```bash
cd /www/wwwroot/ai-work
./scripts/deploy-docker.sh
```

### 方式二：手动部署

```bash
# 1. 构建 Docker 镜像
docker-compose build

# 2. 启动服务
docker-compose up -d

# 3. 检查状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

---

## 环境要求

### 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| OS | Ubuntu 20.04 / CentOS 8 | Ubuntu 22.04 LTS |
| CPU | 2 核心 | 4 核心以上 |
| 内存 | 4GB | 8GB 以上 |
| 磁盘 | 20GB | 50GB SSD |

### 软件依赖

| 软件 | 版本 | 说明 |
|------|------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | 2.0+ | 容器编排 |
| Node.js | 20.x | 仅用于本地构建 |
| Git | 2.x | 版本控制 |

### 安装依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git

# CentOS/RHEL
sudo yum install -y docker docker-compose git

# 启动 Docker 服务
sudo systemctl enable docker
sudo systemctl start docker

# 添加用户到 docker 组（避免 sudo）
sudo usermod -aG docker $USER
```

---

## 部署方式

### 1. Docker Compose 部署（推荐）

**优点**：
- 一键部署，自动化程度高
- 环境隔离，易于维护
- 支持一键回滚

**使用场景**：生产环境、测试环境

### 2. 传统部署

**优点**：
- 直接运行，调试方便
- 无需 Docker 环境

**使用场景**：开发环境、调试

---

## CI/CD 流水线

### 流水线架构

```
┌─────────────┐
│ 代码推送/PR │
└──────┬──────┘
       ▼
┌─────────────────┐
│  阶段 1: Lint    │  ← 代码规范检查
└────────┬────────┘
         ▼
┌─────────────────┐
│  阶段 2: Test    │  ← 单元测试
└────────┬────────┘
         ▼
┌─────────────────┐
│  阶段 3: Build   │  ← 生产构建
└────────┬────────┘
         ▼
┌─────────────────┐
│  阶段 4: Deploy  │  ← 部署到服务器（仅 main 分支）
└────────┬────────┘
         ▼
┌─────────────────┐
│  阶段 5: Health  │  ← 健康检查
└─────────────────┘
```

### 触发条件

| 事件 | 分支 | 执行流程 |
|------|------|---------|
| Push | main, develop | lint → test → build |
| PR | main | lint → test → build |
| Push | main | lint → test → build → deploy → health |

### GitHub Secrets 配置

在 `Settings → Secrets and variables → Actions` 中配置：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DEPLOY_SSH_KEY` | SSH 私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_USER` | 部署用户 | `deploy` |
| `DEPLOY_HOST` | 服务器地址 | `192.168.1.100` |
| `DEPLOY_PATH` | 部署路径 | `/www/wwwroot/ai-work` |
| `FEISHU_WEBHOOK_URL` | 飞书通知 | `https://open.feishu.cn/...` |
| `PRODUCTION_URL` | 生产 URL | `https://ai-work.example.com` |

### 查看流水线状态

```bash
# GitHub Actions 页面
https://github.com/your-org/ai-work/actions

# 命令行查看（需安装 gh CLI）
gh run list
gh run view <run-id>
```

---

## Docker 部署

### 配置文件说明

#### `Dockerfile`

多阶段构建，优化镜像大小：
- **Builder 阶段**：安装依赖、构建前端
- **Production 阶段**：仅包含运行时文件

#### `docker-compose.yml`

服务定义：
- `app`: 主应用服务
- `openclaw` (可选): OpenClaw 网关
- `redis` (可选): Redis 缓存

#### `ecosystem.config.js`

PM2 进程管理配置：
- 集群模式，自动扩缩容
- 内存限制 1GB，自动重启
- 日志合并，按日期分割

### 构建镜像

```bash
# 完整构建（推荐）
docker-compose build --no-cache

# 快速构建（使用缓存）
docker-compose build

# 仅构建应用
docker-compose build app
```

### 启动服务

```bash
# 后台启动
docker-compose up -d

# 前台查看日志
docker-compose up

# 启动特定服务
docker-compose up -d app

# 包含网关服务
docker-compose --profile with-gateway up -d
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 重启服务
docker-compose restart
```

---

## 运维管理

### 服务状态管理

```bash
# 查看服务状态
docker-compose ps

# 查看详细日志
docker-compose logs -f

# 查看最近 100 行
docker-compose logs --tail=100

# 查看特定服务日志
docker-compose logs -f app
```

### 资源监控

```bash
# 实时资源使用
docker stats openclaw-admin

# 容器详细信息
docker inspect openclaw-admin

# 进入容器
docker exec -it openclaw-admin sh
```

### 健康检查

```bash
# 运行健康检查脚本
./scripts/health-check.sh

# 手动检查 HTTP 端点
curl http://localhost:10001/health

# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' openclaw-admin
```

### 日志管理

```bash
# 查看应用日志
tail -f /www/wwwroot/ai-work/logs/app.log

# 查看部署日志
tail -f /www/wwwroot/ai-work/logs/deploy*.log

# 日志轮转（防止日志过大）
docker-compose logs --tail=1000 > logs/archive_$(date +%Y%m%d).log
```

### 备份数据

```bash
# 备份配置文件
tar -czf backups/config_backup_$(date +%Y%m%d).tar.gz config/

# 备份日志
tar -czf backups/logs_backup_$(date +%Y%m%d).tar.gz logs/

# 备份 Docker 卷
docker run --rm -v openclaw-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/volume_backup.tar.gz /data
```

---

## 故障排查

### 问题：容器启动失败

**排查步骤**：

```bash
# 1. 查看容器日志
docker-compose logs app

# 2. 检查端口占用
netstat -tlnp | grep 10001

# 3. 检查环境变量
docker exec openclaw-admin env

# 4. 手动启动调试
docker-compose run --rm app sh
```

### 问题：健康检查失败

**可能原因**：
1. 应用启动时间过长
2. 健康端点配置错误
3. 资源不足

**解决方案**：

```bash
# 增加启动等待时间
# 编辑 docker-compose.yml，修改 healthcheck.start_period

# 手动检查健康端点
curl -v http://localhost:10001/health

# 检查应用日志
docker logs openclaw-admin --tail 200
```

### 问题：内存不足

**解决方案**：

```bash
# 1. 限制容器内存
# 编辑 docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

# 2. 清理 Docker 资源
docker system prune -a

# 3. 增加服务器内存或 Swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 问题：构建失败

**排查步骤**：

```bash
# 1. 本地构建测试
npm ci
npm run build

# 2. 清理缓存重新构建
docker-compose build --no-cache

# 3. 检查 Node 版本
docker-compose run --rm app node -v
```

---

## 回滚指南

### 方式一：Docker 镜像回滚

```bash
# 查看历史镜像
docker images | grep openclaw-admin

# 回滚到指定版本
docker tag openclaw-admin:<old-tag> openclaw-admin:latest
docker-compose down
docker-compose up -d
```

### 方式二：使用回滚脚本

```bash
# 列出可用备份
./scripts/rollback.sh --list

# 回滚到指定备份
./scripts/rollback.sh backups/backup_20260411_120000.tar.gz

# 回滚到上一个 Git 版本
./scripts/rollback.sh --git
```

### 方式三：Git 回滚

```bash
# 查看提交历史
git log --oneline -10

# 回滚到指定提交
git revert <commit-hash>

# 推送回滚
git push origin main
```

---

## 附录

### 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 10001 | OpenClaw-Admin | 主应用 |
| 9090 | Prometheus | 监控指标 |
| 9093 | Alertmanager | 告警管理 |
| 3002 | Grafana | 可视化面板 |
| 9100 | Node Exporter | 主机监控 |
| 8080 | cAdvisor | 容器监控 |

### 环境变量

```bash
# 核心配置
NODE_ENV=production
PORT=10001
LOG_LEVEL=INFO

# OpenClaw 连接
OPENCLAW_WS_URL=ws://openclaw:18789
OPENCLAW_AUTH_TOKEN=<your-token>

# 其他配置
DEV_PORT=10002
AUTH_USERNAME=WKP
```

### 常用命令速查

```bash
# 部署
./scripts/deploy-docker.sh

# 健康检查
./scripts/health-check.sh

# 回滚
./scripts/rollback.sh

# 日志
docker-compose logs -f

# 重启
docker-compose restart

# 进入容器
docker exec -it openclaw-admin sh

# 查看资源
docker stats openclaw-admin
```

---

**文档维护**: 运维工程师  
**联系方式**: 飞书群 "开发团队"  
**更新时间**: 2026-04-11
