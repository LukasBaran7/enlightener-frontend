import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchDailyCounts } from '../stats'

describe('stats api', () => {
  const originalFetch = window.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    window.fetch = vi.fn()
  })

  afterEach(() => {
    window.fetch = originalFetch
  })

  it('should transform stats data correctly', async () => {
    const mockResponse = {
      total_counts: {
        archived_count: 100,
        later_count: 50
      },
      daily_counts: {
        archived: [{ date: '2024-03-20', count: 5 }],
        later: [{ date: '2024-03-20', count: 3 }]
      }
    }

    window.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const result = await fetchDailyCounts()

    expect(result).toEqual({
      readCounts: mockResponse.daily_counts.archived,
      savedCounts: mockResponse.daily_counts.later,
      totalCounts: mockResponse.total_counts
    })
  })

  // Add error handling tests...
}) 