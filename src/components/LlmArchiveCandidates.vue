<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { LlmAnalyzedArticle } from '../types/LlmAnalyzedArticle';
import { fetchLlmArchiveCandidates, archiveArticle } from '../api/articles';
import ToastNotification from './ToastNotification.vue';
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
</script>

<template>
  <div class="llm-archive-candidates">
    <div class="archive-header">
      <div class="header-content">
        <div>
          <h2 class="section-title">
            <span class="section-icon">🤖</span>
            AI-Suggested Archive Candidates
          </h2>
          <p class="header-description">
            Articles that AI suggests you can skip - low value content identified by deep analysis
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
            @click="loadLlmArchiveCandidates"
          >
            <span class="reload-icon">🔄</span>
            Refresh List
          </button>
        </div>
      </div>
      
      <div v-if="metadata" class="metadata-summary">
        <div class="metadata-item">
          <span class="metadata-label">Showing:</span>
          <span class="metadata-value">{{ metadata.count }} archive candidates</span>
        </div>
      </div>
    </div>

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
      <div
        v-for="article in articles" 
        :key="article.id" 
        class="article-item"
        :class="{ archived: archivedArticleIds.has(article.id) }"
      >
        <div class="llm-score-badge" :style="{ background: getScoreColor(article.llm_score) }">
          {{ formatScore(article.llm_score) }}
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
          
          <div 
            class="llm-recommendation" 
            :class="getRecommendationClass(article.llm_recommendation)"
          >
            <span class="recommendation-icon">{{ getRecommendationIcon(article.llm_recommendation) }}</span>
            <span class="recommendation-text">{{ article.llm_recommendation }}</span>
          </div>
          
          <p
            v-if="article.llm_analysis"
            class="llm-analysis"
          >
            {{ article.llm_analysis }}
          </p>
          
          <div class="score-grid">
            <div 
              v-for="(score, metric) in article.llm_component_scores" 
              :key="metric"
              class="score-item"
            >
              <div class="score-label">{{ metric.replace('_', ' ') }}</div>
              <div class="score-bar-container">
                <div 
                  class="score-bar" 
                  :style="{ 
                    width: `${score * 10}%`,
                    background: getScoreColor(score * 10)
                  }"
                ></div>
              </div>
              <div class="score-value" :style="{ color: getScoreColor(score * 10) }">
                {{ score }}
              </div>
            </div>
          </div>
          
          <div class="article-meta">
            <div class="reading-info">
              <time>Saved {{ formatDate(article.saved_at) }}</time>
              <div v-if="article.analyzed_at" class="analyzed-at">
                Analyzed {{ formatDate(article.analyzed_at) }}
              </div>
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

.llm-score-badge {
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

.llm-recommendation {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-weight: 500;
}

.llm-recommendation.read {
  background: var(--success-bg-light, rgba(76, 175, 80, 0.1));
  border-left: 4px solid var(--success-color, #4caf50);
  color: var(--success-color, #4caf50);
}

.llm-recommendation.skip {
  background: var(--warning-bg-light, rgba(255, 152, 0, 0.1));
  border-left: 4px solid var(--warning-color, #ff9800);
  color: var(--warning-color, #ff9800);
}

.recommendation-icon {
  font-size: 1.2rem;
}

.llm-analysis {
  color: var(--text-secondary, #888);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0.75rem 0 1.5rem 0;
  padding: 0.75rem;
  background: var(--card-bg-secondary, #ffffff05);
  border-radius: 8px;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.score-label {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  text-transform: capitalize;
}

.score-bar-container {
  height: 8px;
  background: var(--bar-bg, #ffffff1a);
  border-radius: 4px;
  overflow: hidden;
}

.score-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.score-value {
  font-size: 0.9rem;
  font-weight: 500;
  align-self: flex-end;
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

.analyzed-at {
  font-style: italic;
  font-size: 0.85rem;
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
  .llm-archive-candidates {
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

  .metadata-summary {
    flex-direction: column;
    gap: 0.75rem;
  }

  .article-item {
    padding: 1rem;
    padding-top: 1.5rem;
  }

  .llm-score-badge {
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

  .score-grid {
    grid-template-columns: 1fr 1fr;
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