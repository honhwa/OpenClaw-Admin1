<template>
  <div class="import-export-modal">
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="mode === 'import' ? '数据导入' : '数据导出'"
      style="width: 600px;"
    >
      <!-- 格式选择 -->
      <n-form :model="formState" label-placement="left" label-width="80">
        <n-form-item label="文件格式">
          <n-radio-group v-model:value="formState.format">
            <n-space>
              <n-radio
                v-for="fmt in formatOptions"
                :key="fmt.value"
                :value="fmt.value"
              >
                {{ fmt.label }}
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <!-- 导入模式 (仅导入时显示) -->
        <n-form-item v-if="mode === 'import'" label="导入模式">
          <n-radio-group v-model:value="formState.importMode">
            <n-space>
              <n-radio value="merge">合并模式</n-radio>
              <n-radio value="replace">替换模式</n-radio>
            </n-space>
          </n-radio-group>
          <n-text depth="3" style="font-size: 12px;">
            合并：保留现有数据，新增导入数据 | 替换：清空现有数据后导入
          </n-text>
        </n-form-item>

        <!-- 文件上传 (仅导入时显示) -->
        <n-form-item v-if="mode === 'import'" label="选择文件">
          <n-upload
            :custom-request="handleUpload"
            :show-file-list="true"
            :max="1"
            accept=".xlsx,.xls,.csv"
          >
            <n-button>选择文件</n-button>
          </n-upload>
          <n-text depth="3" style="font-size: 12px;">
            支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式，最大 10MB
          </n-text>
          <n-button
            v-if="formState.format"
            type="tertiary"
            size="small"
            @click="downloadTemplate"
            style="margin-top: 8px;"
          >
            下载模板
          </n-button>
        </n-form-item>

        <!-- 文件名 (仅导出时显示) -->
        <n-form-item v-if="mode === 'export'" label="文件名">
          <n-input
            v-model:value="formState.filename"
            placeholder="请输入文件名"
            :disabled="progressState.isRunning"
          >
            <template #suffix>
              .{{ formState.format }}
            </template>
          </n-input>
        </n-form-item>
      </n-form>

      <!-- 进度条 -->
      <n-card
        v-if="progressState.status !== 'idle'"
        style="margin-top: 16px;"
        :bordered="false"
      >
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-status">
              <n-icon :component="getStatusIcon()" size="20" :color="getStatusColor()" />
              {{ progressState.message }}
            </span>
            <span class="progress-percent">{{ progressState.progress }}%</span>
          </div>
          <n-progress
            type="line"
            :percentage="progressState.progress"
            :status="getProgressStatus()"
            :show-indicator="false"
          />
          <div v-if="progressState.total > 0" class="progress-detail">
            <n-text depth="3">已处理 {{ progressState.completed }} / {{ progressState.total }} 条记录</n-text>
          </div>
        </div>
      </n-card>

      <!-- 操作按钮 -->
      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCancel" :disabled="progressState.isRunning">
            取消
          </n-button>
          <n-button
            v-if="mode === 'export'"
            type="primary"
            @click="handleExport"
            :loading="progressState.isRunning"
            :disabled="!formState.filename"
          >
            开始导出
          </n-button>
          <n-button
            v-if="mode === 'import'"
            type="primary"
            @click="handleImportConfirm"
            :loading="progressState.isRunning"
            :disabled="!selectedFile"
          >
            开始导入
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { NModal, NCard, NForm, NFormItem, NRadioGroup, NRadio, NSpace, NUpload, NButton, NInput, NProgress, NText, NIcon, useMessage, useDialog } from 'naive-ui'
import {
  exportData,
  importData,
  downloadTemplate as serviceDownloadTemplate,
  createProgressState,
  type ExportFormat,
  type ImportFormat,
  type ProgressState
} from '@/services/import-export/import-export-service'

// Props
interface Props {
  show: boolean
  mode: 'import' | 'export'
  data?: any[]
  columns?: Array<{ key: string; title: string; width?: number }>
  defaultFilename?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  mode: 'export',
  data: () => [],
  columns: () => [],
  defaultFilename: 'data'
})

// Emits
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success', result: any): void
  (e: 'error', error: string): void
}>()

const message = useMessage()
const dialog = useDialog()

const showModal = ref(props.show)
const selectedFile: any = ref(null)

