# 飞书 Webhook 配置指南

## 概述

本文档说明如何配置飞书 Webhook，用于接收 CI/CD 部署通知和 Prometheus 告警通知。

## 场景 1: CI/CD 部署通知

### 步骤 1: 创建飞书群机器人

1. 打开飞书，进入项目群聊
2. 点击右上角"..." → "群机器人" → "添加机器人"
3. 选择"自定义机器人"
4. 设置机器人名称：`OpenClaw-Admin 部署通知`
5. 设置安全关键词（可选）: `部署`、`CI/CD`、`GitHub`
6. 复制 Webhook 地址

### 步骤 2: 配置到 GitHub Secrets

```
Name: FEISHU_WEBHOOK_URL
Value: https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx
```

### 步骤 3: 验证通知

推送代码到 main 分支，触发 CI/CD 流水线，飞书群聊将收到部署通知。

---

## 场景 2: Prometheus 告警通知

### 步骤 1: 创建告警专用群机器人

1. 创建新的飞书群聊（或加入现有运维群）
2. 添加"自定义机器人"
3. 设置机器人名称：`OpenClaw-Admin 监控告警`
4. 复制 Webhook 地址

### 步骤 2: 配置 Alertmanager

编辑 `monitoring/alertmanager/config.yml`:

```yaml
receivers:
  - name: 'feishu-notifications'
    webhook_configs:
      - url: 'http://alertmanager:9093/webhook'
        send_resolved: true

# Alertmanager 需要额外配置飞书集成
# 或使用中间件转发
```

### 步骤 3: 使用飞书告警中间件

由于 Prometheus Alertmanager 不直接支持飞书，建议使用以下方案：

**方案 A: 使用 webhook 转发服务**
```bash
# 部署一个简单的转发服务
docker run -d \
  -p 8080:8080 \
  -e FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx" \
  name: prometheus-feishu-bridge
```

**方案 B: 使用 GitHub Actions 发送告警**
在 CI/CD 流水线中集成告警检查，发现异常时发送飞书通知。

---

## 通知消息格式

### CI/CD 部署通知格式

```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": "🚀 部署完成",
      "template": "blue"
    },
    "elements": [
      {
        "tag": "div",
        "text": {
          "content": "**分支**: main\n**提交**: abc123\n**部署者**: developer\n**时间**: 2026-04-11 16:00"
        }
      }
    ]
  }
}
```

### Prometheus 告警通知格式

```json
{
  "msg_type": "text",
  "content": {
    "text": "🚨 [严重] 服务告警\n\n告警名称：ServiceDown\n实例：openclaw-web:3000\n状态：firing\n开始时间：2026-04-11 16:00:00\n\n请立即检查！"
  }
}
```

---

## 测试 Webhook

### 使用 curl 测试

```bash
# 测试飞书 Webhook
curl -X POST https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "text",
    "content": {
      "text": "🧪 Webhook 测试消息\n时间：'"$(date)"'"
    }
  }'
```

### 使用 GitHub Actions 测试

在 `.github/workflows/test-webhook.yml`:

```yaml
- name: 测试飞书通知
  run: |
    curl -X POST ${{ secrets.FEISHU_WEBHOOK_URL }} \
      -H "Content-Type: application/json" \
      -d '{
        "msg_type": "text",
        "content": {
          "text": "✅ Webhook 配置成功！"
        }
      }'
```

---

## 常见问题

### Q1: 通知未收到怎么办？

1. 检查 Webhook URL 是否正确
2. 检查飞书群机器人是否启用
3. 检查安全关键词是否匹配
4. 查看 GitHub Actions 日志确认请求是否发送成功

### Q2: 如何自定义通知样式？

使用 `interactive` 消息类型，参考飞书官方文档配置卡片样式。

### Q3: 告警通知如何区分级别？

在消息内容中使用不同 emoji 标识：
- 🚨 Critical - 严重
- ⚠️ Warning - 警告
- ℹ️ Info - 信息

---

## 安全建议

1. **不要将 Webhook URL 硬编码到代码中**
2. **使用飞书群机器人的安全关键词功能**
3. **定期轮换 Webhook URL**
4. **限制 Webhook 的发送频率**

---

**文档版本**: v1.0  
**最后更新**: 2026-04-11  
**维护人**: 运维工程师
