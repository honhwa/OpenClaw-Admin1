# 多阶段构建 - OpenClaw-Admin
# 阶段 1: 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 阶段 2: 生产阶段
FROM node:20-alpine

WORKDIR /app

# 安装 PM2 进程管理器
RUN npm install -g pm2

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从构建阶段复制依赖和构建产物
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nodejs:nodejs /app/config ./config
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# 复制配置文件
COPY --chown=nodejs:nodejs .env.example .env

# 创建日志和数据目录
RUN mkdir -p /app/logs /app/data /app/backups && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 10001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 使用 PM2 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
