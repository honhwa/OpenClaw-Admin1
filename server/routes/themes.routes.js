import { Router } from 'express'
import { requireAuth } from '../auth.js'
import db from '../database.js'

const router = Router()

// 系统内置主题
const systemThemes = {
  light: {
    id: 'light',
    name: '亮色主题',
    type: 'system',
    colors: {
      primary: '#1890ff',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      textSecondary: '#666666',
      border: '#d9d9d9',
      error: '#ff4d4f',
      success: '#52c41a',
      warning: '#faad14'
    },
    settings: {
      borderRadius: 6,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      compactMode: false
    }
  },
  dark: {
    id: 'dark',
    name: '暗色主题',
    type: 'system',
    colors: {
      primary: '#1890ff',
      background: '#141414',
      surface: '#1f1f1f',
      text: '#ffffff',
      textSecondary: '#bfbfbf',
      border: '#434343',
      error: '#ff4d4f',
      success: '#52c41a',
      warning: '#faad14'
    },
    settings: {
      borderRadius: 6,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      compactMode: false
    }
  }
}

/**
 * GET /api/themes
 * 获取所有可用主题
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // 获取自定义主题
    const customThemes = db.prepare('SELECT * FROM themes WHERE type = "custom"').all()

    const items = [
      ...Object.values(systemThemes),
      ...customThemes.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        preview_url: `/api/themes/${t.id}/preview`
      }))
    ]

    res.json({ items })
  } catch (error) {
    console.error('Get themes error:', error)
    res.status(500).json({ error: '获取主题列表失败' })
  }
})

/**
 * GET /api/themes/:id
 * 获取主题详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // 检查系统主题
    if (systemThemes[id]) {
      return res.json(systemThemes[id])
    }

    // 检查自定义主题
    const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(id)
    if (theme) {
      return res.json({
        id: theme.id,
        name: theme.name,
        type: theme.type,
        colors: JSON.parse(theme.colors),
        settings: JSON.parse(theme.settings)
      })
    }

    res.status(404).json({ error: '主题不存在' })
  } catch (error) {
    console.error('Get theme error:', error)
    res.status(500).json({ error: '获取主题详情失败' })
  }
})

/**
 * POST /api/themes/custom
 * 创建自定义主题
 */
