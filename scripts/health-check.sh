#!/bin/bash
# OpenClaw-Admin 健康检查脚本
# 功能：检查服务健康状态

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
LOG_DIR="$PROJECT_DIR/logs"
HEALTH_LOG="$LOG_DIR/health_$(date '+%Y%m%d').log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$HEALTH_LOG"
}

# 检查容器状态
check_container() {
    log "检查容器状态..."
    
    if docker ps | grep -q openclaw-admin; then
        log "${GREEN}✅ 容器运行中${NC}"
        return 0
    else
        log "${RED}❌ 容器未运行${NC}"
        return 1
    fi
}

# 检查 HTTP 健康端点
check_http() {
    log "检查 HTTP 健康端点..."
    
    if curl -sf http://localhost:10001/health >/dev/null 2>&1; then
        log "${GREEN}✅ HTTP 健康检查通过${NC}"
        return 0
    else
        log "${RED}❌ HTTP 健康检查失败${NC}"
        return 1
    fi
}

# 检查资源使用
check_resources() {
    log "检查资源使用..."
    
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" openclaw-admin | cut -d'/' -f1)
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" openclaw-admin | tr -d '%')
    
    log "内存使用：$MEM_USAGE"
    log "CPU 使用：$CPU_USAGE%"
    
    return 0
}

# 检查日志错误
check_logs() {
    log "检查最新日志..."
    
    ERROR_COUNT=$(docker logs openclaw-admin --tail 100 2>&1 | grep -i "error" | wc -l)
    
    if [ "$ERROR_COUNT" -gt 10 ]; then
        log "${YELLOW}⚠️ 发现 $ERROR_COUNT 个错误日志${NC}"
    else
        log "${GREEN}✅ 日志正常${NC}"
    fi
    
    return 0
}

# 主函数
main() {
    log "=========================================="
    log "🏥 OpenClaw-Admin 健康检查"
    log "=========================================="
    
    local STATUS=0
    
    check_container || STATUS=1
    check_http || STATUS=1
    check_resources
    check_logs
    
    log "=========================================="
    if [ $STATUS -eq 0 ]; then
        log "${GREEN}✅ 所有检查通过${NC}"
    else
        log "${RED}❌ 部分检查失败${NC}"
    fi
    log "=========================================="
    
    return $STATUS
}

# 执行
main
