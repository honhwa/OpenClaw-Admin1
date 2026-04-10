/**
 * 速率限制中间件
 * 防止 API 滥用和 DDoS 攻击
 */

const rateLimitStore = new Map();

/**
 * 速率限制配置
 */
const DEFAULT_CONFIG = {
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 100,    // 最多 100 次请求
  message: '请求过于频繁，请稍后再试'
};

/**
 * 创建速率限制中间件
 * @param {Object} config - 配置选项
 */
export function rateLimit(config = {}) {
  const {
    windowMs = DEFAULT_CONFIG.windowMs,
    maxRequests = DEFAULT_CONFIG.maxRequests,
    message = DEFAULT_CONFIG.message
  } = config;

  // 清理过期记录
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.windowStart > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const identifier = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    let record = rateLimitStore.get(identifier);

    if (!record || now - record.windowStart > windowMs) {
      // 新窗口期
      record = {
        windowStart: now,
        requestCount: 1
      };
      rateLimitStore.set(identifier, record);
      return next();
    }

    // 增加请求计数
    record.requestCount++;

    if (record.requestCount > maxRequests) {
      // 超过限制
      res.setHeader('Retry-After', Math.ceil((record.windowStart + windowMs - now) / 1000));
      return res.status(429).json({
        code: 429,
        message: message,
        timestamp: now
      });
    }

    // 添加响应头
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - record.requestCount);
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.windowStart + windowMs) / 1000));

    next();
  };
}

/**
 * 用户级别速率限制（认证用户）
 */
export function userRateLimit(maxRequests = 500) {
  return rateLimit({ maxRequests });
}

/**
 * API 级别速率限制（特定 API）
 */
export function apiRateLimit(path, maxRequests = 50) {
  return (req, res, next) => {
    if (req.path.startsWith(path)) {
      return rateLimit({ maxRequests })(req, res, next);
    }
    next();
  };
}
