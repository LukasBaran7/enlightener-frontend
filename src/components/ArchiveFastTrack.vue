<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { PrioritizedArticle } from '../types/PrioritizedArticle';
import { fetchLowPriorityArticles, archiveArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import ArticleCard from './ArticleCard.vue';
import ListHeader from './ListHeader.vue';

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

const formattedMetadata = computed(() => {
  if (!metadata.value) return null;
  
  return {
    'Analyzed': `${metadata.value.total_processed} articles`,
    'Showing': `${metadata.value.returned_count} archive candidates`,
    'Min age': `${metadata.value.criteria.min_age_days} days`
  };
});

const canArchiveAll = computed(() => {
  return !loading.value && 
         articles.value.length > 0 && 
         !articles.value.every(a => archivedArticleIds.value.has(a.id));
});

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

// Add a computed function to check if an article is archived
function isArticleArchived(articleId: string): boolean {
  return archivedArticleIds.value.has(articleId);
}

onMounted(() => {
  loadLowPriorityArticles();
});

function updateMinAgeDays(days: number) {
  minAgeDays.value = days;
  loadLowPriorityArticles();
}
</script>

<template>
  <div class="archive-fast-track">
    <ListHeader
      title="Archive Fast Track"
      icon="🗑️"
      description="Articles that may not be worth your time - candidates for archiving without reading"
      :metadata="formattedMetadata || {}"
      :show-refresh-button="true"
      :show-archive-all-button="true"
      :disable-refresh="loading"
      :disable-archive-all="!canArchiveAll"
      @refresh="loadLowPriorityArticles"
      @archive-all="handleArchiveAll"
    />
    
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
      >
        <ArticleCard
          :article="article"
          :show-score="true"
          :score-value="article.priority_score / 10"
          :archived="isArticleArchived(article.id)"
          @archive="handleArchive"
        />
        
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

.filter-options {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
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

.article-item {
  margin-bottom: 2rem;
}

.archive-reasons {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
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

@media (max-width: 640px) {
  .archive-fast-track {
    padding: 0.5rem;
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

  .reasons-list {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .reason-item {
    width: 100%;
  }
}
</style> 