<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NSelect,
  NSpace,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import {
  CheckmarkCircleOutline,
  CloudOutline,
  CreateOutline,
  CubeOutline,
  EyeOutline,
  KeyOutline,
  LinkOutline,
  RefreshOutline,
  SearchOutline,
  ServerOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useHermesModelStore } from '@/stores/hermes/model'
import { useHermesConfigStore } from '@/stores/hermes/config'
import { HERMES_PROVIDERS } from '@/api/hermes/types'
import type { HermesProviderConfig, HermesEnvVar } from '@/api/hermes/types'

const { t } = useI18n()
const modelStore = useHermesModelStore()
const configStore = useHermesConfigStore()
const message = useMessage()

const activeTab = ref('models')

// ---- 筛选状态 ----

const searchQuery = ref('')
const providerFilter = ref<string | null>(null)

const currentModelFromConfig = computed(() => configStore.config?.model || '')

// ---- 统计数据 ----

const totalModels = computed(() => modelStore.models.length)

const activeModelLabel = computed(() => {
  if (!currentModelFromConfig.value) return '-'
  const found = modelStore.models.find((m) => m.id === currentModelFromConfig.value)
  return found?.label || found?.id || currentModelFromConfig.value
})

const uniqueProviders = computed(() => {
  const set = new Set<string>()
  modelStore.models.forEach((m) => {
    if (m.provider) set.add(m.provider)
  })
  return set.size
})

const avgContextWindow = computed(() => {
  const withWindow = modelStore.models.filter((m) => m.contextWindow && m.contextWindow > 0)
  if (withWindow.length === 0) return 0
  const sum = withWindow.reduce((acc, m) => acc + (m.contextWindow || 0), 0)
  return Math.round(sum / withWindow.length)
})

function formatContextWindow(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K'
  return val.toLocaleString()
}

// ---- Provider 筛选选项 ----

const providerOptions = computed<SelectOption[]>(() => {
  const providers = [...new Set(modelStore.models.map((m) => m.provider).filter(Boolean))] as string[]
  return [
    { label: t('pages.hermesModels.allProviders'), value: '__all__' },
    ...providers.map((p) => ({ label: p, value: p })),
  ]
})

// ---- 过滤后的模型列表 ----

const filteredModels = computed(() => {
  let list = modelStore.models
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (m) =>
        (m.label || m.id).toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.provider || '').toLowerCase().includes(q),
    )
  }
  if (providerFilter.value && providerFilter.value !== '__all__') {
    list = list.filter((m) => m.provider === providerFilter.value)
  }
  return list
})

// ---- 能力标签颜色映射 ----

const capabilityColors: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'> = {
  chat: 'success',
  completion: 'info',
  vision: 'warning',
  function_calling: 'error',
  tool_use: 'error',
  embedding: 'default',
  image_generation: 'warning',
  code: 'info',
  reasoning: 'success',
}

function getCapabilityType(cap: string): 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' {
  const lower = cap.toLowerCase()
  for (const [key, type] of Object.entries(capabilityColors)) {
    if (lower.includes(key)) return type
  }
  return 'default'
}

// ---- Provider 配置相关 ----

const revealedKeys = ref<Set<string>>(new Set())
const editingProvider = ref<HermesProviderConfig | null>(null)
const showConfigForm = ref(false)
const configFormApiKey = ref('')
const configFormBaseUrl = ref('')
const configFormSaving = ref(false)

function getProviderEnvVar(provider: HermesProviderConfig): HermesEnvVar | undefined {
  return modelStore.envVars.find((v) => v.key === provider.envKey)
}

function getProviderBaseUrlVar(provider: HermesProviderConfig): HermesEnvVar | undefined {
  if (!provider.baseUrlKey) return undefined
  return modelStore.envVars.find((v) => v.key === provider.baseUrlKey)
}

function isProviderConfigured(provider: HermesProviderConfig): boolean {
  const envVar = getProviderEnvVar(provider)
  return !!envVar && !!envVar.value
}

