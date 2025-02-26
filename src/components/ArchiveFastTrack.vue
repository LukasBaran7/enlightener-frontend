<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { PrioritizedArticle } from '../types/PrioritizedArticle';
import { fetchLowPriorityArticles, archiveArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import { calculateReadingTime } from '../types/Article';

interface ArticleWithReasons extends PrioritizedArticle {
  archive_reasons: string[];
}

const articles = ref<ArticleWithReasons[]>([]);
const metadata = ref<{
  total_processed: number;
  returned_count: number;
  criteria: {
    min_age_days: number;
  };
} | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
const minAgeDays = ref(1095); // Default to 3 years

// Track which articles have been archived
const archivedArticleIds = ref<Set<string>>(new Set());

async function loadLowPriorityArticles() {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchLowPriorityArticles(minAgeDays.value);
    articles.value = data.articles as ArticleWithReasons[];
    metadata.value = data.metadata;
    toastMessage.value = 'Archive candidates loaded successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load archive candidates';
    toastMessage.value = 'Failed to load archive candidates';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Error fetching low priority articles:', err);
  } finally {
    loading.value = false;
  }
}

async function handleArchive(articleId: string) {
  try {
    await archiveArticle(articleId);
    archivedArticleIds.value.add(articleId);
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

async function handleArchiveAll() {
  if (!confirm('Are you sure you want to archive all these articles?')) {
    return;
  }
  
  loading.value = true;
  let successCount = 0;
  let failCount = 0;
  
  for (const article of articles.value) {
    if (!archivedArticleIds.value.has(article.id)) {
      try {
        await archiveArticle(article.id);
        archivedArticleIds.value.add(article.id);
        successCount++;
      } catch (e) {
        console.error(`Failed to archive article ${article.id}:`, e);
        failCount++;
      }
    }
  }
  
  loading.value = false;
  
  if (failCount === 0) {
    toastMessage.value = `Successfully archived ${successCount} articles`;
    toastType.value = 'success';
  } else {
    toastMessage.value = `Archived ${successCount} articles, failed to archive ${failCount} articles`;
    toastType.value = 'error';
  }
  showToast.value = true;
}

function getReasonLabel(reason: string): string {
  const reasonLabels: Record<string, string> = {
    'low_priority_score': 'Low priority score',
    'old_publication_date': 'Old publication date',
    'content_extraction_failed': 'Content extraction failed',
    'low_readability': 'Low readability',
    'low_information_density': 'Low information density',
    'low_topic_relevance': 'Low topic relevance',
    'long_term_neglect': 'Saved but never opened',
    'stale_interest': 'Not opened in over a year',
    'abandoned_reading': 'Multiple abandoned reading attempts',
    'missing_critical_metadata': 'Missing critical metadata'
  };
  
  return reasonLabels[reason] || reason;
}

function getReasonIcon(reason: string): string {
  const reasonIcons: Record<string, string> = {
    'low_priority_score': '⬇️',
    'old_publication_date': '📅',
    'content_extraction_failed': '❌',
    'low_readability': '📖',
    'low_information_density': '📊',
    'low_topic_relevance': '🔍',
    'long_term_neglect': '⏰',
    'stale_interest': '🕰️',
    'abandoned_reading': '🚫',
    'missing_critical_metadata': '📝'
  };
  
  return reasonIcons[reason] || '❓';
}

onMounted(() => {
  loadLowPriorityArticles();
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'var(--score-excellent, #4caf50)';
  if (score >= 6) return 'var(--score-good, #8bc34a)';
  if (score >= 4) return 'var(--score-average, #ffc107)';
  if (score >= 2) return 'var(--score-below-average, #ff9800)';
  return 'var(--score-poor, #f44336)';
}

function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null) return 'N/A';
  return score.toFixed(1);
}

function updateMinAgeDays(days: number) {
  minAgeDays.value = days;
  loadLowPriorityArticles();
}
</script>

<template>
  <div class="archive-fast-track">
    <div class="archive-header">
      <div class="header-content">
        <div>
          <h2 class="section-title">
            <span class="section-icon">🗑️</span>
            Archive Fast Track
          </h2>
          <p class="header-description">
            Articles that may not be worth your time - candidates for archiving without reading
          </p>
        </div>
        <div class="header-actions">
          <button 
            class="archive-all-button"
            :disabled="loading || articles.length === 0 || articles.every(a => archivedArticleIds.has(a.id))"
            @click="handleArchiveAll"
          >
            <span class="archive-icon">📥</span>
            Archive All
          </button>
          <button 
            class="reload-button"
            :disabled="loading"
            @click="loadLowPriorityArticles"
          >
            <span class="reload-icon">🔄</span>
            Refresh List
          </button>
        </div>
      </div>
      
      <div class="filter-options">
        <div class="filter-label">Minimum age:</div>
        <div class="age-filters">
          <button 
            class="age-filter-button" 
            :class="{ active: minAgeDays === 365 }"
            @click="updateMinAgeDays(365)"
          >
            1 Year
          </button>
          <button 
            class="age-filter-button" 
            :class="{ active: minAgeDays === 730 }"
            @click="updateMinAgeDays(730)"
          >
            2 Years
          </button>
          <button 
            class="age-filter-button" 
            :class="{ active: minAgeDays === 1095 }"
            @click="updateMinAgeDays(1095)"
          >
            3 Years
          </button>
          <button 
            class="age-filter-button" 
            :class="{ active: minAgeDays === 0 }"
            @click="updateMinAgeDays(0)"
          >
            Any Age
          </button>
        </div>
      </div>
      
      <div v-if="metadata" class="metadata-summary">
        <div class="metadata-item">
          <span class="metadata-label">Analyzed:</span>
          <span class="metadata-value">{{ metadata.total_processed }} articles</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Showing:</span>
          <span class="metadata-value">{{ metadata.returned_count }} archive candidates</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Min age:</span>
          <span class="metadata-value">{{ metadata.criteria.min_age_days }} days</span>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading archive candidates...
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>

    <template v-else-if="articles.length > 0">
      <div
        v-for="article in articles" 
        :key="article.id" 
        class="article-item"
        :class="{ archived: archivedArticleIds.has(article.id) }"
      >
        <div class="priority-badge" :style="{ background: getScoreColor(article.priority_score / 10) }">
          {{ formatScore(article.priority_score) }}
        </div>
        
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
          
          <div class="archive-reasons">
            <h4>Reasons to archive:</h4>
            <ul class="reasons-list">
              <li 
                v-for="reason in article.archive_reasons" 
                :key="reason"
                class="reason-item"
              >
                <span class="reason-icon">{{ getReasonIcon(reason) }}</span>
                <span class="reason-text">{{ getReasonLabel(reason) }}</span>
              </li>
            </ul>
          </div>
          
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
                v-if="!archivedArticleIds.has(article.id)"
                class="archive-button"
                title="Archive this article"
                @click="handleArchive(article.id)"
              >
                <span class="archive-icon">📥</span>
                Archive
              </button>
              <div 
                v-else
                class="archived-badge"
              >
                <span class="archived-icon">✓</span>
                Archived
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <div
      v-else
      class="no-articles"
    >
      No archive candidates found. Try adjusting the minimum age filter.
    </div>

    <ToastNotification
      v-if="showToast"
      :message="toastMessage"
      :type="toastType"
      @hide="showToast = false"
    />
  </div>
</template>

<style scoped>
.archive-fast-track {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.loading, .error, .no-articles {
  text-align: center;
  padding: 2rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
}

.error {
  color: #ff4444;
}

.archive-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.header-description {
  color: var(--text-muted, #888);
  font-size: 1.1rem;
  margin: 0;
}

.filter-options {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-label {
  font-size: 0.9rem;
  color: var(--text-muted, #888);
}

.age-filters {
  display: flex;
  gap: 0.5rem;
}

.age-filter-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--button-secondary-bg, #4a4a4a);
  color: #ffffff;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.age-filter-button:hover {
  background: var(--button-secondary-hover-bg, #5a5a5a);
}

.age-filter-button.active {
  background: var(--button-bg, #646cff);
}

.metadata-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadata-label {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
}

.metadata-value {
  font-size: 1.1rem;
  font-weight: 500;
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

.reload-button, .archive-all-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.reload-button {
  background: var(--button-bg, #646cff);
}

.reload-button:hover {
  background: var(--button-hover-bg, #535bf2);
}

.archive-all-button {
  background: var(--button-danger-bg, #f44336);
}

.archive-all-button:hover {
  background: var(--button-danger-hover-bg, #d32f2f);
}

.reload-button:disabled, .archive-all-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reload-icon, .archive-icon {
  font-size: 1.1rem;
}

.article-item {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  position: relative;
}

.article-item:hover {
  transform: translateY(-2px);
}

.article-item.archived {
  opacity: 0.7;
  background: var(--card-bg-muted, #ffffff05);
}

.priority-badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: var(--score-good, #8bc34a);
  color: white;
  font-weight: bold;
  font-size: 1.2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.2);
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

.archive-reasons {
  margin: 1.5rem 0;
}

.archive-reasons h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: var(--text-muted, #888);
}

.reasons-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--tag-bg, #ffffff1a);
  border-radius: 6px;
  font-size: 0.9rem;
}

.reason-icon {
  font-size: 1rem;
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

.archived-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--success-bg, #2e7d32);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
}

.archived-icon {
  font-size: 1rem;
}

@media (max-width: 640px) {
  .archive-fast-track {
    padding: 0.5rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .reload-button, .archive-all-button {
    width: 100%;
    justify-content: center;
  }

  .filter-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .age-filters {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .age-filter-button {
    flex: 1;
    text-align: center;
  }

  .metadata-summary {
    flex-direction: column;
    gap: 0.75rem;
  }

  .article-item {
    padding: 1rem;
    padding-top: 1.5rem;
  }

  .priority-badge {
    top: -10px;
    right: 10px;
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .article-header {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .thumbnail {
    width: 100%;
    height: 160px;
  }

  .reasons-list {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .reason-item {
    width: 100%;
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

  .source-link, .archive-button, .archived-badge {
    flex: 1;
    justify-content: center;
  }

  .source-link {
    background: #333333;
  }
}
</style> 