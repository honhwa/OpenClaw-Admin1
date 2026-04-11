# Prometheus 告警配置指南

## 概述

本文档说明如何配置 Prometheus 监控告警，包括告警规则、通知渠道和告警管理。

## 当前监控配置

### 监控目标

| 目标 | 地址 | 端口 | 状态 |
|------|------|------|------|
| Prometheus | localhost | 9090 | ✅ 运行中 |
| Node Exporter | node-exporter | 9100 | ✅ 运行中 |
| OpenClaw Web | openclaw-web | 3000 | ✅ 运行中 |

### 监控指标

- CPU 使用率
- 内存使用率
- 磁盘使用率
- 网络 I/O
- 应用响应时间
- 请求成功率

---

## 告警规则配置

### 当前告警规则文件

位置：`monitoring/prometheus/alerts.yml`

### 建议的告警规则

```yaml
groups:
  - name: openclaw-alerts
    interval: 30s
    rules:
      # 服务不可用告警
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务不可用"
          description: "{{ $labels.instance }} 服务已停止运行超过 1 分钟"

      # CPU 使用率过高
      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "{{ $labels.instance }} CPU 使用率为 {{ $value }}%"

      # 内存使用率过高
      - alert: HighMemory
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "{{ $labels.instance }} 内存使用率为 {{ $value }}%"

      # 磁盘使用率过高
      - alert: DiskFull
        expr: (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "磁盘空间不足"
          description: "{{ $labels.instance }} 磁盘使用率为 {{ $value }}%"

      # 应用错误率过高
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "应用错误率过高"
          description: "应用错误率为 {{ $value | humanizePercentage }}"

      # 应用响应时间过长
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "应用响应时间过长"
          description: "95% 分位响应时间为 {{ $value }} 秒"
```

---

## 通知渠道配置

### 飞书 Webhook 通知

由于 Alertmanager 不直接支持飞书，建议使用以下方案：

#### 方案 A: 使用 Alertmanager 飞书集成

创建 `monitoring/alertmanager/feishu-notifier.py`:

```python
#!/usr/bin/env python3
import json
import requests
import os

FEISHU_WEBHOOK_URL = os.environ.get('FEISHU_WEBHOOK_URL', '')

def send_feishu_notification(alerts):
    for alert in alerts:
        if alert['status'] == 'firing':
            title = alert['annotations']['summary']
            description = alert['annotations']['description']
            severity = alert['labels'].get('severity', 'info')
            
            emoji = {'critical': '🚨', 'warning': '⚠️', 'info': 'ℹ️'}.get(severity, 'ℹ️')
            
            message = {
                "msg_type": "text",
                "content": {
                    "text": f"{emoji} [{severity.upper()}] {title}\n\n{description}"
                }
            }
            
            requests.post(FEISHU_WEBHOOK_URL, json=message)

if __name__ == '__main__':
    alerts = json.loads(sys.stdin.read())
    send_feishu_notification(alerts)
```

#### 方案 B: 使用 GitHub Actions 轮询告警

在 GitHub Actions 中定期查询 Prometheus 告警状态，发现异常时发送飞书通知。

---

## 告警级别定义

| 级别 | 说明 | 通知方式 | 响应时间 |
|------|------|----------|----------|
| Critical | 严重问题，服务不可用 | 飞书 + 短信 | 立即 |
| Warning | 警告，需要关注 | 飞书 | 30 分钟内 |
| Info | 信息，记录日志 | 飞书 | 24 小时内 |

---

## 告警验证测试

### 测试服务不可用告警

```bash
# 停止应用服务
docker-compose stop app

# 等待 1 分钟，应收到 ServiceDown 告警

# 恢复服务
docker-compose start app
```

### 测试 CPU 告警

```bash
# 生成 CPU 负载
stress --cpu 4 --timeout 300

# 等待 5 分钟，应收到 HighCPU 告警
```

### 测试内存告警

```bash
# 生成内存负载
stress --vm 2 --vm-bytes 80% --timeout 300

# 等待 5 分钟，应收到 HighMemory 告警
```

---

## 告警管理最佳实践

### 1. 告警分级

- **P0 - 紧急**: 服务不可用，立即响应
- **P1 - 高**: 性能下降，30 分钟内响应
- **P2 - 中**: 资源预警，24 小时内处理
- **P3 - 低**: 信息通知，定期查看

### 2. 告警聚合

避免告警风暴，使用 Alertmanager 的分组和聚合功能：

```yaml
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
```

### 3. 告警抑制

配置告警抑制规则，避免重复通知：

```yaml
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

---

## 监控仪表板

### Grafana 仪表板

访问地址：`http://localhost:3002`  
默认账号：`admin/admin123`

### 推荐仪表板

1. **系统资源监控** (ID: 1860)
2. **Node Exporter 完整监控** (ID: 19145)
3. **Prometheus 自身监控** (ID: 1910)

---

## 常见问题

### Q1: 告警未触发怎么办？

1. 检查 Prometheus 配置是否正确
2. 检查告警规则语法
3. 查看 Prometheus 日志确认规则加载
4. 手动查询 PromQL 验证表达式

### Q2: 告警通知未收到怎么办？

1. 检查 Webhook URL 是否正确
2. 检查 Alertmanager 配置
3. 查看 Alertmanager 日志
4. 测试飞书 Webhook 是否正常

### Q3: 如何调整告警阈值？

编辑 `monitoring/prometheus/alerts.yml`，修改 `expr` 表达式中的阈值，然后重启 Prometheus。

---

## 下一步行动

- [ ] 配置飞书 Webhook 通知
- [ ] 更新告警规则文件
- [ ] 配置 Alertmanager 飞书集成
- [ ] 设置告警抑制规则
- [ ] 创建 Grafana 监控仪表板
- [ ] 进行告警测试验证

---

**文档版本**: v1.0  
**最后更新**: 2026-04-11  
**维护人**: 运维工程师
