<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Article } from '../types/Article';
import { archiveArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';

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
      <!-- Quick Reads Section -->
      <section class="article-section">
        <h2 class="section-title">
          <span class="section-icon">⚡</span>
          Quick Reads
        </h2>
        <p class="section-description">
          Short articles you can read in under 10 minutes
        </p>
        
        <div class="articles-grid">
          <div
            v-for="article in curated.quick_reads" 
            :key="article.id" 
            class="article-card"
          >
            <img
              v-if="article.image_url" 
              :src="article.image_url" 
              :alt="article.title"
              class="article-image"
            >
            <div class="article-content">
              <div class="article-meta">
                <div class="source-info">
                  <span class="source">{{ article.site_name || article.source }}</span>
                  <span
                    v-if="article.author"
                    class="author"
                  >
                    by {{ article.author }}
                  </span>
                </div>
                <span class="word-count">{{ article.word_count.toLocaleString() }} words</span>
              </div>
              <h3 class="article-title">
                <a
                  :href="article.url"
                  target="_blank"
                >{{ article.title }}</a>
              </h3>
              <p
                v-if="article.summary"
                class="article-summary"
              >
                {{ article.summary }}
              </p>
              <div class="article-footer">
                <div class="footer-left">
                  <time>Saved {{ formatDate(article.saved_at) }}</time>
                </div>
                <div class="footer-right">
                  <button 
                    class="archive-button"
                    title="Archive this article"
                    @click="handleArchive(article.id, 'quick_reads')"
                  >
                    <span class="archive-icon">📥</span>
                    Archive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- From Archives Section -->
      <section class="article-section">
        <h2 class="section-title">
          <span class="section-icon">📚</span>
          From Your Archives
        </h2>
        <p class="section-description">
          Rediscover interesting articles from your past saves
        </p>
        
        <div class="articles-grid">
          <div
            v-for="article in curated.from_archives" 
            :key="article.id" 
            class="article-card"
          >
            <img
              v-if="article.image_url" 
              :src="article.image_url" 
              :alt="article.title"
              class="article-image"
            >
            <div class="article-content">
              <div class="article-meta">
                <div class="source-info">
                  <span class="source">{{ article.site_name || article.source }}</span>
                  <span
                    v-if="article.author"
                    class="author"
                  >
                    by {{ article.author }}
                  </span>
                </div>
                <span class="word-count">{{ article.word_count.toLocaleString() }} words</span>
              </div>
              <h3 class="article-title">
                <a
                  :href="article.url"
                  target="_blank"
                >{{ article.title }}</a>
              </h3>
              <p
                v-if="article.summary"
                class="article-summary"
              >
                {{ article.summary }}
              </p>
              <div class="article-footer">
                <div class="footer-left">
                  <time>Saved {{ formatDate(article.saved_at) }}</time>
                </div>
                <div class="footer-right">
                  <button 
                    class="archive-button"
                    title="Archive this article"
                    @click="handleArchive(article.id, 'from_archives')"
                  >
                    <span class="archive-icon">📥</span>
                    Archive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Favorite Sources Section -->
      <section class="article-section">
        <h2 class="section-title">
          <span class="section-icon">⭐</span>
          From Your Favorite Sources
        </h2>
        <p class="section-description">
          Latest articles from publications you frequently read
        </p>
        
        <div class="articles-grid">
          <div
            v-for="article in curated.favorite_sources" 
            :key="article.id" 
            class="article-card"
          >
            <img
              v-if="article.image_url" 
              :src="article.image_url" 
              :alt="article.title"
              class="article-image"
            >
            <div class="article-content">
              <div class="article-meta">
                <div class="source-info">
                  <span class="source">{{ article.site_name || article.source }}</span>
                  <span
                    v-if="article.author"
                    class="author"
                  >
                    by {{ article.author }}
                  </span>
                </div>
                <span class="word-count">{{ article.word_count.toLocaleString() }} words</span>
              </div>
              <h3 class="article-title">
                <a
                  :href="article.url"
                  target="_blank"
                >{{ article.title }}</a>
              </h3>
              <p
                v-if="article.summary"
                class="article-summary"
              >
                {{ article.summary }}
              </p>
              <div class="article-footer">
                <div class="footer-left">
                  <time>Saved {{ formatDate(article.saved_at) }}</time>
                </div>
                <div class="footer-right">
                  <button 
                    class="archive-button"
                    title="Archive this article"
                    @click="handleArchive(article.id, 'favorite_sources')"
                  >
                    <span class="archive-icon">📥</span>
                    Archive
                  </button>
                </div>
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
  max-width: 1200px;
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

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.article-card {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.article-card:hover {
  transform: translateY(-2px);
}

.article-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.article-content {
  padding: 1.25rem;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  gap: 1rem;
}

.source-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.source {
  color: var(--text-primary, #646cff);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author {
  color: var(--text-muted, #888);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.word-count {
  color: var(--text-muted, #888);
  white-space: nowrap;
}

.article-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  line-height: 1.4;
}

.article-title a {
  color: inherit;
  text-decoration: none;
}

.article-title a:hover {
  text-decoration: underline;
}

.article-summary {
  color: var(--text-secondary, #888);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
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

@media (max-width: 640px) {
  .articles-grid {
    grid-template-columns: 1fr;
  }

  .article-card {
    max-width: 100%;
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
</style> 