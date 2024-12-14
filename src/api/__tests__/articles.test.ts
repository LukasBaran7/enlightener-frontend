import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchArticles } from '../articles'
import type { Article } from '../../types/Article'

describe('articles api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.fetch = vi.fn()
  })

  describe('fetchArticles', () => {
    it('should fetch articles successfully', async () => {
      const mockArticles: Article[] = [{
        _id: '1',
        id: '1',
        title: 'Test Article',
        url: 'https://test.com',
        author: 'Test Author',
        source: 'Test Source',
        category: 'test',
        location: 'later',
        tags: {},
        site_name: 'Test Site',
        word_count: 100,
        created_at: '2024-03-20',
        updated_at: '2024-03-20',
        published_date: 1710892800,
        summary: 'Test summary',
        image_url: null,
        content: null,
        source_url: 'https://test.com',
        notes: '',
        parent_id: null,
        reading_progress: 0,
        first_opened_at: null,
        last_opened_at: null,
        saved_at: '2024-03-20',
        last_moved_at: '2024-03-20'
      }]

      window.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticles)
      })

      const result = await fetchArticles()
      expect(result).toEqual(mockArticles)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/reader/articles'))
    })

    it('should handle fetch errors', async () => {
      window.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchArticles()).rejects.toThrow('Network error')
    })

    it('should handle non-ok responses', async () => {
      window.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(fetchArticles()).rejects.toThrow('HTTP error! status: 404')
    })
  })

  // Similar tests for fetchRandomArticles...
}) 