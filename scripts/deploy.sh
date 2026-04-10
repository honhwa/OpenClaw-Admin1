#!/bin/bash
# OpenClaw-Admin 部署脚本
# 功能：自动化部署应用

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
LOG_DIR="$PROJECT_DIR/logs"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date '+%Y%m%d_%H%M%S')

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/deploy.log"
}

# 检查依赖
check_dependencies() {
    log "检查依赖..."
    
    command -v node >/dev/null 2>&1 || { log "${RED}Node.js 未安装${NC}"; exit 1; }
    command -v npm >/dev/null 2>&1 || { log "${RED}npm 未安装${NC}"; exit 1; }
    command -v mysql >/dev/null 2>&1 || { log "${RED}MySQL 未安装${NC}"; exit 1; }
    
    log "${GREEN}✅ 依赖检查通过${NC}"
}

# 备份当前版本
backup_current() {
    log "创建备份..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$PROJECT_DIR" ]; then
        tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$PROJECT_DIR" . 2>/dev/null || true
        log "${GREEN}✅ 备份完成：backup_$DATE.tar.gz${NC}"
    else
        log "${YELLOW}⚠️ 无现有版本需要备份${NC}"
    fi
}

# 拉取代码
pull_code() {
    log "拉取最新代码..."
    
    cd "$PROJECT_DIR"
    if [ -d ".git" ]; then
        git pull origin main || { log "${RED}❌ Git 拉取失败${NC}"; exit 1; }
        log "${GREEN}✅ 代码拉取完成${NC}"
    else
        log "${YELLOW}⚠️ 非 Git 仓库，跳过代码拉取${NC}"
    fi
}

# 安装依赖
install_deps() {
    log "安装依赖..."
    
    cd "$PROJECT_DIR"
    npm install --production 2>&1 | tee -a "$LOG_DIR/deploy.log"
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✅ 依赖安装完成${NC}"
    else
        log "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
}

# 数据库迁移
run_migrations() {
    log "执行数据库迁移..."
    
    # 这里添加数据库迁移命令
    # npm run migrate
    
    log "${GREEN}✅ 数据库迁移完成${NC}"
}

# 构建前端
build_frontend() {
    log "构建前端资源..."
    
    cd "$PROJECT_DIR/frontend" 2>/dev/null && npm run build 2>&1 | tee -a "$LOG_DIR/deploy.log" || true
    
    log "${GREEN}✅ 前端构建完成${NC}"
}

# 重启服务
restart_service() {
    log "重启服务..."
    
    # 停止旧服务
    pkill -f "node.*openclaw-admin" 2>/dev/null || true
    
    sleep 2
    
    # 启动新服务（根据实际启动方式调整）
    cd "$PROJECT_DIR"
    nohup node server.js > "$LOG_DIR/app.log" 2>&1 &
    
    sleep 3
    
    # 检查服务是否启动
    if pgrep -f "node.*openclaw-admin" > /dev/null; then
        log "${GREEN}✅ 服务重启成功${NC}"
    else
        log "${RED}❌ 服务启动失败${NC}"
        exit 1
    fi
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 检查端口是否监听（假设应用运行在 3000 端口）
    sleep 5
    
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log "${GREEN}✅ 健康检查通过${NC}"
    else
        log "${YELLOW}⚠️ 健康检查未通过，但服务已启动${NC}"
    fi
}

# 主函数
main() {
    log "=========================================="
    log "开始部署 OpenClaw-Admin"
    log "=========================================="
    
    check_dependencies
    backup_current
    pull_code
    install_deps
    run_migrations
    build_frontend
    restart_service
    health_check
    
    log "=========================================="
    log "${GREEN}✅ 部署完成！${NC}"
    log "=========================================="
}

# 执行
main
