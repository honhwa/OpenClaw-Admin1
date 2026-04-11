# GitHub Secrets 配置指南

## 概述

本文档说明如何在 GitHub 仓库中配置 CI/CD 流水线所需的 Secrets。

## 需要配置的 Secrets

### 1. DEPLOY_SSH_KEY (SSH 私钥)

**用途**: 用于 GitHub Actions 通过 SSH 连接到部署服务器

**生成步骤**:
```bash
# 生成 SSH 密钥对（如果还没有）
ssh-keygen -t ed25519 -C "github-actions@openclaw-admin" -f ~/.ssh/github_actions_deploy

# 查看公钥
cat ~/.ssh/github_actions_deploy.pub

# 将公钥添加到服务器 ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_deploy.pub | ssh ubuntu@your-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**配置方法**:
1. 读取私钥内容：`cat ~/.ssh/github_actions_deploy`
2. 在 GitHub 仓库 Settings → Secrets and variables → Actions → New repository secret
3. Name: `DEPLOY_SSH_KEY`
4. Value: 粘贴完整的私钥内容（包括 -----BEGIN OPENSSH PRIVATE KEY----- 和 -----END OPENSSH PRIVATE KEY-----）

---

### 2. DEPLOY_USER (部署用户)

**用途**: SSH 登录用户名

**示例值**: `ubuntu` 或 `root`

**配置方法**:
- Name: `DEPLOY_USER`
- Value: `ubuntu` (根据实际服务器用户填写)

---

### 3. DEPLOY_HOST (部署服务器地址)

**用途**: 部署服务器的 IP 地址或域名

**示例值**: `192.168.1.100` 或 `deploy.openclaw.com`

**配置方法**:
- Name: `DEPLOY_HOST`
- Value: `your-server-ip`

---

### 4. DEPLOY_PATH (部署路径)

**用途**: 服务器上应用部署的目录路径

**示例值**: `/www/wwwroot/ai-work`

**配置方法**:
- Name: `DEPLOY_PATH`
- Value: `/www/wwwroot/ai-work`

---

### 5. PRODUCTION_URL (生产环境 URL)

**用途**: 健康检查端点 URL

**示例值**: `http://your-server-ip:10001` 或 `https://admin.openclaw.com`

**配置方法**:
- Name: `PRODUCTION_URL`
- Value: `http://your-server-ip:10001`

---

### 6. FEISHU_WEBHOOK_URL (飞书 Webhook)

**用途**: 部署完成通知到飞书群聊

**获取步骤**:
1. 在飞书群聊中添加"自定义机器人"
2. 复制 Webhook 地址
3. 配置到 GitHub Secrets

**配置方法**:
- Name: `FEISHU_WEBHOOK_URL`
- Value: `https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx`

---

## Secrets 配置检查清单

- [ ] DEPLOY_SSH_KEY - SSH 私钥
- [ ] DEPLOY_USER - 部署用户名
- [ ] DEPLOY_HOST - 服务器地址
- [ ] DEPLOY_PATH - 部署路径
- [ ] PRODUCTION_URL - 生产环境 URL
- [ ] FEISHU_WEBHOOK_URL - 飞书 Webhook

---

## 验证配置

配置完成后，可以触发以下工作流验证：

```bash
# 推送代码到 main 分支
git push origin main

# 或在 GitHub 页面手动触发 Workflow
# Actions → CI/CD Pipeline → Run workflow
```

---

## 安全建议

1. **定期轮换 SSH 密钥**: 建议每 6 个月更换一次 SSH 密钥
2. **限制 SSH 密钥权限**: 只授予必要的读写权限
3. **使用部署密钥而非个人密钥**: 为 CI/CD 单独生成密钥
4. **保护 Secrets 安全**: 不要将 Secrets 硬编码到代码中
5. **启用分支保护**: 保护 main 分支，要求 PR 审查

---

**文档版本**: v1.0  
**最后更新**: 2026-04-11  
**维护人**: 运维工程师
