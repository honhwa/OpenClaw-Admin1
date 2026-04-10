#!/bin/bash
# OpenClaw-Admin Cron 任务监控脚本
# 功能：监控 Cron 任务执行状态，失败重试，发送告警

LOG_DIR="/www/wwwroot/ai-work/logs"
LOG_FILE="$LOG_DIR/cron-monitor.log"
ALERT_CHANNEL="feishu"

# 记录日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查关键 Cron 任务
check_cron_jobs() {
    log "开始检查 Cron 任务状态..."
    
    # 检查系统 Cron 服务
    if ! systemctl is-active --quiet cron; then
        log "❌ Cron 服务未运行，尝试重启..."
        systemctl restart cron
        if [ $? -eq 0 ]; then
            log "✅ Cron 服务已重启"
        else
            log "❌ Cron 服务重启失败"
            send_alert "Cron 服务重启失败"
        fi
    else
        log "✅ Cron 服务运行正常"
    fi
    
    # 检查关键任务日志
    check_task_log "cron-execution.log"
    check_task_log "app.log"
}

# 检查任务日志
check_task_log() {
    local log_file="$1"
    local full_path="$LOG_DIR/$log_file"
    
    if [ -f "$full_path" ]; then
        # 检查最近是否有错误
        if grep -q "ERROR\|FATAL" "$full_path" 2>/dev/null; then
            log "⚠️ 发现错误日志：$log_file"
            send_alert "检测到错误日志：$log_file"
        else
            log "✅ $log_file 无错误"
        fi
    else
        log "⚠️ 日志文件不存在：$log_file"
    fi
}

# 发送告警通知
send_alert() {
    local message="$1"
    log "🚨 发送告警：$message"
    
    # 这里可以集成飞书 webhook 或其他告警方式
    # curl -X POST "飞书 webhook URL" -d "{\"text\":\"$message\"}"
    
    echo "$message" >> "$LOG_DIR/alerts.log"
}

# 主函数
main() {
    log "========== Cron 监控检查开始 =========="
    check_cron_jobs
    log "========== Cron 监控检查结束 =========="
}

# 执行
main