router.post('/custom', requireAuth, async (req, res) => {
  try {
    const { name, colors, settings } = req.body

    if (!name) {
      return res.status(400).json({ error: '主题名称不能为空' })
    }

    const themeId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stmt = db.prepare(`
      INSERT INTO themes (id, name, type, colors, settings, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    stmt.run(
      themeId,
      name,
      'custom',
      JSON.stringify(colors || {}),
      JSON.stringify(settings || {}),
      now,
      req.user.id
    )

    res.status(201).json({
      id: themeId,
      name,
      created_at: now
    })
  } catch (error) {
    console.error('Create theme error:', error)
    res.status(500).json({ error: '创建主题失败' })
  }
})

/**
 * PUT /api/themes/:id
 * 更新主题
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, colors, settings } = req.body

    // 系统主题不可修改
    if (systemThemes[id]) {
      return res.status(403).json({ error: '系统主题不可修改' })
    }

    const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(id)
    if (!theme) {
      return res.status(404).json({ error: '主题不存在' })
    }

    // 检查是否是当前用户的主题
    if (theme.created_by !== req.user.id) {
      return res.status(403).json({ error: '无权修改其他用户的主题' })
    }

    const updateFields = []
    const params = []

    if (name !== undefined) {
      updateFields.push('name = ?')
      params.push(name)
    }
    if (colors !== undefined) {
      updateFields.push('colors = ?')
      params.push(JSON.stringify(colors))
    }
    if (settings !== undefined) {
      updateFields.push('settings = ?')
      params.push(JSON.stringify(settings))
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有可更新的字段' })
    }

    const now = Date.now()
    updateFields.push('updated_at = ?')
    params.push(now)
    params.push(id)

    const stmt = db.prepare(`
      UPDATE themes 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `)
    stmt.run(...params)

    res.json({ success: true })
  } catch (error) {
    console.error('Update theme error:', error)
    res.status(500).json({ error: '更新主题失败' })
  }
})

/**
 * DELETE /api/themes/:id
 * 删除主题
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // 系统主题不可删除
    if (systemThemes[id]) {
      return res.status(403).json({ error: '系统主题不可删除' })
    }

    const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(id)
    if (!theme) {
      return res.status(404).json({ error: '主题不存在' })
    }

    // 检查是否是当前用户的主题
    if (theme.created_by !== req.user.id) {
      return res.status(403).json({ error: '无权删除其他用户的主题' })
    }

    db.prepare('DELETE FROM themes WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete theme error:', error)
    res.status(500).json({ error: '删除主题失败' })
  }
})

/**
 * GET /api/user/theme-preference
 * 获取用户主题偏好
 */
router.get('/user/theme-preference', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const pref = db.prepare('SELECT * FROM user_theme_preferences WHERE user_id = ?').get(userId)

    if (pref) {
      res.json({
        current_theme: pref.current_theme,
        auto_switch: pref.auto_switch === 1,
        preferred_themes: JSON.parse(pref.preferred_themes || '[]')
      })
    } else {
      // 默认偏好
      res.json({
        current_theme: 'light',
        auto_switch: true,
        preferred_themes: ['light', 'dark']
      })
    }
  } catch (error) {
    console.error('Get theme preference error:', error)
    res.status(500).json({ error: '获取主题偏好失败' })
  }
})

/**
 * PUT /api/user/theme-preference
 * 更新用户主题偏好
 */
router.put('/user/theme-preference', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { current_theme, auto_switch, preferred_themes } = req.body

    // 验证主题是否存在
    if (current_theme && !systemThemes[current_theme]) {
      const theme = db.prepare('SELECT id FROM themes WHERE id = ?').get(current_theme)
      if (!theme) {
        return res.status(404).json({ error: '主题不存在' })
      }
    }

    const now = Date.now()

    // 检查是否已有偏好记录
    const existing = db.prepare('SELECT id FROM user_theme_preferences WHERE user_id = ?').get(userId)

    if (existing) {
      const updateFields = []
      const params = []

      if (current_theme !== undefined) {
        updateFields.push('current_theme = ?')
        params.push(current_theme)
      }
      if (auto_switch !== undefined) {
        updateFields.push('auto_switch = ?')
        params.push(auto_switch ? 1 : 0)
      }
      if (preferred_themes !== undefined) {
        updateFields.push('preferred_themes = ?')
        params.push(JSON.stringify(preferred_themes))
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?')
        params.push(now)
        params.push(userId)

        const stmt = db.prepare(`
          UPDATE user_theme_preferences 
          SET ${updateFields.join(', ')}
          WHERE user_id = ?
        `)
        stmt.run(...params)
      }
    } else {
      // 创建新记录
      const stmt = db.prepare(`
        INSERT INTO user_theme_preferences (user_id, current_theme, auto_switch, preferred_themes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        userId,
        current_theme || 'light',
        auto_switch !== undefined ? (auto_switch ? 1 : 0) : 1,
        JSON.stringify(preferred_themes || ['light', 'dark']),
        now,
        now
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update theme preference error:', error)
    res.status(500).json({ error: '更新主题偏好失败' })
  }
})

/**
 * GET /api/themes/:id/preview
 * 获取主题预览图
 */
router.get('/:id/preview', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // 系统主题返回默认预览
    if (systemThemes[id]) {
      res.json({
        preview_url: `/public/theme-previews/${id}.png`,
        colors: systemThemes[id].colors
      })
      return
    }

    const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(id)
    if (theme) {
      res.json({
        preview_url: `/public/theme-previews/${id}.png`,
        colors: JSON.parse(theme.colors)
      })
      return
    }

    res.status(404).json({ error: '主题不存在' })
  } catch (error) {
    console.error('Get theme preview error:', error)
    res.status(500).json({ error: '获取主题预览失败' })
  }
})

export default router
