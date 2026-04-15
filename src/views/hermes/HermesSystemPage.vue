<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDivider,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NSpace,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  NText,
  NRadioGroup,
  NRadioButton,
  NTooltip,
  NUpload,
  type UploadFileInfo,
  useMessage,
} from 'naive-ui'
import {
  RefreshOutline,
  SaveOutline,
  LinkOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  CreateOutline,
  TrashOutline,
  EyeOutline,
  SearchOutline,
  CodeSlashOutline,
  DownloadOutline,
  CloudUploadOutline,
  SettingsOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useHermesConnectionStore } from '@/stores/hermes/connection'
import { useHermesConfigStore } from '@/stores/hermes/config'
import { useConfigEditor } from '@/composables/useConfigEditor'
import ConfigEditorPanel from '@/components/hermes/ConfigEditorPanel.vue'
import { DEFAULT_HERMES_CONFIG_SCHEMA } from '@/api/hermes/configSchema'
import type { HermesEnvVar, HermesConfig } from '@/api/hermes/types'

const { t } = useI18n()
const connectionStore = useHermesConnectionStore()
const configStore = useHermesConfigStore()
const message = useMessage()

const activeTab = ref('connection')
const testingConnection = ref(false)
const testResult = ref<Record<string, unknown> | null>(null)

// Connection form
const connForm = ref({
  webUrl: connectionStore.connectionConfig.webUrl,
  apiUrl: connectionStore.connectionConfig.apiUrl,
  apiKey: connectionStore.connectionConfig.apiKey,
})

// Environment variables
const envVars = ref<HermesEnvVar[]>([])
const envLoading = ref(false)
const newEnvKey = ref('')
const newEnvValue = ref('')
const revealedKeys = ref<Set<string>>(new Set())
const envSearchQuery = ref('')
const editingEnvKey = ref<string | null>(null)
const editingEnvValue = ref('')

// Config editor
type ConfigMode = 'visual' | 'yaml'
const configMode = ref<ConfigMode>('visual')
const configLoading = ref(false)
const configSaving = ref(false)
const configValues = ref<HermesConfig>({})
const originalConfigValues = ref<HermesConfig>({})
const yamlConfig = ref('')

// Raw config editor
const rawConfig = ref('')
const rawConfigLoading = ref(false)
const rawConfigSaving = ref(false)
const showLineNumbers = ref(true)

// Computed: filtered env vars
const filteredEnvVars = computed(() => {
  const query = envSearchQuery.value.trim().toLowerCase()
  if (!query) return envVars.value
  return envVars.value.filter(
    (v) => v.key.toLowerCase().includes(query) || v.value.toLowerCase().includes(query),
  )
})

// Computed: config modifications
const configModifiedFields = computed(() => {
  const modified = new Set<string>()
  for (const key of Object.keys(configValues.value)) {
    const current = configValues.value[key]
    const original = originalConfigValues.value[key]
    if (JSON.stringify(current) !== JSON.stringify(original)) {
      modified.add(key)
    }
  }
  return modified
})

const hasConfigChanges = computed(() => configModifiedFields.value.size > 0)

const configModifiedCount = computed(() => configModifiedFields.value.size)

// Computed: JSON validation
const yamlConfigValid = computed(() => {
  if (!yamlConfig.value.trim()) return true
  try {
    JSON.parse(yamlConfig.value)
    return true
  } catch {
    return false
  }
})

const yamlConfigError = computed(() => {
  if (!yamlConfig.value.trim()) return ''
  try {
    JSON.parse(yamlConfig.value)
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid JSON'
  }
})

// Computed: connection status info
const isConnected = computed(() => connectionStore.hermesConnected)
const isConnecting = computed(() => connectionStore.hermesConnecting)
const status = computed(() => connectionStore.hermesStatus)

const connectionStatusText = computed(() => {
  if (isConnecting.value) return t('pages.hermesSystem.status.connecting')
  if (isConnected.value) return t('pages.hermesSystem.status.connected')
  return t('pages.hermesSystem.status.disconnected')
})

const connectionStatusType = computed(() => {
  if (isConnecting.value) return 'warning' as const
  if (isConnected.value) return 'success' as const
  return 'error' as const
})

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  return parts.join(' ') || '< 1m'
}

