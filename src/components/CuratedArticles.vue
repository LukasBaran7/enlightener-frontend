<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Article } from '../types/Article';
import { archiveArticle, shortlistArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
import ArticleCard from './ArticleCard.vue';
import ListHeader from './ListHeader.vue';

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
</script>

<template>
  <div class="curated-articles">
    <ListHeader
      title="Curated For You"
      icon="🎯"
      description="Personalized article suggestions based on your reading history"
      :show-refresh-button="true"
      :disable-refresh="loading"
      @refresh="reloadCurated"
    />

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
        
        <ArticleCard
          v-for="article in section" 
          :key="article.id" 
          :article="article"
          @archive="id => handleArchive(id, sectionKey)"
          @shortlist="id => handleShortlist(id, sectionKey)"
        />
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

@media (max-width: 640px) {
  .curated-articles {
    padding: 0.5rem;
  }

  .section-title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}
</style> 