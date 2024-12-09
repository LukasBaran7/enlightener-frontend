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
      podcastTitle: podcast.podcastTitle,
      artworkUrl: podcast.artworkUrl,
      episodes: podcast.episodes
    }));
  } catch (error) {
    console.error('Error fetching episodes:', error);
    throw error;
  }
} 