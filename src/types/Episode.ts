export interface Episode {
  episodeTitle: string;
  audioUrl: string;
  overcastUrl: string;
  overcastId: string;
  publishedDate: string;
  playProgress: number | null;
  lastPlayedAt: string;
  summary: string;
}

export interface Podcast {
  podcastTitle: string;
  artworkUrl: string;
  episodes: Episode[];
} 