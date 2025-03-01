<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { LlmAnalyzedArticle } from '../types/LlmAnalyzedArticle';
import { fetchLlmArchiveCandidates, archiveArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import ArticleCard from './ArticleCard.vue';
import ListHeader from './ListHeader.vue';
import { calculateReadingTime } from '../types/Article';

const articles = ref<LlmAnalyzedArticle[]>([]);
const metadata = ref<{
  count: number;
} | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

// Track which articles have been archived
const archivedArticleIds = ref<Set<string>>(new Set());

const formattedMetadata = computed(() => {
  if (!metadata.value) return null;
  
  return {
    'Showing': `${metadata.value.count} archive candidates`
  };
});

const canArchiveAll = computed(() => {
  return !loading.value && 
         articles.value.length > 0 && 
         !articles.value.every(a => archivedArticleIds.value.has(a.id));
});

async function loadLlmArchiveCandidates() {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchLlmArchiveCandidates();
    articles.value = data.articles;
    metadata.value = { count: data.count };
    toastMessage.value = 'LLM archive candidates loaded successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load LLM archive candidates';
    toastMessage.value = 'Failed to load LLM archive candidates';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Error fetching LLM archive candidates:', err);
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

onMounted(() => {
  loadLlmArchiveCandidates();
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--score-excellent, #4caf50)';
  if (score >= 60) return 'var(--score-good, #8bc34a)';
  if (score >= 40) return 'var(--score-average, #ffc107)';
  if (score >= 20) return 'var(--score-below-average, #ff9800)';
  return 'var(--score-poor, #f44336)';
}

function formatScore(score: number): string {
  return score.toFixed(0);
}

function getRecommendationClass(recommendation: string): string {
  if (recommendation.startsWith('READ')) return 'read';
  return 'skip';
}

function getRecommendationIcon(recommendation: string): string {
  if (recommendation.startsWith('READ')) return '✅';
  return '⏭️';
}

// Add a function to check if an article is archived
function isArticleArchived(articleId: string): boolean {
  return archivedArticleIds.value.has(articleId);
}
</script>

<template>
  <div class="llm-archive-candidates">
    <ListHeader
      title="AI-Suggested Archive Candidates"
      icon="🤖"
      description="Articles that AI suggests you can skip - low value content identified by deep analysis"
      :metadata="formattedMetadata || {}"
      :show-refresh-button="true"
      :show-archive-all-button="true"
      :disable-refresh="loading"
      :disable-archive-all="!canArchiveAll"
      @refresh="loadLlmArchiveCandidates"
      @archive-all="handleArchiveAll"
    />

    <div
      v-if="loading"
      class="loading"
    >
      Loading AI archive candidates...
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>

    <template v-else-if="articles.length > 0">
      <ArticleCard
        v-for="article in articles" 
        :key="article.id" 
        :article="article"
        :show-score="true"
        :score-value="article.llm_score"
        :show-recommendation="true"
        :recommendation="article.llm_recommendation"
        :show-analysis="true"
        :analysis="article.llm_analysis"
        :show-scores="true"
        :component-scores="article.llm_component_scores"
        :archived="isArticleArchived(article.id)"
        @archive="handleArchive"
      />
    </template>
    
    <div
      v-else
      class="no-articles"
    >
      No AI-suggested archive candidates found.
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
.llm-archive-candidates {
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

@media (max-width: 640px) {
  .llm-archive-candidates {
    padding: 0.5rem;
  }
}
</style> 