<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { PrioritizedArticle } from '../types/PrioritizedArticle';
import { fetchPrioritizedArticles, archiveArticle, shortlistArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import ArticleCard from './ArticleCard.vue';
import ListHeader from './ListHeader.vue';

const articles = ref<PrioritizedArticle[]>([]);
const metadata = ref<{
  total_processed: number;
  min_score: number;
  max_score: number;
  returned_count: number;
} | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

const formattedMetadata = computed(() => {
  if (!metadata.value) return null;
  
  return {
    'Analyzed': `${metadata.value.total_processed} articles`,
    'Score range': `${formatScore(metadata.value.min_score)} - ${formatScore(metadata.value.max_score)}`,
    'Showing': `Top ${metadata.value.returned_count} articles`
  };
});

async function loadPrioritizedArticles() {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchPrioritizedArticles();
    articles.value = data.articles;
    metadata.value = data.metadata;
    toastMessage.value = 'Prioritized articles loaded successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load prioritized articles';
    toastMessage.value = 'Failed to load prioritized articles';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Error fetching prioritized articles:', err);
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
  loadPrioritizedArticles();
});

function formatScore(score: number): string {
  return score.toFixed(1);
}
</script>

<template>
  <div class="prioritized-articles">
    <ListHeader
      title="Prioritized Articles"
      icon="🏆"
      description="Articles ranked by quality, relevance, and engagement metrics"
      :metadata="formattedMetadata"
      :show-refresh-button="true"
      :disable-refresh="loading"
      @refresh="loadPrioritizedArticles"
    />

    <div
      v-if="loading"
      class="loading"
    >
      Loading prioritized articles...
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
        :score-value="article.priority_score / 10"
        :show-scores="true"
        :component-scores="article.component_scores"
        @archive="handleArchive"
        @shortlist="handleShortlist"
      />
    </template>
    
    <div
      v-else
      class="no-articles"
    >
      No prioritized articles available.
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
.prioritized-articles {
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
  .prioritized-articles {
    padding: 0.5rem;
  }
}
</style> 