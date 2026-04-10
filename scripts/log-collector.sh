#!/bin/bash
# OpenClaw-Admin 日志收集脚本
# 功能：收集、压缩、归档日志文件

LOG_DIR="/www/wwwroot/ai-work/logs"
ARCHIVE_DIR="/www/wwwroot/ai-work/logs/archives"
DATE=$(date '+%Y%m%d')
RETENTION_DAYS=30

# 创建归档目录
mkdir -p "$ARCHIVE_DIR"

# 记录日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "开始日志收集..."

# 收集所有日志文件
LOG_FILES=$(find "$LOG_DIR" -name "*.log" -type f ! -name "log-collector.log" 2>/dev/null)

if [ -z "$LOG_FILES" ]; then
    log "没有找到需要收集的日志文件"
    exit 0
fi

# 创建今日归档
ARCHIVE_FILE="$ARCHIVE_DIR/logs_$DATE.tar.gz"

log "压缩日志文件到：$ARCHIVE_FILE"
tar -czf "$ARCHIVE_FILE" -C "$LOG_DIR" *.log 2>/dev/null || true

if [ -f "$ARCHIVE_FILE" ]; then
    log "✅ 日志归档完成"
    
    # 显示归档大小
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
    log "归档大小：$ARCHIVE_SIZE"
else
    log "❌ 日志归档失败"
fi

# 清理旧归档
log "清理 $RETENTION_DAYS 天前的归档..."
find "$ARCHIVE_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# 清理大日志文件（超过 100MB）
log "清理大日志文件..."
find "$LOG_DIR" -name "*.log" -size +100M -exec cp {} "$ARCHIVE_DIR/" \; -exec truncate -s 0 {} \; 2>/dev/null || true

log "日志收集完成"

# 输出统计信息
echo ""
echo "========== 日志统计 =========="
echo "总日志文件数：$(find "$LOG_DIR" -name "*.log" -type f | wc -l)"
echo "总日志大小：$(du -sh "$LOG_DIR" | cut -f1)"
echo "归档文件数：$(find "$ARCHIVE_DIR" -name "*.tar.gz" | wc -l)"
echo "=============================="
