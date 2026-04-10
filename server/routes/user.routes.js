import { Router } from 'express'
import {
  requireAuth, requirePermission, getUserById
} from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * GET /api/users
 * 获取用户列表（仅 admin）
 */
router.get('/', requireAuth, requirePermission('users:manage'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let sql = 'SELECT * FROM users WHERE 1=1'
    const params = []

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (role) {
      sql += ' AND role = ?'
      params.push(role)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    const stmt = db.prepare(sql)
    const users = stmt.all(...params)

    const countStmt = db.prepare('SELECT COUNT(*) as total FROM users WHERE 1=1')
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1'
    const countParams = []
    if (status) {
      countSql += ' AND status = ?'
      countParams.push(status)
    }
    if (role) {
      countSql += ' AND role = ?'
      countParams.push(role)
    }
    const count = db.prepare(countSql).get(...countParams).total

    res.json({
      items: users,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: '获取用户列表失败' })
  }
})

/**
 * POST /api/users
 * 创建用户（仅 admin）
 */
router.post('/', requireAuth, requirePermission('users:manage'), async (req, res) => {
  try {
    const { username, password, display_name, email, role } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 位' })
    }

    const validRoles = ['admin', 'operator', 'viewer']
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: '无效的角色' })
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existingUser) {
      return res.status(409).json({ error: '用户名已存在' })
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const { hashPassword } = await import('../auth.js')
    const passwordHash = hashPassword(password)

    const stmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, email, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `)

    const now = Date.now()
    stmt.run(userId, username, passwordHash, display_name || username, email, role || 'viewer', now, now)

    res.status(201).json({
      id: userId,
      username,
      display_name: display_name || username,
      role: role || 'viewer',
      status: 'active',
      created_at: now
    })
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ error: '创建用户失败' })
  }
})

/**
 * GET /api/users/:id
 * 获取用户详情
 */
router.get('/:id', requireAuth, requirePermission('users:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const user = getUserById(id)

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: '获取用户详情失败' })
  }
})

/**
 * PATCH /api/users/:id
 * 更新用户信息
 */
router.patch('/:id', requireAuth, requirePermission('users:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const { display_name, email, role, status, avatar } = req.body

    const user = getUserById(id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const validRoles = ['admin', 'operator', 'viewer']
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: '无效的角色' })
    }

    const validStatus = ['active', 'inactive', 'suspended']
    if (status && !validStatus.includes(status)) {
      return res.status(400).json({ error: '无效的状态' })
    }

    const stmt = db.prepare(`
      UPDATE users 
      SET display_name = COALESCE(?, display_name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          status = COALESCE(?, status),
          avatar = COALESCE(?, avatar),
          updated_at = ?
      WHERE id = ?
    `)

    const now = Date.now()
    stmt.run(display_name, email, role, status, avatar, now, id)

    res.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: '更新用户失败' })
  }
})

/**
 * DELETE /api/users/:id
 * 删除用户
 */
router.delete('/:id', requireAuth, requirePermission('users:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const user = getUserById(id)

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    if (id === req.user.id) {
      return res.status(400).json({ error: '不能删除自己' })
    }

    const stmt = db.prepare('DELETE FROM users WHERE id = ?')
    stmt.run(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: '删除用户失败' })
  }
})

export default router
