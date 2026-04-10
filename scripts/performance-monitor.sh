#!/bin/bash
# OpenClaw-Admin 性能监控脚本
# 功能：采集系统性能指标，检测异常

LOG_DIR="/www/wwwroot/ai-work/logs"
LOG_FILE="$LOG_DIR/performance.log"
CONFIG_FILE="/www/wwwroot/ai-work/config/monitor/performance-config.json"

# 记录日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 获取 CPU 使用率
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
}

# 获取内存使用情况
get_memory_usage() {
    free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}'
}

# 获取磁盘使用率
get_disk_usage() {
    df -h / | awk 'NR==2{print $5}' | sed 's/%//'
}

# 获取 Node.js 进程内存
get_node_memory() {
    ps aux | grep "node" | grep -v grep | awk '{sum+=$6} END {printf "%.2f MB", sum/1024}'
}

# 检查阈值
check_threshold() {
    local metric="$1"
    local value="$2"
    local threshold="$3"
    
    if (( $(echo "$value > $threshold" | bc -l 2>/dev/null || echo "0") )); then
        log "⚠️ $metric 超过阈值：$value% > $threshold%"
        return 1
    fi
    return 0
}

# 采集性能数据
collect_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local cpu=$(get_cpu_usage)
    local memory=$(get_memory_usage)
    local disk=$(get_disk_usage)
    local node_mem=$(get_node_memory)
    
    log "性能数据 - CPU: ${cpu}%, 内存：${memory}, 磁盘：${disk}, Node.js 内存：$node_mem"
    
    # 写入 CSV 用于分析
    echo "$timestamp,$cpu,$memory,$disk,$node_mem" >> "$LOG_DIR/performance-metrics.csv"
    
    # 检查阈值
    check_threshold "CPU" "$cpu" 80
    check_threshold "内存" "$memory" 80
    check_threshold "磁盘" "$disk" 90
}

# 生成性能报告
generate_report() {
    log "========== 性能报告 =========="
    log "CPU 使用率：$(get_cpu_usage)%"
    log "内存使用率：$(get_memory_usage)"
    log "磁盘使用率：$(get_disk_usage)%"
    log "Node.js 进程内存：$(get_node_memory)"
    log "=============================="
}

# 主函数
main() {
    collect_metrics
    
    # 每小时生成一次详细报告
    if [ $(date +%M) -eq 0 ]; then
        generate_report
    fi
}

# 执行
main
