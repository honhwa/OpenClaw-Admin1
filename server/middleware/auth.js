/**
 * 认证中间件
 * 验证 JWT Token 并附加用户信息到请求对象
 */

import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error.js';

/**
 * JWT 验证中间件
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, '未提供认证令牌');
    }

    const token = authHeader.substring(7);
    
    // TODO: 实现 JWT 验证
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 附加用户信息到请求对象
    // req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError(401, '令牌已过期'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError(401, '无效的令牌'));
    } else {
      next(error);
    }
  }
}

/**
 * 权限验证中间件
 * 检查用户是否拥有所需权限
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    // TODO: 实现权限检查逻辑
    const userPermissions = req.user?.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return next(new AppError(403, '权限不足'));
    }
    
    next();
  };
}

/**
 * 角色验证中间件
 * 检查用户是否拥有所需角色
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!roles.includes(userRole)) {
      return next(new AppError(403, '角色权限不足'));
    }
    
    next();
  };
}

/**
 * 可选认证中间件
 * 如果提供 token 则验证，否则继续
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // TODO: 实现 JWT 验证
      // req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
    
    next();
  } catch (error) {
    // 忽略认证错误，继续处理
    next();
  }
}