function maskApiKey(value: string): string {
  if (!value || value.length < 8) return '****'
  const prefix = value.slice(0, 6)
  const suffix = value.slice(-4)
  return `${prefix}****${suffix}`
}

function getProviderDisplayApiKey(provider: HermesProviderConfig): string {
  const envVar = getProviderEnvVar(provider)
  if (!envVar || !envVar.value) return ''
  if (revealedKeys.value.has(provider.envKey)) {
    return envVar.value
  }
  return maskApiKey(envVar.value)
}

function getProviderDisplayBaseUrl(provider: HermesProviderConfig): string {
  const envVar = getProviderBaseUrlVar(provider)
  if (!envVar || !envVar.value) return provider.defaultBaseUrl || ''
  if (revealedKeys.value.has(provider.baseUrlKey!)) {
    return envVar.value
  }
  return envVar.value
}

async function handleOpenConfig(provider: HermesProviderConfig) {
  editingProvider.value = provider
  configFormApiKey.value = ''
  configFormBaseUrl.value = provider.defaultBaseUrl || ''
  showConfigForm.value = true
}

async function handleEditConfig(provider: HermesProviderConfig) {
  editingProvider.value = provider
  configFormApiKey.value = ''
  configFormBaseUrl.value = getProviderBaseUrlVar(provider)?.value || provider.defaultBaseUrl || ''
  showConfigForm.value = true
}

function handleCancelConfig() {
  editingProvider.value = null
  showConfigForm.value = false
  configFormApiKey.value = ''
  configFormBaseUrl.value = ''
}

async function handleSaveConfig() {
  if (!editingProvider.value) return

  configFormSaving.value = true
  try {
    if (configFormApiKey.value.trim()) {
      await modelStore.setEnvVar(editingProvider.value.envKey, configFormApiKey.value.trim())
    }
    if (editingProvider.value.baseUrlKey && configFormBaseUrl.value.trim()) {
      await modelStore.setEnvVar(editingProvider.value.baseUrlKey, configFormBaseUrl.value.trim())
    }
    message.success(t('pages.hermesModels.providerConfig.saveSuccess'))
    handleCancelConfig()
  } catch {
    message.error(t('pages.hermesModels.providerConfig.saveFailed'))
  } finally {
    configFormSaving.value = false
  }
}

async function handleDeleteConfig(provider: HermesProviderConfig) {
  try {
    await modelStore.deleteEnvVar(provider.envKey)
    if (provider.baseUrlKey) {
      const baseUrlVar = getProviderBaseUrlVar(provider)
      if (baseUrlVar) {
        await modelStore.deleteEnvVar(provider.baseUrlKey)
      }
    }
    revealedKeys.value.delete(provider.envKey)
    if (provider.baseUrlKey) {
      revealedKeys.value.delete(provider.baseUrlKey)
    }
    message.success(t('pages.hermesModels.providerConfig.deleteSuccess'))
  } catch {
    message.error(t('pages.hermesModels.providerConfig.deleteFailed'))
  }
}

async function handleRevealKey(provider: HermesProviderConfig) {
  try {
    const value = await modelStore.revealEnvVar(provider.envKey)
    revealedKeys.value.add(provider.envKey)
    const idx = modelStore.envVars.findIndex((v) => v.key === provider.envKey)
    if (idx >= 0) {
      modelStore.envVars[idx] = { ...modelStore.envVars[idx]!, value, masked: false }
    }
  } catch {
    message.error(t('pages.hermesModels.providerConfig.revealFailed'))
  }
}

async function handleRevealBaseUrl(provider: HermesProviderConfig) {
  if (!provider.baseUrlKey) return
  try {
    const value = await modelStore.revealEnvVar(provider.baseUrlKey)
    revealedKeys.value.add(provider.baseUrlKey)
    const idx = modelStore.envVars.findIndex((v) => v.key === provider.baseUrlKey)
    if (idx >= 0) {
      modelStore.envVars[idx] = { ...modelStore.envVars[idx]!, value, masked: false }
    }
  } catch {
    message.error(t('pages.hermesModels.providerConfig.revealFailed'))
  }
}

