import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface ManagedUser {
  id: string
  username: string
  display_name?: string
  role: string
  status: string
  email?: string
  avatar?: string
  created_at: number
  updated_at: number
  last_login_at?: number
  lastLoginAt?: number
  createdAt?: number
  updatedAt?: number
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  is_system: number
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description?: string
}

export const useUserStore = defineStore('users', () => {
  const users = ref<ManagedUser[]>([])
  const roles = ref<Role[]>([])
  const permissions = ref<Permission[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()

  function getToken(): string {
    return authStore.getToken() || ''
  }

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const token = getToken()
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.ok) {
        users.value = data.users
      } else {
        error.value = data.error || 'Failed to fetch users'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function createUser(params: { username: string; password: string; displayName?: string; role?: string; email?: string }) {
    saving.value = true
    error.value = null
    try {
      const token = getToken()
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      })
      const data = await response.json()
      if (data.ok) {
        users.value.unshift(data.user)
        return data.user
      } else {
        error.value = data.error || 'Failed to create user'
        return null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateUser(id: string, params: Partial<ManagedUser>) {
    saving.value = true
    error.value = null
    try {
      const token = getToken()
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      })
      const data = await response.json()
      if (data.ok) {
        const idx = users.value.findIndex(u => u.id === id)
        if (idx !== -1) users.value[idx] = data.user
        return data.user
      } else {
        error.value = data.error || 'Failed to update user'
        return null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteUser(id: string) {
    saving.value = true
    error.value = null
    try {
      const token = getToken()
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.ok) {
        users.value = users.value.filter(u => u.id !== id)
        return true
      } else {
        error.value = data.error || 'Failed to delete user'
        return false
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function fetchRoles() {
    try {
      const token = getToken()
      const response = await fetch('/api/roles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.ok) roles.value = data.roles
    } catch (e) {
      console.error('[UserStore] fetchRoles failed:', e)
    }
  }

  async function fetchPermissions() {
    try {
      const token = getToken()
      const response = await fetch('/api/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.ok) permissions.value = data.permissions
    } catch (e) {
      console.error('[UserStore] fetchPermissions failed:', e)
    }
  }

  async function loadAll() {
    await Promise.all([fetchUsers(), fetchRoles(), fetchPermissions()])
  }

  return {
    users,
    roles,
    permissions,
    loading,
    saving,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    fetchRoles,
    fetchPermissions,
    loadAll,
  }
})
