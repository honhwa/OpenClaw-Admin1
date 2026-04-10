/**
 * 错误处理中间件
 * 统一错误处理和响应格式
 */

import { logger } from '../utils/logger.js';

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
  }
}

/**
 * 错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // 应用错误
  if (err instanceof AppError) {
    return res.status(err.code).json({
      code: err.code,
      message: err.message,
      data: err.data,
      timestamp: err.timestamp
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: '无效的认证令牌',
      timestamp: Date.now()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: '认证令牌已过期',
      timestamp: Date.now()
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      data: err.message,
      timestamp: Date.now()
    });
  }

  // 数据库错误
  if (err.code === 'SQLITE_ERROR' || err.code === 'SQLITE_CONSTRAINT') {
    return res.status(500).json({
      code: 500,
      message: '数据库操作失败',
      timestamp: Date.now()
    });
  }

  // 文件操作错误
  if (err.code === 'ENOENT' || err.code === 'EACCES') {
    return res.status(404).json({
      code: 404,
      message: '文件不存在或无法访问',
      timestamp: Date.now()
    });
  }

  // 未知错误
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  return res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    timestamp: Date.now()
  });
}

/**
 * 404 处理中间件
 */
export function notFound(req, res, next) {
  res.status(404).json({
    code: 404,
    message: `无法找到 ${req.method} ${req.path}`,
    timestamp: Date.now()
  });
}
