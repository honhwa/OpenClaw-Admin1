import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DataImportExport from '../../src/views/DataImportExport.vue'

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
    })
  }
})

// Mock ImportExportBar
vi.mock('@/components/import-export/ImportExportBar.vue', () => ({
  default: {
    template: '<div data-testid="import-export-bar"><slot /></div>',
    props: ['showImport', 'showExport', 'showTemplate', 'data', 'columns', 'defaultFilename']
  }
}))

describe('DataImportExport.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders page header', () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: true
        }
      }
    })

    expect(wrapper.html()).toContain('数据导入导出')
  })

  it('renders data table with columns', () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: true
        }
      }
    })

    const table = wrapper.findComponent({ name: 'NDataTable' })
    expect(table.exists()).toBe(true)
  })

  it('renders usage instructions', () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: true
        }
      }
    })

    expect(wrapper.html()).toContain('使用说明')
    expect(wrapper.html()).toContain('导入说明')
    expect(wrapper.html()).toContain('导出说明')
  })

  it('displays table data', () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: true
        }
      }
    })

    // Check if table data is rendered
    const vm = wrapper.vm as any
    expect(vm.tableData.length).toBeGreaterThan(0)
  })

  it('handles import event', async () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: {
            template: '<div><slot name="extra" /></div>'
          }
        }
      }
    })

    // Import handler should be set up
    const vm = wrapper.vm as any
    expect(typeof vm.handleImport).toBe('function')
  })

  it('handles export event', () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(typeof vm.handleExport).toBe('function')
  })

  it('handles success and error events', () => {
    const wrapper = mount(DataImportExport, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NPageHeader: true,
          NCard: true,
          NDataTable: true,
          NSpace: true,
          NAlert: true,
          ImportExportBar: true
        }
      }
    })

    const vm = wrapper.vm as any
    expect(typeof vm.handleSuccess).toBe('function')
    expect(typeof vm.handleError).toBe('function')
  })
})
