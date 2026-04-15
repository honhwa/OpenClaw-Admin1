import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useHermesConnectionStore } from './connection'
import type { HermesMessage } from '@/api/hermes/types'

export interface ToolCallProgress {
  toolCallId: string
  toolName: string
  phase: 'start' | 'update' | 'result'
  argsPreview?: string
  partialPreview?: string
  resultPreview?: string
  isError?: boolean
  startedAt?: number
  completedAt?: number
  duration?: number
  status: 'pending' | 'running' | 'completed' | 'error'
  emoji?: string
}

export const useHermesChatStore = defineStore('hermes-chat', () => {
  // ---- 状态 ----

  const messages = ref<HermesMessage[]>([])
  const currentSessionId = ref<string | null>(null)
  const loading = ref(false)
  const streaming = ref(false)
  const streamingText = ref('')
  const error = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

  // 工具调用进度追踪
  const activeToolCalls = ref<ToolCallProgress[]>([])

  // ---- 方法 ----

  /**
   * 发送消息（SSE 流式）
   */
  async function sendMessage(
    content: string,
    options?: { model?: string; sessionId?: string },
  ) {
    const text = content.trim()
    if (!text) return

    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接，请先连接 Hermes 网关')
    }

    // 如果传入了 sessionId，更新当前会话
    if (options?.sessionId) {
      currentSessionId.value = options.sessionId
    }

    console.log('[HermesChatStore] sendMessage called:', {
      text: text.substring(0, 50),
      currentSessionId: currentSessionId.value,
      optionsSessionId: options?.sessionId,
      optionsModel: options?.model,
    })

    // 添加用户消息到列表
    const userMessage: HermesMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    messages.value = [...messages.value, userMessage]

    // 准备助手消息占位
    const assistantMessageId = `assistant-${Date.now()}`
    const modelName = options?.model
    console.log('[HermesChatStore] Creating assistant message with model:', modelName)
    const assistantMessage: HermesMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      model: modelName,
    }
    messages.value = [...messages.value, assistantMessage]
    console.log('[HermesChatStore] Assistant message created:', assistantMessage)

    // 重置流式状态
    streaming.value = true
    streamingText.value = ''
    error.value = null
    activeToolCalls.value = []

    // 创建 AbortController
    abortController.value = new AbortController()

    return new Promise<void>((resolve, reject) => {
      client.sendChatStream(
        [{ role: 'user', content: text }],
        // onDelta
        (deltaText: string) => {
          streamingText.value += deltaText
          // 实时更新助手消息内容（直接修改属性，避免频繁创建新数组）
          const idx = messages.value.findIndex((m) => m.id === assistantMessageId)
          if (idx >= 0) {
            messages.value[idx]!.content = streamingText.value
            // 触发响应式更新
            messages.value = [...messages.value]
          }
        },
        currentSessionId.value || undefined,
        options?.model,
        // onToolCall
        (tool: any) => {
          const now = Date.now()
          
          // Handle Hermes-style tool events
          if (tool?.type === 'hermes-tool') {
            const toolName = tool.tool || tool.toolName || 'unknown'
            const toolCallId = tool.id || `hermes-tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const label = tool.label || ''
            const emoji = tool.emoji || '🔧'
            
            // Add new tool call
            activeToolCalls.value = [
              ...activeToolCalls.value,
              {
                toolCallId,
                toolName,
                phase: 'start',
                argsPreview: label,
                emoji,
                startedAt: now,
                status: 'running',
              },
            ]
            
            // Add tool call request message to message list
            // This ensures the tool call request is visible in the message list
            const toolCallMessage: HermesMessage = {
              id: `tool-call-${toolCallId}`,
              role: 'assistant',
              content: JSON.stringify({
                type: 'tool_call',
                id: toolCallId,
                name: toolName,
                arguments: label,
                emoji,
              }),
              timestamp: new Date().toISOString(),
            }
            
            // Insert before the assistant message placeholder
            const assistantIdx = messages.value.findIndex((m) => m.id === assistantMessageId)
            if (assistantIdx >= 0) {
              const updated = [...messages.value]
              updated.splice(assistantIdx, 0, toolCallMessage)
              messages.value = updated
            }
            return
          }
          
          const toolName = tool?.function?.name || tool?.toolName || 'unknown'
          const toolCallId = tool?.id || tool?.toolCallId || `tool-${Date.now()}`
          
          // 处理工具调用结果
          if (tool?.phase === 'result') {
            const existingIdx = activeToolCalls.value.findIndex((t) => t.toolCallId === toolCallId)
            if (existingIdx >= 0) {
              const existing = activeToolCalls.value[existingIdx]!
              const duration = existing.startedAt ? now - existing.startedAt : undefined
              const updated = [...activeToolCalls.value]
              updated[existingIdx] = {
                ...existing,
                phase: 'result',
                resultPreview: tool?.result,
                completedAt: now,
                duration,
                status: tool?.isError ? 'error' : 'completed',
                isError: tool?.isError,
              }
              activeToolCalls.value = updated
            } else {
              activeToolCalls.value = [
                ...activeToolCalls.value,
                {
                  toolCallId,
                  toolName,
                  phase: 'result',
                  resultPreview: tool?.result,
                  startedAt: now,
                  completedAt: now,
                  duration: 0,
                  status: tool?.isError ? 'error' : 'completed',
                  isError: tool?.isError,
                },
              ]
            }
            return
          }
          
          // 处理工具调用开始/更新
          const argsPreview = tool?.function?.arguments
            ? typeof tool.function.arguments === 'string'
              ? tool.function.arguments
              : JSON.stringify(tool.function.arguments, null, 2)
            : undefined

          // Check if this tool call already exists (update)
          const existingIdx = activeToolCalls.value.findIndex((t) => t.toolCallId === toolCallId)
          if (existingIdx >= 0) {
            const updated = [...activeToolCalls.value]
            updated[existingIdx] = {
              ...updated[existingIdx]!,
              phase: 'update',
              partialPreview: argsPreview,
              status: 'running',
            }
            activeToolCalls.value = updated
          } else {
            activeToolCalls.value = [
              ...activeToolCalls.value,
              {
                toolCallId,
                toolName,
                phase: 'start',
                argsPreview,
                startedAt: now,
                status: 'running',
              },
            ]
          }
        },
        // onDone
        () => {
          streaming.value = false
          abortController.value = null
          // 确保最终内容写入消息，并添加模型信息
          const idx = messages.value.findIndex((m) => m.id === assistantMessageId)
          if (idx >= 0) {
            const updated = [...messages.value]
            const existingMsg = updated[idx]!
            updated[idx] = { 
              ...existingMsg, 
              content: streamingText.value,
              model: options?.model || existingMsg.model,
            }
            messages.value = updated
          }
          
          // 将所有还在 running 状态的工具调用更新为 completed
          // 并从消息列表中查找工具结果
          const now = Date.now()
          const toolMessages = messages.value.filter((m) => m.role === 'tool')
          
          const completedToolCalls = activeToolCalls.value.map((tc, tcIdx) => {
            if (tc.status === 'running') {
              // 尝试从消息列表中查找对应的工具结果
              // 使用索引匹配，因为 Hermes 的工具调用没有唯一 ID
              const toolMsg = toolMessages[tcIdx]
              let resultPreview = tc.resultPreview
              
              if (toolMsg && !resultPreview) {
                // 解析工具消息内容
                try {
                  const parsed = JSON.parse(toolMsg.content)
                  resultPreview = parsed.output || parsed.result || parsed.content || toolMsg.content
                  if (typeof resultPreview !== 'string') {
                    resultPreview = JSON.stringify(resultPreview, null, 2)
                  }
                } catch {
                  resultPreview = toolMsg.content
                }
              }
              
              return {
                ...tc,
                status: 'completed' as const,
                phase: 'result' as const,
                completedAt: now,
                duration: tc.startedAt ? now - tc.startedAt : undefined,
                resultPreview,
              }
            }
            return tc
          })
          activeToolCalls.value = completedToolCalls
          
          // 为每个已完成的工具调用添加工具结果消息
          // 在对应的工具调用请求消息之后插入
          for (let tcIdx = 0; tcIdx < completedToolCalls.length; tcIdx++) {
            const tc = completedToolCalls[tcIdx]
            if (!tc || !tc.resultPreview) continue
            
            // 查找对应的工具调用请求消息
            const toolCallMsgId = `tool-call-${tc.toolCallId}`
            const toolCallMsgIdx = messages.value.findIndex((m) => m.id === toolCallMsgId)
            
            // 检查是否已经有对应的工具结果消息
            const existingResultIdx = messages.value.findIndex((m) => 
              m.role === 'tool' && m.toolCallId === tc.toolCallId
            )
            
            if (existingResultIdx < 0) {
              // 创建工具结果消息
              const toolResultMessage: HermesMessage = {
                id: `tool-result-${tc.toolCallId}`,
                role: 'tool',
                content: tc.resultPreview,
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                timestamp: new Date().toISOString(),
                isError: tc.isError,
              }
              
              // 在工具调用请求消息之后插入工具结果消息
              const insertIdx = toolCallMsgIdx >= 0 ? toolCallMsgIdx + 1 : messages.value.length - 1
              const updated = [...messages.value]
              updated.splice(insertIdx, 0, toolResultMessage)
              messages.value = updated
            }
          }
          
          resolve()
        },
        // onError
        (err: string) => {
          streaming.value = false
          error.value = err
          abortController.value = null
          reject(new Error(err))
        },
        abortController.value?.signal,
        // onSessionId
        (sessionId: string) => {
          // 只有在当前没有会话ID时（新会话），才更新 session_id
          // 如果是老会话，不要更新，否则会导致消息显示在新会话中
          if (sessionId && !currentSessionId.value) {
            console.log('[HermesChatStore] New session created with id:', sessionId)
            currentSessionId.value = sessionId
          } else if (sessionId && sessionId !== currentSessionId.value) {
            // 如果 API 返回了不同的 session_id，记录警告但不更新
            console.warn('[HermesChatStore] API returned different session_id:', sessionId, 'current:', currentSessionId.value, '- keeping current')
          }
        },
        // onModel
        (model: string) => {
          // 更新助手消息的模型名称
          const idx = messages.value.findIndex((m) => m.id === assistantMessageId)
          if (idx >= 0 && model) {
            const updated = [...messages.value]
            updated[idx] = { ...updated[idx]!, model }
            messages.value = updated
            console.log('[HermesChatStore] Updated assistant message model:', model)
          }
        },
      )
    })
  }

  /**
   * 停止生成
   */
  async function stopGeneration() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }

    streaming.value = false
  }

  /**
   * 加载会话消息
   */
  async function loadSessionMessages(sessionId: string, sessionModel?: string) {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    console.log('[HermesChatStore] loadSessionMessages called:', {
      sessionId,
      sessionModel,
      previousCurrentSessionId: currentSessionId.value,
    })

    currentSessionId.value = sessionId
    loading.value = true
    error.value = null

    console.log('[HermesChatStore] currentSessionId set to:', currentSessionId.value)

    try {
      const msgs = await client.getSessionMessages(sessionId)
      if (sessionModel) {
        messages.value = msgs.map((msg) => {
          if (msg.role === 'assistant' && !msg.model) {
            return { ...msg, model: sessionModel }
          }
          return msg
        })
      } else {
        messages.value = msgs
      }
    } catch (err) {
      messages.value = []
      error.value = err instanceof Error ? err.message : String(err)
      console.error('[HermesChatStore] loadSessionMessages failed:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空消息
   */
  function clearMessages() {
    messages.value = []
    streamingText.value = ''
    error.value = null
    activeToolCalls.value = []
    currentSessionId.value = null
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
  }

  /**
   * 设置当前会话 ID（不加载消息）
   */
  function setSessionId(sessionId: string | null) {
    currentSessionId.value = sessionId
  }

  return {
    // 状态
    messages,
    currentSessionId,
    loading,
    streaming,
    streamingText,
    error,
    abortController,
    activeToolCalls,
    // 方法
    sendMessage,
    stopGeneration,
    loadSessionMessages,
    clearMessages,
    setSessionId,
  }
})
