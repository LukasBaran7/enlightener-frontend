<script setup lang="ts">
import { ref } from 'vue'
import EpisodeList from './components/EpisodeList.vue'
import ArticleList from './components/ArticleList.vue'
import DailyReadingStats from './components/DailyReadingStats.vue'
import CuratedArticles from './components/CuratedArticles.vue'
import PrioritizedArticles from './components/PrioritizedArticles.vue'
import ArchiveFastTrack from './components/ArchiveFastTrack.vue'

const activeTab = ref('random')
</script>

<template>
  <div class="app">
    <h1>My Media History</h1>
    
    <div class="tabs">
      <button 
        :class="{ active: activeTab === 'podcasts' }"
        @click="activeTab = 'podcasts'"
      >
        Podcast Episodes
      </button>
      <button 
        :class="{ active: activeTab === 'articles' }"
        @click="activeTab = 'articles'"
      >
        Read Articles
      </button>
      <button 
        :class="{ active: activeTab === 'random' }"
        @click="activeTab = 'random'"
      >
        Read Later
      </button>
      <button 
        :class="{ active: activeTab === 'curated' }"
        @click="activeTab = 'curated'"
      >
        For You
      </button>
      <button 
        :class="{ active: activeTab === 'prioritized' }"
        @click="activeTab = 'prioritized'"
      >
        Prioritized
      </button>
      <button 
        :class="{ active: activeTab === 'archive' }"
        @click="activeTab = 'archive'"
      >
        Archive Fast Track
      </button>
      <button 
        :class="{ active: activeTab === 'stats' }"
        @click="activeTab = 'stats'"
      >
        Reading Stats
      </button>
    </div>

    <EpisodeList v-if="activeTab === 'podcasts'" />
    <ArticleList 
      v-if="activeTab === 'articles'" 
      :mode="'history'" 
    />
    <ArticleList 
      v-if="activeTab === 'random'" 
      :mode="'random'" 
    />
    <CuratedArticles v-if="activeTab === 'curated'" />
    <PrioritizedArticles v-if="activeTab === 'prioritized'" />
    <ArchiveFastTrack v-if="activeTab === 'archive'" />
    <DailyReadingStats v-if="activeTab === 'stats'" />
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.tabs button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  background: var(--card-bg, #ffffff0d);
  border: 2px solid transparent;
  color: var(--text-color, #ffffff);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.tabs button:hover {
  background: var(--button-hover-bg, #ffffff1a);
}

.tabs button.active {
  background: var(--button-bg, #646cff);
  border-color: var(--button-hover-bg, #535bf2);
}

@media (max-width: 640px) {
  .app {
    padding: 1rem;
  }

  .tabs {
    flex-direction: column;
    padding: 0 1rem;
  }

  .tabs button {
    width: 100%;
  }
}
</style>
