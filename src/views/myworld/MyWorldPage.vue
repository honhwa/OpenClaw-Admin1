<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NCard,
  NSpace,
  NGrid,
  NGridItem,
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
  NDivider,
  NPopconfirm,
  NAvatar,
  NTooltip,
  NBadge,
  NProgress,
  useMessage,
  NSwitch,
} from 'naive-ui'
import {
  RefreshOutline,
  AddOutline,
  TrashOutline,
  ChatbubblesOutline,
  FlashOutline,
  TimeOutline,
  SettingsOutline,
  PeopleOutline,
  GitBranchOutline,
  ArrowForwardOutline,
  ConstructOutline,
  StarOutline,
  ExtensionPuzzleOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useWebSocketStore } from '@/stores/websocket'
import { useOfficeStore, type OfficeAgent } from '@/stores/office'
import { useAgentStore } from '@/stores/agent'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import { useConfigStore } from '@/stores/config'
import { formatRelativeTime } from '@/utils/format'
import OfficeToolbar from '@/components/office/OfficeToolbar.vue'

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
const activeCount = computed(() => agents.value.filter(a => a.status === 'working').length)
const totalTokens = computed(() => agents.value.reduce((s, a) => s + a.totalTokens, 0))

// --- Stats ---
const totalSessions = computed(() => sessionStore.sessions.length)
const totalTasks = computed(() => officeStore.tasks?.length || 0)

function formatTokens(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// --- Area definitions for virtual company ---
interface CompanyArea {
  id: string
  name: string
  icon: string
  type: 'office' | 'meeting' | 'common' | 'service'
  members: string[]
}

const companyAreas = computed<CompanyArea[]>(() => [
  { id: 'reception', name: t('myworld.areas.reception'), icon: '🏢', type: 'common', members: [] },
  { id: 'office-1', name: t('myworld.areas.office1'), icon: '💼', type: 'office', members: agents.value.slice(0, 2).map(a => a.id) },
  { id: 'office-2', name: t('myworld.areas.office2'), icon: '💼', type: 'office', members: agents.value.slice(2, 4).map(a => a.id) },
  { id: 'office-3', name: t('myworld.areas.office3'), icon: '💼', type: 'office', members: agents.value.slice(4, 6).map(a => a.id) },
  { id: 'meeting', name: t('myworld.areas.meetingRoom'), icon: '🏛️', type: 'meeting', members: [] },
  { id: 'pantry', name: t('myworld.areas.pantry'), icon: '☕', type: 'service', members: [] },
  { id: 'lounge', name: t('myworld.areas.lounge'), icon: '🛋️', type: 'common', members: [] },
])

// --- Collaboration flow steps ---
interface FlowStep {
  id: string
  label: string
  description: string
  icon: string
}

const flowSteps = computed<FlowStep[]>(() => [
  { id: '1', label: t('pages.office.wizard.steps.scenario'), description: t('pages.office.wizard.steps.scenarioDesc'), icon: '📋' },
  { id: '2', label: t('pages.office.wizard.steps.agents'), description: t('pages.office.wizard.steps.agentsDesc'), icon: '👥' },
  { id: '3', label: t('pages.office.wizard.steps.tasks'), description: t('pages.office.wizard.steps.tasksDesc'), icon: '📝' },
  { id: '4', label: t('pages.office.wizard.steps.bindings'), description: t('pages.office.wizard.steps.bindingsDesc'), icon: '🔗' },
  { id: '5', label: t('pages.office.wizard.steps.confirm'), description: t('pages.office.wizard.steps.confirmDesc'), icon: '✅' },
  { id: '6', label: t('pages.office.wizard.steps.execution'), description: t('pages.office.wizard.steps.executionDesc'), icon: '🚀' },
])

// --- Create Agent Modal ---
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ id: '', name: '', workspace: '' })
const createError = ref('')