async function handleTabChange(tab: string) {
  if (tab === 'providers' && modelStore.envVars.length === 0) {
    await modelStore.fetchEnvVars()
  }
}

// ---- 生命周期 ----

onMounted(async () => {
  try {
    await Promise.all([modelStore.fetchModels(), configStore.fetchConfig()])
    if (currentModelFromConfig.value) {
      modelStore.syncCurrentModelFromConfig(currentModelFromConfig.value)
    }
  } catch {
    // ignore
  }
})

// ---- 操作 ----

async function handleRefresh() {
  try {
    await modelStore.fetchModels()
  } catch {
    message.error(t('pages.hermesModels.loadFailed'))
  }
}

async function handleSetModel(modelId: string) {
  try {
    await modelStore.setCurrentModel(modelId)
    message.success(t('pages.hermesModels.setModelSuccess', { model: modelId }))
  } catch {
    message.error(t('pages.hermesModels.setModelFailed'))
  }
}
</script>

<template>
  <div class="hermes-models-page">
    <!-- 页面标题 -->
    <div class="hermes-models-header">
      <h2 class="hermes-models-title">{{ t('pages.hermesModels.title') }}</h2>
      <NButton size="small" class="app-toolbar-btn app-toolbar-btn--refresh" :loading="modelStore.loading" @click="handleRefresh">
        <template #icon><NIcon :component="RefreshOutline" /></template>
        {{ t('common.refresh') }}
      </NButton>
    </div>

    <!-- 错误提示 -->
    <NAlert v-if="modelStore.lastError" type="error" :bordered="false" closable class="app-card">
      {{ modelStore.lastError }}
    </NAlert>

    <!-- 概览统计面板 -->
    <NCard :bordered="false" class="app-card hermes-stats-panel">
      <NGrid cols="1 s:2 m:4" responsive="screen" :x-gap="16" :y-gap="16">
        <NGridItem>
          <div class="stat-item">
            <div class="stat-icon stat-icon--blue">
              <NIcon :component="CubeOutline" :size="20" />
            </div>
            <div class="stat-content">
              <NText depth="3" class="stat-label">{{ t('pages.hermesModels.stats.totalModels') }}</NText>
              <div class="stat-value">{{ totalModels }}</div>
            </div>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="stat-item">
            <div class="stat-icon stat-icon--green">
              <NIcon :component="CheckmarkCircleOutline" :size="20" />
            </div>
            <div class="stat-content">
              <NText depth="3" class="stat-label">{{ t('pages.hermesModels.stats.activeModel') }}</NText>
              <div class="stat-value stat-value--text">{{ activeModelLabel }}</div>
            </div>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="stat-item">
            <div class="stat-icon stat-icon--purple">
              <NIcon :component="ServerOutline" :size="20" />
            </div>
            <div class="stat-content">
              <NText depth="3" class="stat-label">{{ t('pages.hermesModels.stats.providers') }}</NText>
              <div class="stat-value">{{ uniqueProviders }}</div>
            </div>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="stat-item">
            <div class="stat-icon stat-icon--orange">
              <NIcon :component="CloudOutline" :size="20" />
            </div>
            <div class="stat-content">
              <NText depth="3" class="stat-label">{{ t('pages.hermesModels.stats.avgContextWindow') }}</NText>
              <div class="stat-value">{{ formatContextWindow(avgContextWindow) }}</div>
            </div>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>

    <!-- 标签页 -->
    <NCard :bordered="false" class="app-card">
      <NTabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
        <!-- 模型列表标签页 -->
        <NTabPane name="models" :tab="t('pages.hermesModels.tabs.models')">
          <!-- 搜索与筛选栏 -->
          <div class="hermes-filter-bar">
            <NSpace :size="12" align="center">
              <NInput
                v-model:value="searchQuery"
                clearable
                :placeholder="t('pages.hermesModels.searchPlaceholder')"
                style="width: 280px;"
              >
                <template #prefix><NIcon :component="SearchOutline" /></template>
              </NInput>
              <NSelect
                v-model:value="providerFilter"
                :options="providerOptions"
                :placeholder="t('pages.hermesModels.providerFilter')"
                style="width: 180px;"
                clearable
              />
              <NText v-if="filteredModels.length !== modelStore.models.length" depth="3" style="font-size: 12px; margin-left: auto;">
                {{ filteredModels.length }} / {{ modelStore.models.length }}
              </NText>
            </NSpace>
          </div>

          <!-- 模型卡片网格 -->
          <NSpin :show="modelStore.loading">
            <NGrid v-if="filteredModels.length > 0" cols="1 s:2 m:3" responsive="screen" :x-gap="12" :y-gap="12">
              <NGridItem v-for="model in filteredModels" :key="model.id">
                <div class="model-card-wrapper">
                  <NCard class="app-card model-card" :bordered="false">
                    <NSpace vertical :size="10">
                      <!-- 模型名称 + 当前标记 -->
                      <NSpace justify="space-between" align="center">
                        <NText strong class="model-name">{{ model.label || model.id }}</NText>
                        <NTag
                          v-if="model.id === currentModelFromConfig"
                          type="success"
                          size="small"
                          :bordered="false"
                          round
                        >
                          <template #icon><NIcon :component="CheckmarkCircleOutline" /></template>
                          {{ t('pages.hermesModels.active') }}
                        </NTag>
                      </NSpace>

                      <!-- Provider 标签 -->
                      <NTag v-if="model.provider" size="small" :bordered="false" round type="info">
                        {{ model.provider }}
                      </NTag>

                      <!-- 描述 -->
                      <NText v-if="model.description" depth="3" class="model-description">
                        {{ model.description }}
                      </NText>

                      <!-- 上下文窗口 -->
                      <NSpace v-if="model.contextWindow" :size="6" align="center">
                        <NText depth="3" style="font-size: 12px;">
                          {{ t('pages.hermesModels.contextWindow') }}:
                        </NText>
                        <NText style="font-size: 12px; font-weight: 600;">
                          {{ model.contextWindow.toLocaleString() }}
                        </NText>
                      </NSpace>

                      <!-- 能力标签 -->
                      <NSpace v-if="model.capabilities?.length" :size="4" wrap>
                        <NTag
                          v-for="cap in model.capabilities"
                          :key="cap"
                          size="tiny"
                          :bordered="false"
                          round
                          :type="getCapabilityType(cap)"
                        >
                          {{ cap }}
                        </NTag>
                      </NSpace>

                      <!-- 操作按钮 -->
                      <div class="model-card-actions">
                        <NButton
                          v-if="model.id !== currentModelFromConfig"
                          size="small"
                          type="primary"
                          secondary
                          class="app-toolbar-btn"
                          @click="handleSetModel(model.id)"
                        >
                          {{ t('pages.hermesModels.setAsCurrent') }}
                        </NButton>
                      </div>
                    </NSpace>
                  </NCard>
                </div>
              </NGridItem>
            </NGrid>

            <!-- 空状态 -->
            <NText v-else-if="!modelStore.loading" depth="3" class="empty-state">
              {{ t('common.empty') }}
            </NText>
          </NSpin>
        </NTabPane>

        <!-- Provider 配置标签页 -->
        <NTabPane name="providers" :tab="t('pages.hermesModels.tabs.providers')">
          <NSpin :show="modelStore.envLoading">
            <!-- Provider 卡片列表 -->
            <div class="provider-list">
              <div
                v-for="provider in HERMES_PROVIDERS"
                :key="provider.id"
                class="provider-card"
              >
                <div class="provider-header">
                  <div class="provider-info">
                    <NSpace :size="8" align="center">
                      <NIcon :component="KeyOutline" :size="18" class="provider-icon" />
                      <NText strong class="provider-name">{{ provider.name }}</NText>
                      <NTag
                        v-if="provider.recommended"
                        type="success"
                        size="small"
                        :bordered="false"
                        round
                      >
                        {{ t('pages.hermesModels.providerConfig.recommended') }}
                      </NTag>
                    </NSpace>
                    <NText v-if="provider.description" depth="3" class="provider-description">
                      {{ provider.description }}
                    </NText>
                  </div>
                  <div class="provider-status">
                    <NTag
                      :type="isProviderConfigured(provider) ? 'success' : 'default'"
                      :bordered="false"
                      round
                      size="small"
                    >
                      {{ isProviderConfigured(provider) ? t('pages.hermesModels.providerConfig.configured') : t('pages.hermesModels.providerConfig.notConfigured') }}
                    </NTag>
                  </div>
                </div>

                <!-- 已配置时显示信息 -->
                <div v-if="isProviderConfigured(provider)" class="provider-config-info">
                  <div class="config-item">
                    <NText depth="3" class="config-label">API Key:</NText>
                    <NText class="config-value">{{ getProviderDisplayApiKey(provider) }}</NText>
                    <NButton
                      v-if="getProviderEnvVar(provider)?.masked && !revealedKeys.has(provider.envKey)"
                      size="tiny"
                      quaternary
                      class="app-toolbar-btn"
                      @click="handleRevealKey(provider)"
                    >
                      <template #icon><NIcon :component="EyeOutline" :size="14" /></template>
                    </NButton>
                  </div>
                  <div v-if="provider.baseUrlKey" class="config-item">
                    <NText depth="3" class="config-label">Base URL:</NText>
                    <NText class="config-value">{{ getProviderDisplayBaseUrl(provider) }}</NText>
                    <NButton
                      v-if="getProviderBaseUrlVar(provider)?.masked && !revealedKeys.has(provider.baseUrlKey)"
                      size="tiny"
                      quaternary
                      class="app-toolbar-btn"
                      @click="handleRevealBaseUrl(provider)"
                    >
                      <template #icon><NIcon :component="EyeOutline" :size="14" /></template>
                    </NButton>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="provider-actions">
                  <NButton
                    v-if="!isProviderConfigured(provider)"
                    size="small"
                    type="primary"
                    secondary
                    class="app-toolbar-btn"
                    @click="handleOpenConfig(provider)"
                  >
                    <template #icon><NIcon :component="KeyOutline" /></template>
                    {{ t('pages.hermesModels.providerConfig.configure') }}
                  </NButton>
                  <template v-else>
                    <NButton
                      size="small"
                      secondary
                      class="app-toolbar-btn"
                      @click="handleEditConfig(provider)"
                    >
                      <template #icon><NIcon :component="CreateOutline" /></template>
                      {{ t('pages.hermesModels.providerConfig.edit') }}
                    </NButton>
                    <NButton
                      size="small"
                      type="error"
                      secondary
                      class="app-toolbar-btn"
                      @click="handleDeleteConfig(provider)"
                    >
                      <template #icon><NIcon :component="TrashOutline" /></template>
                      {{ t('pages.hermesModels.providerConfig.delete') }}
                    </NButton>
                  </template>
                  <NButton
                    v-if="provider.docsUrl"
                    size="small"
                    quaternary
                    tag="a"
                    :href="provider.docsUrl"
                    target="_blank"
                    class="app-toolbar-btn"
                  >
                    <template #icon><NIcon :component="LinkOutline" /></template>
                    {{ t('pages.hermesModels.providerConfig.docs') }}
                  </NButton>
                </div>
              </div>
            </div>
          </NSpin>
        </NTabPane>
      </NTabs>
    </NCard>

    <!-- Provider 配置表单弹窗 -->
    <div v-if="showConfigForm && editingProvider" class="config-form-overlay" @click.self="handleCancelConfig">
      <NCard class="config-form-card" :bordered="false">
        <template #header>
          <NSpace align="center" :size="8">
            <NIcon :component="KeyOutline" :size="18" />
            <NText strong>
              {{ isProviderConfigured(editingProvider) ? t('pages.hermesModels.providerConfig.editTitle') : t('pages.hermesModels.providerConfig.configureTitle') }}
              - {{ editingProvider.name }}
            </NText>
          </NSpace>
        </template>

        <NSpace vertical :size="16">
          <div>
            <NText strong style="font-size: 14px; display: block; margin-bottom: 8px;">
              API Key
            </NText>
            <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 8px;">
              {{ isProviderConfigured(editingProvider) ? t('pages.hermesModels.providerConfig.editHint') : t('pages.hermesModels.providerConfig.apiKeyHint') }}
            </NText>
            <NInput
              v-model:value="configFormApiKey"
              type="password"
              show-password-on="click"
              :placeholder="t('pages.hermesModels.providerConfig.apiKeyPlaceholder')"
            />
          </div>

          <div v-if="editingProvider.baseUrlKey">
            <NText strong style="font-size: 14px; display: block; margin-bottom: 8px;">
              Base URL
            </NText>
            <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 8px;">
              {{ t('pages.hermesModels.providerConfig.baseUrlHint') }}
            </NText>
            <NInput
              v-model:value="configFormBaseUrl"
              :placeholder="editingProvider.defaultBaseUrl || ''"
            />
          </div>

          <NSpace :size="8" justify="end">
            <NButton class="app-toolbar-btn" @click="handleCancelConfig">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              class="app-toolbar-btn"
              :loading="configFormSaving"
              :disabled="!configFormApiKey.trim() && !isProviderConfigured(editingProvider)"
              @click="handleSaveConfig"
            >
              {{ t('common.save') }}
            </NButton>
          </NSpace>
        </NSpace>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.hermes-models-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 页面标题 ---- */

