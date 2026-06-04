import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/generate-report/route'

const originalFetch = global.fetch

const mockUserData = {
  name: 'Test User',
  age: 35,
  gender: 'm',
  height_feet: 5,
  height_inches: 10,
  height_cm: 177.8,
  dob: '1990-01-01',
  current_weight: 200,
  current_bf: 22,
  goal_weight: 180,
  goal_bf: 15,
  start_date: '2025-01-01',
  end_date: '2025-06-01',
  activity_level: 2,
  resistance_training: true,
  is_athlete: false,
  workout_type: 'General Fitness',
  workout_days: 4,
  job_activity: 2,
  leisure_activity: 2,
  experience_level: 'intermediate',
  volume_score: 5,
  intensity_score: 5,
  frequency_score: 5,
  is_bodybuilder: false,
  protein_intake: 160,
  diet_type: 'balanced',
  ped_use: false,
  exercise_type: 'resistance',
  sleep_quality: 'good',
  timeline_weeks: 16,
  waist: 34,
  hip: 40,
  neck: 16
}

describe('generate-report route timeout', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  let timeoutSpy: any
  let capturedTimeout = 0
  let capturedSignal: AbortSignal | null = null

  beforeEach(() => {
    capturedTimeout = 0
    capturedSignal = null

    fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ html_content: '<html>ok</html>' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )
    global.fetch = fetchSpy as typeof global.fetch

    timeoutSpy = vi.spyOn(globalThis.AbortSignal, 'timeout').mockImplementation((ms: number) => {
      capturedTimeout = ms
      const controller = new AbortController()
      capturedSignal = controller.signal
      return controller.signal
    })
  })

  afterEach(() => {
    timeoutSpy.mockRestore()
    global.fetch = originalFetch
  })

  it('issues Python fetch with five-minute timeout', async () => {
    const requestInit: RequestInit & { duplex?: 'half' } = {
      method: 'POST',
      body: JSON.stringify(mockUserData),
      headers: { 'Content-Type': 'application/json' },
      duplex: 'half'
    }
    const request = new Request('http://localhost:3010/api/generate-report', requestInit)

    const response = await POST(request as unknown as import('next/server').NextRequest)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('/generate-report')
    expect(init?.signal).toBe(capturedSignal)
    expect(capturedTimeout).toBe(5 * 60 * 1000)
  })
})