async function handleCreateAgent() {
  if (!createForm.value.id.trim()) { createError.value = t('pages.agents.form.idRequired'); return }
  creating.value = true
  createError.value = ''
  try {
    await agentStore.addAgent({ id: createForm.value.id.trim(), name: createForm.value.name.trim() || createForm.value.id.trim(), workspace: createForm.value.workspace.trim() || undefined })
    await agentStore.fetchAgents()
    await officeStore.loadOfficeData()
    message.success(t('pages.agents.messages.created'))
    showCreateModal.value = false
  } catch (e: any) {
    createError.value = e?.message || t('pages.agents.messages.createFailed')
  } finally { creating.value = false }
}

function openCreateModal() { createForm.value = { id: '', name: '', workspace: '' }; createError.value = ''; showCreateModal.value = true }

// --- Delete Agent ---
async function handleDeleteAgent(agentId: string) {
  try {
    await agentStore.deleteAgent(agentId)
    await agentStore.fetchAgents()
    await officeStore.loadOfficeData()
    message.success(t('pages.agents.messages.deleted'))
  } catch (e: any) { message.error(e?.message || t('pages.agents.messages.deleteFailed')) }
}

// --- Select Agent ---
const selectedAgentId = computed(() => officeStore.selectedAgentId)
function handleSelectAgent(id: string) { officeStore.selectAgent(id) }

// --- Open Chat ---
async function handleOpenChat(agentId: string) {
  officeStore.selectAgent(agentId)
  const sessions = sessionStore.sessions.filter(s => s.agentId === agentId)
  if (sessions.length > 0) {
    const latest = sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())[0]
    chatStore.setSessionKey(latest.key)
    await chatStore.fetchHistory(latest.key)
  }
}

// --- Config Modal ---
const showConfigModal = ref(false)
const configTab = ref<'identity' | 'model' | 'tools'>('identity')
const submitting = ref(false)
const configForm = ref({ name: '', emoji: '', theme: '', model: '', allow: [] as string[], deny: [] as string[] })

const modelOptions = computed(() => {
  const opts: Array<{ label: string; value: string }> = []
  const providers = configStore.config?.models?.providers || {} as Record<string, any>
  for (const [pid, prov] of Object.entries(providers)) {
    if (!prov?.models) continue
    for (const m of prov.models) { if (m?.id) opts.push({ label: `${pid}/${m.id}`, value: `${pid}/${m.id}` }) }
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label))
})

