import { Router } from 'express'
import { requireAuth, requirePermission } from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * GET /api/rbac/permissions
 * 获取所有权限列表（分页）
 */
router.get('/permissions', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, resource } = req.query

    let sql = 'SELECT * FROM permissions'
    let countSql = 'SELECT COUNT(*) as total FROM permissions'
    const params = []

    if (resource) {
      sql += ' WHERE resource = ?'
      countSql += ' WHERE resource = ?'
      params.push(resource)
    }

    sql += ' ORDER BY resource, action LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

    const permissions = db.prepare(sql).all(...params)
    const count = db.prepare(countSql).get(...params).total

    res.json({
      items: permissions,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('Get permissions error:', error)
    res.status(500).json({ error: '获取权限列表失败' })
  }
})

/**
 * POST /api/rbac/permissions
 * 创建权限
 */
router.post('/permissions', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { resource, action, description } = req.body

    if (!resource || !action) {
      return res.status(400).json({ error: '资源和操作不能为空' })
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM permissions WHERE resource = ? AND action = ?').get(resource, action)
    if (existing) {
      return res.status(409).json({ error: '权限已存在' })
    }

    const permId = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stmt = db.prepare(`
      INSERT INTO permissions (id, resource, action, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    stmt.run(permId, resource, action, description || '', now)

    res.status(201).json({
      id: permId,
      resource,
      action,
      description: description || '',
      created_at: now
    })
  } catch (error) {
    console.error('Create permission error:', error)
    res.status(500).json({ error: '创建权限失败' })
  }
})

/**
 * PUT /api/rbac/permissions/:id
 * 更新权限
 */
router.put('/permissions/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const { description } = req.body

    const perm = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id)
    if (!perm) {
      return res.status(404).json({ error: '权限不存在' })
    }

    const stmt = db.prepare(`
      UPDATE permissions 
      SET description = COALESCE(?, description),
          updated_at = ?
      WHERE id = ?
    `)

    const now = Date.now()
    stmt.run(description, now, id)

    res.json({ success: true })
  } catch (error) {
    console.error('Update permission error:', error)
    res.status(500).json({ error: '更新权限失败' })
  }
})

/**
 * DELETE /api/rbac/permissions/:id
 * 删除权限
 */
router.delete('/permissions/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params

    const perm = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id)
    if (!perm) {
      return res.status(404).json({ error: '权限不存在' })
    }

    // 删除关联
    db.prepare('DELETE FROM role_permissions WHERE permission_id = ?').run(id)
    db.prepare('DELETE FROM permissions WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete permission error:', error)
    res.status(500).json({ error: '删除权限失败' })
  }
})

/**
 * GET /api/rbac/roles
 * 获取角色列表（含权限）
 */
router.get('/roles', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const roles = db.prepare(`
      SELECT * FROM roles 
      ORDER BY created_at 
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset)

    const total = db.prepare('SELECT COUNT(*) as total FROM roles').get().total

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

    res.json({
      items: rolesWithPermissions,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
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
    const { name, description, permission_ids = [] } = req.body

    if (!name) {
      return res.status(400).json({ error: '角色名称不能为空' })
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(name)
    if (existing) {
      return res.status(409).json({ error: '角色名称已存在' })
    }

    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stmt = db.prepare(`
      INSERT INTO roles (id, name, description, created_at)
      VALUES (?, ?, ?, ?)
    `)

    const now = Date.now()
    stmt.run(roleId, name, description || '', now)

    // 分配权限
    if (permission_ids.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        VALUES (?, ?, ?)
      `)
      for (const permId of permission_ids) {
        insertStmt.run(roleId, permId, now)
      }
    }

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
 * 获取角色详情
 */
router.get('/roles/:id', requireAuth, async (req, res) => {
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
 * PUT /api/rbac/roles/:id
 * 更新角色
 */
router.put('/roles/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    // 检查名称冲突
    if (name && name !== role.name) {
      const existing = db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').get(name, id)
      if (existing) {
        return res.status(409).json({ error: '角色名称已存在' })
      }
    }

    const stmt = db.prepare(`
      UPDATE roles 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          updated_at = ?
      WHERE id = ?
    `)

    const now = Date.now()
    stmt.run(name, description, now, id)

    res.json({ success: true })
  } catch (error) {
    console.error('Update role error:', error)
    res.status(500).json({ error: '更新角色失败' })
  }
})

/**
 * DELETE /api/rbac/roles/:id
 * 删除角色
 */
router.delete('/roles/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    // 删除关联
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
    db.prepare('DELETE FROM roles WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete role error:', error)
    res.status(500).json({ error: '删除角色失败' })
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
 * GET /api/rbac/users/:userId/permissions
 * 获取用户所有权限
 */
router.get('/users/:userId/permissions', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params

    // 用户直接权限（如果有）
    const directPermissions = db.prepare(`
      SELECT DISTINCT p.* FROM permissions p
      JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = ?
    `).all(userId)

    // 通过角色继承的权限
    const inheritedPermissions = db.prepare(`
      SELECT DISTINCT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId)

    // 合并去重
    const allPermissionIds = new Set([
      ...directPermissions.map(p => p.id),
      ...inheritedPermissions.map(p => p.id)
    ])
    const allPermissions = db.prepare('SELECT * FROM permissions WHERE id IN (' + [...allPermissionIds].map(() => '?').join(',') + ')')
      .all(...allPermissionIds)

    res.json({
      direct_permissions: directPermissions,
      inherited_permissions: inheritedPermissions,
      all_permissions: allPermissions
    })
  } catch (error) {
    console.error('Get user permissions error:', error)
    res.status(500).json({ error: '获取用户权限失败' })
  }
})

/**
 * POST /api/rbac/check
 * 权限检查
 */
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { user_id, permission } = req.body

    if (!user_id || !permission) {
      return res.status(400).json({ error: '用户 ID 和权限不能为空' })
    }

    // 解析权限字符串 (如 users:manage)
    const [resource, action] = permission.split(':')

    // 检查用户是否拥有该权限
    const hasPermission = db.prepare(`
      SELECT 1 FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?
      LIMIT 1
    `).get(user_id, resource, action)

    res.json({
      has_permission: !!hasPermission
    })
  } catch (error) {
    console.error('Check permission error:', error)
    res.status(500).json({ error: '权限检查失败' })
  }
})

/**
 * GET /api/rbac/users/:userId/roles
 * 获取用户角色
 */
router.get('/users/:userId/roles', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params

    const roles = db.prepare(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId)

    res.json({ roles })
  } catch (error) {
    console.error('Get user roles error:', error)
    res.status(500).json({ error: '获取用户角色失败' })
  }
})

/**
 * PUT /api/rbac/users/:userId/roles
 * 分配用户角色
 */
router.put('/users/:userId/roles', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { userId } = req.params
    const { role_ids } = req.body

    // 验证用户存在
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 删除旧角色
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId)

    // 添加新角色
    if (role_ids && role_ids.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO user_roles (user_id, role_id, created_at)
        VALUES (?, ?, ?)
      `)

      const now = Date.now()
      for (const roleId of role_ids) {
        // 验证角色存在
        const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId)
        if (role) {
          insertStmt.run(userId, roleId, now)
        }
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update user roles error:', error)
    res.status(500).json({ error: '更新用户角色失败' })
  }
})

export default router
