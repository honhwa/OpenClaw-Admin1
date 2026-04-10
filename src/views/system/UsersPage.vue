<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { h } from 'vue'
import {
  NCard, NButton, NTable, NTag, NText, NSpace, NModal,
  NForm, NFormItem, NInput, NSelect, NPopconfirm, NEmpty,
  NSpin, NAlert, useMessage,
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useUserStore, type ManagedUser } from '@/stores/users'
import { useRbacStore } from '@/stores/rbac'

const { t } = useI18n()
const message = useMessage()
const userStore = useUserStore()
const rbacStore = useRbacStore()

const showModal = ref(false)
const editingUser = ref<ManagedUser | null>(null)
const formRef = ref()

const form = ref({
  username: '',
  password: '',
  displayName: '',
  role: 'viewer',
  email: '',
})

const roleOptions = computed(() => [
  { label: 'Admin', value: 'admin' },
  { label: 'Operator', value: 'operator' },
  { label: 'Viewer', value: 'viewer' },
])

const statusTagType = (status: string): 'success' | 'warning' | 'error' => {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'warning'
  return 'error'
}

const roleTagType = (role: string): 'error' | 'warning' | 'info' => {
  if (role === 'admin') return 'error'
  if (role === 'operator') return 'warning'
  return 'info'
}

const formatTime = (ts: number | undefined): string => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function renderCell(tag: string, type?: 'success' | 'warning' | 'error' | 'info') {
  return () => h(NTag, { type: type || 'info', size: 'small' }, () => tag)
}

function renderActionButtons(user: ManagedUser) {
  return () => h(NSpace, { size: 6 }, () => [
    h(NButton, {
      size: 'tiny',
      quaternary: true,
      onClick: () => openEdit(user),
    }, () => 'Edit'),
    h(NPopconfirm, {
      onPositiveClick: () => handleDelete(user.id),
    }, {
      trigger: () => h(NButton, { size: 'tiny', quaternary: true, type: 'error' }, () => 'Delete'),
      default: () => 'Delete this user?',
    }),
  ])
}

const columns = computed(() => [
  {
    title: 'Username',
    key: 'username',
    width: 150,
  },
  {
    title: 'Display Name',
    key: 'display_name',
    width: 150,
    render: (row: ManagedUser) => row.display_name || row.username,
  },
  {
    title: 'Role',
    key: 'role',
    width: 100,
    render: (row: ManagedUser) => h(NTag, { type: roleTagType(row.role), size: 'small' }, () => row.role),
  },
  {
    title: 'Status',
    key: 'status',
    width: 90,
    render: (row: ManagedUser) => h(NTag, { type: statusTagType(row.status), size: 'small' }, () => row.status),
  },
  {
    title: 'Email',
    key: 'email',
    width: 180,
    render: (row: ManagedUser) => row.email || '-',
  },
  {
    title: 'Last Login',
    key: 'last_login_at',
    width: 160,
    render: (row: ManagedUser) => formatTime(row.last_login_at || row.lastLoginAt),
  },
  {
    title: 'Created',
    key: 'created_at',
    width: 160,
    render: (row: ManagedUser) => formatTime(row.created_at || row.createdAt),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 140,
    render: renderActionButtons,
  },
])

function openCreate() {
  editingUser.value = null
  form.value = { username: '', password: '', displayName: '', role: 'viewer', email: '' }
  showModal.value = true
}

function openEdit(user: ManagedUser) {
  editingUser.value = user
  form.value = {
    username: user.username,
    password: '',
    displayName: user.display_name || '',
    role: user.role,
    email: user.email || '',
  }
  showModal.value = true
}

async function handleSave() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (!editingUser.value) {
    if (!form.value.password) {
      message.warning('Password is required for new users')
      return
    }
    const result = await userStore.createUser({
      username: form.value.username,
      password: form.value.password,
      displayName: form.value.displayName,
      role: form.value.role,
      email: form.value.email,
    })
    if (result) {
      message.success('User created')
      showModal.value = false
    } else {
      message.error(userStore.error || 'Failed to create user')
    }
  } else {
    const params: Record<string, string> = {}
    if (form.value.displayName) params.displayName = form.value.displayName
    if (form.value.role) params.role = form.value.role
    if (form.value.email !== undefined) params.email = form.value.email
    const result = await userStore.updateUser(editingUser.value.id, params)
    if (result) {
      message.success('User updated')
      showModal.value = false
    } else {
      message.error(userStore.error || 'Failed to update user')
    }
  }
}

async function handleDelete(id: string) {
  const ok = await userStore.deleteUser(id)
  if (ok) {
    message.success('User deleted')
  } else {
    message.error(userStore.error || 'Failed to delete user')
  }
}

onMounted(async () => {
  await userStore.loadAll()
})
</script>

<template>
  <div>
    <NCard :title="t('pages.users.title')" class="app-card">
      <template #header-extra>
        <NButton type="primary" @click="openCreate">
          + Add User
        </NButton>
      </template>

      <NSpin :show="userStore.loading">
        <NAlert v-if="!rbacStore.isAdmin" type="warning" :bordered="false">
          只有管理员可以管理用户
        </NAlert>

        <NEmpty v-else-if="userStore.users.length === 0 && !userStore.loading" description="No users yet" style="padding: 40px 0;" />

        <NTable
          v-else-if="rbacStore.isAdmin"
          :columns="columns"
          :data="userStore.users"
          :bordered="false"
          single-line
          size="small"
          :pagination="false"
        />
      </NSpin>
    </NCard>

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="editingUser ? 'Edit User' : 'Create User'"
      style="width: 480px;"
    >
      <NForm ref="formRef" :model="form" label-placement="left" label-width="100">
        <NFormItem label="Username" path="username">
          <NInput
            v-model:value="form.username"
            :disabled="!!editingUser"
            placeholder="login name"
          />
        </NFormItem>

        <NFormItem label="Password" path="password">
          <NInput
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            :placeholder="editingUser ? 'Leave blank to keep current' : 'Required'"
          />
        </NFormItem>

        <NFormItem label="Display Name" path="displayName">
          <NInput v-model:value="form.displayName" placeholder="Optional display name" />
        </NFormItem>

        <NFormItem label="Role" path="role">
          <NSelect v-model:value="form.role" :options="roleOptions" />
        </NFormItem>

        <NFormItem label="Email" path="email">
          <NInput v-model:value="form.email" placeholder="Optional email" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">Cancel</NButton>
          <NButton type="primary" :loading="userStore.saving" @click="handleSave">
            {{ editingUser ? 'Save' : 'Create' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