onMounted(async () => {
  connForm.value = {
    webUrl: connectionStore.connectionConfig.webUrl,
    apiUrl: connectionStore.connectionConfig.apiUrl,
    apiKey: connectionStore.connectionConfig.apiKey,
  }
  await configStore.fetchConfig()
  if (configStore.config) {
    configValues.value = { ...configStore.config }
    originalConfigValues.value = { ...configStore.config }
    yamlConfig.value = JSON.stringify(configStore.config, null, 2)
  }
})

async function handleSaveConnection() {
  try {
    connectionStore.updateConnectionConfig(connForm.value)
    message.success(t('pages.hermesSystem.connectionSaved'))
  } catch {
    message.error(t('pages.hermesSystem.connectionSaveFailed'))
  }
}

async function handleTestConnection() {
  testingConnection.value = true
  testResult.value = null
  try {
    const result = await connectionStore.testConnection(connForm.value.apiUrl, connForm.value.apiKey)
    testResult.value = result as unknown as Record<string, unknown>
    if (result.ok) {
      message.success(t('pages.hermesSystem.testSuccess'))
    } else {
      message.error(t('pages.hermesSystem.testFailed'))
    }
  } catch {
    message.error(t('pages.hermesSystem.testFailed'))
  } finally {
    testingConnection.value = false
  }
}

async function handleTabChange(tab: string) {
  if (tab === 'env' && envVars.value.length === 0) {
    await loadEnvVars()
  }
  if (tab === 'config') {
    await loadConfig()
  }
}

async function loadEnvVars() {
  envLoading.value = true
  try {
    const client = connectionStore.getClient()
    if (client) {
      envVars.value = await client.listEnvVars()
    }
  } catch {
    message.error(t('pages.hermesSystem.envLoadFailed'))
  } finally {
    envLoading.value = false
  }
}

async function loadConfig() {
  configLoading.value = true
  try {
    await configStore.fetchConfig()
    if (configStore.config) {
      configValues.value = { ...configStore.config }
      originalConfigValues.value = { ...configStore.config }
      yamlConfig.value = JSON.stringify(configStore.config, null, 2)
    }
  } catch {
    message.error(t('pages.hermesSystem.rawConfigLoadFailed'))
  } finally {
    configLoading.value = false
  }
}

async function handleSaveConfig() {
  if (!hasConfigChanges.value) {
    message.info(t('pages.config.noChanges'))
    return
  }
  configSaving.value = true
  try {
    const changes: Record<string, unknown> = {}
    configModifiedFields.value.forEach(key => {
      changes[key] = configValues.value[key]
    })
    await configStore.updateConfig(changes)
    originalConfigValues.value = { ...configValues.value }
    message.success(t('pages.hermesSystem.rawConfigSaveSuccess'))
  } catch {
    message.error(t('pages.hermesSystem.rawConfigSaveFailed'))
  } finally {
    configSaving.value = false
  }
}

function handleConfigValueChange(key: string, value: unknown) {
  configValues.value[key] = value
}

function handleResetConfigField(key: string) {
  configValues.value[key] = originalConfigValues.value[key]
}

function handleResetAllConfig() {
  configValues.value = { ...originalConfigValues.value }
  yamlConfig.value = JSON.stringify(originalConfigValues.value, null, 2)
}

function handleYamlConfigChange(value: string) {
  yamlConfig.value = value
  try {
    const parsed = JSON.parse(value)
    configValues.value = parsed
  } catch {
    // Invalid JSON, ignore
  }
}

function handleExportConfig() {
  const dataStr = JSON.stringify(configValues.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'hermes-config.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success(t('common.export') + ' ' + t('common.saveSuccess').toLowerCase())
}

function handleImportConfig(options: { file: UploadFileInfo }) {
  const file = options.file.file
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const parsed = JSON.parse(content)
      configValues.value = parsed
      yamlConfig.value = JSON.stringify(parsed, null, 2)
      message.success(t('pages.hermesSystem.rawConfigSaveSuccess'))
    } catch {
      message.error(t('pages.hermesSystem.rawConfigInvalid'))
    }
  }
  reader.readAsText(file)
  return false
}

