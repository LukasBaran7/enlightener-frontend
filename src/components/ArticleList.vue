<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Article, DayStats } from '../types/Article';
import { fetchArticles, fetchRandomArticles, archiveArticle, shortlistArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import ArticleCard from './ArticleCard.vue';
import ListHeader from './ListHeader.vue';

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
            <span class="summary-icon">📊</span>
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
      <ListHeader
        v-if="mode === 'random'"
        title="Suggested Articles for Later"
        icon="🎲"
        description="Here are 10 random articles from your reading list that you might want to read next."
        :show-refresh-button="true"
        :disable-refresh="loading"
        @refresh="reloadArticles"
      />

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
        
        <ArticleCard
          v-for="article in regularArticles" 
          :key="article.id" 
          :article="article"
          @archive="handleArchive"
          @shortlist="handleShortlist"
        />
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
        
        <ArticleCard
          v-for="article in newsletterArticles" 
          :key="article.id" 
          :article="article"
          @archive="handleArchive"
          @shortlist="handleShortlist"
        />
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

@media (max-width: 640px) {
  .section-title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}
</style> 