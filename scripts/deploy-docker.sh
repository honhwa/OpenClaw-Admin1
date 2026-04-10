#!/bin/bash
# OpenClaw-Admin 生产环境部署脚本
# 功能：Docker 容器化部署

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
LOG_DIR="$PROJECT_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy_$(date '+%Y%m%d_%H%M%S').log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# 检查依赖
check_dependencies() {
    log "检查部署依赖..."
    
    command -v docker >/dev/null 2>&1 || { log "${RED}❌ Docker 未安装${NC}"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log "${RED}❌ Docker Compose 未安装${NC}"; exit 1; }
    
    log "${GREEN}✅ 依赖检查通过${NC}"
}

# 停止旧容器
stop_containers() {
    log "停止旧容器..."
    
    cd "$PROJECT_DIR"
    docker-compose down || true
    
    log "${GREEN}✅ 旧容器已停止${NC}"
}

# 构建镜像
build_image() {
    log "构建 Docker 镜像..."
    
    cd "$PROJECT_DIR"
    docker-compose build --no-cache app
    
    log "${GREEN}✅ 镜像构建完成${NC}"
}

# 启动服务
start_services() {
    log "启动服务..."
    
    cd "$PROJECT_DIR"
    docker-compose up -d app
    
    log "${GREEN}✅ 服务启动完成${NC}"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    for i in {1..30}; do
        if docker exec openclaw-admin curl -sf http://localhost:10001/health >/dev/null 2>&1; then
            log "${GREEN}✅ 健康检查通过${NC}"
            return 0
        fi
        log "⏳ 等待服务启动... ($i/30)"
        sleep 5
    done
    
    log "${YELLOW}⚠️ 健康检查超时，但容器已启动${NC}"
    return 0
}

# 清理旧镜像
cleanup() {
    log "清理旧镜像..."
    
    docker image prune -f --filter "until=24h" || true
    
    log "${GREEN}✅ 清理完成${NC}"
}

# 显示状态
show_status() {
    log "=========================================="
    log "部署状态"
    log "=========================================="
    
    docker-compose ps
    log ""
    log "访问地址：http://localhost:10001"
    log "日志查看：docker-compose logs -f"
    log "=========================================="
}

# 主函数
main() {
    log "=========================================="
    log "🚀 开始部署 OpenClaw-Admin (Docker 版)"
    log "=========================================="
    
    check_dependencies
    stop_containers
    build_image
    start_services
    health_check
    cleanup
    show_status
    
    log "=========================================="
    log "${GREEN}✅ 部署完成！${NC}"
    log "=========================================="
}

# 执行
main
