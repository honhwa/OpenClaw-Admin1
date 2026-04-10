/**
 * Integration Tests - Cron Expression Parser and Scheduler
 * Tests cron expression parsing and job scheduling logic
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock cron parser
interface CronParsed {
  minutes: number[]
  hours: number[]
  daysOfMonth: number[]
  months: number[]
  weekdays: number[]
}

function parseCronExpression(expression: string): CronParsed {
  const parts = expression.split(' ')
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression: must have 5 fields')
  }

  const [minStr, hourStr, dayStr, monthStr, weekdayStr] = parts

  const parseField = (field: string, min: number, max: number): number[] => {
    if (field === '*') {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i)
    }

    const values: number[] = []
    const parts = field.split(',')

    for (const part of parts) {
      if (part.includes('/') && part.includes('-')) {
        // Handle range with step like 9-17/2
        const [range, stepStr] = part.split('/')
        const [startStr, endStr] = range.split('-')
        const start = Number(startStr)
        const end = Number(endStr)
        const step = Number(stepStr)
        for (let i = start; i <= end; i += step) {
          values.push(i)
        }
      } else if (part.includes('/')) {
        const [baseStr, stepStr] = part.split('/')
        const step = Number(stepStr)
        const base = baseStr === '*' ? min : Number(baseStr)
        const start = base === '*' ? min : base
        for (let i = start; i <= max; i += step) {
          values.push(i)
        }
      } else if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number)
        for (let i = start; i <= end; i++) {
          values.push(i)
        }
      } else {
        values.push(Number(part))
      }
    }

    return [...new Set(values)].sort((a, b) => a - b)
  }

  return {
    minutes: parseField(minStr, 0, 59),
    hours: parseField(hourStr, 0, 23),
    daysOfMonth: parseField(dayStr, 1, 31),
    months: parseField(monthStr, 1, 12),
    weekdays: parseField(weekdayStr, 0, 6),
  }
}

function getNextRunTime(expression: string, from: Date = new Date()): Date | null {
  try {
    const parsed = parseCronExpression(expression)
    const current = new Date(from)
    current.setSeconds(0, 0)

    // Search for next run time (max 1 year)
    for (let i = 0; i < 366 * 24 * 60; i++) {
      current.setMinutes(current.getMinutes() + 1)

      const min = current.getMinutes()
      const hour = current.getHours()
      const day = current.getDate()
      const month = current.getMonth() + 1
      const weekday = current.getDay()

      if (
        parsed.minutes.includes(min) &&
        parsed.hours.includes(hour) &&
        parsed.daysOfMonth.includes(day) &&
        parsed.months.includes(month) &&
        parsed.weekdays.includes(weekday)
      ) {
        return new Date(current)
      }
    }

    return null
  } catch {
    return null
  }
}

describe('Cron Expression Parser', () => {
  describe('parseCronExpression', () => {
    it('should parse wildcard expression', () => {
      const result = parseCronExpression('* * * * *')
      expect(result.minutes.length).toBe(60)
      expect(result.hours.length).toBe(24)
      expect(result.daysOfMonth.length).toBe(31)
      expect(result.months.length).toBe(12)
      expect(result.weekdays.length).toBe(7)
    })

    it('should parse single value', () => {
      const result = parseCronExpression('30 12 15 6 3')
      expect(result.minutes).toEqual([30])
      expect(result.hours).toEqual([12])
      expect(result.daysOfMonth).toEqual([15])
      expect(result.months).toEqual([6])
      expect(result.weekdays).toEqual([3])
    })

    it('should parse comma-separated values', () => {
      const result = parseCronExpression('0,15,30,45 * * * *')
      expect(result.minutes).toEqual([0, 15, 30, 45])
    })

    it('should parse range', () => {
      const result = parseCronExpression('0 9-17 * * *')
      expect(result.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
    })

    it('should parse step values', () => {
      const result = parseCronExpression('*/15 * * * *')
      expect(result.minutes).toEqual([0, 15, 30, 45])
    })

    it('should parse complex expression', () => {
      const result = parseCronExpression('0,30 9-17/2 * * 1-5')
      expect(result.minutes).toEqual([0, 30])
      expect(result.hours).toEqual([9, 11, 13, 15, 17])
      expect(result.weekdays).toEqual([1, 2, 3, 4, 5])
    })

    it('should throw on invalid expression', () => {
      expect(() => parseCronExpression('* * * *')).toThrow('Invalid cron expression')
      expect(() => parseCronExpression('* * * * * *')).toThrow('Invalid cron expression')
    })
  })

  describe('getNextRunTime', () => {
    it('should find next run time for every minute', () => {
      const now = new Date('2026-04-10T12:30:00')
      const next = getNextRunTime('* * * * *', now)
      expect(next).not.toBeNull()
      expect(next!.getMinutes()).toBe(31)
    })

    it('should find next run time for hourly', () => {
      const now = new Date('2026-04-10T12:30:00')
      const next = getNextRunTime('0 * * * *', now)
      expect(next).not.toBeNull()
      expect(next!.getMinutes()).toBe(0)
      expect(next!.getHours()).toBe(13)
    })

    it('should find next run time for daily', () => {
      const now = new Date('2026-04-10T12:30:00')
      const next = getNextRunTime('0 0 * * *', now)
      expect(next).not.toBeNull()
      expect(next!.getHours()).toBe(0)
      expect(next!.getMinutes()).toBe(0)
    })

    it('should find next run time for weekly', () => {
      const now = new Date('2026-04-10T12:30:00') // Friday
      const next = getNextRunTime('0 0 * * 0', now) // Sunday
      expect(next).not.toBeNull()
      expect(next!.getDay()).toBe(0) // Sunday
    })

    it('should find next run time for monthly', () => {
      const now = new Date('2026-04-10T12:30:00')
      const next = getNextRunTime('0 0 1 * *', now)
      expect(next).not.toBeNull()
      expect(next!.getDate()).toBe(1)
    })

    it('should return null for invalid expression', () => {
      const next = getNextRunTime('invalid', new Date())
      expect(next).toBeNull()
    })
  })
})

