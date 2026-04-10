/**
 * Unit Tests - Cron Editor Component
 * Tests the CronEditor.vue component logic
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CronEditor from '@/components/cron/CronEditor.vue'

describe('CronEditor Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('should have correct initial form state', async () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: {
            NCard: true,
            NSpace: true,
            NForm: true,
            NFormItem: true,
            NRadioGroup: true,
            NRadio: true,
            NInput: true,
            NAlert: true,
            NGrid: true,
            NGridItem: true,
            NInputNumber: true,
            NSelect: true,
            NTimePicker: true,
            NDatePicker: true,
            NText: true,
            NButton: true,
          },
        },
      })

      // Check initial schedule type
      expect(wrapper.vm.scheduleForm.scheduleType).toBe('cron')
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('* * * * *')
      expect(wrapper.vm.scheduleForm.everyValue).toBe(1)
      expect(wrapper.vm.scheduleForm.everyUnit).toBe('minutes')
    })
  })

  describe('Quick Presets', () => {
    it('should have correct preset templates', async () => {
      const wrapper = mount(CronEditor, {
        props: { showPresets: true },
        global: {
          plugins: [createPinia()],
          stubs: {
            NCard: true,
            NSpace: true,
            NText: true,
            NButton: true,
            NForm: true,
            NFormItem: true,
            NRadioGroup: true,
            NRadio: true,
            NInput: true,
            NAlert: true,
            NGrid: true,
            NGridItem: true,
            NInputNumber: true,
            NSelect: true,
            NTimePicker: true,
            NDatePicker: true,
          },
        },
      })

      const presets = wrapper.vm.quickPresets
      expect(presets.length).toBe(5)
      expect(presets[0].id).toBe('minutely')
      expect(presets[0].cronExpression).toBe('* * * * *')
      expect(presets[2].id).toBe('daily')
      expect(presets[2].cronExpression).toBe('0 0 * * *')
    })

    it('should apply preset when clicked', async () => {
      const wrapper = mount(CronEditor, {
        props: { showPresets: true },
        global: {
          plugins: [createPinia()],
          stubs: {
            NCard: true,
            NSpace: true,
            NText: true,
            NButton: true,
            NForm: true,
            NFormItem: true,
            NRadioGroup: true,
            NRadio: true,
            NInput: true,
            NAlert: true,
          },
        },
      })

      // Apply hourly preset
      wrapper.vm.applyPreset(wrapper.vm.quickPresets[1])
      
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('0 * * * *')
    })
  })

  describe('Cron Expression Building', () => {
    it('should toggle cron field values correctly', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true, NButton: true, NForm: true, NFormItem: true },
        },
      })

      // Start with * * * * *
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('* * * * *')

      // Toggle minute to 5
      wrapper.vm.toggleCronValue('minutes', '5')
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('5 * * * *')

      // Toggle minute back to *
      wrapper.vm.toggleCronValue('minutes', '5')
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('* * * * *')

      // Toggle multiple values
      wrapper.vm.toggleCronValue('minutes', '5')
      wrapper.vm.toggleCronValue('minutes', '10')
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('5,10 * * * *')
    })

    it('should check if value is selected correctly', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true, NButton: true },
        },
      })

      // * means all selected
      expect(wrapper.vm.isSelected('minutes', '5')).toBe(true)

      wrapper.vm.scheduleForm.cronExpression = '5 * * * *'
      expect(wrapper.vm.isSelected('minutes', '5')).toBe(true)
      expect(wrapper.vm.isSelected('minutes', '10')).toBe(false)
    })
  })

  describe('Cron Preview', () => {
    it('should show correct preview for common cron expressions', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true, NInput: true, NAlert: true },
        },
      })

      // Every minute
      wrapper.vm.scheduleForm.cronExpression = '* * * * *'
      expect(wrapper.vm.parseCronPreview('* * * * *')).toBe('everyMinute')

      // Every hour
      wrapper.vm.scheduleForm.cronExpression = '0 * * * *'
      expect(wrapper.vm.parseCronPreview('0 * * * *')).toBe('everyHour')

      // Every day
      wrapper.vm.scheduleForm.cronExpression = '0 0 * * *'
      expect(wrapper.vm.parseCronPreview('0 0 * * *')).toBe('everyDay')

      // Every week
      wrapper.vm.scheduleForm.cronExpression = '0 0 * * 0'
      expect(wrapper.vm.parseCronPreview('0 0 * * 0')).toBe('everyWeek')

      // Every month
      wrapper.vm.scheduleForm.cronExpression = '0 0 1 * *'
      expect(wrapper.vm.parseCronPreview('0 0 1 * *')).toBe('everyMonth')

      // Invalid cron
      expect(wrapper.vm.parseCronPreview('invalid')).toBe('invalidCron')
    })
  })

  describe('Schedule Type Switching', () => {
    it('should switch between schedule types', async () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: {
            NCard: true,
            NSpace: true,
            NForm: true,
            NFormItem: true,
            NRadioGroup: true,
            NRadio: true,
          },
        },
      })

      // Initial: cron type
      expect(wrapper.vm.scheduleForm.scheduleType).toBe('cron')

      // Switch to 'every'
      wrapper.vm.scheduleForm.scheduleType = 'every'
      expect(wrapper.vm.scheduleForm.scheduleType).toBe('every')

      // Switch to 'at'
      wrapper.vm.scheduleForm.scheduleType = 'at'
      expect(wrapper.vm.scheduleForm.scheduleType).toBe('at')
    })
  })

  describe('Every Type Configuration', () => {
    it('should configure every interval correctly', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true, NForm: true, NFormItem: true },
        },
      })

      wrapper.vm.scheduleForm.scheduleType = 'every'
      wrapper.vm.scheduleForm.everyValue = 5
      wrapper.vm.scheduleForm.everyUnit = 'hours'

      expect(wrapper.vm.scheduleForm.everyValue).toBe(5)
      expect(wrapper.vm.scheduleForm.everyUnit).toBe('hours')
    })

    it('should have correct unit options', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true },
        },
      })

      const units = wrapper.vm.everyUnitOptions
      expect(units.length).toBe(3)
      expect(units[0].value).toBe('minutes')
      expect(units[1].value).toBe('hours')
      expect(units[2].value).toBe('days')
    })
  })

  describe('getScheduleData', () => {
    it('should return correct data for cron type', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true },
        },
      })

      wrapper.vm.scheduleForm.scheduleType = 'cron'
      wrapper.vm.scheduleForm.cronExpression = '0 0 * * *'

      const data = wrapper.vm.getScheduleData()
      expect(data.kind).toBe('cron')
      expect(data.expression).toBe('0 0 * * *')
    })

    it('should return correct data for every type', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true },
        },
      })

      wrapper.vm.scheduleForm.scheduleType = 'every'
      wrapper.vm.scheduleForm.everyValue = 30
      wrapper.vm.scheduleForm.everyUnit = 'minutes'

      const data = wrapper.vm.getScheduleData()
      expect(data.kind).toBe('every')
      expect(data.value).toBe(30)
      expect(data.unit).toBe('minutes')
    })

    it('should return correct data for at type', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true },
        },
      })

      wrapper.vm.scheduleForm.scheduleType = 'at'
      wrapper.vm.scheduleForm.specificTime = 480 // 08:00 in minutes
      wrapper.vm.scheduleForm.specificDate = new Date('2026-04-15').getTime()

      const data = wrapper.vm.getScheduleData()
      expect(data.kind).toBe('at')
      expect(data.time).toBe(480)
      expect(data.date).toBe(new Date('2026-04-15').getTime())
    })
  })

  describe('resetForm', () => {
    it('should reset form to initial state', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true },
        },
      })

      // Modify form
      wrapper.vm.scheduleForm.cronExpression = '0 0 * * *'
      wrapper.vm.scheduleForm.scheduleType = 'every'
      wrapper.vm.scheduleForm.everyValue = 99

      // Reset
      wrapper.vm.resetForm()

      expect(wrapper.vm.scheduleForm.scheduleType).toBe('cron')
      expect(wrapper.vm.scheduleForm.cronExpression).toBe('* * * * *')
      expect(wrapper.vm.scheduleForm.everyValue).toBe(1)
      expect(wrapper.vm.scheduleForm.everyUnit).toBe('minutes')
      expect(wrapper.vm.scheduleForm.specificTime).toBeNull()
      expect(wrapper.vm.scheduleForm.specificDate).toBeNull()
    })
  })

  describe('Cron Fields', () => {
    it('should have correct cron field definitions', () => {
      const wrapper = mount(CronEditor, {
        global: {
          plugins: [createPinia()],
          stubs: { NCard: true, NSpace: true },
        },
      })

      const fields = wrapper.vm.cronFields
      expect(fields.length).toBe(5)
      expect(fields[0].key).toBe('minutes')
      expect(fields[0].options.length).toBe(60)
      expect(fields[1].key).toBe('hours')
      expect(fields[1].options.length).toBe(24)
      expect(fields[2].key).toBe('days')
      expect(fields[2].options.length).toBe(31)
      expect(fields[3].key).toBe('months')
      expect(fields[3].options.length).toBe(12)
      expect(fields[4].key).toBe('weekdays')
      expect(fields[4].options.length).toBe(7)
    })
  })
})