.hermes-models-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hermes-models-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

/* ---- 概览统计面板 ---- */

.hermes-stats-panel {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.08), rgba(59, 130, 246, 0.08));
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius, 8px);
  flex-shrink: 0;
}

.stat-icon--blue {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.stat-icon--green {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

.stat-icon--purple {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.stat-icon--orange {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
}

.stat-content {
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  display: block;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  margin-top: 4px;
  line-height: 1.2;
}

.stat-value--text {
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

/* ---- 搜索与筛选栏 ---- */

.hermes-filter-bar {
  margin-bottom: 16px;
}

/* ---- 模型卡片 ---- */

.model-card-wrapper {
  height: 100%;
}

.model-card {
  height: 100%;
  border-radius: var(--radius, 8px);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.model-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.model-name {
  font-size: 15px;
}

.model-description {
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.model-card-actions {
  margin-top: 4px;
}

/* ---- 空状态 ---- */

.empty-state {
  display: block;
  text-align: center;
  padding: 40px 0;
}

/* ---- Provider 配置 ---- */

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  padding: 16px;
  border-radius: var(--radius, 8px);
  background: var(--n-color-modal, #fafafa);
  border: 1px solid var(--n-border-color, #efeff5);
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.provider-card:hover {
  background: var(--n-color-hover, rgba(32, 128, 240, 0.04));
  border-color: var(--n-border-color-hover, rgba(32, 128, 240, 0.2));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.provider-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.provider-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-icon {
  color: var(--n-text-color, #333);
}

.provider-name {
  font-size: 15px;
}

.provider-description {
  font-size: 13px;
}

.provider-status {
  flex-shrink: 0;
}

.provider-config-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: var(--radius, 6px);
  background: var(--n-color, rgba(0, 0, 0, 0.02));
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label {
  font-size: 12px;
  min-width: 70px;
  flex-shrink: 0;
}

.config-value {
  font-size: 13px;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ---- 配置表单弹窗 ---- */

.config-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.config-form-card {
  width: 100%;
  max-width: 480px;
  margin: 16px;
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
