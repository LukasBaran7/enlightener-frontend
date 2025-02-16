<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Article } from '../types/Article';
import { archiveArticle, shortlistArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import { calculateReadingTime } from '../types/Article';

interface CuratedData {
  quick_reads: Article[];
  from_archives: Article[];
  favorite_sources: Article[];
}

const curated = ref<CuratedData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

const sectionTitles = {
  quick_reads: 'Quick Reads',
  from_archives: 'From Your Archives',
  favorite_sources: 'From Your Favorite Sources'
}

const sectionIcons = {
  quick_reads: '⚡',
  from_archives: '📚',
  favorite_sources: '⭐'
}

const sectionDescriptions = {
  quick_reads: 'Short articles you can read in under 10 minutes',
  from_archives: 'Rediscover interesting articles from your past saves',
  favorite_sources: 'Latest articles from publications you frequently read'
}

async function reloadCurated() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/reader/later/curated`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    curated.value = await response.json();
    toastMessage.value = 'Suggestions refreshed successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load curated articles';
    toastMessage.value = 'Failed to refresh suggestions';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Error fetching curated articles:', err);
  } finally {
    loading.value = false;
  }
}

async function handleArchive(articleId: string, section: keyof CuratedData) {
  try {
    await archiveArticle(articleId);
    if (curated.value) {
      curated.value[section] = curated.value[section].filter(
        article => article.id !== articleId
      );
    }
    toastMessage.value = 'Article archived successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (e) {
    toastMessage.value = e instanceof Error 
      ? e.message 
      : 'Failed to archive article. Please try again later.';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Archive error:', e);
  }
}

async function handleShortlist(articleId: string, section: keyof CuratedData) {
  try {
    await shortlistArticle(articleId);
    if (curated.value) {
      const article = curated.value[section].find(a => a.id === articleId);
      if (article) {
        article.shortlisted = true;
      }
    }
    toastMessage.value = 'Article shortlisted successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (e) {
    toastMessage.value = e instanceof Error 
      ? e.message 
      : 'Failed to shortlist article. Please try again later.';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Shortlist error:', e);
  }
}

onMounted(() => {
  reloadCurated();
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
  <div class="curated-articles">
    <div class="curated-header">
      <div class="header-content">
        <h1>Curated For You</h1>
        <button 
          class="reload-button"
          :disabled="loading"
          @click="reloadCurated"
        >
          <span class="reload-icon">🔄</span>
          Refresh Suggestions
        </button>
      </div>
      <p class="header-description">
        Personalized article suggestions based on your reading history
      </p>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading curated articles...
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>

    <template v-else-if="curated">
      <section 
        v-for="(section, sectionKey) in curated" 
        :key="sectionKey"
        class="article-section"
      >
        <h2 class="section-title">
          <span class="section-icon">{{ sectionIcons[sectionKey] }}</span>
          {{ sectionTitles[sectionKey] }}
        </h2>
        <p class="section-description">
          {{ sectionDescriptions[sectionKey] }}
        </p>
        
        <div
          v-for="article in section" 
          :key="article.id" 
          class="article-item"
          :class="{ shortlisted: article.shortlisted }"
        >
          <div class="article-content">
            <div class="article-header">
              <div class="article-text">
                <div class="source-info">
                  <span class="source">{{ article.site_name || article.source }}</span>
                  <span
                    v-if="article.author"
                    class="author"
                  >
                    by {{ article.author }}
                  </span>
                </div>
                <h3>
                  <a
                    :href="article.url"
                    target="_blank"
                    class="article-link"
                  >
                    {{ article.title }}
                    <span class="link-icon">📄</span>
                  </a>
                </h3>
              </div>
              <img
                v-if="article.image_url" 
                :src="article.image_url" 
                :alt="article.title"
                class="thumbnail"
              >
            </div>
            
            <p
              v-if="article.summary"
              class="summary"
            >
              {{ article.summary }}
            </p>
            
            <div class="article-meta">
              <div class="reading-info">
                <time>Saved {{ formatDate(article.saved_at) }}</time>
              </div>
              <div class="stats">
                <span class="reading-time">{{ calculateReadingTime(article.word_count) }}</span>
                <span class="word-count">{{ article.word_count.toLocaleString() }} words</span>
                <a 
                  v-if="article.source_url" 
                  :href="article.source_url" 
                  target="_blank" 
                  class="source-link"
                  title="Visit original source"
                >
                  Original Source
                  <span class="link-icon">🔗</span>
                </a>
                <button 
                  class="shortlist-button"
                  title="Shortlist this article"
                  @click="handleShortlist(article.id, sectionKey)"
                >
                  <span class="shortlist-icon">⭐</span>
                  Shortlist
                </button>
                <button 
                  class="archive-button"
                  title="Archive this article"
                  @click="handleArchive(article.id, sectionKey)"
                >
                  <span class="archive-icon">📥</span>
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <ToastNotification
      v-if="showToast"
      :message="toastMessage"
      :type="toastType"
      @hide="showToast = false"
    />
  </div>
</template>

<style scoped>
.curated-articles {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
}

.error {
  color: #ff4444;
}

.article-section {
  margin-bottom: 3rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  color: var(--text-primary, #ffffff);
}

.section-icon {
  font-size: 1.5rem;
}

.section-description {
  color: var(--text-muted, #888);
  margin-bottom: 1.5rem;
}

.article-item {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.article-item:hover {
  transform: translateY(-2px);
}

.article-header {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.article-text {
  flex: 1;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.source {
  font-weight: 500;
  color: var(--text-primary, #646cff);
}

.author {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.thumbnail {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.article-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}

.article-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: inherit;
  text-decoration: none;
}

.article-link:hover {
  text-decoration: underline;
}

.article-link .link-icon {
  font-size: 1rem;
  opacity: 0.7;
}

.article-link:hover .link-icon {
  opacity: 1;
}

.summary {
  color: var(--text-secondary, #888);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0.75rem 0;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #ffffff1a);
}

.reading-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.word-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.word-count::before {
  content: "📝";
  font-size: 1rem;
}

.source-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: #4a4a4a;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.source-link:hover {
  background: #5a5a5a;
  border-color: rgba(255, 255, 255, 0.2);
}

.source-link:active {
  background: #404040;
}

.link-icon {
  font-size: 1rem;
  opacity: 0.9;
}

.archive-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--button-bg, #646cff);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.archive-button:hover {
  background: var(--button-hover-bg, #535bf2);
}

.archive-button:active {
  transform: scale(0.98);
}

.archive-icon {
  font-size: 1rem;
  opacity: 0.9;
}

.shortlist-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--button-secondary-bg, #4a4a4a);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shortlist-button:hover {
  background: var(--button-secondary-hover-bg, #5a5a5a);
}

.shortlist-button:active {
  transform: scale(0.98);
}

.shortlist-icon {
  font-size: 1rem;
  opacity: 0.9;
}

@media (max-width: 640px) {
  .curated-articles {
    padding: 0.5rem;
  }

  .article-item {
    padding: 1rem;
  }

  .article-header {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .thumbnail {
    width: 100%;
    height: 160px;
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .stats {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .source-link, .shortlist-button, .archive-button {
    flex: 1;
    justify-content: center;
  }

  .source-link {
    background: #333333;
  }
}

.curated-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.header-description {
  color: var(--text-muted, #888);
  font-size: 1.1rem;
  margin: 0;
}

.reload-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--button-bg, #646cff);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.reload-button:hover {
  background: var(--button-hover-bg, #535bf2);
}

.reload-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reload-icon {
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .reload-button {
    width: 100%;
    justify-content: center;
  }
}

.article-item.shortlisted {
  border: 2px solid var(--shortlist-color, #ffd700);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.2);
}

.article-item.shortlisted .shortlist-button {
  background: var(--shortlist-color, #ffd700);
  color: #000000;
}

.article-item.shortlisted .shortlist-button:hover {
  background: var(--shortlist-hover-color, #ffed4a);
}

.article-item.shortlisted .shortlist-icon {
  font-size: 1.2rem;
  opacity: 1;
}
</style> 