// 格式选项
const formatOptions = ref([
  { label: 'Excel', value: 'excel' },
  { label: 'CSV', value: 'csv' }
])

// 导出格式选项
const exportFormatOptions = ref([
  { label: 'Excel', value: 'excel' },
  { label: 'CSV', value: 'csv' },
  { label: 'PDF', value: 'pdf' }
])

// 表单状态
const formState = reactive({
  format: props.mode === 'import' ? 'excel' : 'excel' as ExportFormat | ImportFormat,
  importMode: 'merge' as 'merge' | 'replace',
  filename: props.defaultFilename
})

// 进度状态
const progressState = reactive(createProgressState())

// 监听 show 属性变化
watch(() => props.show, (val) => {
  showModal.value = val
  if (val) {
    resetState()
  }
})

// 监听 showModal 变化
watch(showModal, (val) => {
  emit('update:show', val)
})

// 重置状态
function resetState() {
  progressState.isRunning = false
  progressState.progress = 0
  progressState.status = 'idle'
  progressState.message = ''
  progressState.total = 0
  progressState.completed = 0
  selectedFile.value = null
  formState.filename = props.defaultFilename
  formState.format = props.mode === 'import' ? 'excel' : 'excel' as ExportFormat | ImportFormat
}

// 获取状态图标
function getStatusIcon() {
  const iconMap: Record<string, any> = {
    'idle': null,
    'processing': 'loading',
    'success': 'checkmark-circle',
    'error': 'close-circle'
  }
  return iconMap[progressState.status]
}

// 获取状态颜色
function getStatusColor() {
  const colorMap: Record<string, string> = {
    'idle': '#999',
    'processing': '#18a058',
    'success': '#18a058',
    'error': '#d03050'
  }
  return colorMap[progressState.status]
}

// 获取进度条状态
function getProgressStatus() {
  const statusMap: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
    'idle': 'default',
    'processing': 'default',
    'success': 'success',
    'error': 'error'
  }
  return statusMap[progressState.status]
}

// 取消操作
function handleCancel() {
  if (progressState.isRunning) {
    dialog.warning({
      title: '确认取消',
      content: '操作正在进行中，确定要取消吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        showModal.value = false
        resetState()
      }
    })
  } else {
    showModal.value = false
    resetState()
  }
}

// 文件上传处理
function handleUpload(file: any) {
  selectedFile.value = file.file
}

// 下载模板
function downloadTemplate() {
  serviceDownloadTemplate(
    formState.format as ImportFormat,
    props.columns || [],
    'template'
  )
}

// 确认导入
function handleImportConfirm() {
  if (!selectedFile.value) {
    message.warning('请选择文件')
    return
  }

  dialog.warning({
    title: '确认导入',
    content: `确定要导入文件 "${selectedFile.value.name}" 吗？\n导入模式：${formState.importMode === 'merge' ? '合并模式' : '替换模式'}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      executeImport()
    }
  })
}

// 执行导入
async function executeImport() {
  progressState.isRunning = true
  progressState.status = 'processing'
  progressState.message = '准备导入...'

  const result = await importData(
    {
      format: formState.format as ImportFormat,
      file: selectedFile.value,
      mode: formState.importMode,
      onProgress: (progress) => {
        progressState.progress = progress
      }
    },
    progressState
  )

  if (result.success) {
    message.success(result.message)
    emit('success', result.data)
    showModal.value = false
    resetState()
  } else {
    message.error(result.message)
    emit('error', result.error || '导入失败')
  }
}

// 执行导出
async function handleExport() {
  if (!formState.filename) {
    message.warning('请输入文件名')
    return
  }

  progressState.isRunning = true
  progressState.status = 'processing'
  progressState.message = '准备导出...'
  progressState.total = props.data?.length || 0

  const result = await exportData(
    {
      format: formState.format as ExportFormat,
      filename: formState.filename,
      data: props.data || [],
      columns: props.columns
    },
    progressState
  )

  if (result.success) {
    message.success(result.message)
    emit('success', result.data)
    showModal.value = false
    resetState()
  } else {
    message.error(result.message)
    emit('error', result.error || '导出失败')
  }
}
</script>

<style scoped>
.import-export-modal {
  width: 100%;
}

.progress-section {
  padding: 8px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: #18a058;
}

.progress-detail {
  margin-top: 8px;
}
</style>
