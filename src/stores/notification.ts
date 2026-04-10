import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success'

export interface Notification {
  id: string
  title: string
  message: string
  level: NotificationLevel
  timestamp: number
  read: boolean
  source?: string
  link?: string
  persistent?: boolean
  type?: string
  priority?: string
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const maxStored = 100
  const loading = ref(false)
  const hasLoadedFromApi = ref(false)

  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.read).length
  )

  const unreadList = computed(() =>
    notifications.value.filter(n => !n.read).slice(0, 20)
  )

  const recentList = computed(() =>
    [...notifications.value]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
  )

  function generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: number; read?: boolean }): string {
    const id = notification.id || generateId()
    // Avoid duplicates
    if (notifications.value.some(n => n.id === id)) return id
    const full: Notification = {
      ...notification,
      id,
      timestamp: notification.timestamp || Date.now(),
      read: notification.read ?? false,
    }
    notifications.value.unshift(full)
    if (notifications.value.length > maxStored) {
      notifications.value = notifications.value.slice(0, maxStored)
    }
    return id
  }

  function info(title: string, message: string, extra?: Partial<Notification>) {
    return add({ title, message, level: 'info', ...extra })
  }

  function warn(title: string, message: string, extra?: Partial<Notification>) {
    return add({ title, message, level: 'warning', ...extra })
  }

  function error(title: string, message: string, extra?: Partial<Notification>) {
    return add({ title, message, level: 'error', persistent: true, ...extra })
  }

  function success(title: string, message: string, extra?: Partial<Notification>) {
    return add({ title, message, level: 'success', ...extra })
  }

  function markRead(id: string) {
    const notif = notifications.value.find(n => n.id === id)
    if (notif) notif.read = true
    // Sync to backend API (fire and forget)
    syncReadToApi(id)
  }

  function markAllRead() {
    notifications.value.forEach(n => { n.read = true })
    syncReadAllToApi()
  }

  function remove(id: string) {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) notifications.value.splice(idx, 1)
  }

  function clear() {
    notifications.value = []
  }

  function clearRead() {
    notifications.value = notifications.value.filter(n => !n.read)
  }

  // Fetch from backend API
  async function fetchNotifications(page = 1, pageSize = 50, unreadOnly = false) {
    loading.value = true
    try {
      const authStore = useAuthStore()
      const token = authStore.getToken()
      if (!token) {
        loading.value = false
        return
      }
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(unreadOnly ? { unreadOnly: 'true' } : {}),
      })
      const response = await fetch(`/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.ok && data.notifications) {
        // Merge with local notifications, avoid duplicates
        const localIds = new Set(notifications.value.map(n => n.id))
        for (const notif of data.notifications) {
          if (!localIds.has(notif.id)) {
            notifications.value.push({
              id: notif.id,
              title: notif.title,
              message: notif.message || '',
              level: normalizeLevel(notif.priority),
              timestamp: notif.created_at || Date.now(),
              read: notif.read,
              source: notif.type || 'system',
              priority: notif.priority,
              type: notif.type,
            })
          }
        }
        // Re-sort
        notifications.value.sort((a, b) => b.timestamp - a.timestamp)
        hasLoadedFromApi.value = true
      }
    } catch (e) {
      console.error('[NotificationStore] fetchNotifications failed:', e)
    } finally {
      loading.value = false
    }
  }

  function normalizeLevel(priority?: string): NotificationLevel {
    if (priority === 'high' || priority === 'urgent') return 'error'
    if (priority === 'low') return 'info'
    return 'info'
  }

  async function syncReadToApi(id: string) {
    try {
      const authStore = useAuthStore()
      const token = authStore.getToken()
      if (!token) return
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Silently fail - local state already updated
    }
  }

  async function syncReadAllToApi() {
    try {
      const authStore = useAuthStore()
      const token = authStore.getToken()
      if (!token) return
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Silently fail
    }
  }

  // Auto-add system notifications from WebSocket events
  function handleGatewayDisconnect() {
    error(
      'Gateway 断开',
      '与后端的 WebSocket 连接已断开，正在尝试重连...',
      { source: 'system', persistent: false }
    )
  }

  function handleGatewayReconnect() {
    success(
      'Gateway 已重连',
      'WebSocket 连接已恢复',
      { source: 'system' }
    )
  }

  function handleCronFailed(jobName: string, errorMsg: string) {
    error(
      '定时任务执行失败',
      `任务「${jobName}」执行失败：${errorMsg}`,
      { source: 'cron' }
    )
  }

  function handleTokenThreshold(percentage: number) {
    warn(
      'Token 用量预警',
      `本月 Token 用量已达到 ${percentage}% 的阈值`,
      { source: 'billing' }
    )
  }

  function handleAgentCrash(agentName: string) {
    error(
      'Agent 异常终止',
      `Agent「${agentName}」意外崩溃`,
      { source: 'agent' }
    )
  }

  return {
    notifications,
    unreadCount,
    unreadList,
    recentList,
    loading,
    add,
    info,
    warn,
    error,
    success,
    markRead,
    markAllRead,
    remove,
    clear,
    clearRead,
    fetchNotifications,
    handleGatewayDisconnect,
    handleGatewayReconnect,
    handleCronFailed,
    handleTokenThreshold,
    handleAgentCrash,
  }
})