async function handleSetEnvVar() {
  if (!newEnvKey.value.trim()) return
  try {
    const client = connectionStore.getClient()
    if (client) {
      await client.setEnvVar(newEnvKey.value.trim(), newEnvValue.value)
      message.success(t('pages.hermesSystem.envSetSuccess'))
      newEnvKey.value = ''
      newEnvValue.value = ''
      await loadEnvVars()
    }
  } catch {
    message.error(t('pages.hermesSystem.envSetFailed'))
  }
}

async function handleDeleteEnvVar(key: string) {
  try {
    const client = connectionStore.getClient()
    if (client) {
      await client.deleteEnvVar(key)
      message.success(t('pages.hermesSystem.envDeleteSuccess'))
      await loadEnvVars()
    }
  } catch {
    message.error(t('pages.hermesSystem.envDeleteFailed'))
  }
}

async function handleRevealEnvVar(key: string) {
  try {
    const client = connectionStore.getClient()
    if (client) {
      const value = await client.revealEnvVar(key)
      revealedKeys.value.add(key)
      const idx = envVars.value.findIndex((v) => v.key === key)
      if (idx >= 0) {
        const updated = [...envVars.value]
        updated[idx] = { ...updated[idx]!, value, masked: false }
        envVars.value = updated
      }
    }
  } catch {
    message.error(t('pages.hermesSystem.envRevealFailed'))
  }
}

function handleStartEditEnv(key: string, currentValue: string) {
  editingEnvKey.value = key
  editingEnvValue.value = currentValue
}

function handleCancelEditEnv() {
  editingEnvKey.value = null
  editingEnvValue.value = ''
}

async function handleSaveEditEnv(key: string) {
  try {
    const client = connectionStore.getClient()
    if (client) {
      await client.setEnvVar(key, editingEnvValue.value)
      message.success(t('pages.hermesSystem.envUpdateSuccess'))
      editingEnvKey.value = null
      editingEnvValue.value = ''
      await loadEnvVars()
    }
  } catch {
    message.error(t('pages.hermesSystem.envUpdateFailed'))
  }
}

</script>

