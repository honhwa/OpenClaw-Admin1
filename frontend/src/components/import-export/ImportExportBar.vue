<template>
  <div class="import-export-bar">
    <n-space>
      <!-- 导入按钮 -->
      <n-button
        v-if="showImport"
        type="primary"
        @click="handleImportClick"
      >
        <template #icon>
          <n-icon :component="DownloadOutline" size="18" />
        </template>
        导入数据
      </n-button>

      <!-- 导出按钮 -->
      <n-dropdown
        v-if="showExport"
        :options="exportOptions"
        @select="handleExportSelect"
      >
        <n-button type="success">
          <template #icon>
            <n-icon :component="UploadOutline" size="18" />
          </template>
          导出数据
        </n-button>
      </n-dropdown>

      <!-- 模板下载 -->
      <n-dropdown
        v-if="showTemplate && mode === 'import'"
        :options="templateOptions"
        @select="handleTemplateSelect"
      >
        <n-button type="tertiary">
          <template #icon>
            <n-icon :component="DocumentTextOutline" size="18" />
          </template>
          下载模板
        </n-button>
      </n-dropdown>
    </n-space>

    <!-- 导入导出弹窗 -->
    <ImportExportModal
      v-model:show="showModal"
      :mode="modalMode"
      :data="data"
      :columns="columns"
      :default-filename="defaultFilename"
      @success="handleSuccess"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NSpace, NIcon, NDropdown, useMessage } from 'naive-ui'
import { DownloadOutline, UploadOutline, DocumentTextOutline } from '@vicons/ionicons5'
import ImportExportModal from './ImportExportModal.vue'

// Props
interface Props {
  showImport?: boolean
  showExport?: boolean
  showTemplate?: boolean
  data?: any[]
  columns?: Array<{ key: string; title: string }>
  defaultFilename?: string
  mode?: 'import' | 'export'
}

const props = withDefaults(defineProps<Props>(), {
  showImport: true,
  showExport: true,
  showTemplate: true,
  data: () => [],
  columns: () => [],
  defaultFilename: 'data',
  mode: 'export'
})

// Emits
const emit = defineEmits<{
  (e: 'import', file: File, format: string): void
  (e: 'export', format: string): void
  (e: 'template-download', format: string): void
  (e: 'success', result: any): void
  (e: 'error', error: string): void
}>()

const message = useMessage()

const showModal = ref(false)
const modalMode = ref<'import' | 'export'>('export')

// 导出选项
const exportOptions = computed(() => [
  { label: '导出为 Excel', value: 'excel' },
  { label: '导出为 CSV', value: 'csv' },
  { label: '导出为 PDF', value: 'pdf' }
])

// 模板选项
const templateOptions = computed(() => [
  { label: '下载 Excel 模板', value: 'excel' },
  { label: '下载 CSV 模板', value: 'csv' }
])

// 导入按钮点击
function handleImportClick() {
  modalMode.value = 'import'
  showModal.value = true
}

// 导出选择
function handleExportSelect(value: string) {
  modalMode.value = 'export'
  showModal.value = true
  // 可以在这里直接触发导出，或者让用户在弹窗中确认
}

// 模板选择
function handleTemplateSelect(value: string) {
  emit('template-download', value)
}

// 成功回调
function handleSuccess(result: any) {
  emit('success', result)
}

// 错误回调
function handleError(error: string) {
  emit('error', error)
}
</script>

<style scoped>
.import-export-bar {
  padding: 16px 0;
}
</style>
