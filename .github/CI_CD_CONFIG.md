# CI/CD 配置说明

## 流水线概览

本项目的 CI/CD 流水线基于 GitHub Actions，包含以下阶段：

### 阶段 1: 代码检查 (lint)
- ESLint 代码规范检查
- TypeScript 类型检查
- 运行条件：所有 push 和 PR

### 阶段 2: 单元测试 (test)
- 运行 Jest/Vitest 测试套件
- 生成测试覆盖率报告
- 运行条件：lint 通过后

### 阶段 3: 构建 (build)
- 生产环境构建
- 生成 dist 目录产物
- 运行条件：test 通过后

### 阶段 4: 部署 (deploy)
- 仅在主分支 (main) 触发
- 通过 SSH 部署到生产服务器
- 自动重启服务
- 运行条件：build 通过后 + main 分支

### 阶段 5: 健康检查 (health-check)
- 验证部署后服务健康状态
- 最多等待 100 秒
- 运行条件：deploy 通过后 + main 分支

## 环境配置要求

### 需要配置的 Secrets

在 GitHub 仓库 Settings → Secrets 中配置以下变量：

| 名称 | 说明 | 示例 |
|------|------|------|
| `DEPLOY_SSH_KEY` | SSH 私钥（用于部署） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_USER` | 部署用户名 | `deploy` |
| `DEPLOY_HOST` | 部署服务器地址 | `192.168.1.100` |
| `DEPLOY_PATH` | 部署目标路径 | `/www/wwwroot/ai-work` |
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook | `https://open.feishu.cn/open-apis/bot/v2/hook/...` |
| `PRODUCTION_URL` | 生产环境 URL | `https://ai-work.example.com` |

### SSH 密钥生成

```bash
# 生成部署专用密钥
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# 将公钥添加到服务器
cat deploy_key.pub | ssh deploy@192.168.1.100 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 将私钥添加到 GitHub Secrets
cat deploy_key | pbcopy  # 复制私钥内容
```

## 手动触发流水线

### 触发部署
```bash
# 推送代码到 main 分支自动触发
git push origin main

# 或手动触发 workflow_dispatch
```

### 查看流水线状态
- GitHub Actions 页面：https://github.com/your-org/ai-work/actions
- 实时日志：点击具体 workflow run 查看

## 故障排查

### 部署失败
1. 检查 SSH 密钥是否正确配置
2. 验证服务器连通性：`ssh -i deploy_key deploy@192.168.1.100`
3. 检查服务器磁盘空间：`df -h`

### 测试失败
1. 本地运行测试：`npm run test:coverage`
2. 查看测试报告：`coverage/lcov-report/index.html`

### 构建失败
1. 本地构建测试：`npm run build`
2. 检查依赖完整性：`npm ci`

## 监控集成

### 飞书通知
流水线会在以下节点发送飞书通知：
- ✅ 部署完成
- ❌ 部署失败
- 🏥 健康检查结果

### 监控面板
部署后可访问监控面板：
- Grafana: http://your-server:3002
- Prometheus: http://your-server:9090

## 回滚策略

### 自动回滚
健康检查失败时，流水线自动标记为失败，不会触发后续操作。

### 手动回滚
```bash
# 回滚到上一个版本
git revert HEAD
git push origin main
```

## 最佳实践

1. **分支策略**
   - `main`: 生产环境，受保护分支
   - `develop`: 开发环境
   - `feature/*`: 功能分支

2. **代码规范**
   - 所有 PR 必须通过 lint 和 test 检查
   - 测试覆盖率不低于 80%

3. **安全建议**
   - 定期轮换 SSH 密钥
   - Secrets 不硬编码在代码中
   - 使用最小权限原则配置部署用户

---
*最后更新：2026-04-10*
*版本：1.0*
