import { Router } from 'express'
import { requireAuth, requirePermission } from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * DELETE /api/batch/:resource
 * 批量删除资源
 */
router.delete('/:resource', requireAuth, async (req, res) => {
  try {
    const { resource } = req.params
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的记录 ID 列表' })
    }

    // 映射资源类型到表名
    const resourceMap = {
      'users': 'users',
      'tasks': 'tasks',
      'scenarios': 'scenarios',
      'audit-logs': 'audit_logs',
      'sessions': 'sessions'
    }

    const tableName = resourceMap[resource]
    if (!tableName) {
      return res.status(400).json({ error: '不支持的资源类型' })
    }

    // 检查权限
    const requiredPermission = `${resource.replace('-', '')}:delete`
    try {
      requirePermission(requiredPermission)(req, res, () => {})
    } catch (e) {
      return res.status(403).json({ error: '无权限执行此操作' })
    }

    // 执行批量删除
    const placeholders = ids.map(() => '?').join(',')
    const deleteStmt = db.prepare(`DELETE FROM ${tableName} WHERE id IN (${placeholders})`)
    const result = deleteStmt.run(...ids)

    // 统计失败项（理论上不会失败，除非外键约束）
    const failedIds = []

    res.json({
      success: true,
      deleted_count: result.changes,
      failed_ids: failedIds
    })
  } catch (error) {
    console.error('Batch delete error:', error)
    res.status(500).json({ error: '批量删除失败' })
  }
})

/**
 * PATCH /api/batch/:resource/status
 * 批量更新状态
 */
router.patch('/:resource/status', requireAuth, async (req, res) => {
  try {
    const { resource } = req.params
    const { ids, status } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要更新的记录 ID 列表' })
    }

    if (!status) {
      return res.status(400).json({ error: '请提供新的状态值' })
    }

    // 映射资源类型到表名和状态字段
    const resourceMap = {
      'users': { table: 'users', field: 'status' },
      'tasks': { table: 'tasks', field: 'status' },
      'scenarios': { table: 'scenarios', field: 'status' },
      'backup-records': { table: 'backup_records', field: 'status' }
    }

    const config = resourceMap[resource]
    if (!config) {
      return res.status(400).json({ error: '不支持的资源类型' })
    }

    const { table, field } = config

    // 执行批量更新
    const placeholders = ids.map(() => '?').join(',')
    const updateStmt = db.prepare(`UPDATE ${table} SET ${field} = ?, updated_at = ? WHERE id IN (${placeholders})`)
    const now = Date.now()
    const result = updateStmt.run(status, now, ...ids)

    res.json({
      success: true,
      updated_count: result.changes,
      failed_ids: []
    })
  } catch (error) {
    console.error('Batch status update error:', error)
    res.status(500).json({ error: '批量更新状态失败' })
  }
})

/**
 * POST /api/batch/:resource/export
 * 批量导出数据
 */
router.post('/:resource/export', requireAuth, async (req, res) => {
  try {
    const { resource } = req.params
    const { ids, format = 'csv', fields = [] } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要导出的记录 ID 列表' })
    }

    // 映射资源类型到表名和默认字段
    const resourceMap = {
      'users': { 
        table: 'users',
        defaultFields: ['id', 'username', 'display_name', 'email', 'role', 'status', 'created_at']
      },
      'tasks': {
        table: 'tasks',
        defaultFields: ['id', 'title', 'description', 'status', 'priority', 'assigned_agents', 'created_at']
      },
      'scenarios': {
        table: 'scenarios',
        defaultFields: ['id', 'name', 'description', 'status', 'created_at', 'updated_at']
      },
      'audit-logs': {
        table: 'audit_logs',
        defaultFields: ['id', 'user_id', 'action', 'resource', 'resource_id', 'timestamp']
      }
    }

    const config = resourceMap[resource]
    if (!config) {
      return res.status(400).json({ error: '不支持的资源类型' })
    }

    const { table, defaultFields } = config
    const exportFields = fields.length > 0 ? fields : defaultFields

    // 查询数据
    const placeholders = ids.map(() => '?').join(',')
    const selectStmt = db.prepare(`SELECT ${exportFields.join(', ')} FROM ${table} WHERE id IN (${placeholders})`)
    const records = selectStmt.all(...ids)

    // 生成 CSV
    if (format === 'csv') {
      const header = exportFields.join(',')
      const rows = records.map(record => 
        exportFields.map(field => {
          let value = record[field]
          if (value === null || value === undefined) value = ''
          if (typeof value === 'object') value = JSON.stringify(value)
          // 处理 CSV 转义
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
      const csvContent = [header, ...rows].join('\n')

      // 生成文件名
      const filename = `${resource}_export_${Date.now()}.csv`
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csvContent)
    } else {
      res.status(400).json({ error: '不支持的导出格式' })
    }
  } catch (error) {
    console.error('Batch export error:', error)
    res.status(500).json({ error: '批量导出失败' })
  }
})

/**
 * PATCH /api/batch/:resource/assign
 * 批量分配
 */
router.patch('/:resource/assign', requireAuth, async (req, res) => {
  try {
    const { resource } = req.params
    const { ids, assignee_id } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要分配的记录 ID 列表' })
    }

    if (!assignee_id) {
      return res.status(400).json({ error: '请提供分配对象 ID' })
    }

    // 仅支持任务分配
    if (resource !== 'tasks') {
      return res.status(400).json({ error: '当前仅支持任务分配' })
    }

    // 验证用户是否存在
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(assignee_id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 执行批量分配
    const placeholders = ids.map(() => '?').join(',')
    const updateStmt = db.prepare(`
      UPDATE tasks 
      SET assigned_agents = json_insert(COALESCE(assigned_agents, '[]'), '$[#]', ?),
          updated_at = ?
      WHERE id IN (${placeholders})
    `)
    const now = Date.now()
    const result = updateStmt.run(assignee_id, now, ...ids)

    res.json({
      success: true,
      assigned_count: result.changes,
      failed_ids: []
    })
  } catch (error) {
    console.error('Batch assign error:', error)
    res.status(500).json({ error: '批量分配失败' })
  }
})

export default router
