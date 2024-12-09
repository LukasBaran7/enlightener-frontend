<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Podcast } from '../types/Episode';
import { fetchEpisodes } from '../api/episodes';

const podcasts = ref<Podcast[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    podcasts.value = await fetchEpisodes();
  } catch (e) {
    error.value = e instanceof Error 
      ? e.message 
      : 'Failed to load episodes. Please try again later.';
    console.error('Episode fetch error:', e);
  } finally {
    loading.value = false;
  }
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
</script>

<template>
  <div class="episode-list">
    <div v-if="loading" class="loading">
      <p>Loading episodes...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <template v-else>
      <div v-for="podcast in podcasts" :key="podcast.podcastTitle" class="podcast-group">
        <div class="podcast-header">
          <img :src="podcast.artworkUrl" :alt="podcast.podcastTitle" class="podcast-artwork">
          <h2 class="podcast-title">{{ podcast.podcastTitle }}</h2>
        </div>
        
        <div v-for="episode in podcast.episodes" 
             :key="episode.overcastId" 
             class="episode-item">
          <h3>{{ episode.episodeTitle }}</h3>
          <div class="episode-meta">
            <time>{{ formatDate(episode.publishedDate) }}</time>
            <div class="play-status">
              <span class="play-icon">✓</span>
              Listened on {{ formatDate(episode.lastPlayedAt) }}
              <div class="progress-indicator">
                {{ Math.round(episode.playProgress || 0) }}% completed
              </div>
            </div>
          </div>
          <p class="summary">{{ episode.summary }}</p>
          <div class="episode-links">
            <a :href="episode.audioUrl" target="_blank" class="link-button">
              <span>🎧</span> Listen
            </a>
            <a :href="episode.overcastUrl" target="_blank" class="link-button">
              <span>📱</span> Open in Overcast
            </a>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.episode-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.episode-item {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.episode-item:hover {
  transform: translateY(-2px);
}

.episode-item h2 {
  margin: 0;
  font-size: 1.25rem;
}

.episode-item time {
  display: block;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.summary {
  line-height: 1.6;
  margin: 1rem 0;
}

.episode-links {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.link-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--button-bg, #646cff);
  color: white;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.link-button:hover {
  background: var(--button-hover-bg, #535bf2);
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
}

.error {
  color: #ff4444;
}

.episode-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.play-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-success, #4CAF50);
  font-size: 0.9rem;
  background: rgba(76, 175, 80, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
}

.play-icon {
  font-size: 1rem;
  color: var(--text-success, #4CAF50);
}

.progress-indicator {
  display: inline-block;
  background: var(--button-bg, #646cff);
  padding: 0.1rem 0.5rem;
  border-radius: 12px;
  color: white;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.episode-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.podcast-artwork {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.episode-titles {
  flex: 1;
}

.podcast-title {
  font-size: 0.9rem;
  color: var(--text-muted, #888);
  margin: 0 0 0.25rem 0;
}

@media (max-width: 640px) {
  .episode-list {
    padding: 0.5rem;
  }

  .episode-item {
    padding: 1rem;
  }

  .episode-links {
    flex-direction: column;
  }

  .link-button {
    width: 100%;
    justify-content: center;
  }

  .episode-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .podcast-artwork {
    width: 48px;
    height: 48px;
  }
  
  .episode-titles h2 {
    font-size: 1.1rem;
  }
}

.podcast-group {
  margin-bottom: 3rem;
}

.podcast-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
}

.podcast-artwork {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}

.podcast-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--heading-color, #ffffff);
}

.episode-item {
  margin-left: 2rem;
}

.episode-item h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--heading-color, #ffffff);
}

@media (max-width: 640px) {
  .podcast-artwork {
    width: 60px;
    height: 60px;
  }
  
  .podcast-title {
    font-size: 1.25rem;
  }
  
  .episode-item {
    margin-left: 0;
  }
}
</style> 