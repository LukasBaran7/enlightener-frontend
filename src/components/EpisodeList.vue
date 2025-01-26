<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Podcast } from '../types/Episode';
import { fetchEpisodes } from '../api/episodes';

const podcasts = ref<Podcast[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const groupByDate = ref(true);
const sortAscending = ref(false);

// Group episodes by date
const groupedByDate = computed(() => {
  const groups: { [key: string]: Array<{ episode: any, podcast: Podcast }> } = {};
  
  podcasts.value.forEach(podcast => {
    podcast.episodes.forEach(episode => {
      const date = formatDate(episode.lastPlayedAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push({ 
        episode,
        podcast
      });
    });
  });

  return Object.entries(groups)
    .sort(([dateA], [dateB]) => {
      const comparison = new Date(dateB).getTime() - new Date(dateA).getTime();
      return sortAscending.value ? -comparison : comparison;
    });
});

// Sort podcasts episodes
const sortedPodcasts = computed(() => {
  return podcasts.value.map(podcast => ({
    ...podcast,
    episodes: [...podcast.episodes].sort((a, b) => {
      const comparison = new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
      return sortAscending.value ? -comparison : comparison;
    })
  }));
});

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
    <div class="view-controls">
      <label class="switch">
        <input 
          type="checkbox" 
          v-model="groupByDate"
        >
        <span class="slider"></span>
        <span class="label">{{ groupByDate ? 'Grouped by Date' : 'Grouped by Podcast' }}</span>
      </label>
      
      <button 
        class="sort-button" 
        @click="sortAscending = !sortAscending"
        :title="sortAscending ? 'Showing oldest first' : 'Showing newest first'"
      >
        <span class="sort-icon">{{ sortAscending ? '↑' : '↓' }}</span>
        {{ sortAscending ? 'Oldest First' : 'Newest First' }}
      </button>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      <p>Loading episodes...</p>
    </div>
    
    <div
      v-else-if="error"
      class="error"
    >
      <p>{{ error }}</p>
    </div>
    
    <template v-else>
      <template v-if="groupByDate">
        <div
          v-for="[date, episodes] in groupedByDate"
          :key="date"
          class="date-group"
        >
          <h2 class="date-header">{{ date }}</h2>
          
          <div
            v-for="{ episode, podcast } in episodes"
            :key="episode.overcastId"
            class="episode-item"
          >
            <div class="episode-header">
              <img
                :src="podcast.artworkUrl || '/path/to/default-image.png'"
                :alt="podcast.podcastTitle"
                class="podcast-artwork"
              >
              <div class="episode-titles">
                <h3 class="podcast-name">{{ podcast.podcastTitle }}</h3>
                <h4 class="episode-title">{{ episode.episodeTitle }}</h4>
              </div>
            </div>

            <div class="episode-meta">
              <time>Listened on {{ formatDate(episode.lastPlayedAt) }}</time>
              <div class="play-status">
                <span class="play-icon">✓</span>
              </div>
            </div>

            <p class="summary">{{ episode.summary }}</p>

            <div class="episode-links">
              <a
                :href="episode.audioUrl"
                target="_blank"
                class="link-button"
              >
                <span>🎧</span> Listen
              </a>
              <a
                :href="episode.overcastUrl"
                target="_blank"
                class="link-button"
              >
                <span>📱</span> Open in Overcast
              </a>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="podcast in sortedPodcasts"
          :key="podcast.podcastTitle"
          class="podcast-group"
        >
          <div class="podcast-header">
            <img 
              :src="podcast.artworkUrl || '/path/to/default-image.png'" 
              :alt="podcast.podcastTitle" 
              class="podcast-artwork"
            >
            <h2 class="podcast-title">
              {{ podcast.podcastTitle }}
            </h2>
          </div>
          
          <div
            v-for="episode in podcast.episodes" 
            :key="episode.overcastId" 
            class="episode-item"
          >
            <h3>{{ episode.episodeTitle }}</h3>
            <div class="episode-meta">
              <time>Listened on {{ formatDate(episode.lastPlayedAt) }}</time>
              <div class="play-status">
                <span class="play-icon">✓</span>
              </div>
            </div>
            <p class="summary">
              {{ episode.summary }}
            </p>
            <div class="episode-links">
              <a
                :href="episode.audioUrl"
                target="_blank"
                class="link-button"
              >
                <span>🎧</span> Listen
              </a>
              <a
                :href="episode.overcastUrl"
                target="_blank"
                class="link-button"
              >
                <span>📱</span> Open in Overcast
              </a>
            </div>
          </div>
        </div>
      </template>
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

.podcast-name {
  font-size: 0.9rem;
  color: var(--text-muted, #888);
  margin: 0 0 0.25rem 0;
}

.episode-title {
  font-size: 1.25rem;
  margin: 0;
  color: var(--heading-color, #ffffff);
}

.date-group {
  margin-bottom: 3rem;
}

.date-header {
  font-size: 1.5rem;
  margin: 2rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color, #ffffff1a);
}

.episode-item {
  margin-left: 0;
}

.view-controls {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  background-color: var(--button-bg, #646cff);
  border-radius: 24px;
  margin-right: 8px;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.label {
  font-size: 0.9rem;
  color: var(--text-muted, #888);
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

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--button-bg, #646cff);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.sort-button:hover {
  background: var(--button-hover-bg, #535bf2);
}

.sort-icon {
  font-size: 1.2rem;
  line-height: 1;
}

@media (max-width: 640px) {
  .date-header {
    font-size: 1.25rem;
    margin: 1.5rem 0 0.75rem;
  }

  .podcast-artwork {
    width: 48px;
    height: 48px;
  }

  .episode-title {
    font-size: 1.1rem;
  }

  .view-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .sort-button {
    width: 100%;
    justify-content: center;
  }
}
</style> 