<script setup lang="ts">
defineProps<{
  title: string;
  icon: string;
  description?: string;
  showRefreshButton?: boolean;
  showArchiveAllButton?: boolean;
  disableRefresh?: boolean;
  disableArchiveAll?: boolean;
  metadata?: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'archiveAll'): void;
}>();

function handleRefresh() {
  emit('refresh');
}

function handleArchiveAll() {
  emit('archiveAll');
}
</script>

<template>
  <div class="list-header">
    <div class="header-content">
      <div>
        <h2 class="section-title">
          <span class="section-icon">{{ icon }}</span>
          {{ title }}
        </h2>
        <p 
          v-if="description"
          class="header-description"
        >
          {{ description }}
        </p>
      </div>
      <div class="header-actions">
        <button 
          v-if="showArchiveAllButton"
          class="archive-all-button"
          :disabled="disableArchiveAll"
          @click="handleArchiveAll"
        >
          <span class="archive-icon">📥</span>
          Archive All
        </button>
        <button 
          v-if="showRefreshButton"
          class="reload-button"
          :disabled="disableRefresh"
          @click="handleRefresh"
        >
          <span class="reload-icon">🔄</span>
          {{ showArchiveAllButton ? 'Refresh List' : 'Refresh' }}
        </button>
      </div>
    </div>
    
    <div v-if="metadata" class="metadata-summary">
      <div 
        v-for="(value, key) in metadata" 
        :key="key"
        class="metadata-item"
      >
        <span class="metadata-label">{{ key }}:</span>
        <span class="metadata-value">{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-header {
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
  text-transform: capitalize;
}

.metadata-value {
  font-size: 1.1rem;
  font-weight: 500;
}

@media (max-width: 640px) {
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
}
</style> 