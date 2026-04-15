import { Router } from 'express'
import http from 'http'

const router = Router()

// Hermes 连接配置（内存存储）
let hermesConfig = {
  webUrl: '',
  apiUrl: '',
  apiKey: '',
}

// 初始化配置（从环境变量）
export function initHermesConfig(envConfig) {
  hermesConfig.webUrl = envConfig.HERMES_WEB_URL || 'http://localhost:9119'
  hermesConfig.apiUrl = envConfig.HERMES_API_URL || 'http://localhost:8642'
  hermesConfig.apiKey = envConfig.HERMES_API_KEY || ''
  console.log(`[Hermes] Proxy initialized: web=${hermesConfig.webUrl}, api=${hermesConfig.apiUrl}`)
}

function debug(...args) {
  console.log('[Hermes]', ...args)
}

function getHermesWebUrl() {
  return hermesConfig.webUrl
}

function getHermesApiUrl() {
  return hermesConfig.apiUrl
}

function getHermesApiKey() {
  return hermesConfig.apiKey
}

function buildProxyHeaders(req) {
  const headers = {}
  // 转发 Authorization
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization
  }
  // 转发 Content-Type
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type']
  }
  // 转发 X-Hermes-Session-Id (关键：用于会话连续性)
  if (req.headers['x-hermes-session-id']) {
    headers['X-Hermes-Session-Id'] = req.headers['x-hermes-session-id']
    console.log('[Hermes] Forwarding X-Hermes-Session-Id:', req.headers['x-hermes-session-id'])
  }
  // 如果有 Hermes API Key 且请求中没有 Authorization，则添加
  const apiKey = getHermesApiKey()
  if (apiKey && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return headers
}

function proxyRequest(req, res, targetBaseUrl, path) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(path, targetBaseUrl)
    const queryString = req.originalUrl.split('?')[1]
    if (queryString) {
      targetUrl.search = queryString
    }

    const headers = buildProxyHeaders(req)
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers,
    }

    const proxyReq = http.request(options, (proxyRes) => {
      // 转发状态码
      res.status(proxyRes.statusCode)

      // 转发响应头
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        try {
          res.setHeader(key, value)
        } catch (e) {
          // 忽略已设置的头部
        }
      }

      // Pipe 响应体
      proxyRes.pipe(res)
      proxyRes.on('end', () => resolve())
      proxyRes.on('error', (err) => reject(err))
    })

    proxyReq.on('error', (err) => {
      console.error('[Hermes] Proxy request failed:', err.message)
      reject(err)
    })

    // 转发请求体（如果有）
    if (req.body && Object.keys(req.body).length > 0) {
      proxyReq.write(JSON.stringify(req.body))
    }
    proxyReq.end()
  })
}

