/**
 * 错误处理工具
 * 统一错误类和错误处理函数
 */

import { logger } from './logger.js';

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(code, message, data = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.data = data;
    this.timestamp = Date.now();
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp
    };
  }
}

/**
 * 常见错误码
 */
export const ERROR_CODES = {
  // 4xx 客户端错误
  BAD_REQUEST: 4000,
  UNAUTHORIZED: 4010,
  FORBIDDEN: 4030,
  NOT_FOUND: 4040,
  METHOD_NOT_ALLOWED: 4050,
  CONFLICT: 4090,
  TOO_MANY_REQUESTS: 4290,
  
  // 5xx 服务端错误
  INTERNAL_ERROR: 5000,
  DATABASE_ERROR: 5001,
  VALIDATION_ERROR: 4001,
  AUTH_ERROR: 4011,
  FILE_ERROR: 5002,
  
  // 业务错误
  USER_NOT_FOUND: 1001,
  USER_EXISTS: 1002,
  INVALID_CREDENTIALS: 1003,
  TOKEN_EXPIRED: 1004,
  TOKEN_INVALID: 1005,
  PERMISSION_DENIED: 1006,
  PROJECT_NOT_FOUND: 2001,
  PROJECT_EXISTS: 2002,
  TASK_NOT_FOUND: 3001,
  FILE_NOT_FOUND: 4001,
  FILE_TOO_LARGE: 4002
};

/**
 * 创建应用错误
 */
export function createError(code, message, data = null) {
  return new AppError(code, message, data);
}

/**
 * 验证参数
 */
export function validateParams(params, rules) {
  const errors = [];

  for (const [key, rule] of Object.entries(rules)) {
    const value = params[key];

    // 必填检查
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: key, reason: '不能为空' });
      continue;
    }

    // 类型检查
    if (value !== undefined && value !== null && rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push({ field: key, reason: `类型错误，期望 ${rule.type}` });
        continue;
      }
    }

    // 最小长度检查
    if (rule.minLength && value && value.length < rule.minLength) {
      errors.push({ field: key, reason: `长度不能少于 ${rule.minLength} 个字符` });
    }

    // 最大长度检查
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors.push({ field: key, reason: `长度不能超过 ${rule.maxLength} 个字符` });
    }

    // 正则表达式检查
    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors.push({ field: key, reason: `格式不正确` });
    }

    // 值范围检查
    if (rule.min !== undefined && value < rule.min) {
      errors.push({ field: key, reason: `值不能小于 ${rule.min}` });
    }

    if (rule.max !== undefined && value > rule.max) {
      errors.push({ field: key, reason: `值不能大于 ${rule.max}` });
    }
  }

  if (errors.length > 0) {
    throw createError(ERROR_CODES.VALIDATION_ERROR, '参数验证失败', { errors });
  }
}

/**
 * 异步错误处理包装器
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 记录未捕获异常
 */
export function setupErrorHandlers() {
  // 未捕获异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  // 未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  });

  // 信号处理
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}
