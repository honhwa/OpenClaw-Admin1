<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NCard,
  NSpace,
  NText,
  NTag,
  NIcon,
  NButton,
  NSpin,
  NAlert,
  NEmpty,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSwitch,
  NDivider,
  NPopconfirm,
  useMessage,
  NBadge,
  NAvatar,
  NTooltip,
  NGradientText,
} from 'naive-ui'
import {
  RefreshOutline,
  PersonOutline,
  CubeOutline,
  AddOutline,
  CreateOutline,
  SettingsOutline,
  TrashOutline,
  ChatbubblesOutline,
  FlashOutline,
  TimeOutline,
  ExtensionPuzzleOutline,
  ShuffleOutline,
  StarOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useWebSocketStore } from '@/stores/websocket'
import { useOfficeStore, type OfficeAgent } from '@/stores/office'
import { useAgentStore } from '@/stores/agent'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import { useConfigStore } from '@/stores/config'
import { formatRelativeTime } from '@/utils/format'

const { t } = useI18n()
const wsStore = useWebSocketStore()
const officeStore = useOfficeStore()
const agentStore = useAgentStore()
const sessionStore = useSessionStore()
const chatStore = useChatStore()
const configStore = useConfigStore()
const message = useMessage()

const loading = computed(() => officeStore.loading || agentStore.loading)
const error = computed(() => officeStore.error || agentStore.error)
const agents = computed(() => officeStore.officeAgents)
const selectedAgentId = computed(() => officeStore.selectedAgentId)
const selectedAgent = computed(() => officeStore.selectedAgent)

const agentStats = computed(() => agentStore.agentStats)

// --- Create Agent Modal ---
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({
  id: '',
  name: '',
  workspace: '',
  emoji: '',
})
const createFormError = ref('')

async function handleCreateAgent() {
  if (!createForm.value.id.trim()) {
    createFormError.value = t('pages.agents.form.idRequired')
    return
  }
  creating.value = true
  createFormError.value = ''
  try {
    await agentStore.addAgent({
      id: createForm.value.id.trim(),
      name: createForm.value.name.trim() || createForm.value.id.trim(),
      workspace: createForm.value.workspace.trim() || undefined,
    })
    await agentStore.fetchAgents()
    await officeStore.loadOfficeData()
    message.success(t('pages.agents.messages.created'))
    showCreateModal.value = false
  } catch (e: any) {
    createFormError.value = e?.message || t('pages.agents.messages.createFailed')
  } finally {
    creating.value = false
  }
}

function openCreateModal() {
  createForm.value = { id: '', name: '', workspace: '', emoji: '' }
  createFormError.value = ''
  showCreateModal.value = true
}

// --- Delete Agent ---
async function handleDeleteAgent(agentId: string) {
  try {
    await agentStore.deleteAgent(agentId)
    await agentStore.fetchAgents()
    await officeStore.loadOfficeData()
    message.success(t('pages.agents.messages.deleted'))
  } catch (e: any) {
    message.error(e?.message || t('pages.agents.messages.deleteFailed'))
  }
}

// --- Select Agent ---
function handleSelectAgent(agentId: string) {
  officeStore.selectAgent(agentId)
}

// --- Config Modal ---
const showConfigModal = ref(false)
const configTab = ref<'identity' | 'model' | 'tools'>('identity')
const submitting = ref(false)
const configForm = ref({
  name: '',
  emoji: '',
  theme: '',
  model: '',
  allow: [] as string[],
  deny: [] as string[],
})

