# OpenClaw-Admin Cron 可视化编辑器 - 运维部署文档

> 版本：v1.0.0  
> 日期：2026-04-10  
> 负责人：运维工程师  
> 状态：部署中

---

## 📋 项目概述

**项目名称**: OpenClaw-Admin Cron 可视化编辑器  
**技术栈**: Vue3 + Node.js + MySQL  
**部署环境**: Linux ARM64 (Oracle Cloud)  
**当前阶段**: 运维部署

---

## 🔧 1. Cron 任务监控配置

### 1.1 监控脚本位置
```bash
/www/wwwroot/ai-work/scripts/cron-monitor.sh
```

### 1.2 监控内容
- 监控所有关键 Cron 任务的执行状态
- 检测任务失败并自动重试（最多 3 次）
- 失败时发送飞书告警通知
- 收集执行日志到 `/www/wwwroot/ai-work/logs/cron-execution.log`

### 1.3 配置 Cron 监控任务
```bash
# 添加到系统 crontab (crontab -e)
*/5 * * * * /www/wwwroot/ai-work/scripts/cron-monitor.sh >> /www/wwwroot/ai-work/logs/cron-monitor.log 2>&1
```

---

## 📊 2. 性能监控面板配置

### 2.1 监控指标
- CPU 使用率
- 内存使用量
- 磁盘 I/O
- 网络流量
- Node.js 应用内存泄漏检测
- 数据库连接池状态

### 2.2 配置文件位置
```bash
/www/wwwroot/ai-work/config/monitor/performance-config.json
```

### 2.3 监控脚本
```bash
/www/wwwroot/ai-work/scripts/performance-monitor.sh
```

### 2.4 定时任务
```bash
# 每分钟采集一次性能数据
* * * * * /www/wwwroot/ai-work/scripts/performance-monitor.sh >> /www/wwwroot/ai-work/logs/performance.log 2>&1
```

---

## 🚀 3. 部署脚本

### 3.1 主部署脚本
```bash
/www/wwwroot/ai-work/scripts/deploy.sh
```

### 3.2 部署步骤
1. 拉取最新代码
2. 安装依赖
3. 数据库迁移
4. 构建前端资源
5. 重启服务
6. 健康检查

### 3.3 执行部署
```bash
cd /www/wwwroot/ai-work
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 📝 4. 日志收集配置

### 4.1 日志目录结构
```
/www/wwwroot/ai-work/logs/
├── cron-execution.log    # Cron 任务执行日志
├── cron-monitor.log      # Cron 监控日志
├── performance.log       # 性能监控日志
├── app.log               # 应用运行日志
└── error.log             # 错误日志
```

### 4.2 日志轮转配置
```bash
/www/wwwroot/ai-work/config/logrotate.conf
```

### 4.3 日志收集脚本
```bash
/www/wwwroot/ai-work/scripts/log-collector.sh
```

### 4.4 定时日志收集
```bash
# 每天凌晨 2 点收集并压缩日志
0 2 * * * /www/wwwroot/ai-work/scripts/log-collector.sh >> /www/wwwroot/ai-work/logs/log-collector.log 2>&1
```

---

## 📅 5. 飞书多维表格状态更新

### 5.1 任务信息
- **任务名称**: Cron 可视化编辑器 - 运维部署
- **状态**: 部署中
- **负责人**: 运维工程师
- **进度**: 0%

### 5.2 多维表格链接
```
https://qcn2yp1dj5gd.feishu.cn/base/PUl1bf4KFaJNivsHB1hcdu3BnHc
```

### 5.3 更新说明
- 当前状态已标记为"部署中"
- 进度初始化为 0%
- 待部署完成后更新为 100%

---

## 🔄 6. 部署后验证清单

- [ ] Cron 监控服务正常运行
- [ ] 性能监控数据采集正常
- [ ] 日志文件正常生成
- [ ] 应用健康检查通过
- [ ] 飞书告警通知测试通过
- [ ] 数据库连接正常
- [ ] 前端页面可访问

---

## 🆘 7. 故障排查

### 7.1 查看服务状态
```bash
systemctl status openclaw-admin
```

### 7.2 查看实时日志
```bash
tail -f /www/wwwroot/ai-work/logs/app.log
```

### 7.3 重启服务
```bash
systemctl restart openclaw-admin
```

### 7.4 检查 Cron 任务
```bash
crontab -l | grep ai-work
```

---

## 📞 8. 联系方式

- **运维负责人**: 运维工程师
- **项目文档**: `/www/wwwroot/ai-work/docs/`
- **监控面板**: 待配置 Grafana/Prometheus

---

## 📈 9. 下一步计划

1. ✅ 配置 Cron 任务监控
2. ✅ 配置性能监控面板
3. ✅ 编写部署脚本
4. ✅ 配置日志收集
5. ⏳ 更新飞书多维表格任务状态为"部署中"
6. ✅ 输出运维文档
7. ⏳ 部署完成后更新进度为 100%

---

*文档生成时间：2026-04-10 19:02 GMT+8*  
*自动生成 by WinClaw AI 助手*