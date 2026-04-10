# 前端组件库

## 组件目录结构

```
src/components/
├── common/                     # 通用组件
│   ├── BaseButton.vue          # 基础按钮
│   ├── BaseInput.vue           # 基础输入框
│   ├── BaseSelect.vue          # 基础选择器
│   ├── BaseModal.vue           # 基础弹窗
│   ├── BaseTable.vue           # 基础表格
│   ├── BasePagination.vue      # 基础分页
│   └── BaseLoading.vue         # 加载动画
├── layout/                     # 布局组件
│   ├── Header.vue              # 顶部导航
│   ├── Sidebar.vue             # 侧边栏
│   ├── Footer.vue              # 底部栏
│   ├── MainContent.vue         # 主内容区
│   └── PageLayout.vue          # 页面布局
├── business/                   # 业务组件
│   ├── batch/                  # 批量操作
│   │   ├── BatchToolbar.vue    # 批量操作栏
│   │   ├── BatchDeleteModal.vue # 批量删除确认
│   │   └── BatchStatusChange.vue # 批量状态变更
│   ├── search/                 # 搜索模块
│   │   ├── GlobalSearch.vue    # 全局搜索
│   │   ├── SearchHistory.vue   # 搜索历史
│   │   ├── SearchSuggestion.vue # 搜索建议
│   │   └── AdvancedFilter.vue  # 高级筛选
│   ├── visualization/          # 数据可视化
│   │   ├── DataCard.vue        # 数据卡片
│   │   ├── LineChart.vue       # 折线图
│   │   ├── BarChart.vue        # 柱状图
│   │   ├── PieChart.vue        # 饼图
│   │   ├── ProgressBar.vue     # 进度条
│   │   └── Dashboard.vue       # 仪表板
│   ├── permission/             # 权限管理
│   │   ├── RoleSelector.vue    # 角色选择器
│   │   ├── PermissionPanel.vue # 权限配置面板
│   │   ├── UserRoleAssign.vue  # 用户角色分配
│   │   └── PermissionTree.vue  # 权限层级树
│   ├── theme/                  # 主题切换
│   │   ├── ThemeSelector.vue   # 主题选择器
│   │   ├── ThemeSettings.vue   # 主题设置面板
│   │   └── ThemePreview.vue    # 主题预览
│   └── mobile/                 # 移动端
│       ├── MobileNav.vue       # 移动端导航
│       ├── GestureHandler.vue  # 手势处理
│       └── OfflineIndicator.vue # 离线指示器
└── charts/                     # 图表组件
    ├── EChartBase.vue          # ECharts 基础封装
    ├── ChartTooltip.vue        # 图表提示框
    └── ChartLegend.vue         # 图例组件
```

## 工具函数目录

```
src/utils/
├── request.js                  # API 请求封装
├── storage.js                  # 本地存储管理
├── auth.js                     # 权限验证
├── format.js                   # 数据格式化
├── date.js                     # 日期时间处理
├── file.js                     # 文件操作
├── validation.js               # 表单验证
└── constants.js                # 常量定义
```

## 状态管理

```
src/stores/
├── user.js                     # 用户信息
├── permission.js               # 权限管理
├── theme.js                    # 主题配置
├── search.js                   # 搜索状态
├── batch.js                    # 批量操作状态
└── app.js                      # 应用全局状态
```

## 路由配置

```
src/router/
├── index.js                    # 路由入口
├── routes.js                   # 路由定义
├── guards.js                   # 路由守卫
└── modules/                    # 路由模块
    ├── dashboard.js            # 仪表板
    ├── batch-operation.js      # 批量操作
    ├── search.js               # 搜索模块
    ├── visualization.js        # 数据可视化
    ├── permission.js           # 权限管理
    ├── theme.js                # 主题设置
    └── mobile.js               # 移动端
```

## 组合式函数

```
src/composables/
├── useApi.js                   # API 调用
├── useAuth.js                  # 认证逻辑
├── useTheme.js                 # 主题切换
├── useSearch.js                # 搜索逻辑
├── useBatch.js                 # 批量操作
├── usePagination.js            # 分页逻辑
└── usePermission.js            # 权限判断
```

## 国际化

```
src/i18n/
├── index.js                    # i18n 配置
├── locales/
│   ├── zh-CN.js               # 简体中文
│   └── en-US.js               # 英文
└── messages/
    ├── common.js              # 通用文案
    ├── dashboard.js           # 仪表板
    ├── batch-operation.js     # 批量操作
    ├── search.js              # 搜索
    ├── visualization.js       # 可视化
    ├── permission.js          # 权限
    └── theme.js               # 主题
```

## 组件使用示例

### 批量操作栏组件

```vue
<template>
  <BatchToolbar
    :selected-count="selectedCount"
    :total-count="totalCount"
    @select-all="handleSelectAll"
    @batch-delete="handleBatchDelete"
    @batch-status-change="handleBatchStatusChange"
  />
</template>

<script setup>
import { BatchToolbar } from '@/components/business/batch'
import { ref } from 'vue'

const selectedCount = ref(0)
const totalCount = ref(100)

const handleSelectAll = () => { /* ... */ }
const handleBatchDelete = () => { /* ... */ }
const handleBatchStatusChange = () => { /* ... */ }
</script>
```

### 智能搜索组件

```vue
<template>
  <GlobalSearch
    v-model="searchQuery"
    :suggestions="suggestions"
    @search="handleSearch"
    @select-history="handleHistory"
  />
  <AdvancedFilter
    :filters="filters"
    @filter-change="handleFilterChange"
  />
</template>

<script setup>
import { GlobalSearch, AdvancedFilter } from '@/components/business/search'
import { ref, computed } from 'vue'

const searchQuery = ref('')
const filters = ref([])

const suggestions = computed(() => { /* ... */ })

const handleSearch = (query) => { /* ... */ }
const handleHistory = (item) => { /* ... */ }
const handleFilterChange = (filters) => { /* ... */ }
</script>
```

### 数据可视化组件

```vue
<template>
  <Dashboard>
    <DataCard title="总用户数" :value="userCount" :trend="userTrend" />
    <DataCard title="活跃用户" :value="activeUsers" :trend="activeTrend" />
    <LineChart :data="lineData" :options="lineOptions" />
    <BarChart :data="barData" :options="barOptions" />
  </Dashboard>
</template>

<script setup>
import { Dashboard, DataCard, LineChart, BarChart } from '@/components/business/visualization'
import { ref } from 'vue'

const userCount = ref(12345)
const userTrend = ref(12.5)
const activeUsers = ref(8765)
const activeTrend = ref(-3.2)

const lineData = ref([])
const lineOptions = ref({})
const barData = ref([])
const barOptions = ref({})
</script>
```

---

**组件库版本**: 1.0.0  
**最后更新**: 2026-04-11  
**负责人**: 前端开发
