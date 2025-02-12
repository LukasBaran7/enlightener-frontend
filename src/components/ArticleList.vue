<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Article, DayStats } from '../types/Article';
import { fetchArticles, fetchRandomArticles, archiveArticle, shortlistArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import { calculateReadingTime } from '../types/Article';

const props = defineProps<{
  mode: 'history' | 'random'
}>();

const articles = ref<Article[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

const isNewsletter = (article: Article) => 
  article.source_url?.includes('mailto:reader-forwarded-email');

const regularArticles = computed(() => 
  articles.value.filter(article => !isNewsletter(article))
);

const newsletterArticles = computed(() => 
  articles.value.filter(article => isNewsletter(article))
);

const articlesCount = computed(() => regularArticles.value.length);
const newsletterCount = computed(() => newsletterArticles.value.length);

const totalWordsRead = computed(() => 
  regularArticles.value.reduce((sum, article) => sum + (article.word_count || 0), 0)
);

const sourceStats = computed(() => {
  const sources = new Map<string, number>();
  
  regularArticles.value.forEach(article => {
    if (article.site_name || article.source) {
      const sourceName = article.site_name || article.source || '';
      if (sourceName) {
        sources.set(sourceName, (sources.get(sourceName) || 0) + 1);
      }
    }
  });
  
  let maxSource = { name: '', count: 0 };
  sources.forEach((count, name) => {
    if (count > maxSource.count) {
      maxSource = { name, count };
    }
  });
  
  return maxSource;
});

const authorStats = computed(() => {
  const authors = new Map<string, number>();
  
  regularArticles.value.forEach(article => {
    if (article.author) {
      authors.set(article.author, (authors.get(article.author) || 0) + 1);
    }
  });
  
  let maxAuthor = { name: '', count: 0 };
  authors.forEach((count, name) => {
    if (count > maxAuthor.count && count > 1) {
      maxAuthor = { name, count };
    }
  });
  
  return maxAuthor;
});

const readingDistribution = computed(() => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const distribution = new Map<string, number>();
  
  days.forEach(day => distribution.set(day, 0));
  
  regularArticles.value.forEach(article => {
    const day = new Date(article.updated_at).getDay();
    const dayName = days[day];
    distribution.set(dayName, (distribution.get(dayName) || 0) + 1);
  });
  
  const stats: DayStats[] = days.map(day => ({
    dayName: day,
    count: distribution.get(day) || 0
  }));
  
  const maxCount = Math.max(...stats.map(s => s.count));
  
  const busiest = stats.reduce((a, b) => a.count > b.count ? a : b);
  
  return {
    stats,
    maxCount,
    busiest
  };
});

const isReadLaterMode = computed(() => props.mode === 'random');

async function reloadArticles() {
  loading.value = true;
  error.value = null;
  try {
    if (props.mode === 'history') {
      articles.value = await fetchArticles();
    } else {
      articles.value = await fetchRandomArticles();
      toastMessage.value = 'New suggestions loaded successfully';
      toastType.value = 'success';
      showToast.value = true;
    }
  } catch (e) {
    error.value = e instanceof Error 
      ? e.message 
      : 'Failed to load articles. Please try again later.';
    toastMessage.value = 'Failed to load new suggestions';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Article fetch error:', e);
  } finally {
    loading.value = false;
  }
}

async function handleArchive(articleId: string) {
  try {
    await archiveArticle(articleId);
    articles.value = articles.value.filter(article => article.id !== articleId);
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

async function handleShortlist(articleId: string) {
  try {
    await shortlistArticle(articleId);
    const article = articles.value.find(a => a.id === articleId);
    if (article) {
      article.shortlisted = true;
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
  reloadArticles();
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatWordCount(count?: number): string {
  if (!count) return '';
  return `${count.toLocaleString()} words`;
}
</script>

<template>
  <div class="article-list">
    <div
      v-if="loading"
      class="loading"
    >
      <p>Loading articles...</p>
    </div>
    
    <div
      v-else-if="error"
      class="error"
    >
      <p>{{ error }}</p>
    </div>
    
    <template v-else>
      <!-- Show stats grid only in history mode -->
      <div
        v-if="mode === 'history'"
        class="stats-grid"
      >
        <div class="stat-card">
          <span class="summary-icon">📚</span>
          <div class="stat-content">
            <div class="stat-value">
              {{ articlesCount }}
            </div>
            <div class="stat-label">
              article{{ articlesCount === 1 ? '' : 's' }} this week
            </div>
          </div>
        </div>

        <div class="stat-card">
          <span class="summary-icon">📝</span>
          <div class="stat-content">
            <div class="stat-value">
              {{ totalWordsRead.toLocaleString() }}
            </div>
            <div class="stat-label">
              words read
            </div>
          </div>
        </div>

        <div
          v-if="sourceStats.count > 1"
          class="stat-card"
        >
          <span class="summary-icon">📰</span>
          <div class="stat-content">
            <div class="stat-value">
              {{ sourceStats.name }}
            </div>
            <div class="stat-label">
              your favorite source ({{ sourceStats.count }} articles)
            </div>
          </div>
        </div>

        <div
          v-if="authorStats.count > 1"
          class="stat-card"
        >
          <span class="summary-icon">✍️</span>
          <div class="stat-content">
            <div class="stat-value">
              {{ authorStats.name }}
            </div>
            <div class="stat-label">
              your favorite author ({{ authorStats.count }} articles)
            </div>
          </div>
        </div>

        <div
          v-if="newsletterCount > 0"
          class="stat-card"
        >
          <span class="summary-icon">📧</span>
          <div class="stat-content">
            <div class="stat-value">
              {{ newsletterCount }}
            </div>
            <div class="stat-label">
              newsletter{{ newsletterCount === 1 ? '' : 's' }} read
            </div>
          </div>
        </div>

        <div class="stat-card distribution-card">
          <div class="stat-header">
            <span class="summary-icon">��</span>
            <div class="stat-content">
              <div class="stat-value">
                {{ readingDistribution.busiest.dayName }}
              </div>
              <div class="stat-label">
                your most active reading day
              </div>
            </div>
          </div>
          
          <div class="distribution-chart">
            <div
              v-for="day in readingDistribution.stats" 
              :key="day.dayName" 
              class="day-bar"
            >
              <div class="bar-label">
                {{ day.dayName.slice(0, 3) }}
              </div>
              <div class="bar-wrapper">
                <div
                  class="bar" 
                  :style="{ 
                    width: day.count ? `${(day.count / readingDistribution.maxCount) * 100}%` : '0%',
                    opacity: day.count ? 1 : 0.3
                  }"
                >
                  <span
                    v-if="day.count"
                    class="bar-value"
                  >{{ day.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Show header with reload button for random mode -->
      <div
        v-else
        class="random-header"
      >
        <div class="header-content">
          <div>
            <h2 class="section-title">
              <span class="section-icon">🎲</span>
              Suggested Articles for Later
            </h2>
            <p class="random-description">
              Here are 10 random articles from your reading list that you might want to read next.
            </p>
          </div>
          <button 
            class="reload-button"
            :disabled="loading"
            @click="reloadArticles"
          >
            <span class="reload-icon">🔄</span>
            Get New Suggestions
          </button>
        </div>
      </div>

      <!-- Regular articles section -->
      <div
        v-if="regularArticles.length > 0"
        class="article-section"
      >
        <h2
          v-if="mode === 'history'"
          class="section-title"
        >
          <span class="section-icon">📚</span>
          Saved Articles
        </h2>
        
        <div
          v-for="article in regularArticles" 
          :key="article.id" 
          class="article-item"
          :class="{ shortlisted: article.shortlisted }"
        >
          <div class="article-content">
            <div class="article-header">
              <div class="article-text">
                <div class="source-info">
                  <span class="source">
                    {{ article.site_name || article.source }}
                  </span>
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
                <time>{{ isReadLaterMode ? 'Moved' : 'Read' }} {{ formatDate(article.updated_at) }}</time>
              </div>
              <div class="stats">
                <span class="reading-time">{{ calculateReadingTime(article.word_count) }}</span>
                <span class="word-count">{{ formatWordCount(article.word_count) }}</span>
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
                  @click="handleShortlist(article.id)"
                >
                  <span class="shortlist-icon">⭐</span>
                  Shortlist
                </button>
                <button 
                  class="archive-button"
                  title="Archive this article"
                  @click="handleArchive(article.id)"
                >
                  <span class="archive-icon">📥</span>
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Newsletter articles section -->
      <div
        v-if="mode === 'history' && newsletterArticles.length > 0"
        class="article-section"
      >
        <h2 class="section-title">
          <span class="section-icon">📧</span>
          Newsletters
        </h2>
        <div
          v-for="article in newsletterArticles" 
          :key="article.id" 
          class="article-item newsletter"
        >
          <div class="article-content">
            <div class="article-header">
              <div class="article-text">
                <div class="source-info">
                  <span class="source">
                    {{ article.site_name || article.source }}
                  </span>
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
                <time>{{ isReadLaterMode ? 'Moved' : 'Read' }} {{ formatDate(article.updated_at) }}</time>
              </div>
              <div class="stats">
                <span class="reading-time">{{ calculateReadingTime(article.word_count) }}</span>
                <span class="word-count">{{ formatWordCount(article.word_count) }}</span>
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
                  @click="handleShortlist(article.id)"
                >
                  <span class="shortlist-icon">⭐</span>
                  Shortlist
                </button>
                <button 
                  class="archive-button"
                  title="Archive this article"
                  @click="handleArchive(article.id)"
                >
                  <span class="archive-icon">📥</span>
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
.article-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
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

.article-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}

.article-content a {
  color: inherit;
  text-decoration: none;
}

.article-content a:hover {
  text-decoration: underline;
}

.article-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.source {
  font-weight: 500;
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

@media (max-width: 640px) {
  .article-list {
    padding: 0.5rem;
  }

  .article-item {
    padding: 1rem;
  }

  .article-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
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

@media (max-width: 640px) {
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
    justify-content: space-between;
  }
}

.weekly-summary {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary, #ffffff);
  font-size: 1.1rem;
}

.summary-icon {
  font-size: 1.5rem;
}

@media (max-width: 640px) {
  .weekly-summary {
    font-size: 1rem;
    padding: 0.75rem 1rem;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
  line-height: 1.2;
}

.stat-label {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.summary-icon {
  font-size: 1.75rem;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 0.75rem 1rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }
}

.distribution-card {
  grid-column: 1 / -1;
  flex-direction: column;
  align-items: stretch;
  padding: 1.5rem;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.day-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bar-label {
  width: 3rem;
  font-size: 0.9rem;
  color: var(--text-muted, #888);
}

.bar-wrapper {
  flex: 1;
  background: var(--bar-bg, #ffffff0d);
  border-radius: 4px;
  height: 1.5rem;
}

.bar {
  height: 100%;
  background: var(--button-bg, #646cff);
  border-radius: 4px;
  min-width: 2rem;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  transition: width 0.3s ease;
}

.bar-value {
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .distribution-card {
    padding: 1rem;
  }

  .bar-wrapper {
    height: 1.25rem;
  }

  .bar-value {
    font-size: 0.75rem;
  }
}

.article-section {
  margin-bottom: 3rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: var(--text-primary, #ffffff);
}

.section-icon {
  font-size: 1.5rem;
}

.article-item.newsletter {
  border: 1px solid var(--accent-color, #646cff);
  background: var(--card-bg-accent, #646cff0d);
}

@media (max-width: 640px) {
  .section-title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.random-header {
  margin-bottom: 2rem;
}

.random-description {
  color: var(--text-muted, #888);
  font-size: 1rem;
  margin-top: 0.5rem;
}

.stats {
  display: flex;
  gap: 1rem;
  align-items: center;
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

@media (max-width: 640px) {
  .stats {
    flex-wrap: wrap;
  }
  
  .source-link {
    flex: 1;
    justify-content: center;
    background: #333333;
  }
}

.article-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.article-link .link-icon {
  font-size: 1rem;
  opacity: 0.7;
}

.article-link:hover .link-icon {
  opacity: 1;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
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
  }
  
  .reload-button {
    width: 100%;
    justify-content: center;
  }
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

.reading-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
  white-space: nowrap;
}

.reading-time::before {
  content: "⏱️";
  font-size: 1rem;
}
</style> 