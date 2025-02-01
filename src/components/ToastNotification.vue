<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  message: string;
  type?: 'success' | 'error';
  duration?: number;
}>();

const visible = ref(false);

// Watch for message changes to show new toasts
watch(() => props.message, () => {
  if (props.message) {
    visible.value = true;
    setTimeout(() => {
      visible.value = false;
    }, props.duration || 3000);
  }
}, { immediate: true });
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="toast"
      :class="type"
    >
      <span class="toast-icon">{{ type === 'error' ? '❌' : '✅' }}</span>
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--toast-bg, #323232);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.toast.success {
  background: var(--success-bg, #2e7d32);
}

.toast.error {
  background: var(--error-bg, #d32f2f);
}

.toast-icon {
  font-size: 1.1rem;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style> 