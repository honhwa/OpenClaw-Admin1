import type {
  ConfigCategory,
  ConfigFieldSchema,
  HermesConfigSchema,
} from './types'

export const GENERAL_FIELDS: ConfigFieldSchema[] = [
  {
    key: 'model',
    label: '模型',
    description: '选择要使用的 AI 模型',
    type: 'select',
    defaultValue: '',
    placeholder: '选择模型',
    validation: { required: true },
  },
  {
    key: 'modelProvider',
    label: '模型提供商',
    description: '选择模型提供商',
    type: 'select',
    defaultValue: 'openrouter',
    options: [
      { value: 'openrouter', label: 'OpenRouter', description: '推荐，支持 200+ 模型' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic' },
      { value: 'google', label: 'Google Gemini' },
      { value: 'zhipu', label: 'z.ai / ZhipuAI' },
      { value: 'kimi', label: 'Kimi / Moonshot' },
      { value: 'minimax', label: 'MiniMax' },
      { value: 'deepseek', label: 'DeepSeek' },
      { value: 'huggingface', label: 'Hugging Face' },
      { value: 'nous', label: 'Nous Portal' },
      { value: 'custom', label: '自定义端点' },
    ],
  },
  {
    key: 'systemPrompt',
    label: '系统提示词',
    description: '设置 AI 助手的系统提示词',
    type: 'textarea',
    defaultValue: '',
    placeholder: '输入系统提示词...',
  },
  {
    key: 'temperature',
    label: '温度',
    description: '控制输出的随机性，值越高输出越随机',
    type: 'number',
    defaultValue: 0.7,
    validation: { min: 0, max: 2 },
    unit: '',
  },
  {
    key: 'maxTokens',
    label: '最大令牌数',
    description: '单次响应的最大令牌数',
    type: 'number',
    defaultValue: 4096,
    validation: { min: 1, max: 1000000 },
    unit: 'tokens',
  },
  {
    key: 'contextWindow',
    label: '上下文窗口',
    description: '模型可用的上下文窗口大小',
    type: 'number',
    defaultValue: 128000,
    validation: { min: 1000, max: 10000000 },
    unit: 'tokens',
  },
]

export const TERMINAL_FIELDS: ConfigFieldSchema[] = [
  {
    key: 'terminal.backend',
    label: '终端后端',
    description: '选择终端后端类型',
    type: 'select',
    defaultValue: 'local',
    options: [
      { value: 'local', label: '本地终端' },
      { value: 'remote', label: '远程终端' },
    ],
  },
  {
    key: 'terminal.cwd',
    label: '工作目录',
    description: '终端的默认工作目录',
    type: 'text',
    defaultValue: '',
    placeholder: '例如: /home/user/projects',
  },
]

export const MEMORY_FIELDS: ConfigFieldSchema[] = [
  {
    key: 'memory.enabled',
    label: '启用记忆',
    description: '启用 AI 记忆功能，允许跨会话记住信息',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'memory.maxSize',
    label: '最大记忆大小',
    description: '记忆存储的最大大小',
    type: 'number',
    defaultValue: 10000,
    validation: { min: 100, max: 100000 },
    unit: '字符',
  },
]

export const COMPRESSION_FIELDS: ConfigFieldSchema[] = [
  {
    key: 'compression.enabled',
    label: '启用压缩',
    description: '启用上下文压缩功能',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'compression.threshold',
    label: '压缩阈值',
    description: '触发压缩的上下文大小阈值',
    type: 'number',
    defaultValue: 50000,
    validation: { min: 1000, max: 500000 },
    unit: 'tokens',
  },
]

export const TTS_FIELDS: ConfigFieldSchema[] = [
  {
    key: 'tts.enabled',
    label: '启用 TTS',
    description: '启用文本转语音功能',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'tts.provider',
    label: 'TTS 提供商',
    description: '选择文本转语音提供商',
    type: 'select',
    defaultValue: 'openai',
    options: [
      { value: 'openai', label: 'OpenAI TTS' },
      { value: 'elevenlabs', label: 'ElevenLabs' },
      { value: 'azure', label: 'Azure TTS' },
      { value: 'local', label: '本地 TTS' },
    ],
  },
  {
    key: 'tts.voice',
    label: '语音',
    description: '选择 TTS 语音',
    type: 'select',
    defaultValue: 'alloy',
    options: [
      { value: 'alloy', label: 'Alloy' },
      { value: 'echo', label: 'Echo' },
      { value: 'fable', label: 'Fable' },
      { value: 'onyx', label: 'Onyx' },
      { value: 'nova', label: 'Nova' },
      { value: 'shimmer', label: 'Shimmer' },
    ],
  },
]

export const SECURITY_FIELDS: ConfigFieldSchema[] = [
  {
    key: 'security.commandApproval',
    label: '命令审批',
    description: '执行命令前需要用户确认',
    type: 'select',
    defaultValue: 'ask',
    options: [
      { value: 'ask', label: '每次询问', description: '每次执行命令前都询问用户' },
      { value: 'auto', label: '自动执行', description: '自动执行所有命令（不推荐）' },
      { value: 'dangerous', label: '仅危险命令', description: '仅对危险命令进行确认' },
    ],
  },
  {
    key: 'security.containerIsolation',
    label: '容器隔离',
    description: '在容器中执行命令以增强安全性',
    type: 'boolean',
    defaultValue: false,
  },
]

export const DEFAULT_CONFIG_CATEGORIES: ConfigCategory[] = [
  {
    id: 'general',
    label: '通用',
    icon: 'settings',
    description: '基础模型和参数配置',
    fields: GENERAL_FIELDS,
  },
  {
    id: 'terminal',
    label: '终端',
    icon: 'terminal',
    description: '终端相关配置',
    fields: TERMINAL_FIELDS,
  },
  {
    id: 'memory',
    label: '记忆',
    icon: 'brain',
    description: 'AI 记忆功能配置',
    fields: MEMORY_FIELDS,
  },
  {
    id: 'compression',
    label: '压缩',
    icon: 'compress',
    description: '上下文压缩配置',
    fields: COMPRESSION_FIELDS,
  },
  {
    id: 'tts',
    label: 'TTS',
    icon: 'volume',
    description: '文本转语音配置',
    fields: TTS_FIELDS,
  },
  {
    id: 'security',
    label: '安全',
    icon: 'shield',
    description: '安全相关配置',
    fields: SECURITY_FIELDS,
  },
]

export const DEFAULT_HERMES_CONFIG_SCHEMA: HermesConfigSchema = {
  version: '1.0.0',
  categories: DEFAULT_CONFIG_CATEGORIES,
}

export const CONFIG_FIELD_MAP: Record<string, ConfigFieldSchema> = (() => {
  const map: Record<string, ConfigFieldSchema> = {}
  for (const category of DEFAULT_CONFIG_CATEGORIES) {
    for (const field of category.fields) {
      map[field.key] = field
    }
  }
  return map
})()

export const getConfigField = (key: string): ConfigFieldSchema | undefined => {
  return CONFIG_FIELD_MAP[key]
}

export const getConfigCategory = (id: string): ConfigCategory | undefined => {
  return DEFAULT_CONFIG_CATEGORIES.find(cat => cat.id === id)
}

export const getDefaultValue = (key: string): string | number | boolean | undefined => {
  return CONFIG_FIELD_MAP[key]?.defaultValue
}
