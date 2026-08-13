<script setup>
defineProps({
  title: { type: String, required: true },
  source: { type: String, default: '' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <section class="panel calc-panel">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <span v-if="source" class="panel-source">{{ source }}</span>
    </div>
    <div class="panel-body">
      <p v-if="hint" class="calc-hint">{{ hint }}</p>
      <slot />
    </div>
  </section>
</template>
