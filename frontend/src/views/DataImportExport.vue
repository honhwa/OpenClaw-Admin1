<template>
  <div class="data-import-export-page">
    <n-page-header>
      <template #header>
        <h2>数据导入导出</h2>
      </template>
      <template #extra>
        <ImportExportBar
          :show-import="true"
          :show-export="true"
          :show-template="true"
          :data="tableData"
          :columns="tableColumns"
          default-filename="任务数据"
          @import="handleImport"
          @export="handleExport"
          @template-download="handleTemplateDownload"
          @success="handleSuccess"
          @error="handleError"
        />
      </template>
    </n-page-header>

    <!-- 数据表格 -->
    <n-card style="margin-top: 16px;">
      <n-data-table
        :columns="tableColumns"
        :data="tableData"
        :bordered="false"
        :single-line="false"
        striped
      />
    </n-card>

    <!-- 使用说明 -->
    <n-card title="使用说明" style="margin-top: 16px;">
      <n-space vertical>
        <n-alert type="info" title="导入说明">
          <ul>
            <li>支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式</li>
            <li>文件大小不超过 10MB</li>
            <li>合并模式：保留现有数据，新增导入数据</li>
            <li>替换模式：清空现有数据后导入</li>
          </ul>
        </n-alert>
        <n-alert type="info" title="导出说明">
          <ul>
            <li>支持导出为 Excel、CSV 和 PDF 格式</li>
            <li>导出文件将自动下载到本地</li>
            <li>大数据量导出可能需要较长时间</li>
          </ul>
        </n-alert>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NPageHeader, NCard, NDataTable, NSpace, NAlert, useMessage } from 'naive-ui'
import ImportExportBar from '@/components/import-export/ImportExportBar.vue'

const message = useMessage()

// 表格列定义
const tableColumns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '任务名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '状态', key: 'status', width: 100 },
  { title: '负责人', key: 'assignee', width: 100 },
  { title: '优先级', key: 'priority', width: 100 },
  { title: '截止日期', key: 'dueDate', width: 120 },
  { title: '创建时间', key: 'createdAt', width: 160 }
]

// 表格数据
const tableData = ref([
  { id: 1, name: '前端页面开发', status: '进行中', assignee: '张三', priority: '高', dueDate: '2026-04-15', createdAt: '2026-04-01 10:00:00' },
  { id: 2, name: 'API 接口设计', status: '已完成', assignee: '李四', priority: '高', dueDate: '2026-04-10', createdAt: '2026-04-02 09:30:00' },
  { id: 3, name: '数据库优化', status: '待处理', assignee: '王五', priority: '中', dueDate: '2026-04-20', createdAt: '2026-04-03 14:20:00' },
  { id: 4, name: '单元测试编写', status: '进行中', assignee: '赵六', priority: '中', dueDate: '2026-04-18', createdAt: '2026-04-04 11:15:00' },
  { id: 5, name: '文档整理', status: '待处理', assignee: '钱七', priority: '低', dueDate: '2026-04-25', createdAt: '2026-04-05 16:45:00' }
])

// 处理导入
function handleImport(file: File, format: string) {
  console.log('导入文件:', file, '格式:', format)
  message.info(`准备导入文件：${file.name} (${format})`)
}

// 处理导出
function handleExport(format: string) {
  console.log('导出格式:', format)
  message.info(`开始导出为 ${format} 格式`)
}

// 处理模板下载
function handleTemplateDownload(format: string) {
  console.log('下载模板格式:', format)
  message.info(`开始下载 ${format} 模板`)
}

// 成功回调
function handleSuccess(result: any) {
  console.log('操作成功:', result)
  message.success('操作成功!')
}

// 错误回调
function handleError(error: string) {
  console.error('操作失败:', error)
  message.error(error)
}
</script>

<style scoped>
.data-import-export-page {
  padding: 20px;
}

.data-import-export-page h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>