<template>
  <div class="hermes-system-page">
    <!-- Overview Stats Panel -->
    <NCard class="app-card hermes-overview-panel" :bordered="false">
      <NGrid cols="1 s:2 m:4" responsive="screen" :x-gap="16" :y-gap="16">
        <NGridItem>
          <div class="overview-stat-card">
            <div class="overview-stat-icon" :class="`overview-stat-icon--${connectionStatusType}`">
              <NIcon
                :component="isConnected ? CheckmarkCircleOutline : CloseCircleOutline"
                :size="24"
              />
            </div>
            <div class="overview-stat-content">
              <NText depth="3" class="overview-stat-label">
                {{ t('pages.hermesSystem.status.connectionStatus') }}
              </NText>
              <div class="overview-stat-value">
                <NTag
                  :type="connectionStatusType"
                  :bordered="false"
                  round
                  size="small"
                >
                  <template #icon>
                    <NIcon
                      :component="isConnecting ? RefreshOutline : (isConnected ? CheckmarkCircleOutline : CloseCircleOutline)"
                      :size="14"
                    />
                  </template>
                  {{ connectionStatusText }}
                </NTag>
              </div>
            </div>
          </div>
        </NGridItem>

        <NGridItem>
          <div class="overview-stat-card">
            <div class="overview-stat-icon overview-stat-icon--info">
              <NIcon :component="CodeSlashOutline" :size="24" />
            </div>
            <div class="overview-stat-content">
              <NText depth="3" class="overview-stat-label">
                {{ t('pages.hermesSystem.status.version') }}
              </NText>
              <div class="overview-stat-value">
                <NText strong style="font-size: 18px;">
                  {{ status?.version || '-' }}
                </NText>
              </div>
            </div>
          </div>
        </NGridItem>

        <NGridItem>
          <div class="overview-stat-card">
            <div class="overview-stat-icon overview-stat-icon--success">
              <NIcon :component="RefreshOutline" :size="24" />
            </div>
            <div class="overview-stat-content">
              <NText depth="3" class="overview-stat-label">
                {{ t('pages.hermesSystem.status.uptime') }}
              </NText>
              <div class="overview-stat-value">
                <NText strong style="font-size: 18px;">
                  {{ status ? formatUptime(status.uptime) : '-' }}
                </NText>
              </div>
            </div>
          </div>
        </NGridItem>

        <NGridItem>
          <div class="overview-stat-card">
            <div class="overview-stat-icon overview-stat-icon--warning">
              <NIcon :component="LinkOutline" :size="24" />
            </div>
            <div class="overview-stat-content">
              <NText depth="3" class="overview-stat-label">
                {{ t('pages.hermesSystem.status.platform') }}
              </NText>
              <div class="overview-stat-value">
                <NTag v-if="status?.platform" :bordered="false" round type="info">
                  {{ status.platform }}
                </NTag>
                <NText v-else depth="3">-</NText>
              </div>
            </div>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>

    <!-- Main Tab Card -->
    <NCard :title="t('pages.hermesSystem.title')" :bordered="false" class="app-card">
      <NTabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
        <!-- Connection Config Tab -->
        <NTabPane name="connection" :tab="t('pages.hermesSystem.tabs.connection')">
          <NSpace vertical :size="20">
            <NAlert type="info" :bordered="false">
              {{ t('pages.hermesSystem.connectionHint') }}
            </NAlert>

            <div>
              <NText strong style="font-size: 15px; display: block; margin-bottom: 12px;">
                {{ t('pages.hermesSystem.form.sectionEndpoints') }}
              </NText>
              <NText depth="3" style="font-size: 13px; display: block; margin-bottom: 16px;">
                {{ t('pages.hermesSystem.form.sectionEndpointsHint') }}
              </NText>
              <NForm label-placement="left" label-width="120" style="max-width: 600px;">
                <NFormItem :label="t('pages.hermesSystem.form.webUrl')">
                  <NInput v-model:value="connForm.webUrl" placeholder="http://localhost:9119" />
                </NFormItem>
                <NFormItem :label="t('pages.hermesSystem.form.apiUrl')">
                  <NInput v-model:value="connForm.apiUrl" placeholder="http://localhost:8642" />
                </NFormItem>
              </NForm>
            </div>

            <NDivider style="margin: 0;" />

            <div>
              <NText strong style="font-size: 15px; display: block; margin-bottom: 12px;">
                {{ t('pages.hermesSystem.form.sectionAuth') }}
              </NText>
              <NText depth="3" style="font-size: 13px; display: block; margin-bottom: 16px;">
                {{ t('pages.hermesSystem.form.sectionAuthHint') }}
              </NText>
              <NForm label-placement="left" label-width="120" style="max-width: 600px;">
                <NFormItem :label="t('pages.hermesSystem.form.apiKey')">
                  <NInput
                    v-model:value="connForm.apiKey"
                    type="password"
                    show-password-on="click"
                    placeholder="API Key"
                  />
                </NFormItem>
              </NForm>
            </div>

            <NDivider style="margin: 0;" />

            <NSpace :size="8">
              <NButton type="primary" class="app-toolbar-btn" @click="handleSaveConnection">
                <template #icon><NIcon :component="SaveOutline" /></template>
                {{ t('common.save') }}
              </NButton>
              <NButton
                class="app-toolbar-btn"
                :loading="testingConnection"
                @click="handleTestConnection"
              >
                <template #icon><NIcon :component="LinkOutline" /></template>
                {{ t('pages.hermesSystem.testConnection') }}
              </NButton>
            </NSpace>

            <NAlert
              v-if="testResult"
              :type="(testResult as any).ok ? 'success' : 'error'"
              :bordered="false"
            >
              <pre class="test-result-pre">{{ JSON.stringify(testResult, null, 2) }}</pre>
            </NAlert>
          </NSpace>
        </NTabPane>

        <!-- Environment Variables Tab -->
        <NTabPane name="env" :tab="t('pages.hermesSystem.tabs.env')">
          <NSpace vertical :size="16">
            <!-- Add new env var -->
            <div>
              <NText strong style="font-size: 15px; display: block; margin-bottom: 4px;">
                {{ t('pages.hermesSystem.envAddNew') }}
              </NText>
              <NText depth="3" style="font-size: 13px; display: block; margin-bottom: 12px;">
                {{ t('pages.hermesSystem.envAddHint') }}
              </NText>
              <NSpace :size="8" align="end" :wrap="true">
                <NInput
                  v-model:value="newEnvKey"
                  :placeholder="t('pages.hermesSystem.envKeyPlaceholder')"
                  style="width: 200px;"
                />
                <NInput
                  v-model:value="newEnvValue"
                  :placeholder="t('pages.hermesSystem.envValuePlaceholder')"
                  style="width: 300px;"
                />
                <NButton
                  type="primary"
                  size="small"
                  class="app-toolbar-btn"
                  :disabled="!newEnvKey.trim()"
                  @click="handleSetEnvVar"
                >
                  {{ t('pages.hermesSystem.envAdd') }}
                </NButton>
              </NSpace>
            </div>

            <NDivider style="margin: 0;" />

            <!-- Search & refresh -->
            <NSpace justify="space-between" align="center">
              <NInput
                v-model:value="envSearchQuery"
                :placeholder="t('pages.hermesSystem.envSearchPlaceholder')"
                clearable
                style="width: 280px;"
              >
                <template #prefix>
                  <NIcon :component="SearchOutline" />
                </template>
              </NInput>
              <NButton
                size="small"
                class="app-toolbar-btn app-toolbar-btn--refresh"
                :loading="envLoading"
                @click="loadEnvVars"
              >
                <template #icon><NIcon :component="RefreshOutline" /></template>
                {{ t('common.refresh') }}
              </NButton>
            </NSpace>

            <!-- Env var list -->
            <NSpin :show="envLoading">
              <div v-if="filteredEnvVars.length > 0" class="hermes-env-list">
                <div
                  v-for="envVar in filteredEnvVars"
                  :key="envVar.key"
                  class="hermes-env-item"
                >
                  <!-- Normal display -->
                  <template v-if="editingEnvKey !== envVar.key">
                    <NSpace :size="8" align="center" style="flex: 1; min-width: 0;">
                      <NText
                        strong
                        class="hermes-env-key"
                        style="font-size: 13px; min-width: 160px; flex-shrink: 0;"
                      >
                        {{ envVar.key }}
                      </NText>
                      <NText
                        depth="3"
                        style="font-size: 13px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                      >
                        {{ envVar.masked && !revealedKeys.has(envVar.key) ? '********' : envVar.value }}
                      </NText>
                    </NSpace>
                    <NSpace :size="4" :wrap="false">
                      <NButton
                        v-if="envVar.masked && !revealedKeys.has(envVar.key)"
                        size="tiny"
                        quaternary
                        class="app-toolbar-btn"
                        @click="handleRevealEnvVar(envVar.key)"
                      >
                        <template #icon><NIcon :component="EyeOutline" :size="14" /></template>
                      </NButton>
                      <NButton
                        size="tiny"
                        quaternary
                        class="app-toolbar-btn"
                        @click="handleStartEditEnv(envVar.key, envVar.value)"
                      >
                        <template #icon><NIcon :component="CreateOutline" :size="14" /></template>
                      </NButton>
                      <NButton
                        size="tiny"
                        quaternary
                        type="error"
                        class="app-toolbar-btn"
                        @click="handleDeleteEnvVar(envVar.key)"
                      >
                        <template #icon><NIcon :component="TrashOutline" :size="14" /></template>
                      </NButton>
                    </NSpace>
                  </template>

                  <!-- Edit mode -->
                  <template v-else>
                    <NSpace :size="8" align="center" style="flex: 1; min-width: 0;">
                      <NText
                        strong
                        style="font-size: 13px; min-width: 160px; flex-shrink: 0;"
                      >
                        {{ envVar.key }}
                      </NText>
                      <NInput
                        v-model:value="editingEnvValue"
                        size="small"
                        style="flex: 1;"
                      />
                    </NSpace>
                    <NSpace :size="4" :wrap="false">
                      <NButton
                        size="tiny"
                        type="primary"
                        class="app-toolbar-btn"
                        @click="handleSaveEditEnv(envVar.key)"
                      >
                        {{ t('common.save') }}
                      </NButton>
                      <NButton
                        size="tiny"
                        class="app-toolbar-btn"
                        @click="handleCancelEditEnv"
                      >
                        {{ t('common.cancel') }}
                      </NButton>
                    </NSpace>
                  </template>
                </div>
              </div>
              <NText
                v-else-if="envSearchQuery && envVars.length > 0"
                depth="3"
                style="display: block; text-align: center; padding: 40px 0;"
              >
                {{ t('pages.hermesSystem.envNoMatch') }}
              </NText>
              <NText
                v-else
                depth="3"
                style="display: block; text-align: center; padding: 40px 0;"
              >
                {{ t('common.empty') }}
              </NText>
            </NSpin>
          </NSpace>
        </NTabPane>

        <!-- Config Tab (Visual + YAML Editor) -->
        <NTabPane name="config" :tab="t('pages.hermesSystem.tabs.config')">
          <NSpace vertical :size="12">
            <NAlert type="info" :bordered="false">
              {{ t('pages.hermesSystem.rawConfigHint') }}
            </NAlert>

            <!-- Toolbar: Mode switch + Import/Export -->
            <NSpace justify="space-between" align="center">
              <NSpace :size="12" align="center">
                <NRadioGroup v-model:value="configMode" size="small">
                  <NRadioButton value="visual">
                    <NIcon :component="SettingsOutline" :size="14" style="margin-right: 4px;" />
                    {{ t('pages.hermesSystem.configModeVisual') }}
                  </NRadioButton>
                  <NRadioButton value="yaml">
                    <NIcon :component="CodeSlashOutline" :size="14" style="margin-right: 4px;" />
                    {{ t('pages.hermesSystem.configModeYaml') }}
                  </NRadioButton>
                </NRadioGroup>
                <span v-if="hasConfigChanges" class="config-modified-indicator">
                  {{ configModifiedCount }} {{ t('pages.hermesSystem.configPendingSave') }}
                </span>
              </NSpace>
              <NSpace :size="8">
                <NUpload
                  :show-file-list="false"
                  accept=".json"
                  :custom-request="handleImportConfig"
                >
                  <NButton size="small" class="app-toolbar-btn">
                    <template #icon><NIcon :component="CloudUploadOutline" :size="14" /></template>
                    {{ t('pages.hermesSystem.configImport') }}
                  </NButton>
                </NUpload>
                <NButton size="small" class="app-toolbar-btn" @click="handleExportConfig">
                  <template #icon><NIcon :component="DownloadOutline" :size="14" /></template>
                  {{ t('pages.hermesSystem.configExport') }}
                </NButton>
              </NSpace>
            </NSpace>

            <NSpin :show="configLoading">
              <!-- Visual Mode -->
              <template v-if="configMode === 'visual'">
                <ConfigEditorPanel
                  v-model="configValues"
                  :schema="{
                    categories: DEFAULT_HERMES_CONFIG_SCHEMA.categories.map(cat => ({
                      id: cat.id,
                      name: cat.label,
                      icon: cat.icon,
                      description: cat.description,
                    })),
                    fields: Object.fromEntries(
                      DEFAULT_HERMES_CONFIG_SCHEMA.categories.map(cat => [
                        cat.id,
                        cat.fields.map(field => ({
                          key: field.key,
                          label: field.label,
                          description: field.description,
                          type: field.type,
                          defaultValue: field.defaultValue,
                          placeholder: field.placeholder,
                          options: field.options?.map(opt => ({
                            label: opt.label,
                            value: opt.value as string | number,
                          })),
                          validation: field.validation,
                          unit: field.unit,
                        })),
                      ])
                    ),
                  }"
                  :disabled="configSaving"
                  :saving="configSaving"
                  @save="handleSaveConfig"
                  @reset="handleResetAllConfig"
                />
              </template>

              <!-- YAML Mode -->
              <template v-else>
                <NSpace vertical :size="12">
                  <NSpace :size="12" align="center">
                    <NTag
                      :type="yamlConfigValid ? 'success' : 'error'"
                      :bordered="false"
                      round
                      size="small"
                    >
                      <template #icon>
                        <NIcon
                          :component="yamlConfigValid ? CheckmarkCircleOutline : CloseCircleOutline"
                          :size="14"
                        />
                      </template>
                      {{ yamlConfigValid ? t('pages.hermesSystem.rawConfigValid') : t('pages.hermesSystem.rawConfigInvalid') }}
                    </NTag>
                    <NText v-if="!yamlConfigValid" depth="3" style="font-size: 12px;">
                      {{ yamlConfigError }}
                    </NText>
                  </NSpace>

                  <div class="raw-config-editor">
                    <div v-if="showLineNumbers" class="raw-config-line-numbers">
                      <div
                        v-for="(_, index) in yamlConfig.split('\n')"
                        :key="index"
                        class="raw-config-line-number"
                      >
                        {{ index + 1 }}
                      </div>
                    </div>
                    <NInput
                      :value="yamlConfig"
                      type="textarea"
                      :autosize="{ minRows: 20, maxRows: 50 }"
                      class="raw-config-textarea"
                      :class="{ 'raw-config-textarea--with-lines': showLineNumbers }"
                      style="font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 13px;"
                      @update:value="handleYamlConfigChange"
                    />
                  </div>
                </NSpace>
              </template>
            </NSpin>

            <!-- Footer actions -->
            <NSpace :size="8" justify="end">
              <NButton
                size="small"
                class="app-toolbar-btn app-toolbar-btn--refresh"
                :loading="configLoading"
                @click="loadConfig"
              >
                <template #icon><NIcon :component="RefreshOutline" /></template>
                {{ t('common.refresh') }}
              </NButton>
              <NButton
                size="small"
                class="app-toolbar-btn"
                :disabled="!hasConfigChanges"
                @click="handleResetAllConfig"
              >
                <template #icon><NIcon :component="RefreshOutline" /></template>
                {{ t('common.reset') }}
              </NButton>
              <NButton
                type="primary"
                size="small"
                class="app-toolbar-btn"
                :loading="configSaving"
                :disabled="!hasConfigChanges || (configMode === 'yaml' && !yamlConfigValid)"
                @click="handleSaveConfig"
              >
                <template #icon><NIcon :component="SaveOutline" /></template>
                {{ t('common.save') }}
              </NButton>
            </NSpace>
          </NSpace>
        </NTabPane>

        </NTabs>
    </NCard>
  </div>
