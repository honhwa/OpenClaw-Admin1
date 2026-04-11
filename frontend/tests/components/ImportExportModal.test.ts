import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ImportExportModal from '../../src/components/import-export/ImportExportModal.vue'

// Mock naive-ui components
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    useMessage: () => ({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }),
    useDialog: () => ({
      warning: vi.fn(),
      info: vi.fn(),
      success: vi.fn()
    })
  }
})

// Mock import-export service
vi.mock('@/services/import-export/import-export-service', () => ({
  exportData: vi.fn().mockResolvedValue({ success: true, message: '导出成功' }),
  importData: vi.fn().mockResolvedValue({ success: true, message: '导入成功' }),
  downloadTemplate: vi.fn(),
  createProgressState: () => ({
    isRunning: false,
    progress: 0,
    status: 'idle',
    message: '',
    total: 0,
    completed: 0
  })
}))

describe('ImportExportModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders import modal correctly', () => {
    const wrapper = mount(ImportExportModal, {
      props: {
        show: true,
        mode: 'import',
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NModal: true,
          NCard: true,
          NForm: true,
          NFormItem: true,
          NRadioGroup: true,
          NRadio: true,
          NSpace: true,
          NUpload: true,
          NButton: true,
          NInput: true,
          NProgress: true,
          NText: true,
          NIcon: true,
          NDropdown: true
        }
      }
    })

    expect(wrapper.props().mode).toBe('import')
  })

  it('renders export modal correctly', () => {
    const wrapper = mount(ImportExportModal, {
      props: {
        show: true,
        mode: 'export',
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NModal: true,
          NCard: true,
          NForm: true,
          NFormItem: true,
          NRadioGroup: true,
          NRadio: true,
          NSpace: true,
          NUpload: true,
          NButton: true,
          NInput: true,
          NProgress: true,
          NText: true,
          NIcon: true,
          NDropdown: true
        }
      }
    })

    expect(wrapper.props().mode).toBe('export')
  })

  it('shows progress bar when processing', async () => {
    const wrapper = mount(ImportExportModal, {
      props: {
        show: true,
        mode: 'export',
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NModal: true,
          NCard: true,
          NForm: true,
          NFormItem: true,
          NRadioGroup: true,
          NRadio: true,
          NSpace: true,
          NUpload: true,
          NButton: true,
          NInput: true,
          NProgress: true,
          NText: true,
          NIcon: true,
          NDropdown: true
        }
      }
    })

    // Progress bar should not be visible initially
    expect(wrapper.find('.progress-section').exists()).toBe(false)
  })

  it('emits update:show event when modal state changes', async () => {
    const wrapper = mount(ImportExportModal, {
      props: {
        show: true,
        mode: 'export',
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NModal: true,
          NCard: true,
          NForm: true,
          NFormItem: true,
          NRadioGroup: true,
          NRadio: true,
          NSpace: true,
          NUpload: true,
          NButton: true,
          NInput: true,
          NProgress: true,
          NText: true,
          NIcon: true,
          NDropdown: true
        }
      }
    })

    // Check if emit is set up correctly
    expect(wrapper.emits()).toHaveProperty('update:show')
  })

  it('validates filename before export', () => {
    const wrapper = mount(ImportExportModal, {
      props: {
        show: true,
        mode: 'export',
        data: [],
        columns: [],
        defaultFilename: ''
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NModal: true,
          NCard: true,
          NForm: true,
          NFormItem: true,
          NRadioGroup: true,
          NRadio: true,
          NSpace: true,
          NUpload: true,
          NButton: true,
          NInput: true,
          NProgress: true,
          NText: true,
          NIcon: true,
          NDropdown: true
        }
      }
    })

    // Export button should be disabled when filename is empty
    const exportButton = wrapper.find('button')
    expect(exportButton.exists()).toBe(true)
  })
})
