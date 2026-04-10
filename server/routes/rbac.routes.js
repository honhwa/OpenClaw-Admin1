import { Router } from 'express'
import { requireAuth, requirePermission } from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * GET /api/rbac/permissions
 * 获取所有权限列表
 */
router.get('/permissions', requireAuth, async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM permissions ORDER BY resource, action')
    const permissions = stmt.all()

    res.json(permissions)
  } catch (error) {
    console.error('Get permissions error:', error)
    res.status(500).json({ error: '获取权限列表失败' })
  }
})

/**
 * GET /api/rbac/roles
 * 获取角色列表
 */
router.get('/roles', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM roles ORDER BY created_at')
    const roles = stmt.all()

    // 为每个角色获取权限
    const rolesWithPermissions = roles.map(role => {
      const rolePermissions = db.prepare(`
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `).all(role.id)

      return {
        ...role,
        permissions: rolePermissions
      }
    })

    res.json(rolesWithPermissions)
  } catch (error) {
    console.error('Get roles error:', error)
    res.status(500).json({ error: '获取角色列表失败' })
  }
})

/**
 * POST /api/rbac/roles
 * 创建角色
 */
router.post('/roles', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: '角色名称不能为空' })
    }

    const existingRole = db.prepare('SELECT id FROM roles WHERE name = ?').get(name)
    if (existingRole) {
      return res.status(409).json({ error: '角色名称已存在' })
    }

    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stmt = db.prepare(`
      INSERT INTO roles (id, name, description, created_at)
      VALUES (?, ?, ?, ?)
    `)

    const now = Date.now()
    stmt.run(roleId, name, description || '', now)

    res.status(201).json({
      id: roleId,
      name,
      description: description || '',
      created_at: now
    })
  } catch (error) {
    console.error('Create role error:', error)
    res.status(500).json({ error: '创建角色失败' })
  }
})

/**
 * GET /api/rbac/roles/:id
 * 获取角色详情（含权限）
 */
router.get('/roles/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)

    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    const rolePermissions = db.prepare(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).all(id)

    res.json({
      ...role,
      permissions: rolePermissions
    })
  } catch (error) {
    console.error('Get role error:', error)
    res.status(500).json({ error: '获取角色详情失败' })
  }
})

/**
 * PUT /api/rbac/roles/:id/permissions
 * 分配角色权限
 */
router.put('/roles/:id/permissions', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const { permission_ids } = req.body

    const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    // 删除旧权限
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)

    // 添加新权限
    if (permission_ids && permission_ids.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        VALUES (?, ?, ?)
      `)

      const now = Date.now()
      for (const permissionId of permission_ids) {
        insertStmt.run(id, permissionId, now)
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update role permissions error:', error)
    res.status(500).json({ error: '更新角色权限失败' })
  }
})

/**
 * GET /api/rbac/user/:userId/permissions
 * 获取用户所有权限（通过角色）
 */
router.get('/user/:userId/permissions', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params

    const permissions = db.prepare(`
      SELECT DISTINCT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN users_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId)

    res.json(permissions)
  } catch (error) {
    console.error('Get user permissions error:', error)
    res.status(500).json({ error: '获取用户权限失败' })
  }
})

export default router
