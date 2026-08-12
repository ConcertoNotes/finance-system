<script setup>
import { AlertTriangle, CheckCircle2, Info } from '@lucide/vue'

defineProps({ toasts: { type: Array, default: () => [] } })
const icons = { success: CheckCircle2, warning: AlertTriangle, info: Info }
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="`toast-${toast.tone}`">
        <component :is="icons[toast.tone] || Info" :size="18" /><span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>