const modelOptions = computed(() => {
  const options: Array<{ label: string; value: string }> = []
  const config = configStore.config
  const providers = config?.models?.providers || {}
  for (const [providerId, provider] of Object.entries(providers)) {
    if (!provider || typeof provider !== 'object') continue
    const providerConfig = provider as Record<string, unknown>
    const models = providerConfig.models
    if (!Array.isArray(models)) continue
    for (const model of models) {
      if (!model || typeof model !== 'object') continue
      const modelConfig = model as Record<string, unknown>
      const modelId = (typeof modelConfig.id === 'string' && modelConfig.id.trim()) || ''
      if (!modelId) continue
      options.push({ label: `${providerId}/${modelId}`, value: `${providerId}/${modelId}` })
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
})

const toolCategories = [
  { name: 'Files', tools: ['read', 'write', 'edit', 'apply_patch'] },
  { name: 'Runtime', tools: ['exec', 'process'] },
  { name: 'Web', tools: ['web_search', 'web_fetch'] },
  { name: 'Memory', tools: ['memory_search', 'memory_get'] },
  { name: 'Sessions', tools: ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn', 'sessions_yield', 'subagents'] },
  { name: 'UI', tools: ['browser', 'canvas'] },
  { name: 'Messaging', tools: ['message'] },
  { name: 'Automation', tools: ['cron', 'gateway'] },
  { name: 'Nodes', tools: ['nodes'] },
  { name: 'Agents', tools: ['agents_list'] },
  { name: 'Media', tools: ['image', 'image_generate', 'tts'] },
]

function openConfigModal(agentId: string) {
  const agent = agents.value.find(a => a.id === agentId)
  if (!agent) return
  officeStore.selectAgent(agentId)
  configTab.value = 'identity'
  configForm.value = {
    name: agent.identity?.name || agent.name || '',
    emoji: agent.identity?.emoji || '',
    theme: agent.identity?.theme || '',
    model: agent.model || '',
    allow: agent.toolPolicy?.allow || [],
    deny: agent.toolPolicy?.deny || [],
  }
  showConfigModal.value = true
}

function toggleToolAllow(tool: string) {
  const idx = configForm.value.allow.indexOf(tool)
  if (idx >= 0) {
    configForm.value.allow.splice(idx, 1)
  } else {
    configForm.value.allow.push(tool)
    const di = configForm.value.deny.indexOf(tool)
    if (di >= 0) configForm.value.deny.splice(di, 1)
  }
}

function toggleToolDeny(tool: string) {
  const idx = configForm.value.deny.indexOf(tool)
  if (idx >= 0) {
    configForm.value.deny.splice(idx, 1)
  } else {
    configForm.value.deny.push(tool)
    const ai = configForm.value.allow.indexOf(tool)
    if (ai >= 0) configForm.value.allow.splice(ai, 1)
  }
}

async function handleSaveConfig() {
  submitting.value = true
  try {
    const agentId = selectedAgentId.value
    if (!agentId) throw new Error('No agent selected')
    if (configTab.value === 'identity') {
      await agentStore.setAgentIdentity({
        agentId,
        name: configForm.value.name || undefined,
        emoji: configForm.value.emoji || undefined,
        theme: configForm.value.theme || undefined,
      })
    } else if (configTab.value === 'model') {
      await agentStore.setAgentModel({ agentId, model: configForm.value.model || undefined })
    } else if (configTab.value === 'tools') {
      await agentStore.setAgentTools({
        agentId,
        allow: configForm.value.allow.length ? configForm.value.allow : undefined,
        deny: configForm.value.deny.length ? configForm.value.deny : undefined,
      })
    }
    await agentStore.fetchAgents()
    await officeStore.loadOfficeData()
    message.success(t('common.saveSuccess', { name: '' }))
    showConfigModal.value = false
  } catch (e: any) {
    message.error(e?.message || t('common.saveFailed'))
  } finally {
    submitting.value = false
  }
}

// --- Stats ---
const totalSessions = computed(() => sessionStore.sessions.length)
const totalTokens = computed(() => agents.value.reduce((s, a) => s + a.totalTokens, 0))
const activeCount = computed(() => agents.value.filter(a => a.status === 'working').length)

function formatTokens(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// --- Open Session ---
async function handleOpenSession(agentId: string) {
  const sessions = sessionStore.sessions.filter(s => s.agentId === agentId)
  if (sessions.length > 0) {
    const latest = sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())[0]
    officeStore.selectSession(latest.key)
    chatStore.setSessionKey(latest.key)
    await chatStore.fetchHistory(latest.key)
  }
}

// --- Load ---
async function loadData() {
  await Promise.all([
    officeStore.loadOfficeData(),
    agentStore.fetchAgents(),
    sessionStore.fetchSessions(),
    configStore.fetchConfig(),
  ])
}

onMounted(async () => {
  await loadData()
})

const methodUnknown = computed(() => wsStore.gatewayMethods.length === 0)
const supportsAgents = computed(() => methodUnknown.value || wsStore.supportsAnyMethod(['agents.list']))

const AGENT_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7']

function getAgentColor(idx: number) {
  return AGENT_COLORS[idx % AGENT_COLORS.length]
}

function getAgentEmoji(agent: OfficeAgent) {
  return agent.emoji || agent.identity?.emoji || '🤖'
}
</script>

<template>
  <NSpace vertical :size="16" class="office-page">
    <!-- Header -->
    <NCard :title="t('routes.office')" class="app-card office-header-card">
      <template #header-extra>
        <NSpace :size="12" align="center">
          <NButton type="primary" size="small" @click="openCreateModal">
            <template #icon><NIcon :component="AddOutline" /></template>
            {{ t('pages.office.addAgent') }}
          </NButton>
          <NButton size="small" class="app-toolbar-btn--refresh" :loading="loading" @click="loadData">
            <template #icon><NIcon :component="RefreshOutline" /></template>
            {{ t('common.refresh') }}
          </NButton>
        </NSpace>
      </template>

      <NAlert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px;">
        {{ error }}
      </NAlert>

      <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 12px;">
        {{ t('pages.office.subtitle') }}
      </NText>

      <!-- Stats Row -->
      <div class="office-stats">
        <div class="stat-chip">
          <NIcon :component="CubeOutline" :size="14" />
          <NText depth="3" style="font-size: 11px;">{{ t('pages.office.totalAgents') }}</NText>
          <NText strong style="font-size: 15px;">{{ agents.length }}</NText>
        </div>
        <div class="stat-chip">
          <NIcon :component="FlashOutline" :size="14" />
          <NText depth="3" style="font-size: 11px;">{{ t('pages.office.activeAgents') }}</NText>
          <NText strong style="font-size: 15px;">{{ activeCount }}</NText>
        </div>
        <div class="stat-chip">
          <NIcon :component="ChatbubblesOutline" :size="14" />
          <NText depth="3" style="font-size: 11px;">{{ t('pages.office.totalSessions') }}</NText>
          <NText strong style="font-size: 15px;">{{ totalSessions }}</NText>
        </div>
        <div class="stat-chip">
          <NIcon :component="ShuffleOutline" :size="14" />
          <NText depth="3" style="font-size: 11px;">{{ t('pages.office.totalTokens') }}</NText>
          <NText strong style="font-size: 15px;">{{ formatTokens(totalTokens) }}</NText>
        </div>
      </div>
    </NCard>

    <!-- Agent Grid -->
    <NSpin :show="loading">
      <div class="agents-workspace">
        <div class="agents-grid" v-if="supportsAgents">
          <!-- Agent Cards -->
          <NCard
            v-for="(agent, index) in agents"
            :key="agent.id"
            class="agent-card"
            :class="{ 'agent-card--selected': selectedAgentId === agent.id }"
            size="small"
            hoverable
            @click="handleSelectAgent(agent.id)"
          >
            <div class="agent-card__header">
              <div class="agent-avatar" :style="{ background: getAgentColor(index) }">
                <span class="agent-avatar__emoji">{{ getAgentEmoji(agent) }}</span>
                <div class="agent-status-dot" :class="`status--${agent.status}`"></div>
              </div>
              <div class="agent-card__meta">
                <NText strong style="font-size: 13px;" class="agent-card__name">
                  {{ agent.identity?.name || agent.name || agent.id }}
                </NText>
                <NTag size="tiny" :bordered="false" round :type="agent.status === 'working' ? 'success' : agent.status === 'idle' ? 'default' : 'warning'">
                  {{ t(`pages.office.agentStatus.${agent.status}`) }}
                </NTag>
              </div>
            </div>

            <NDivider style="margin: 8px 0;" />

            <div class="agent-card__stats">
              <div class="agent-stat">
                <NIcon :component="ChatbubblesOutline" :size="12" />
                <NText depth="3" style="font-size: 11px;">{{ agentStats[agent.id]?.sessions || 0 }}</NText>
              </div>
              <div class="agent-stat">
                <NIcon :component="ShuffleOutline" :size="12" />
                <NText depth="3" style="font-size: 11px;">{{ formatTokens(agent.totalTokens) }}</NText>
              </div>
              <div class="agent-stat" v-if="agent.lastActivity">
                <NIcon :component="TimeOutline" :size="12" />
                <NText depth="3" style="font-size: 11px;">{{ formatRelativeTime(agent.lastActivity) }}</NText>
              </div>
            </div>

            <div class="agent-card__id">
              <NText depth="3" style="font-size: 10px; font-family: monospace;">{{ agent.id }}</NText>
            </div>

            <div class="agent-card__actions">
              <NTooltip>
                <template #trigger>
                  <NButton size="tiny" quaternary circle @click.stop="handleOpenSession(agent.id)">
                    <template #icon><NIcon :component="ChatbubblesOutline" /></template>
                  </NButton>
                </template>
                {{ t('pages.office.chatWithAgent') }}
              </NTooltip>
              <NTooltip>
                <template #trigger>
                  <NButton size="tiny" quaternary circle @click.stop="openConfigModal(agent.id)">
                    <template #icon><NIcon :component="SettingsOutline" /></template>
                  </NButton>
                </template>
                {{ t('common.settings') }}
              </NTooltip>
              <NPopconfirm @positive-click="handleDeleteAgent(agent.id)">
                <template #trigger>
                  <NButton size="tiny" quaternary circle type="error" @click.stop>
                    <template #icon><NIcon :component="TrashOutline" /></template>
                  </NButton>
                </template>
                {{ t('common.confirm') }} {{ t('common.delete') }}?
              </NPopconfirm>
            </div>
          </NCard>

          <!-- Add Agent Card -->
          <div class="agent-card agent-card--add" @click="openCreateModal">
            <div class="add-agent-inner">
              <NIcon :component="AddOutline" :size="32" />
              <NText strong style="font-size: 13px; margin-top: 8px;">{{ t('pages.office.addAgent') }}</NText>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <NEmpty v-if="!supportsAgents" :description="t('pages.office.noAgents')" style="padding: 60px 0;">
          <template #icon>
            <NIcon :component="PersonOutline" :size="48" />
          </template>
        </NEmpty>
      </div>
    </NSpin>

    <!-- Create Agent Modal -->
    <NModal
      v-model:show="showCreateModal"
      preset="card"
      :title="t('pages.agents.modal.createTitle')"
      style="width: 500px; max-width: 90vw;"
      :mask-closable="false"
    >
      <NForm label-placement="left" label-width="100">
        <NFormItem :label="t('pages.agents.form.id')" path="id" required>
          <NInput v-model:value="createForm.id" :placeholder="t('pages.agents.form.idPlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('pages.agents.form.name')" path="name">
          <NInput v-model:value="createForm.name" :placeholder="t('pages.agents.form.namePlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('pages.agents.form.workspace')" path="workspace">
          <NInput v-model:value="createForm.workspace" :placeholder="t('pages.agents.form.workspacePlaceholder')" />
        </NFormItem>
        <NAlert v-if="createFormError" type="error" :bordered="false" style="margin-top: 8px;">
          {{ createFormError }}
        </NAlert>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCreateModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="creating" @click="handleCreateAgent">
            {{ t('common.create') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Config Modal -->
    <NModal
      v-model:show="showConfigModal"
      preset="card"
      :title="`${t('common.settings')}: ${selectedAgent?.identity?.name || selectedAgent?.name || selectedAgentId}`"
      style="width: 700px; max-width: 95vw;"
      :mask-closable="false"
    >
      <div class="config-modal-body">
        <!-- Tabs -->
        <div class="config-tabs">
          <button
            v-for="tab in ['identity', 'model', 'tools'] as const"
            :key="tab"
            class="config-tab"
            :class="{ 'config-tab--active': configTab === tab }"
            @click="configTab = tab"
          >
            <NIcon v-if="tab === 'identity'" :component="PersonOutline" />
            <NIcon v-else-if="tab === 'model'" :component="StarOutline" />
            <NIcon v-else :component="ExtensionPuzzleOutline" />
            {{ tab === 'identity' ? t('pages.agents.form.tabIdentity') : tab === 'model' ? t('pages.agents.form.tabModel') : t('pages.agents.form.tabTools') }}
          </button>
        </div>

        <!-- Identity Tab -->
        <div v-if="configTab === 'identity'" class="config-section">
          <NForm label-placement="left" label-width="80">
            <NFormItem :label="t('pages.agents.form.name')">
              <NInput v-model:value="configForm.name" :placeholder="t('pages.agents.form.namePlaceholder')" />
            </NFormItem>
            <NFormItem :label="t('pages.agents.form.emoji')">
              <NInput v-model:value="configForm.emoji" :placeholder="t('pages.agents.form.emojiPlaceholder')" />
            </NFormItem>
            <NFormItem :label="t('pages.agents.form.theme')">
              <NInput v-model:value="configForm.theme" :placeholder="t('pages.agents.form.themePlaceholder')" />
            </NFormItem>
          </NForm>
        </div>

        <!-- Model Tab -->
        <div v-if="configTab === 'model'" class="config-section">
          <NForm label-placement="left" label-width="80">
            <NFormItem :label="t('pages.agents.form.model')">
              <NSelect
                v-model:value="configForm.model"
                :options="modelOptions"
                :placeholder="t('pages.agents.form.modelPlaceholder')"
                clearable
                filterable
              />
            </NFormItem>
          </NForm>
        </div>

        <!-- Tools Tab -->
        <div v-if="configTab === 'tools'" class="config-section">
          <div class="tools-panel">
            <div class="tools-section">
              <NText depth="3" style="font-size: 12px; font-weight: 600;">{{ t('pages.agents.form.toolsAllow') }}</NText>
              <div class="tool-tags">
                <NTag
                  v-for="tool in configForm.allow"
                  :key="tool"
                  type="success"
                  closable
                  @close="toggleToolAllow(tool)"
                >{{ tool }}</NTag>
              </div>
            </div>
            <div class="tools-section">
              <NText depth="3" style="font-size: 12px; font-weight: 600;">{{ t('pages.agents.form.toolsDeny') }}</NText>
              <div class="tool-tags">
                <NTag
                  v-for="tool in configForm.deny"
                  :key="tool"
                  type="error"
                  closable
                  @close="toggleToolDeny(tool)"
                >{{ tool }}</NTag>
              </div>
            </div>
            <NDivider />
            <div class="tools-categories">
              <div v-for="cat in toolCategories" :key="cat.name" class="tool-category">
                <NText depth="3" style="font-size: 11px; font-weight: 600;">{{ cat.name }}</NText>
                <div class="tool-tags">
                  <NTag
                    v-for="tool in cat.tools"
                    :key="tool"
                    size="small"
                    :type="configForm.allow.includes(tool) ? 'success' : configForm.deny.includes(tool) ? 'error' : 'default'"
                    style="cursor: pointer;"
                    @click="toggleToolAllow(tool)"
                    @click.right.prevent="toggleToolDeny(tool)"
                  >{{ tool }}</NTag>
                </div>
              </div>
            </div>
            <NText depth="3" style="font-size: 11px; margin-top: 8px; display: block;">
              {{ t('pages.agents.form.toolsHint') }}
            </NText>
          </div>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showConfigModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="submitting" @click="handleSaveConfig">
            {{ t('common.save') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </NSpace>
</template>

<style scoped>
.office-page {
  padding: 0;
}

.office-header-card {
  flex-shrink: 0;
}

.office-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: var(--radius, 8px);
}

.agents-workspace {
  min-height: 400px;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.agent-card {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.agent-card--selected {
  border-color: var(--primary-color, #18a058);
  box-shadow: 0 0 0 1px var(--primary-color, #18a058), 0 4px 16px rgba(24, 160, 88, 0.2);
}

.agent-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.agent-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  position: relative;
  flex-shrink: 0;
}

.agent-avatar__emoji {
  line-height: 1;
}

.agent-status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg-card, #fff);
}

.status--working { background: #18a058; box-shadow: 0 0 6px rgba(24, 160, 88, 0.5); }
.status--idle { background: #909399; }
.status--communicating { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
.status--offline { background: #d9d9d9; }

.agent-card__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agent-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-card__stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.agent-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.agent-card__id {
  margin-bottom: 8px;
}

.agent-card__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.agent-card:hover .agent-card__actions {
  opacity: 1;
}

.agent-card--add {
  border: 2px dashed var(--border-color, #d9d9d9);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-card--add:hover {
  border-color: var(--primary-color, #18a058);
  background: rgba(24, 160, 88, 0.04);
  transform: translateY(-2px);
}

.add-agent-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-color-disabled, #d9d9d9);
}

.agent-card--add:hover .add-agent-inner {
  color: var(--primary-color, #18a058);
}

/* Config Modal */
.config-modal-body {
  max-height: 60vh;
  overflow-y: auto;
}

.config-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #d9d9d9);
  padding-bottom: 0;
}

.config-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color-secondary, #666);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.config-tab:hover {
  color: var(--text-color, #333);
}

.config-tab--active {
  color: var(--primary-color, #18a058);
  border-bottom-color: var(--primary-color, #18a058);
}

.config-section {
  padding: 8px 0;
}

.tools-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tools-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tools-categories {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-category {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Responsive */
@media (max-width: 768px) {
  .agents-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  .office-stats {
    gap: 8px;
  }
  .stat-chip {
    padding: 4px 8px;
  }
}
</style>
