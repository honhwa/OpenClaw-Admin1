#!/bin/bash
# 监控配置检查脚本
# 功能：验证监控系统配置完整性

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
MONITORING_DIR="$PROJECT_DIR/monitoring"
LOG_DIR="$PROJECT_DIR/logs"
CHECK_LOG="$LOG_DIR/monitoring-check_$(date '+%Y%m%d_%H%M%S').log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$CHECK_LOG"
}

# 检查 Prometheus 配置
check_prometheus() {
    log "检查 Prometheus 配置..."
    
    if [ -f "$MONITORING_DIR/prometheus/prometheus.yml" ]; then
        log "${GREEN}✅ Prometheus 配置文件存在${NC}"
        
        # 检查配置语法
        if command -v promtool >/dev/null 2>&1; then
            promtool check config "$MONITORING_DIR/prometheus/prometheus.yml" 2>&1 | tee -a "$CHECK_LOG"
            if [ $? -eq 0 ]; then
                log "${GREEN}✅ Prometheus 配置语法正确${NC}"
            else
                log "${RED}❌ Prometheus 配置语法错误${NC}"
                return 1
            fi
        else
            log "${YELLOW}⚠️ promtool 未安装，跳过语法检查${NC}"
        fi
    else
        log "${RED}❌ Prometheus 配置文件不存在${NC}"
        return 1
    fi
    
    # 检查告警规则
    if [ -f "$MONITORING_DIR/prometheus/alerts-rules.yml" ]; then
        log "${GREEN}✅ 告警规则文件存在${NC}"
    else
        log "${YELLOW}⚠️ 告警规则文件不存在${NC}"
    fi
    
    return 0
}

# 检查 Grafana 配置
check_grafana() {
    log "检查 Grafana 配置..."
    
    if [ -d "$MONITORING_DIR/grafana/provisioning/datasources" ]; then
        log "${GREEN}✅ Grafana 数据源配置目录存在${NC}"
        
        if [ -f "$MONITORING_DIR/grafana/provisioning/datasources/datasources.yml" ]; then
            log "${GREEN}✅ Grafana 数据源配置文件存在${NC}"
        else
            log "${RED}❌ Grafana 数据源配置文件不存在${NC}"
            return 1
        fi
    else
        log "${RED}❌ Grafana 配置目录不存在${NC}"
        return 1
    fi
    
    if [ -d "$MONITORING_DIR/grafana/provisioning/dashboards" ]; then
        log "${GREEN}✅ Grafana 仪表盘配置目录存在${NC}"
    else
        log "${RED}❌ Grafana 仪表盘配置目录不存在${NC}"
        return 1
    fi
    
    return 0
}

# 检查监控容器状态
check_containers() {
    log "检查监控容器状态..."
    
    local SERVICES=("prometheus" "grafana" "alertmanager" "node-exporter" "cadvisor")
    local STATUS=0
    
    for service in "${SERVICES[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
            log "${GREEN}✅ $service 容器运行中${NC}"
        else
            log "${YELLOW}⚠️ $service 容器未运行${NC}"
            STATUS=1
        fi
    done
    
    return $STATUS
}

# 检查监控端点可达性
check_endpoints() {
    log "检查监控端点可达性..."
    
    local ENDPOINTS=(
        "http://localhost:9090/-/healthy:Prometheus"
        "http://localhost:3002/api/health:Grafana"
        "http://localhost:9093/api/status:Alertmanager"
        "http://localhost:9100/metrics:Node Exporter"
        "http://localhost:8080/metrics:cAdvisor"
    )
    
    local STATUS=0
    
    for endpoint in "${ENDPOINTS[@]}"; do
        local URL=$(echo $endpoint | cut -d: -f1)
        local NAME=$(echo $endpoint | cut -d: -f2)
        
        if curl -sf "$URL" >/dev/null 2>&1; then
            log "${GREEN}✅ $NAME 端点正常${NC}"
        else
            log "${YELLOW}⚠️ $NAME 端点不可达${NC}"
            STATUS=1
        fi
    done
    
    return $STATUS
}

# 检查磁盘空间
check_disk_space() {
    log "检查磁盘空间..."
    
    local USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
    
    if [ "$USAGE" -gt 90 ]; then
        log "${RED}❌ 磁盘使用率超过 90% ($USAGE%)${NC}"
        return 1
    elif [ "$USAGE" -gt 80 ]; then
        log "${YELLOW}⚠️ 磁盘使用率超过 80% ($USAGE%)${NC}"
        return 0
    else
        log "${GREEN}✅ 磁盘使用率正常 ($USAGE%)${NC}"
        return 0
    fi
}

# 检查日志文件大小
check_log_size() {
    log "检查日志文件大小..."
    
    local LOG_SIZES=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    log "日志目录大小：$LOG_SIZES"
    
    # 检查单个日志文件是否过大
    local LARGE_LOGS=$(find "$LOG_DIR" -type f -size +100M 2>/dev/null | wc -l)
    
    if [ "$LARGE_LOGS" -gt 0 ]; then
        log "${YELLOW}⚠️ 发现 $LARGE_LOGS 个超过 100MB 的日志文件${NC}"
    else
        log "${GREEN}✅ 日志文件大小正常${NC}"
    fi
    
    return 0
}

# 生成检查报告
generate_report() {
    log ""
    log "=========================================="
    log "📊 监控配置检查报告"
    log "=========================================="
    log ""
    log "检查日志已保存：$CHECK_LOG"
    log ""
    log "监控服务访问地址:"
    log "  - Prometheus: http://localhost:9090"
    log "  - Grafana: http://localhost:3002 (admin/admin123)"
    log "  - Alertmanager: http://localhost:9093"
    log "  - Node Exporter: http://localhost:9100"
    log "  - cAdvisor: http://localhost:8080"
    log ""
}

# 主函数
main() {
    log "=========================================="
    log "🔍 开始监控配置检查"
    log "=========================================="
    
    mkdir -p "$LOG_DIR"
    
    local STATUS=0
    
    check_prometheus || STATUS=1
    check_grafana || STATUS=1
    check_containers
    check_endpoints
    check_disk_space
    check_log_size
    
    generate_report
    
    log "=========================================="
    if [ $STATUS -eq 0 ]; then
        log "${GREEN}✅ 监控配置检查完成${NC}"
    else
        log "${RED}❌ 部分检查项失败，请查看日志${NC}"
    fi
    log "=========================================="
    
    return $STATUS
}

# 执行
main
