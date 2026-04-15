import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useHermesConnectionStore } from './connection'
import type { HermesModel, HermesEnvVar } from '@/api/hermes/types'

export const useHermesModelStore = defineStore('hermes-model', () => {
  // ---- 状态 ----

  const models = ref<HermesModel[]>([])
  const currentModel = ref('')
  const loading = ref(false)
  const lastError = ref<string | null>(null)

  const envVars = ref<HermesEnvVar[]>([])
  const envLoading = ref(false)

  // ---- 方法 ----

  /**
   * 加载模型列表
   */
  async function fetchModels() {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    loading.value = true
    lastError.value = null

    try {
      models.value = await client.listModels()
    } catch (error) {
      models.value = []
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('[HermesModelStore] fetchModels failed:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置当前模型（通过配置 API）
   */
  async function setCurrentModel(modelId: string) {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    lastError.value = null

    try {
      await client.setCurrentModel(modelId)
      currentModel.value = modelId
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('[HermesModelStore] setCurrentModel failed:', error)
      throw error
    }
  }

  /**
   * 从配置中同步当前模型
   */
  function syncCurrentModelFromConfig(configModel?: string) {
    if (configModel) {
      currentModel.value = configModel
    }
  }

  // ---- 环境变量方法 ----

  /**
   * 获取环境变量列表
   */
  async function fetchEnvVars() {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    envLoading.value = true
    lastError.value = null

    try {
      envVars.value = await client.listEnvVars()
    } catch (error) {
      envVars.value = []
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('[HermesModelStore] fetchEnvVars failed:', error)
    } finally {
      envLoading.value = false
    }
  }

  /**
   * 设置环境变量
   */
  async function setEnvVar(key: string, value: string) {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    lastError.value = null

    try {
      await client.setEnvVar(key, value)
      await fetchEnvVars()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('[HermesModelStore] setEnvVar failed:', error)
      throw error
    }
  }

  /**
   * 删除环境变量
   */
  async function deleteEnvVar(key: string) {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    lastError.value = null

    try {
      await client.deleteEnvVar(key)
      await fetchEnvVars()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('[HermesModelStore] deleteEnvVar failed:', error)
      throw error
    }
  }

  /**
   * 显示环境变量明文
   */
  async function revealEnvVar(key: string): Promise<string> {
    const connStore = useHermesConnectionStore()
    const client = await connStore.getClientAsync()
    if (!client) {
      throw new Error('Hermes 未连接')
    }

    lastError.value = null

    try {
      return await client.revealEnvVar(key)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      console.error('[HermesModelStore] revealEnvVar failed:', error)
      throw error
    }
  }

  return {
    // 状态
    models,
    currentModel,
    loading,
    lastError,
    envVars,
    envLoading,
    // 方法
    fetchModels,
    setCurrentModel,
    syncCurrentModelFromConfig,
    fetchEnvVars,
    setEnvVar,
    deleteEnvVar,
    revealEnvVar,
  }
})