</template>

<style scoped>
.hermes-system-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- Overview Stats Panel ---- */

.hermes-overview-panel {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.08), rgba(59, 130, 246, 0.08));
}

.overview-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-lg, 12px);
  background: var(--n-color, #fff);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.overview-stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.overview-stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
}

.overview-stat-icon--success {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

.overview-stat-icon--error {
  background: rgba(208, 48, 80, 0.12);
  color: #d03050;
}

.overview-stat-icon--warning {
  background: rgba(240, 160, 32, 0.12);
  color: #f0a020;
}

.overview-stat-icon--info {
  background: rgba(32, 128, 240, 0.12);
  color: #2080f0;
}

.overview-stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.overview-stat-label {
  font-size: 13px;
}

.overview-stat-value {
  display: flex;
  align-items: center;
}

/* ---- Connection Tab ---- */

.test-result-pre {
  margin: 0;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}

/* ---- Environment Variables ---- */

.hermes-env-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hermes-env-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius, 8px);
  background: var(--n-color-modal, #fafafa);
  border: 1px solid var(--n-border-color, #efeff5);
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.hermes-env-item:hover {
  background: var(--n-color-hover, rgba(32, 128, 240, 0.04));
  border-color: var(--n-border-color-hover, rgba(32, 128, 240, 0.2));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.hermes-env-key {
  color: var(--n-text-color, #333);
  user-select: all;
}

/* ---- Config Editor ---- */

.config-modified-indicator {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  font-weight: 500;
}

[data-theme='dark'] .config-modified-indicator {
  background: rgba(245, 158, 11, 0.15);
}

/* ---- Raw Config Editor ---- */

.raw-config-editor {
  display: flex;
  border-radius: var(--radius, 8px);
  border: 1px solid var(--n-border-color, #efeff5);
  overflow: hidden;
  background: var(--n-color-modal, #fafafa);
}

.raw-config-line-numbers {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  background: var(--n-color, rgba(0, 0, 0, 0.02));
  border-right: 1px solid var(--n-border-color, #efeff5);
  user-select: none;
  min-width: 48px;
  flex-shrink: 0;
}

.raw-config-line-number {
  text-align: right;
  padding: 0 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--n-text-color-disabled, #bbb);
}

.raw-config-textarea :deep(.n-input__textarea-el) {
  line-height: 1.6 !important;
}

.raw-config-textarea--with-lines :deep(.n-input-wrapper) {
  padding-left: 0 !important;
}

/* ---- Button hover animations ---- */

.app-toolbar-btn {
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.app-toolbar-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.app-toolbar-btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.app-toolbar-btn--refresh:hover {
  opacity: 0.85;
}
</style>
