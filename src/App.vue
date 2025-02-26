<script setup lang="ts">
import { ref } from 'vue'
import EpisodeList from './components/EpisodeList.vue'
import ArticleList from './components/ArticleList.vue'
import DailyReadingStats from './components/DailyReadingStats.vue'
import CuratedArticles from './components/CuratedArticles.vue'
import PrioritizedArticles from './components/PrioritizedArticles.vue'
import ArchiveFastTrack from './components/ArchiveFastTrack.vue'
import LlmRecommendations from './components/LlmRecommendations.vue'
import LlmArchiveCandidates from './components/LlmArchiveCandidates.vue'

const activeTab = ref('articles')

const tabs = [
  { id: 'articles', label: 'Recent Articles', icon: '📚' },
  { id: 'random', label: 'Read Later', icon: '📋' },
  { id: 'curated', label: 'For You', icon: '🎯' },
  { id: 'prioritized', label: 'Prioritized', icon: '🏆' },
  { id: 'llm-recommendations', label: 'AI Recommendations', icon: '🧠' },
  { id: 'archive-fast-track', label: 'Archive Fast Track', icon: '🗑️' },
  { id: 'llm-archive', label: 'AI Archive Suggestions', icon: '🤖' },
  { id: 'stats', label: 'Reading Stats', icon: '📊' },
  { id: 'podcasts', label: 'Podcasts', icon: '🎧' }
]

function setActiveTab(tabId: string) {
  activeTab.value = tabId
}
</script>

<template>
  <div class="app">
    <header>
      <h1>Reader Dashboard</h1>
    </header>
    
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="setActiveTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>
    
    <main>
      <EpisodeList v-if="activeTab === 'podcasts'" />
      <ArticleList v-if="activeTab === 'articles'" :mode="'history'" />
      <ArticleList v-if="activeTab === 'random'" :mode="'random'" />
      <CuratedArticles v-if="activeTab === 'curated'" />
      <PrioritizedArticles v-if="activeTab === 'prioritized'" />
      <LlmRecommendations v-if="activeTab === 'llm-recommendations'" />
      <ArchiveFastTrack v-if="activeTab === 'archive-fast-track'" />
      <LlmArchiveCandidates v-if="activeTab === 'llm-archive'" />
      <DailyReadingStats v-if="activeTab === 'stats'" />
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color, #333);
}

h1 {
  font-size: 1.75rem;
  margin: 0;
}

.tabs {
  display: flex;
  overflow-x: auto;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-secondary, #1a1a1a);
  border-bottom: 1px solid var(--border-color, #333);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--tab-bg, #2a2a2a);
  color: var(--text-primary, #fff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-button:hover {
  background: var(--tab-hover-bg, #3a3a3a);
}

.tab-button.active {
  background: var(--tab-active-bg, #4a4a4a);
  font-weight: 500;
}

.tab-icon {
  font-size: 1.25rem;
}

main {
  padding: 1rem;
}

@media (max-width: 768px) {
  .tabs {
    padding: 0.75rem;
    gap: 0.25rem;
  }
  
  .tab-button {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  
  .tab-icon {
    font-size: 1rem;
  }
}

@media (max-width: 640px) {
  .tab-label {
    display: none;
  }
  
  .tab-button {
    padding: 0.5rem;
  }
  
  .tab-icon {
    font-size: 1.5rem;
  }
}
</style>
