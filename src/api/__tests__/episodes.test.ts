import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchEpisodes } from '../episodes'
import type { Podcast, Episode } from '../../types/Episode'

describe('episodes api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.fetch = vi.fn()
  })

  it('should transform podcast data correctly', async () => {
    const mockEpisode: Episode = {
      episodeTitle: 'Test Episode',
      audioUrl: 'audio.mp3',
      overcastUrl: 'overcast.fm/123',
      overcastId: '123',
      publishedDate: '2024-03-20',
      playProgress: 50,
      lastPlayedAt: '2024-03-20',
      summary: 'Test summary'
    }

    const mockResponse = [{
      podcast_title: 'Test Podcast',
      artwork_url: 'test.jpg',
      episodes: [{
        episode_title: mockEpisode.episodeTitle,
        audio_url: mockEpisode.audioUrl,
        overcast_url: mockEpisode.overcastUrl,
        overcast_id: mockEpisode.overcastId,
        published_date: mockEpisode.publishedDate,
        play_progress: mockEpisode.playProgress,
        last_played_at: mockEpisode.lastPlayedAt,
        summary: mockEpisode.summary
      }]
    }]

    const expectedPodcast: Podcast = {
      podcastTitle: 'Test Podcast',
      artworkUrl: 'test.jpg',
      episodes: [mockEpisode]
    }

    window.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const result = await fetchEpisodes()
    expect(result[0]).toEqual(expectedPodcast)
  })
}) 