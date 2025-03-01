<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { LlmAnalyzedArticle } from '../types/LlmAnalyzedArticle';
import { fetchLlmRecommendedArticles, archiveArticle, shortlistArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import ArticleCard from './ArticleCard.vue';
import ListHeader from './ListHeader.vue';

const articles = ref<LlmAnalyzedArticle[]>([]);
const metadata = ref<{
  count: number;
} | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

const formattedMetadata = computed(() => {
  if (!metadata.value) return null;
  
  return {
    'Showing': `${metadata.value.count} AI-analyzed articles`
  };
});

async function loadLlmRecommendedArticles() {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchLlmRecommendedArticles();
    articles.value = data.articles;
    metadata.value = { count: data.count };
    toastMessage.value = 'LLM recommended articles loaded successfully';
    toastType.value = 'success';
    showToast.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load LLM recommended articles';
    toastMessage.value = 'Failed to load LLM recommended articles';
    toastType.value = 'error';
    showToast.value = true;
    console.error('Error fetching LLM recommended articles:', err);
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
  loadLlmRecommendedArticles();
});
</script>

<template>
  <div class="llm-recommendations">
    <ListHeader
      title="AI-Powered Reading Recommendations"
      icon="🧠"
      description="Articles analyzed by AI for information density, practical value, and uniqueness"
      :metadata="formattedMetadata"
      :show-refresh-button="true"
      :disable-refresh="loading"
      @refresh="loadLlmRecommendedArticles"
    />

    <div
      v-if="loading"
      class="loading"
    >
      Loading AI recommendations...
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
        @archive="handleArchive"
        @shortlist="handleShortlist"
      />
    </template>
    
    <div
      v-else
      class="no-articles"
    >
      No AI-analyzed articles available.
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
.llm-recommendations {
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
  .llm-recommendations {
    padding: 0.5rem;
  }
}
</style> 