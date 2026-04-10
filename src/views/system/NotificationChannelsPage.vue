<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NSwitch, NDescriptions, NDescriptionsItem, NText,
  NAlert, NSpin, useMessage,
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'

const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()
const rbacStore = useRbacStore()

interface AlertChannel {
  id: string
  name: string
  type: string
  enabled: boolean
  description: string
  config?: Record<string, unknown>
}

const channels = ref<AlertChannel[]>([])
const loading = ref(false)
const saving = ref<Record<string, boolean>>({})

const channelIcons: Record<string, string> = {
  in_app: '🔔',
  email: '📧',
  feishu: '📱',
}

const channelDescriptions: Record<string, string> = {
  in_app: '在应用内通知中心实时显示系统告警和通知',
  email: '当触发告警时，通过 SMTP 邮件发送通知',
  feishu: '当触发告警时，通过飞书机器人发送通知到指定群或用户',
}

async function fetchChannels() {
  loading.value = true
  try {
    const token = authStore.getToken()
    const response = await fetch('/api/notification-channels', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (data.ok) {
      channels.value = data.channels
    }
  } catch (e) {
    message.error('Failed to load channels')
  } finally {
    loading.value = false
  }
}

async function toggleChannel(channel: AlertChannel) {
  saving.value[channel.id] = true
  try {
    const token = authStore.getToken()
    const response = await fetch(`/api/notification-channels/${channel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !channel.enabled }),
    })
    const data = await response.json()
    if (data.ok) {
      channel.enabled = data.channel.enabled
      message.success(`${channel.name} ${channel.enabled ? '已启用' : '已禁用'}`)
    }
  } catch {
    message.error('Failed to update channel')
  } finally {
    saving.value[channel.id] = false
  }
}

onMounted(() => {
  fetchChannels()
})
</script>

<template>
  <div>
    <NCard :title="'通知渠道配置'" class="app-card">
      <template #header-extra>
        <NText depth="3" style="font-size: 13px;">配置告警通知的发送渠道</NText>
      </template>

      <NSpin :show="loading">
        <NAlert v-if="!rbacStore.isAdmin" type="warning" :bordered="false">
          只有管理员可以配置通知渠道
        </NAlert>

        <div v-else style="display: flex; flex-direction: column; gap: 16px;">
          <NCard
            v-for="channel in channels"
            :key="channel.id"
            size="small"
            embedded
          >
            <div style="display: flex; align-items: flex-start; gap: 16px;">
              <span style="font-size: 24px; line-height: 1;">{{ channelIcons[channel.type] || '📢' }}</span>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                  <NText strong style="font-size: 15px;">{{ channel.name }}</NText>
                  <NText depth="3" style="font-size: 12px; padding: 1px 8px; background: var(--bg-secondary); border-radius: 4px;">
                    {{ channel.type }}
                  </NText>
                  <NText
                    :style="{ fontSize: '12px', color: channel.enabled ? '#18a058' : '#999' }"
                  >
                    {{ channel.enabled ? '已启用' : '已禁用' }}
                  </NText>
                </div>
                <NText depth="3" style="font-size: 13px; line-height: 1.5;">
                  {{ channelDescriptions[channel.type] || channel.description }}
                </NText>
              </div>
              <NSwitch
                :value="channel.enabled"
                :loading="saving[channel.id]"
                :disabled="saving[channel.id]"
                @update:value="() => toggleChannel(channel)"
              />
            </div>
          </NCard>

          <NAlert type="info" :bordered="false">
            通知渠道用于系统事件告警（Gateway 断开、定时任务失败、Token 用量预警、Agent 崩溃等）。可在「通知中心」查看历史告警记录。
          </NAlert>
        </div>
      </NSpin>
    </NCard>
  </div>
</template>
