/**
 * Unit Tests - Cron Store
 * Tests the cron job management store logic
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCronStore } from '@/stores/cron'

// Mock WebSocket store
const mockRpc = {
  listCrons: vi.fn(),
  getCronStatus: vi.fn(),
  listCronRuns: vi.fn(),
  createCron: vi.fn(),
  updateCron: vi.fn(),
  deleteCron: vi.fn(),
  runCron: vi.fn(),
}

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: () => ({
    rpc: mockRpc,
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
      mockRpc.listCrons.mockResolvedValueOnce(mockJobs)

      const store = useCronStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual(mockJobs)
      expect(store.loading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle fetch error', async () => {
      mockRpc.listCrons.mockRejectedValueOnce(new Error('Network error'))

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
      mockRpc.getCronStatus.mockResolvedValueOnce(mockStatus)

      const store = useCronStore()
      await store.fetchStatus()

      expect(store.status).toEqual(mockStatus)
      expect(store.statusLoading).toBe(false)
    })

    it('should handle status fetch error', async () => {
      mockRpc.getCronStatus.mockRejectedValueOnce(new Error('Status error'))

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
      mockRpc.listCronRuns.mockResolvedValueOnce(mockRuns)

      const store = useCronStore()
      await store.fetchRuns('1', 50)

      expect(store.selectedJobId).toBe('1')
      expect(store.runs).toEqual(mockRuns)
      expect(store.runsLoading).toBe(false)
    })
  })

  describe('createJob', () => {
    it('should create a job successfully', async () => {
      mockRpc.createCron.mockResolvedValueOnce(undefined)
      mockRpc.listCrons.mockResolvedValueOnce([])
      mockRpc.getCronStatus.mockResolvedValueOnce(null)

      const store = useCronStore()
      await store.createJob({ name: 'New Job', schedule: '0 * * * *' })

      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle create error', async () => {
      mockRpc.createCron.mockRejectedValueOnce(new Error('Create failed'))

      const store = useCronStore()
      await expect(store.createJob({ name: 'New Job', schedule: '* * * * *' })).rejects.toThrow('Create failed')
      expect(store.saving).toBe(false)
      expect(store.lastError).toBe('Create failed')
    })
  })

  describe('updateJob', () => {
    it('should update a job successfully', async () => {
      mockRpc.updateCron.mockResolvedValueOnce(undefined)
      mockRpc.listCrons.mockResolvedValueOnce([])
      mockRpc.getCronStatus.mockResolvedValueOnce(null)
      mockRpc.listCronRuns.mockResolvedValueOnce([])

      const store = useCronStore()
      // selectedJobId is already initialized as ref<string | null>(null)
      await store.updateJob('1', { name: 'Updated Job' })

      expect(store.saving).toBe(false)
      expect(store.lastError).toBeNull()
    })
  })

  describe('deleteJob', () => {
    it('should delete a job successfully', async () => {
      mockRpc.deleteCron.mockResolvedValueOnce(undefined)
      mockRpc.listCrons.mockResolvedValueOnce([])
      mockRpc.getCronStatus.mockResolvedValueOnce(null)

      const store = useCronStore()
      await store.deleteJob('1')

      expect(store.saving).toBe(false)
    })
  })

  describe('runJob', () => {
    it('should run a job in force mode', async () => {
      mockRpc.runCron.mockResolvedValue(undefined)
      mockRpc.listCrons.mockResolvedValue([])
      mockRpc.getCronStatus.mockResolvedValue(null)
      mockRpc.listCronRuns.mockResolvedValue([])

      const store = useCronStore()
      await store.runJob('1', 'force')

      expect(store.saving).toBe(false)
      expect(mockRpc.runCron).toHaveBeenCalledWith('1', 'force')
    })

    it('should run a job in due mode', async () => {
      mockRpc.runCron.mockResolvedValue(undefined)
      mockRpc.listCrons.mockResolvedValue([])
      mockRpc.getCronStatus.mockResolvedValue(null)
      mockRpc.listCronRuns.mockResolvedValue([])

      const store = useCronStore()
      await store.runJob('1', 'due')

      expect(mockRpc.runCron).toHaveBeenCalledWith('1', 'due')
    })
  })

  describe('clearRuns', () => {
    it('should clear selected job and runs', () => {
      const store = useCronStore()
      // Mock the runs data directly using store's runs ref
      store.runs.value = [{ id: 'run1', jobId: '1', status: 'success', startTime: '2026-04-10T12:00:00Z' }]

      store.clearRuns()

      expect(store.selectedJobId.value).toBeNull()
      expect(store.runs.value).toEqual([])
    })
  })
})
