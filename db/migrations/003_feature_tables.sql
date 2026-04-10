-- ============================================================
-- OpenClaw-Admin: Feature Enhancement Tables
-- Version: 003
-- Tables: 
--   - operation_logs (批量操作日志)
--   - search_indexes (搜索索引)
--   - performance_metrics (性能指标)
--   - user_behavior_logs (用户行为日志)
-- Author: DBA Agent
-- Created: 2026-04-11
-- ============================================================

-- ============================================================
-- 1. OPERATION_LOGS 表 - 批量操作日志
-- 用途：记录批量操作的详细信息，支持审计和回溯
-- ============================================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id             TEXT    PRIMARY KEY,
    operator_id    TEXT,                     -- 操作人 ID
    operator_name  TEXT,                     -- 操作人姓名
    operation_type TEXT    NOT NULL,         -- 操作类型：batch_create, batch_update, batch_delete, batch_export, etc.
    target_resource TEXT   NOT NULL,         -- 目标资源：users, roles, agents, etc.
    target_ids     TEXT    NOT NULL,         -- 目标资源 ID 列表 (JSON 数组)
    operation_params TEXT  DEFAULT '{}',     -- 操作参数 (JSON)
    result         TEXT    NOT NULL,         -- 结果：success, partial_success, failed
    success_count  INTEGER DEFAULT 0,        -- 成功数量
    failed_count   INTEGER DEFAULT 0,        -- 失败数量
    error_details  TEXT,                     -- 错误详情 (JSON)
    duration_ms    INTEGER,                  -- 操作耗时 (毫秒)
    ip_address     TEXT,
    user_agent     TEXT,
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_operator ON operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_resource ON operation_logs(target_resource);
CREATE INDEX IF NOT EXISTS idx_operation_logs_result ON operation_logs(result);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

