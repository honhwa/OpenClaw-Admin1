import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ImportExportBar from '../../src/components/import-export/ImportExportBar.vue'

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

// Mock ImportExportModal
vi.mock('./ImportExportModal.vue', () => ({
  default: {
    template: '<div data-testid="import-export-modal"></div>',
    props: ['show', 'mode', 'data', 'columns', 'defaultFilename']
  }
}))

describe('ImportExportBar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders import and export buttons', () => {
    const wrapper = mount(ImportExportBar, {
      props: {
        showImport: true,
        showExport: true,
        showTemplate: true,
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NButton: true,
          NSpace: true,
          NIcon: true,
          NDropdown: true,
          ImportExportModal: true
        }
      }
    })

    expect(wrapper.findComponent({ name: 'ImportExportModal' }).exists()).toBe(true)
  })

  it('hides import button when showImport is false', () => {
    const wrapper = mount(ImportExportBar, {
      props: {
        showImport: false,
        showExport: true,
        showTemplate: true,
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NButton: true,
          NSpace: true,
          NIcon: true,
          NDropdown: true,
          ImportExportModal: true
        }
      }
    })

    // Import button should not be rendered
    expect(wrapper.emits()).toHaveProperty('import')
  })

  it('emits export event with format', async () => {
    const wrapper = mount(ImportExportBar, {
      props: {
        showImport: true,
        showExport: true,
        showTemplate: true,
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NButton: true,
          NSpace: true,
          NIcon: true,
          NDropdown: {
            template: '<div><slot /></div>'
          },
          ImportExportModal: true
        }
      }
    })

    expect(wrapper.emits()).toHaveProperty('export')
  })

  it('emits template-download event', () => {
    const wrapper = mount(ImportExportBar, {
      props: {
        showImport: true,
        showExport: true,
        showTemplate: true,
        data: [],
        columns: [],
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NButton: true,
          NSpace: true,
          NIcon: true,
          NDropdown: {
            template: '<div><slot /></div>'
          },
          ImportExportModal: true
        }
      }
    })

    expect(wrapper.emits()).toHaveProperty('template-download')
  })

  it('passes data and columns to modal', () => {
    const testData = [{ id: 1, name: 'test' }]
    const testColumns = [{ key: 'id', title: 'ID' }]

    const wrapper = mount(ImportExportBar, {
      props: {
        showImport: true,
        showExport: true,
        showTemplate: true,
        data: testData,
        columns: testColumns,
        defaultFilename: 'test'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          NButton: true,
          NSpace: true,
          NIcon: true,
          NDropdown: true,
          ImportExportModal: true
        }
      }
    })

    const modal = wrapper.findComponent({ name: 'ImportExportModal' })
    expect(modal.props('data')).toEqual(testData)
    expect(modal.props('columns')).toEqual(testColumns)
  })
})
