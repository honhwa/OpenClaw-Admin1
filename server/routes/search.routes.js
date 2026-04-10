import { Router } from 'express'
import { requireAuth } from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * GET /api/search/global
 * 全局搜索
 */
router.get('/global', requireAuth, async (req, res) => {
  try {
    const { q, types, page = 1, limit = 20 } = req.query

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: '请输入搜索关键词' })
    }

    const searchTypes = types ? types.split(',') : ['users', 'tasks', 'scenarios']
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const searchTerm = `%${q}%`

    const results = []

    // 搜索用户
    if (searchTypes.includes('users')) {
      const userStmt = db.prepare(`
        SELECT id, username, display_name, email, role, status, created_at
        FROM users 
        WHERE display_name LIKE ? OR username LIKE ? OR email LIKE ?
        LIMIT ? OFFSET ?
      `)
      const users = userStmt.all(searchTerm, searchTerm, searchTerm, parseInt(limit), offset)
      results.push(...users.map(u => ({
        type: 'user',
        id: u.id,
        title: u.display_name || u.username,
        description: `用户名：${u.username}, 邮箱：${u.email}`,
        data: u
      })))
    }

    // 搜索任务
    if (searchTypes.includes('tasks')) {
      const taskStmt = db.prepare(`
        SELECT id, title, description, status, priority, created_at
        FROM tasks 
        WHERE title LIKE ? OR description LIKE ?
        LIMIT ? OFFSET ?
      `)
      const tasks = taskStmt.all(searchTerm, searchTerm, parseInt(limit), offset)
      results.push(...tasks.map(t => ({
        type: 'task',
        id: t.id,
        title: t.title,
        description: `状态：${t.status}, 优先级：${t.priority}`,
        data: t
      })))
    }

    // 搜索场景
    if (searchTypes.includes('scenarios')) {
      const scenarioStmt = db.prepare(`
        SELECT id, name, description, status, created_at
        FROM scenarios 
        WHERE name LIKE ? OR description LIKE ?
        LIMIT ? OFFSET ?
      `)
      const scenarios = scenarioStmt.all(searchTerm, searchTerm, parseInt(limit), offset)
      results.push(...scenarios.map(s => ({
        type: 'scenario',
        id: s.id,
        title: s.name,
        description: `状态：${s.status}`,
        data: s
      })))
    }

    // 获取总数
    const totalStmt = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE display_name LIKE ? OR username LIKE ?) +
        (SELECT COUNT(*) FROM tasks WHERE title LIKE ? OR description LIKE ?) +
        (SELECT COUNT(*) FROM scenarios WHERE name LIKE ? OR description LIKE ?) as total
    `)
    const total = totalStmt.get(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm).total

    res.json({
      items: results,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('Global search error:', error)
    res.status(500).json({ error: '搜索失败' })
  }
})

/**
 * POST /api/:resource/filter
 * 高级筛选
 */
router.post('/:resource/filter', requireAuth, async (req, res) => {
  try {
    const { resource } = req.params
    const { filters = [], sort = [], page = 1, limit = 20 } = req.body

    // 映射资源类型
    const resourceMap = {
      'users': { table: 'users', allowedFields: ['id', 'username', 'display_name', 'email', 'role', 'status', 'created_at'] },
      'tasks': { table: 'tasks', allowedFields: ['id', 'title', 'description', 'status', 'priority', 'assigned_agents', 'created_at'] },
      'scenarios': { table: 'scenarios', allowedFields: ['id', 'name', 'description', 'status', 'created_at', 'updated_at'] },
      'audit-logs': { table: 'audit_logs', allowedFields: ['id', 'user_id', 'action', 'resource', 'resource_id', 'timestamp'] }
    }

    const config = resourceMap[resource]
    if (!config) {
      return res.status(400).json({ error: '不支持的资源类型' })
    }

    const { table, allowedFields } = config

    // 构建 WHERE 条件
    const whereConditions = []
    const params = []

    const operatorMap = {
      'eq': '=',
      'neq': '!=',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'in': 'IN',
      'contains': 'LIKE',
      'like': 'LIKE'
    }

    for (const filter of filters) {
      const { field, operator, value } = filter

      if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: `不允许的筛选字段：${field}` })
      }

      const sqlOperator = operatorMap[operator]
      if (!sqlOperator) {
        return res.status(400).json({ error: `不支持的运算符：${operator}` })
      }

      let condition = ''
      let param = value

      if (operator === 'in') {
        condition = `${field} IN (${value.map(() => '?').join(',')})`
        params.push(...value)
      } else if (operator === 'contains' || operator === 'like') {
        condition = `${field} LIKE ?`
        param = `%${value}%`
      } else {
        condition = `${field} ${sqlOperator} ?`
      }

      whereConditions.push(condition)
      if (!(operator === 'in')) {
        params.push(param)
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 构建 ORDER BY
    const orderBy = sort.map(s => `${s.field} ${s.order || 'ASC'}`).join(', ')
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY created_at DESC'

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const limitClause = `LIMIT ? OFFSET ?`
    params.push(parseInt(limit), offset)

    // 查询数据
    const selectStmt = db.prepare(`SELECT * FROM ${table} ${whereClause} ${orderClause} ${limitClause}`)
    const items = selectStmt.all(...params)

    // 查询总数
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`)
    const total = countStmt.get(...params.slice(0, -2)).total

    res.json({
      items,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('Filter error:', error)
    res.status(500).json({ error: '筛选失败' })
  }
})

/**
 * GET /api/search/suggest
 * 搜索建议
 */
router.get('/suggest', requireAuth, async (req, res) => {
  try {
    const { q, type, limit = 5 } = req.query

    if (!q || q.trim().length === 0) {
      return res.json({ suggestions: [] })
    }

    const searchTerm = `%${q}%`
    const suggestions = []

    if (!type || type === 'users') {
      const userStmt = db.prepare(`
        SELECT DISTINCT display_name FROM users 
        WHERE display_name LIKE ? 
        LIMIT ?
      `)
      const users = userStmt.all(searchTerm, parseInt(limit))
      suggestions.push(...users.map(u => u.display_name))
    }

    if (!type || type === 'tasks') {
      const taskStmt = db.prepare(`
        SELECT DISTINCT title FROM tasks 
        WHERE title LIKE ? 
        LIMIT ?
      `)
      const tasks = taskStmt.all(searchTerm, parseInt(limit))
      suggestions.push(...tasks.map(t => t.title))
    }

    if (!type || type === 'scenarios') {
      const scenarioStmt = db.prepare(`
        SELECT DISTINCT name FROM scenarios 
        WHERE name LIKE ? 
        LIMIT ?
      `)
      const scenarios = scenarioStmt.all(searchTerm, parseInt(limit))
      suggestions.push(...scenarios.map(s => s.name))
    }

    res.json({
      suggestions: suggestions.slice(0, parseInt(limit))
    })
  } catch (error) {
    console.error('Search suggest error:', error)
    res.status(500).json({ error: '获取搜索建议失败' })
  }
})

export default router