const toolCategories = [
  { name: 'Files', tools: ['read', 'write', 'edit', 'apply_patch'] },
  { name: 'Runtime', tools: ['exec', 'process'] },
  { name: 'Web', tools: ['web_search', 'web_fetch'] },
  { name: 'Memory', tools: ['memory_search', 'memory_get'] },
  { name: 'Sessions', tools: ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn'] },
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
  configForm.value = { name: agent.identity?.name || agent.name || '', emoji: agent.identity?.emoji || '', theme: agent.identity?.theme || '', model: agent.model || '', allow: agent.toolPolicy?.allow || [], deny: agent.toolPolicy?.deny || [] }
  showConfigModal.value = true
}

function toggleToolAllow(tool: string) {
  const i = configForm.value.allow.indexOf(tool)
  if (i >= 0) configForm.value.allow.splice(i, 1)
  else { configForm.value.allow.push(tool); const di = configForm.value.deny.indexOf(tool); if (di >= 0) configForm.value.deny.splice(di, 1) }
}
function toggleToolDeny(tool: string) {
  const i = configForm.value.deny.indexOf(tool)
  if (i >= 0) configForm.value.deny.splice(i, 1)
  else { configForm.value.deny.push(tool); const ai = configForm.value.allow.indexOf(tool); if (ai >= 0) configForm.value.allow.splice(ai, 1) }
}

async function handleSaveConfig() {
  submitting.value = true
  try {
    const id = selectedAgentId.value
    if (!id) throw new Error('No agent selected')
    if (configTab.value === 'identity') await agentStore.setAgentIdentity({ agentId: id, name: configForm.value.name || undefined, emoji: configForm.value.emoji || undefined, theme: configForm.value.theme || undefined })
    else if (configTab.value === 'model') await agentStore.setAgentModel({ agentId: id, model: configForm.value.model || undefined })
    else await agentStore.setAgentTools({ agentId: id, allow: configForm.value.allow.length ? configForm.value.allow : undefined, deny: configForm.value.deny.length ? configForm.value.deny : undefined })
    await agentStore.fetchAgents()
    await officeStore.loadOfficeData()
    message.success(t('common.saveSuccess', { name: '' }))
    showConfigModal.value = false
  } catch (e: any) { message.error(e?.message || t('common.saveFailed')) }
  finally { submitting.value = false }
}

// --- Load ---
async function loadData() {
  await Promise.all([officeStore.loadOfficeData(), agentStore.fetchAgents(), sessionStore.fetchSessions(), configStore.fetchConfig()])
}

onMounted(async () => { await loadData() })

// --- Refresh ---
async function handleRefresh() {
  await loadData()
  message.success(t('common.refreshSuccess'))
}

// --- Agent Stats ---
const agentStats = computed(() => agentStore.agentStats)

// --- Colors ---
const AGENT_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7']
function getAgentColor(idx: number) { return AGENT_COLORS[idx % AGENT_COLORS.length] }
function getAgentEmoji(agent: OfficeAgent) { return agent.emoji || agent.identity?.emoji || '🤖' }
</script>

<template>
  <div class="myworld-page">
    <!-- Toolbar -->
    <OfficeToolbar
      :active-count="activeCount"
      :total-agents="agents.length"
      :total-tokens="totalTokens"
      @create-agent="openCreateModal"
      @permission-control="() => openConfigModal(agents[0]?.id || '')"
      @refresh="handleRefresh"
    />

    <NSpace vertical :size="16" class="myworld-content">

      <!-- Company Overview Stats -->
      <NCard class="app-card overview-card">
        <div class="overview-grid">
          <div class="overview-stat">
            <span class="overview-stat__icon">🏢</span>
            <div class="overview-stat__info">
              <NText depth="3" style="font-size: 11px;">{{ t('myworld.totalEmployees') }}</NText>
              <NText strong style="font-size: 20px;">{{ agents.length }}</NText>
            </div>
          </div>
          <div class="overview-stat">
            <span class="overview-stat__icon">⚡</span>
            <div class="overview-stat__info">
              <NText depth="3" style="font-size: 11px;">{{ t('myworld.working') }}</NText>
              <NText strong style="font-size: 20px;">{{ activeCount }}</NText>
            </div>
          </div>
          <div class="overview-stat">
            <span class="overview-stat__icon">💬</span>
            <div class="overview-stat__info">
              <NText depth="3" style="font-size: 11px;">{{ t('pages.office.totalSessions') }}</NText>
              <NText strong style="font-size: 20px;">{{ totalSessions }}</NText>
            </div>
          </div>
          <div class="overview-stat">
            <span class="overview-stat__icon">📊</span>
            <div class="overview-stat__info">
              <NText depth="3" style="font-size: 11px;">Token</NText>
              <NText strong style="font-size: 20px;">{{ formatTokens(totalTokens) }}</NText>
            </div>
          </div>
        </div>
      </NCard>

      <NSpin :show="loading">
        <NAlert v-if="error" type="error" :bordered="false">{{ error }}</NAlert>

        <!-- Main Layout: Areas + Team Members -->
        <div class="main-grid">
          <!-- Left: Company Areas -->
          <NCard :title="t('myworld.areasLabel')" class="app-card areas-card">
            <div class="areas-grid">
              <div
                v-for="area in companyAreas"
                :key="area.id"
                class="area-item"
                :class="`area-item--${area.type}`"
              >
                <div class="area-icon">{{ area.icon }}</div>
                <div class="area-info">
                  <NText strong style="font-size: 13px;">{{ area.name }}</NText>
                  <NText depth="3" style="font-size: 11px;">
                    {{ area.members.length > 0 ? `${area.members.length} ${t('myworld.working')}` : t('myworld.noAgents') }}
                  </NText>
                </div>
              </div>
            </div>
          </NCard>

          <!-- Center: Team Members -->
          <NCard :title="t('myworld.myEmployees')" class="app-card team-card">
            <template #header-extra>
              <NButton size="tiny" quaternary @click="openCreateModal">
                <template #icon><NIcon :component="AddOutline" /></template>
                {{ t('myworld.addEmployee') }}
              </NButton>
            </template>

            <div class="team-list" v-if="agents.length > 0">
              <div
                v-for="(agent, index) in agents"
                :key="agent.id"
                class="team-member"
                :class="{ 'team-member--selected': selectedAgentId === agent.id }"
                @click="handleSelectAgent(agent.id)"
              >
                <div class="member-avatar" :style="{ background: getAgentColor(index) }">
                  <span class="member-avatar__emoji">{{ getAgentEmoji(agent) }}</span>
                  <div class="member-status" :class="`member-status--${agent.status}`"></div>
                </div>

                <div class="member-info">
                  <div class="member-name-row">
                    <NText strong style="font-size: 13px;">
                      {{ agent.identity?.name || agent.name || agent.id }}
                    </NText>
                    <NTag size="tiny" :bordered="false" round :type="agent.status === 'working' ? 'success' : agent.status === 'idle' ? 'default' : 'warning'">
                      {{ t(`pages.office.agentStatus.${agent.status}`) }}
                    </NTag>
                  </div>
                  <div class="member-stats-row">
                    <span class="member-stat">
                      <NIcon :component="ChatbubblesOutline" :size="11" />
                      {{ agentStats[agent.id]?.sessions || 0 }}
                    </span>
                    <span class="member-stat">
                      <NIcon :component="FlashOutline" :size="11" />
                      {{ formatTokens(agent.totalTokens) }}
                    </span>
                    <span class="member-stat" v-if="agent.lastActivity">
                      <NIcon :component="TimeOutline" :size="11" />
                      {{ formatRelativeTime(agent.lastActivity) }}
                    </span>
                  </div>
                </div>

                <div class="member-actions">
                  <NTooltip>
                    <template #trigger>
                      <NButton size="tiny" quaternary circle @click.stop="handleOpenChat(agent.id)">
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
              </div>
            </div>

            <NEmpty v-else :description="t('myworld.noAgents')" />
          </NCard>

          <!-- Right: Collaboration Flow -->
          <NCard :title="t('pages.office.wizard.title')" class="app-card flow-card">
            <div class="flow-steps">
              <div
                v-for="(step, index) in flowSteps"
                :key="step.id"
                class="flow-step"
              >
                <div class="flow-step__number">{{ step.id }}</div>
                <div class="flow-step__content">
                  <div class="flow-step__header">
                    <span class="flow-step__icon">{{ step.icon }}</span>
                    <NText strong style="font-size: 13px;">{{ step.label }}</NText>
                  </div>
                  <NText depth="3" style="font-size: 11px;">{{ step.description }}</NText>
                </div>
                <div class="flow-step__arrow" v-if="index < flowSteps.length - 1">
                  <NIcon :component="ArrowForwardOutline" :size="14" />
                </div>
              </div>
            </div>
          </NCard>
        </div>

        <!-- Selected Agent Detail -->
        <NCard v-if="selectedAgentId" class="app-card agent-detail-card" size="small">
          <template #header>
            <NSpace align="center" :size="12">
              <span style="font-size: 18px;">{{ getAgentEmoji(agents.find(a => a.id === selectedAgentId)!) }}</span>
              <NText strong>{{ agents.find(a => a.id === selectedAgentId)?.identity?.name || agents.find(a => a.id === selectedAgentId)?.name || selectedAgentId }}</NText>
              <NTag size="small" :type="agents.find(a => a.id === selectedAgentId)?.status === 'working' ? 'success' : 'default'">
                {{ t(`pages.office.agentStatus.${agents.find(a => a.id === selectedAgentId)?.status}`) }}
              </NTag>
            </NSpace>
          </template>
          <div class="agent-detail-grid">
            <div class="detail-item">
              <NText depth="3" style="font-size: 11px;">ID</NText>
              <NText style="font-size: 12px; font-family: monospace;">{{ selectedAgentId }}</NText>
            </div>
            <div class="detail-item">
              <NText depth="3" style="font-size: 11px;">{{ t('pages.agents.form.model') }}</NText>
              <NText style="font-size: 12px;">{{ agents.find(a => a.id === selectedAgentId)?.model || '-' }}</NText>
            </div>
            <div class="detail-item">
              <NText depth="3" style="font-size: 11px;">Sessions</NText>
              <NText style="font-size: 12px;">{{ agentStats[selectedAgentId]?.sessions || 0 }}</NText>
            </div>
            <div class="detail-item">
              <NText depth="3" style="font-size: 11px;">Token</NText>
              <NText style="font-size: 12px;">{{ formatTokens(agents.find(a => a.id === selectedAgentId)?.totalTokens || 0) }}</NText>
            </div>
          </div>
        </NCard>
      </NSpin>
    </NSpace>

    <!-- Create Agent Modal -->
    <NModal v-model:show="showCreateModal" preset="card" :title="t('pages.agents.modal.createTitle')" style="width: 500px; max-width: 90vw;" :mask-closable="false">
      <NForm label-placement="left" label-width="100">
        <NFormItem :label="t('pages.agents.form.id')" required>
          <NInput v-model:value="createForm.id" :placeholder="t('pages.agents.form.idPlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('pages.agents.form.name')">
          <NInput v-model:value="createForm.name" :placeholder="t('pages.agents.form.namePlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('pages.agents.form.workspace')">
          <NInput v-model:value="createForm.workspace" :placeholder="t('pages.agents.form.workspacePlaceholder')" />
        </NFormItem>
        <NAlert v-if="createError" type="error" :bordered="false" style="margin-top: 8px;">{{ createError }}</NAlert>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCreateModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="creating" @click="handleCreateAgent">{{ t('common.create') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Config Modal -->
    <NModal v-model:show="showConfigModal" preset="card" :title="t('myworld.modifyEmployeePermission')" style="width: 700px; max-width: 95vw;" :mask-closable="false">
      <div class="config-modal-body">
        <div class="config-tabs">
          <button v-for="tab in ['identity', 'model', 'tools'] as const" :key="tab" class="config-tab" :class="{ 'config-tab--active': configTab === tab }" @click="configTab = tab">
            <NIcon v-if="tab === 'identity'" :component="PeopleOutline" />
            <NIcon v-else-if="tab === 'model'" :component="StarOutline" />
            <NIcon v-else :component="ExtensionPuzzleOutline" />
            {{ tab === 'identity' ? 'Identity' : tab === 'model' ? 'Model' : 'Tools' }}
          </button>
        </div>

        <div v-if="configTab === 'identity'" class="config-section">
          <NForm label-placement="left" label-width="80">
            <NFormItem label="Name"><NInput v-model:value="configForm.name" placeholder="Agent name" /></NFormItem>
            <NFormItem label="Emoji"><NInput v-model:value="configForm.emoji" placeholder="🤖" /></NFormItem>
            <NFormItem label="Theme"><NInput v-model:value="configForm.theme" placeholder="Theme color" /></NFormItem>
          </NForm>
        </div>

        <div v-if="configTab === 'model'" class="config-section">
          <NForm label-placement="left" label-width="80">
            <NFormItem label="Model">
              <NSelect v-model:value="configForm.model" :options="modelOptions" placeholder="Select model" clearable filterable />
            </NFormItem>
          </NForm>
        </div>

        <div v-if="configTab === 'tools'" class="config-section">
          <div class="tools-panel">
            <div class="tools-section">
              <NText depth="3" style="font-size: 12px; font-weight: 600;">{{ t('pages.agents.form.toolsAllow') }}</NText>
              <div class="tool-tags">
                <NTag v-for="tool in configForm.allow" :key="tool" type="success" closable @close="toggleToolAllow(tool)">{{ tool }}</NTag>
              </div>
            </div>
            <div class="tools-section">
              <NText depth="3" style="font-size: 12px; font-weight: 600;">{{ t('pages.agents.form.toolsDeny') }}</NText>
              <div class="tool-tags">
                <NTag v-for="tool in configForm.deny" :key="tool" type="error" closable @close="toggleToolDeny(tool)">{{ tool }}</NTag>
              </div>
            </div>
            <NDivider />
            <div class="tools-categories">
              <div v-for="cat in toolCategories" :key="cat.name" class="tool-category">
                <NText depth="3" style="font-size: 11px; font-weight: 600;">{{ cat.name }}</NText>
                <div class="tool-tags">
                  <NTag v-for="tool in cat.tools" :key="tool" size="small"
                    :type="configForm.allow.includes(tool) ? 'success' : configForm.deny.includes(tool) ? 'error' : 'default'"
                    style="cursor: pointer;" @click="toggleToolAllow(tool)"
                    @click.right.prevent="toggleToolDeny(tool)"
                  >{{ tool }}</NTag>
                </div>
              </div>
            </div>
            <NText depth="3" style="font-size: 11px; margin-top: 8px; display: block;">{{ t('pages.agents.form.toolsHint') }}</NText>
          </div>
        </div>
      </div>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showConfigModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="submitting" @click="handleSaveConfig">{{ t('common.save') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.myworld-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.myworld-content {
  padding: 0;
  flex: 1;
}

/* Overview Stats */
.overview-card {
  flex-shrink: 0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: var(--radius, 8px);
}

.overview-stat__icon {
  font-size: 28px;
  line-height: 1;
}

.overview-stat__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Main Grid */
.main-grid {
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 16px;
  align-items: start;
}

/* Areas Card */
.areas-card {
  position: sticky;
  top: 16px;
}

.areas-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.area-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: var(--radius, 8px);
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.area-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.area-item--office { border-left-color: #667eea; }
.area-item--meeting { border-left-color: #f59e0b; }
.area-item--common { border-left-color: #43e97b; }
.area-item--service { border-left-color: #ec4899; }

.area-icon {
  font-size: 24px;
  line-height: 1;
}

.area-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Team Card */
.team-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: var(--radius, 8px);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.team-member:hover {
  background: rgba(102, 126, 234, 0.08);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateX(4px);
}

.team-member--selected {
  background: rgba(24, 160, 88, 0.08);
  border-color: rgba(24, 160, 88, 0.4);
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  position: relative;
  flex-shrink: 0;
}

.member-avatar__emoji { line-height: 1; }

.member-status {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid var(--bg-card, #fff);
}

.member-status--working { background: #18a058; }
.member-status--idle { background: #909399; }
.member-status--communicating { background: #f59e0b; }
.member-status--offline { background: #d9d9d9; }

.member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.member-name-row > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.member-stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.member-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--text-color-disabled, #d9d9d9);
  font-size: 11px;
}

.member-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.team-member:hover .member-actions {
  opacity: 1;
}

/* Flow Card */
.flow-card {
  position: sticky;
  top: 16px;
}

.flow-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.flow-step__number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.flow-step__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-secondary, #f5f5f5);
  padding: 8px 12px;
  border-radius: var(--radius, 6px);
}

.flow-step__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flow-step__icon {
  font-size: 14px;
  line-height: 1;
}

.flow-step__arrow {
  color: var(--text-color-disabled, #d9d9d9);
  flex-shrink: 0;
}

/* Agent Detail */
.agent-detail-card {
  margin-top: 0;
}

.agent-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.config-tab:hover { color: var(--text-color, #333); }
.config-tab--active { color: var(--primary-color, #18a058); border-bottom-color: var(--primary-color, #18a058); }

.config-section { padding: 8px 0; }

.tools-panel { display: flex; flex-direction: column; gap: 12px; }
.tools-section { display: flex; flex-direction: column; gap: 8px; }
.tool-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tools-categories { display: flex; flex-direction: column; gap: 10px; }
.tool-category { display: flex; flex-direction: column; gap: 6px; }

/* Responsive */
@media (max-width: 1199px) {
  .main-grid {
    grid-template-columns: 1fr 1fr;
  }
  .areas-card, .flow-card { position: static; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .agent-detail-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
