import { Podcast } from '../types/Episode';

const API_URL = import.meta.env.VITE_API_URL + '/podcasts/latest';

export async function fetchEpisodes(): Promise<Podcast[]> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    return data.map((podcast: any) => ({
      podcastTitle: podcast.podcast_title,
      artworkUrl: podcast.artwork_url,
      episodes: podcast.episodes.map((episode: any) => ({
        episodeTitle: episode.episode_title,
        audioUrl: episode.audio_url,
        overcastUrl: episode.overcast_url,
        overcastId: episode.overcast_id,
        publishedDate: episode.published_date,
        playProgress: episode.play_progress,
        lastPlayedAt: episode.last_played_at,
        summary: episode.summary
      }))
    }));
  } catch (error) {
    console.error('Error fetching episodes:', error);
    throw error;
  }
} 