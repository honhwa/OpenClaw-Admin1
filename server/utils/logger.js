/**
 * 日志工具
 * 统一日志格式和输出
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 日志级别
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

/**
 * 日志配置
 */
const config = {
  level: process.env.LOG_LEVEL || 'info',
  dir: process.env.LOG_DIR || './logs',
  maxFiles: 10,
  maxFileSize: 10 * 1024 * 1024 // 10MB
};

// 确保日志目录存在
if (!fs.existsSync(config.dir)) {
  fs.mkdirSync(config.dir, { recursive: true });
}

/**
 * 格式化日志消息
 */
function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * 写入日志文件
 */
function writeToFile(level, message) {
  const date = new Date();
  const filename = `app-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
  const filepath = path.join(config.dir, filename);
  
  const logMessage = formatMessage(level, message) + '\n';
  
  // 检查文件大小
  try {
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      if (stats.size > config.maxFileSize) {
        // 轮转日志文件
        const backupName = `${filename}.${Date.now()}.bak`;
        fs.renameSync(filepath, path.join(config.dir, backupName));
        
        // 清理旧日志
        cleanupOldLogs();
      }
    }
  } catch (err) {
    // 忽略文件操作错误
  }
  
  fs.appendFileSync(filepath, logMessage);
}

/**
 * 清理旧日志文件
 */
function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(config.dir)
      .filter(f => f.endsWith('.log') || f.endsWith('.bak'))
      .sort()
      .slice(0, -config.maxFiles);
    
    files.forEach(f => {
      try {
        fs.unlinkSync(path.join(config.dir, f));
      } catch (err) {
        // 忽略删除错误
      }
    });
  } catch (err) {
    // 忽略清理错误
  }
}

/**
 * 日志类
 */
class Logger {
  constructor(level = config.level) {
    this.level = level;
  }

  /**
   * 记录错误日志
   */
  error(message, meta = {}) {
    if (LOG_LEVELS.error <= LOG_LEVELS[this.level]) {
      const formatted = formatMessage('error', message, meta);
      console.error(formatted);
      writeToFile('error', message, meta);
    }
  }

  /**
   * 记录警告日志
   */
  warn(message, meta = {}) {
    if (LOG_LEVELS.warn <= LOG_LEVELS[this.level]) {
      const formatted = formatMessage('warn', message, meta);
      console.warn(formatted);
      writeToFile('warn', message, meta);
    }
  }

  /**
   * 记录信息日志
   */
  info(message, meta = {}) {
    if (LOG_LEVELS.info <= LOG_LEVELS[this.level]) {
      const formatted = formatMessage('info', message, meta);
      console.info(formatted);
      writeToFile('info', message, meta);
    }
  }

  /**
   * 记录 HTTP 日志
   */
  http(message, meta = {}) {
    if (LOG_LEVELS.http <= LOG_LEVELS[this.level]) {
      const formatted = formatMessage('http', message, meta);
      console.log(formatted);
      writeToFile('http', message, meta);
    }
  }

  /**
   * 记录调试日志
   */
  debug(message, meta = {}) {
    if (LOG_LEVELS.debug <= LOG_LEVELS[this.level]) {
      const formatted = formatMessage('debug', message, meta);
      console.debug(formatted);
      writeToFile('debug', message, meta);
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    if (LOG_LEVELS.hasOwnProperty(level)) {
      this.level = level;
    }
  }
}

// 导出单例
export const logger = new Logger();

// 创建命名空间日志器
export function createLogger(namespace) {
  const originalInfo = logger.info.bind(logger);
  const originalWarn = logger.warn.bind(logger);
  const originalError = logger.error.bind(logger);
  const originalDebug = logger.debug.bind(logger);
  const originalHttp = logger.http.bind(logger);

  return {
    info: (message, meta = {}) => originalInfo(`[${namespace}] ${message}`, meta),
    warn: (message, meta = {}) => originalWarn(`[${namespace}] ${message}`, meta),
    error: (message, meta = {}) => originalError(`[${namespace}] ${message}`, meta),
    debug: (message, meta = {}) => originalDebug(`[${namespace}] ${message}`, meta),
    http: (message, meta = {}) => originalHttp(`[${namespace}] ${message}`, meta),
    setLevel: logger.setLevel.bind(logger)
  };
}
