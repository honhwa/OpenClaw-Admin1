#!/bin/bash
# OpenClaw-Admin 回滚脚本
# 功能：回滚到上一个版本

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_DIR="$PROJECT_DIR/logs"
DEPLOY_LOG="$LOG_DIR/rollback_$(date '+%Y%m%d_%H%M%S').log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# 列出可用备份
list_backups() {
    log "可用备份列表:"
    ls -lht "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -10 || log "无可用备份"
}

# 回滚到指定备份
rollback_to() {
    local BACKUP_FILE=$1
    
    if [ -z "$BACKUP_FILE" ]; then
        log "${RED}❌ 请指定备份文件${NC}"
        list_backups
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log "${RED}❌ 备份文件不存在：$BACKUP_FILE${NC}"
        exit 1
    fi
    
    log "开始回滚到：$BACKUP_FILE"
    
    # 停止服务
    log "停止服务..."
    docker-compose down || true
    
    # 恢复备份
    log "恢复备份..."
    tar -xzf "$BACKUP_FILE" -C "$PROJECT_DIR"
    
    # 重启服务
    log "重启服务..."
    docker-compose up -d
    
    log "${GREEN}✅ 回滚完成${NC}"
}

# 回滚到上一个 Git 版本
rollback_git() {
    log "回滚到上一个 Git 版本..."
    
    cd "$PROJECT_DIR"
    git reset --hard HEAD~1
    git pull origin main
    
    # 重新部署
    ./scripts/deploy-docker.sh
    
    log "${GREEN}✅ Git 回滚完成${NC}"
}

# 主函数
main() {
    log "=========================================="
    log "🔄 OpenClaw-Admin 回滚工具"
    log "=========================================="
    
    case "$1" in
        --list)
            list_backups
            ;;
        --git)
            rollback_git
            ;;
        *)
            rollback_to "$1"
            ;;
    esac
    
    log "=========================================="
    log "✅ 回滚操作完成"
    log "=========================================="
}

# 执行
main "$@"