-- ============================================================
-- 2. SEARCH_INDEXES 表 - 搜索索引
-- 用途：为智能搜索系统建立索引，提高搜索效率
-- ============================================================
CREATE TABLE IF NOT EXISTS search_indexes (
    id             TEXT    PRIMARY KEY,
    resource_type  TEXT    NOT NULL,         -- 资源类型：user, agent, config, etc.
    resource_id    TEXT    NOT NULL,         -- 资源 ID
    title          TEXT,                     -- 标题/名称
    content        TEXT,                     -- 搜索内容 (全文)
    tags           TEXT    DEFAULT '[]',     -- 标签 (JSON 数组)
    metadata       TEXT    DEFAULT '{}',     -- 元数据 (JSON)
    weight         INTEGER DEFAULT 1,        -- 权重 (用于排序)
    is_active      INTEGER DEFAULT 1,        -- 是否启用：1=启用，0=禁用
    indexed_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_search_indexes_resource ON search_indexes(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_search_indexes_tags ON search_indexes(tags);
CREATE INDEX IF NOT EXISTS idx_search_indexes_active ON search_indexes(is_active);
CREATE INDEX IF NOT EXISTS idx_search_indexes_updated ON search_indexes(updated_at);

-- ============================================================
-- 3. PERFORMANCE_METRICS 表 - 性能指标
-- 用途：收集系统性能数据，用于监控面板展示
-- ============================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id             TEXT    PRIMARY KEY,
    metric_name    TEXT    NOT NULL,         -- 指标名称：cpu_usage, memory_usage, db_query_time, etc.
    metric_type    TEXT    NOT NULL,         -- 指标类型：gauge, counter, histogram
    resource_type  TEXT,                     -- 资源类型：server, database, api, etc.
    resource_id    TEXT,                     -- 资源 ID
    value          REAL    NOT NULL,         -- 指标值
    unit           TEXT,                     -- 单位：percent, ms, bytes, count, etc.
    labels         TEXT    DEFAULT '{}',     -- 标签 (JSON)
    timestamp      INTEGER NOT NULL,         -- 指标时间戳
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_resource ON performance_metrics(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_created ON performance_metrics(created_at);

-- 聚合指标表（用于快速查询统计）
CREATE TABLE IF NOT EXISTS performance_metrics_summary (
    id             TEXT    PRIMARY KEY,
    metric_name    TEXT    NOT NULL,
    resource_type  TEXT,
    interval       TEXT    NOT NULL,         -- 时间间隔：1h, 24h, 7d, 30d
    start_time     INTEGER NOT NULL,         -- 统计开始时间
    end_time       INTEGER NOT NULL,         -- 统计结束时间
    count          INTEGER DEFAULT 0,        -- 样本数
    sum            REAL,                     -- 总和
    avg            REAL,                     -- 平均值
    min            REAL,                     -- 最小值
    max            REAL,                     -- 最大值
    p50            REAL,                     -- 50 分位值
    p95            REAL,                     -- 95 分位值
    p99            REAL,                     -- 99 分位值
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(metric_name, resource_type, interval, start_time)
);

CREATE INDEX IF NOT EXISTS idx_perf_summary_name ON performance_metrics_summary(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_summary_interval ON performance_metrics_summary(interval);
CREATE INDEX IF NOT EXISTS idx_perf_summary_time ON performance_metrics_summary(start_time, end_time);

-- ============================================================
-- 4. USER_BEHAVIOR_LOGS 表 - 用户行为日志
-- 用途：记录用户行为，用于行为分析面板
-- ============================================================
CREATE TABLE IF NOT EXISTS user_behavior_logs (
    id             TEXT    PRIMARY KEY,
    user_id        TEXT,                     -- 用户 ID
    user_name      TEXT,                     -- 用户姓名
    session_id     TEXT,                     -- 会话 ID
    event_type     TEXT    NOT NULL,         -- 事件类型：page_view, click, search, api_call, etc.
    event_name     TEXT    NOT NULL,         -- 事件名称：view_dashboard, click_button, search_users, etc.
    page_url       TEXT,                     -- 页面 URL
    page_title     TEXT,                     -- 页面标题
    element_id     TEXT,                     -- 元素 ID (点击事件)
    element_text   TEXT,                     -- 元素文本 (点击事件)
    search_query   TEXT,                     -- 搜索关键词 (搜索事件)
    search_results INTEGER,                  -- 搜索结果数 (搜索事件)
    api_endpoint   TEXT,                     -- API 端点 (API 调用事件)
    api_method     TEXT,                     -- HTTP 方法
    api_status     INTEGER,                  -- HTTP 状态码
    api_duration_ms INTEGER,                 -- API 耗时
    properties     TEXT    DEFAULT '{}',     -- 自定义属性 (JSON)
    ip_address     TEXT,
    user_agent     TEXT,
    referrer       TEXT,                     -- 来源页面
    timestamp      INTEGER NOT NULL,         -- 事件时间戳
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_behavior_user ON user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_event ON user_behavior_logs(event_type, event_name);
CREATE INDEX IF NOT EXISTS idx_behavior_page ON user_behavior_logs(page_url);
CREATE INDEX IF NOT EXISTS idx_behavior_session ON user_behavior_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_timestamp ON user_behavior_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_behavior_created ON user_behavior_logs(created_at);

-- ============================================================
-- SEED: 初始化示例数据
-- ============================================================

-- 示例：初始化搜索索引（可根据实际情况调整）
INSERT OR IGNORE INTO search_indexes (id, resource_type, resource_id, title, content, tags, weight) VALUES
    ('idx_user_admin', 'user', 'user_admin', 'Administrator', 'System administrator account', '["system", "admin"]', 10),
    ('idx_role_admin', 'role', 'role_admin', 'Admin Role', 'Full administrative access role', '["system", "role"]', 10),
    ('idx_role_operator', 'role', 'role_operator', 'Operator Role', 'Standard operator role', '["system", "role"]', 5),
    ('idx_role_viewer', 'role', 'role_viewer', 'Viewer Role', 'Read-only access role', '["system", "role"]', 5);

-- ============================================================
-- 迁移说明
-- ============================================================
-- 
-- 表结构说明：
-- 1. operation_logs: 记录批量操作的完整信息，包括操作人、操作类型、目标资源、结果等
-- 2. search_indexes: 为搜索系统建立索引，支持全文搜索和标签筛选
-- 3. performance_metrics: 收集系统性能指标，支持多种指标类型和时间序列存储
-- 4. performance_metrics_summary: 预聚合的性能指标，用于快速查询统计
-- 5. user_behavior_logs: 记录用户行为事件，支持行为分析和用户画像
--
-- 索引设计：
-- - 所有表都创建了常用查询字段的索引
-- - 复合索引用于提高多条件查询性能
-- - 时间字段索引用于时间范围查询
--
-- 性能优化建议：
-- 1. 定期清理旧的 operation_logs 和 user_behavior_logs (建议保留 90 天)
-- 2. performance_metrics 表数据量大时，考虑按时间分表
-- 3. search_indexes 应在资源更新时同步更新
--
-- ============================================================
