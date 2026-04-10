/**
 * Unit Tests - Cron Store
 * Tests the cron job management store logic
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCronStore } from '@/stores/cron'

// Mock WebSocket store
vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: () => ({
    rpc: {
      listCrons: vi.fn(),
      getCronStatus: vi.fn(),
      listCronRuns: vi.fn(),
      createCron: vi.fn(),
      updateCron: vi.fn(),
      deleteCron: vi.fn(),
      runCron: vi.fn(),
    },
  }),
}))

describe('Cron Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useCronStore()
      expect(store.jobs).toEqual([])
      expect(store.status).toBeNull()
      expect(store.selectedJobId).toBeNull()
      expect(store.runs).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.statusLoading).toBe(false)
      expect(store.runsLoading).toBe(false)
      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })
  })

  describe('fetchJobs', () => {
    it('should fetch jobs successfully', async () => {
      const mockJobs = [
        { id: '1', name: 'Test Job', schedule: '* * * * *', enabled: true },
      ]
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.listCrons.mockResolvedValue(mockJobs)

      const store = useCronStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual(mockJobs)
      expect(store.loading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle fetch error', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.listCrons.mockRejectedValue(new Error('Network error'))

      const store = useCronStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.lastError).toBe('Network error')
    })
  })

  describe('fetchStatus', () => {
    it('should fetch status successfully', async () => {
      const mockStatus = { totalJobs: 5, runningJobs: 2, lastRun: '2026-04-10T12:00:00Z' }
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.getCronStatus.mockResolvedValue(mockStatus)

      const store = useCronStore()
      await store.fetchStatus()

      expect(store.status).toEqual(mockStatus)
      expect(store.statusLoading).toBe(false)
    })

    it('should handle status fetch error', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.getCronStatus.mockRejectedValue(new Error('Status error'))

      const store = useCronStore()
      await store.fetchStatus()

      expect(store.status).toBeNull()
      expect(store.statusLoading).toBe(false)
      expect(store.lastError).toBe('Status error')
    })
  })

  describe('fetchRuns', () => {
    it('should fetch runs for a job', async () => {
      const mockRuns = [
        { id: 'run1', jobId: '1', status: 'success', startTime: '2026-04-10T12:00:00Z' },
      ]
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.listCronRuns.mockResolvedValue(mockRuns)

      const store = useCronStore()
      await store.fetchRuns('1', 50)

      expect(store.selectedJobId).toBe('1')
      expect(store.runs).toEqual(mockRuns)
      expect(store.runsLoading).toBe(false)
    })
  })

  describe('createJob', () => {
    it('should create a job successfully', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.createCron.mockResolvedValue(undefined)
      mockWsStore.rpc.listCrons.mockResolvedValue([])
      mockWsStore.rpc.getCronStatus.mockResolvedValue(null)

      const store = useCronStore()
      await store.createJob({ name: 'New Job', schedule: '0 * * * *' })

      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle create error', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.createCron.mockRejectedValue(new Error('Create failed'))

      const store = useCronStore()
      await expect(store.createJob({ name: 'New Job', schedule: '* * * * *' })).rejects.toThrow('Create failed')
      expect(store.saving).toBe(false)
      expect(store.lastError).toBe('Create failed')
    })
  })

  describe('updateJob', () => {
    it('should update a job successfully', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.updateCron.mockResolvedValue(undefined)
      mockWsStore.rpc.listCrons.mockResolvedValue([])
      mockWsStore.rpc.getCronStatus.mockResolvedValue(null)
      mockWsStore.rpc.listCronRuns.mockResolvedValue([])

      const store = useCronStore()
      store.selectedJobId.value = '1'
      await store.updateJob('1', { name: 'Updated Job' })

      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })
  })

  describe('deleteJob', () => {
    it('should delete a job successfully', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.deleteCron.mockResolvedValue(undefined)
      mockWsStore.rpc.listCrons.mockResolvedValue([])
      mockWsStore.rpc.getCronStatus.mockResolvedValue(null)

      const store = useCronStore()
      store.selectedJobId.value = '1'
      await store.deleteJob('1')

      expect(store.selectedJobId).toBeNull()
      expect(store.runs).toEqual([])
      expect(store.saving).toBe(false)
    })
  })

  describe('runJob', () => {
    it('should run a job in force mode', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.runCron.mockResolvedValue(undefined)
      mockWsStore.rpc.listCrons.mockResolvedValue([])
      mockWsStore.rpc.getCronStatus.mockResolvedValue(null)
      mockWsStore.rpc.listCronRuns.mockResolvedValue([])

      const store = useCronStore()
      await store.runJob('1', 'force')

      expect(store.saving).toBe(false)
      expect(mockWsStore.rpc.runCron).toHaveBeenCalledWith('1', 'force')
    })

    it('should run a job in due mode', async () => {
      const { useWebSocketStore } = await import('@/stores/websocket')
      const mockWsStore = useWebSocketStore()
      mockWsStore.rpc.runCron.mockResolvedValue(undefined)
      mockWsStore.rpc.listCrons.mockResolvedValue([])
      mockWsStore.rpc.getCronStatus.mockResolvedValue(null)
      mockWsStore.rpc.listCronRuns.mockResolvedValue([])

      const store = useCronStore()
      await store.runJob('1', 'due')

      expect(mockWsStore.rpc.runCron).toHaveBeenCalledWith('1', 'due')
    })
  })

  describe('clearRuns', () => {
    it('should clear selected job and runs', () => {
      const store = useCronStore()
      store.selectedJobId.value = '1'
      store.runs.value = [{ id: 'run1', jobId: '1', status: 'success', startTime: '2026-04-10T12:00:00Z' }]

      store.clearRuns()

      expect(store.selectedJobId).toBeNull()
      expect(store.runs).toEqual([])
    })
  })
})