function proxySSEStream(req, res, targetBaseUrl, path) {
  const targetUrl = new URL(path, targetBaseUrl)
  const queryString = req.originalUrl.split('?')[1]
  if (queryString) {
    targetUrl.search = queryString
  }

  const headers = buildProxyHeaders(req)
  headers['Accept'] = 'text/event-stream'
  // SSE 不需要 Content-Length，使用 chunked transfer
  delete headers['Content-Length']
  // 如果有请求体，设置正确的 Content-Length
  const bodyStr = req.body ? JSON.stringify(req.body) : ''
  if (bodyStr) {
    headers['Content-Length'] = Buffer.byteLength(bodyStr)
  }

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers,
    timeout: 300000, // 5 分钟超时
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // 跟踪上游是否已完成，防止客户端提前断开时销毁仍在进行的代理请求
  let upstreamDone = false

  const proxyReq = http.request(options, (proxyRes) => {
    // 如果上游返回非 SSE 响应（如错误），正常转发
    if (proxyRes.statusCode !== 200) {
      // 只有在头部未发送时才移除 SSE 相关头部
      if (!res.headersSent) {
        res.removeHeader('Content-Type')
        res.removeHeader('Cache-Control')
        res.removeHeader('Connection')
        res.removeHeader('X-Accel-Buffering')
      }
      res.status(proxyRes.statusCode)
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        try {
          res.setHeader(key, value)
        } catch (e) {
          // 忽略
        }
      }
      proxyRes.pipe(res)
      return
    }

    // SSE 流式透传 - 转发上游响应头（包括 X-Hermes-Session-Id）
    if (!res.headersSent) {
      // 转发重要的响应头
      const headersToForward = ['x-hermes-session-id', 'x-request-id']
      for (const key of headersToForward) {
        const value = proxyRes.headers[key]
        if (value) {
          res.setHeader(key, value)
          console.log(`[Hermes] Forwarding response header: ${key}=${value}`)
        }
      }
    }

    // SSE 流式透传（带日志）
    let logBuffer = ''
    proxyRes.on('data', (chunk) => {
      const text = chunk.toString()
      logBuffer += text
      // 检测 tool_calls
      if (text.includes('tool_calls') || text.includes('tool_responses')) {
        console.log('[Hermes] Tool event detected:', text.substring(0, 500))
      }
    })
    proxyRes.pipe(res)

    proxyRes.on('end', () => {
      upstreamDone = true
    })

    proxyRes.on('error', (err) => {
      console.error('[Hermes] SSE stream error:', err.message)
      if (!res.writableEnded) {
        res.end()
      }
    })
  })

  proxyReq.on('error', (err) => {
    console.error('[Hermes] SSE request failed:', err.message)
    if (!res.headersSent) {
      res.status(502).json({ error: 'Hermes proxy error', message: err.message })
    } else if (!res.writableEnded) {
      res.end()
    }
  })

  proxyReq.on('timeout', () => {
    console.error('[Hermes] SSE request timed out')
    if (!proxyReq.destroyed) {
      proxyReq.destroy(new Error('Request timed out'))
    }
  })

  // 转发请求体
  if (bodyStr) {
    proxyReq.write(bodyStr)
  }
  proxyReq.end()

  // 客户端断开时关闭代理请求（仅在上游未完成时）
  res.on('close', () => {
    if (!proxyReq.destroyed && !upstreamDone && !res.writableEnded) {
      debug('SSE: client disconnected before stream finished, destroying proxy request')
      proxyReq.destroy()
    }
  })
}

// ==================== 连接管理 ====================

// 获取当前连接配置
router.get('/api/hermes/connect', (req, res) => {
  res.json({
    webUrl: hermesConfig.webUrl,
    apiUrl: hermesConfig.apiUrl,
    hasApiKey: !!hermesConfig.apiKey,
  })
})

// 设置连接参数
router.post('/api/hermes/connect', (req, res) => {
  const { webUrl, apiUrl, apiKey } = req.body || {}

  if (webUrl) hermesConfig.webUrl = webUrl
  if (apiUrl) hermesConfig.apiUrl = apiUrl
  if (apiKey !== undefined) hermesConfig.apiKey = apiKey

  console.log(`[Hermes] Connection updated: web=${hermesConfig.webUrl}, api=${hermesConfig.apiUrl}`)
  res.json({ ok: true, webUrl: hermesConfig.webUrl, apiUrl: hermesConfig.apiUrl })
})

// 测试连接
router.post('/api/hermes/test-connection', async (req, res) => {
  const results = {}

  // 测试 Web UI API
  if (hermesConfig.webUrl) {
    try {
      await new Promise((resolve, reject) => {
        const url = new URL('/api/status', hermesConfig.webUrl)
        const headers = {}
        const apiKey = getHermesApiKey()
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

        http.get({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers,
          timeout: 5000,
        }, (proxyRes) => {
          let data = ''
          proxyRes.on('data', (chunk) => { data += chunk })
          proxyRes.on('end', () => {
            results.web = { ok: proxyRes.statusCode === 200, status: proxyRes.statusCode, data: data.substring(0, 200) }
            resolve()
          })
        }).on('error', (err) => {
          results.web = { ok: false, error: err.message }
          resolve()
        }).on('timeout', () => {
          results.web = { ok: false, error: 'Timeout' }
          resolve()
        })
      })
    } catch (err) {
      results.web = { ok: false, error: err.message }
    }
  } else {
    results.web = { ok: false, error: 'Web URL not configured' }
  }

  // 测试 API Server
  if (hermesConfig.apiUrl) {
    try {
      await new Promise((resolve, reject) => {
        const url = new URL('/health', hermesConfig.apiUrl)
        const headers = {}
        const apiKey = getHermesApiKey()
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

        http.get({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers,
          timeout: 5000,
        }, (proxyRes) => {
          let data = ''
          proxyRes.on('data', (chunk) => { data += chunk })
          proxyRes.on('end', () => {
            results.api = { ok: proxyRes.statusCode === 200, status: proxyRes.statusCode, data: data.substring(0, 200) }
            resolve()
          })
        }).on('error', (err) => {
          results.api = { ok: false, error: err.message }
          resolve()
        }).on('timeout', () => {
          results.api = { ok: false, error: 'Timeout' }
          resolve()
        })
      })
    } catch (err) {
      results.api = { ok: false, error: err.message }
    }
  } else {
    results.api = { ok: false, error: 'API URL not configured' }
  }

  res.json(results)
})