describe('Cron Scheduler', () => {
  interface ScheduledJob {
    id: string
    name: string
    expression: string
    enabled: boolean
    lastRun: Date | null
    nextRun: Date | null
    runCount: number
  }

  class CronScheduler {
    private jobs: Map<string, ScheduledJob> = new Map()
    private timer: NodeJS.Timeout | null = null

    addJob(id: string, name: string, expression: string, enabled: boolean = true): ScheduledJob {
      const job: ScheduledJob = {
        id,
        name,
        expression,
        enabled,
        lastRun: null,
        nextRun: getNextRunTime(expression),
        runCount: 0,
      }
      this.jobs.set(id, job)
      return job
    }

    removeJob(id: string): boolean {
      return this.jobs.delete(id)
    }

    getJob(id: string): ScheduledJob | undefined {
      return this.jobs.get(id)
    }

    enableJob(id: string): void {
      const job = this.jobs.get(id)
      if (job) job.enabled = true
    }

    disableJob(id: string): void {
      const job = this.jobs.get(id)
      if (job) job.enabled = false
    }

    getAllJobs(): ScheduledJob[] {
      return Array.from(this.jobs.values())
    }

    async runJob(id: string): Promise<boolean> {
      const job = this.jobs.get(id)
      if (!job || !job.enabled) return false

      job.lastRun = new Date()
      job.runCount++
      job.nextRun = getNextRunTime(job.expression, job.lastRun)

      // Simulate job execution
      await Promise.resolve()

      return true
    }

    start(): void {
      if (this.timer) return
      this.timer = setInterval(() => this.tick(), 60000) // Check every minute
    }

    stop(): void {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    }

    private tick(): void {
      const now = new Date()
      const currentMinute = now.getMinutes()
      const currentHour = now.getHours()
      const currentDay = now.getDate()
      const currentMonth = now.getMonth() + 1
      const currentWeekday = now.getDay()

      for (const job of this.jobs.values()) {
        if (!job.enabled) continue

        try {
          const parsed = parseCronExpression(job.expression)

          if (
            parsed.minutes.includes(currentMinute) &&
            parsed.hours.includes(currentHour) &&
            parsed.daysOfMonth.includes(currentDay) &&
            parsed.months.includes(currentMonth) &&
            parsed.weekdays.includes(currentWeekday)
          ) {
            this.runJob(job.id)
          }
        } catch (error) {
          console.error(`Error checking job ${job.id}:`, error)
        }
      }
    }
  }

  describe('Job Management', () => {
    let scheduler: CronScheduler

    beforeEach(() => {
      scheduler = new CronScheduler()
    })

    afterEach(() => {
      scheduler.stop()
    })

    it('should add a job', () => {
      const job = scheduler.addJob('1', 'Test Job', '* * * * *')
      expect(job.id).toBe('1')
      expect(job.name).toBe('Test Job')
      expect(job.expression).toBe('* * * * *')
      expect(job.enabled).toBe(true)
    })

    it('should remove a job', () => {
      scheduler.addJob('1', 'Test Job', '* * * * *')
      const removed = scheduler.removeJob('1')
      expect(removed).toBe(true)
      expect(scheduler.getJob('1')).toBeUndefined()
    })

    it('should get all jobs', () => {
      scheduler.addJob('1', 'Job 1', '* * * * *')
      scheduler.addJob('2', 'Job 2', '0 * * * *')
      const jobs = scheduler.getAllJobs()
      expect(jobs.length).toBe(2)
    })

    it('should enable/disable job', () => {
      scheduler.addJob('1', 'Test Job', '* * * * *')
      const job = scheduler.getJob('1')!
      expect(job.enabled).toBe(true)

      scheduler.disableJob('1')
      expect(job.enabled).toBe(false)

      scheduler.enableJob('1')
      expect(job.enabled).toBe(true)
    })

    it('should run a job', async () => {
      scheduler.addJob('1', 'Test Job', '* * * * *')
      const result = await scheduler.runJob('1')
      expect(result).toBe(true)

      const job = scheduler.getJob('1')!
      expect(job.lastRun).not.toBeNull()
      expect(job.runCount).toBe(1)
    })

    it('should not run disabled job', async () => {
      scheduler.addJob('1', 'Test Job', '* * * * *', false)
      const result = await scheduler.runJob('1')
      expect(result).toBe(false)
    })

    it('should not run non-existent job', async () => {
      const result = await scheduler.runJob('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Scheduler Tick', () => {
    it('should check jobs on tick', () => {
      const scheduler = new CronScheduler()
      const tickSpy = vi.spyOn(scheduler as any, 'tick')

      scheduler.addJob('1', 'Test Job', '* * * * *')
      scheduler.start()

      // Timer should be set
      expect(scheduler['timer']).not.toBeNull()

      scheduler.stop()
    })
  })
})

describe('Cron Validation', () => {
  function validateCronExpression(expression: string): { valid: boolean; error?: string } {
    try {
      const parts = expression.trim().split(/\s+/)
      if (parts.length !== 5) {
        return { valid: false, error: 'Cron expression must have exactly 5 fields' }
      }

      const [min, hour, day, month, weekday] = parts

      const validateField = (value: string, min: number, max: number, name: string): void => {
        if (value === '*') return

        const parts = value.split(',')
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number)
            if (start < min || end > max || start > end) {
              throw new Error(`Invalid ${name} range: ${part}`)
            }
          } else if (part.includes('/')) {
            const [base, step] = part.split('/')
            const stepNum = Number(step)
            if (stepNum <= 0) {
              throw new Error(`Invalid step in ${name}: ${part}`)
            }
          } else {
            const num = Number(part)
            if (num < min || num > max) {
              throw new Error(`Invalid ${name} value: ${part}`)
            }
          }
        }
      }

      validateField(min, 0, 59, 'minute')
      validateField(hour, 0, 23, 'hour')
      validateField(day, 1, 31, 'day')
      validateField(month, 1, 12, 'month')
      validateField(weekday, 0, 6, 'weekday')

      return { valid: true }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  it('should validate valid expressions', () => {
    expect(validateCronExpression('* * * * *').valid).toBe(true)
    expect(validateCronExpression('0 0 * * *').valid).toBe(true)
    expect(validateCronExpression('0 9-17 * * 1-5').valid).toBe(true)
    expect(validateCronExpression('*/15 * * * *').valid).toBe(true)
  })

  it('should reject invalid expressions', () => {
    expect(validateCronExpression('* * * *').valid).toBe(false)
    expect(validateCronExpression('60 * * * *').valid).toBe(false)
    expect(validateCronExpression('* 25 * * *').valid).toBe(false)
    expect(validateCronExpression('* * 32 * *').valid).toBe(false)
    expect(validateCronExpression('* * * 13 *').valid).toBe(false)
  })
})
