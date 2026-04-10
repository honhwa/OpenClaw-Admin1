import { Router } from 'express'
import {
  hashPassword, verifyPassword, generateToken, createSession,
  validateSession, invalidateSession, invalidateAllUserSessions,
  getUserById, getUserByUsername, getUserPermissions, userHasPermission,
  userHasAnyPermission, getUserRoles, attachAuth, requireAuth,
  requirePermission, requireAnyPermission, requireRole,
  createAuditLog, getAuditLogs, cleanupExpiredSessions
} from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    const user = getUserByUsername(username)
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const valid = verifyPassword(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: '用户账号已被禁用' })
    }

    // 创建 Session
    const session = await createSession(user.id, req.ip)
    const token = generateToken(user.id, session.id)

    // 更新最后登录时间
    const stmt = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
    stmt.run(Date.now(), user.id)

    // 记录审计日志
    createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'login',
      resource: 'auth',
      resource_id: session.id,
      details: JSON.stringify({ status: 'success' }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'success'
    })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        avatar: user.avatar,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: '登录失败' })
  }
})

/**
 * POST /api/auth/logout
 * 用户登出
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const sessionId = req.sessionId
    await invalidateSession(sessionId)

    createAuditLog({
      user_id: req.user.id,
      username: req.user.username,
      action: 'logout',
      resource: 'auth',
      resource_id: sessionId,
      details: JSON.stringify({ status: 'success' }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'success'
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: '登出失败' })
  }
})

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = getUserById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      email: user.email,
      avatar: user.avatar,
      created_at: user.created_at
    })
  } catch (error) {
    console.error('Get user info error:', error)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少 6 位' })
    }

    const user = getUserById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const valid = verifyPassword(oldPassword, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: '旧密码错误' })
    }

    const newPasswordHash = hashPassword(newPassword)
    const stmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    stmt.run(newPasswordHash, Date.now(), user.id)

    createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'change_password',
      resource: 'auth',
      resource_id: user.id,
      details: JSON.stringify({ status: 'success' }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'success'
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: '修改密码失败' })
  }
})

/**
 * POST /api/auth/register
 * 用户注册（仅允许首次注册或 admin 注册）
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, display_name, email } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 位' })
    }

    // 检查用户是否已存在
    const existingUser = getUserByUsername(username)
    if (existingUser) {
      return res.status(409).json({ error: '用户名已存在' })
    }

    // 创建新用户
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const passwordHash = hashPassword(password)

    const stmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, email, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'viewer', 'active', ?, ?)
    `)

    const now = Date.now()
    stmt.run(userId, username, passwordHash, display_name || username, email, now, now)

    createAuditLog({
      user_id: userId,
      username: username,
      action: 'register',
      resource: 'auth',
      resource_id: userId,
      details: JSON.stringify({ status: 'success' }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'success'
    })

    res.status(201).json({
      id: userId,
      username,
      display_name: display_name || username,
      role: 'viewer',
      status: 'active',
      created_at: now
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: '注册失败' })
  }
})

export default router