// ==================== Hermes Web UI API 代理 (端口 9119) ====================

// GET /api/hermes/status
router.get('/api/hermes/status', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/status')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions
router.get('/api/hermes/sessions', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/sessions')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions/search
router.get('/api/hermes/sessions/search', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/sessions/search')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions/:id
router.get('/api/hermes/sessions/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/sessions/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions/:id/messages
router.get('/api/hermes/sessions/:id/messages', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/sessions/${req.params.id}/messages`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// DELETE /api/hermes/sessions/:id
router.delete('/api/hermes/sessions/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/sessions/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config
router.get('/api/hermes/config', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config/defaults
router.get('/api/hermes/config/defaults', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/defaults')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config/schema
router.get('/api/hermes/config/schema', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/schema')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/config
router.put('/api/hermes/config', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config/raw
router.get('/api/hermes/config/raw', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/raw')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/config/raw
router.put('/api/hermes/config/raw', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/raw')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/env
router.get('/api/hermes/env', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/env
router.put('/api/hermes/env', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// DELETE /api/hermes/env
router.delete('/api/hermes/env', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/env/reveal
router.post('/api/hermes/env/reveal', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env/reveal')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/logs
router.get('/api/hermes/logs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/logs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Cron Jobs ====================

// GET /api/hermes/cron/jobs
router.get('/api/hermes/cron/jobs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/cron/jobs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/cron/jobs/:id
router.get('/api/hermes/cron/jobs/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs
router.post('/api/hermes/cron/jobs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/cron/jobs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/cron/jobs/:id
router.put('/api/hermes/cron/jobs/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs/:id/pause
router.post('/api/hermes/cron/jobs/:id/pause', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}/pause`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs/:id/resume
router.post('/api/hermes/cron/jobs/:id/resume', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}/resume`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs/:id/trigger
router.post('/api/hermes/cron/jobs/:id/trigger', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}/trigger`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// DELETE /api/hermes/cron/jobs/:id
router.delete('/api/hermes/cron/jobs/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Skills ====================

// GET /api/hermes/skills
router.get('/api/hermes/skills', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/skills')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/skills/toggle
router.put('/api/hermes/skills/toggle', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/skills/toggle')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Tools ====================

// GET /api/hermes/tools/toolsets
router.get('/api/hermes/tools/toolsets', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/tools/toolsets')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Analytics ====================

// GET /api/hermes/analytics/usage
router.get('/api/hermes/analytics/usage', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/analytics/usage')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Hermes API Server 代理 (端口 8642) ====================

// GET /api/hermes/v1/models
router.get('/api/hermes/v1/models', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesApiUrl(), '/v1/models')
  } catch (err) {
    res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
  }
})

// POST /api/hermes/v1/chat/completions (流式或非流式)
router.post('/api/hermes/v1/chat/completions', (req, res) => {
    const isStream = req.body && req.body.stream === true
    if (isStream) {
    proxySSEStream(req, res, getHermesApiUrl(), '/v1/chat/completions')
  } else {
    proxyRequest(req, res, getHermesApiUrl(), '/v1/chat/completions').catch((err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
      }
    })
  }
})

// POST /api/hermes/v1/runs
router.post('/api/hermes/v1/runs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesApiUrl(), '/v1/runs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
  }
})

// GET /api/hermes/v1/runs/:id/events (SSE 流式透传)
router.get('/api/hermes/v1/runs/:id/events', (req, res) => {
  proxySSEStream(req, res, getHermesApiUrl(), `/v1/runs/${req.params.id}/events`)
})

// GET /api/hermes/health
router.get('/api/hermes/health', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesApiUrl(), '/health')
  } catch (err) {
    res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
  }
})

export default router
