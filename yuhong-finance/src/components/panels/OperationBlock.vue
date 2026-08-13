<script setup>
defineProps({
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  status: { type: String, default: 'locked' },
  doneLabel: { type: String, default: '已完成' },
})
</script>

<template>
  <section class="op-block" :class="status">
    <header class="op-head">
      <span class="op-state">
        <span v-if="status === 'done'">✓</span>
      </span>
      <h3 class="op-title">{{ title }}</h3>
      <span v-if="status === 'done'" class="op-badge done">{{ doneLabel }}</span>
      <span v-else-if="status === 'active'" class="op-badge active">待执行</span>
      <span v-else class="op-badge locked">未解锁</span>
    </header>

    <div class="op-body">
      <p v-if="hint && status !== 'locked'" class="op-hint">{{ hint }}</p>

      <div v-if="status !== 'locked'" class="op-controls">
        <slot />
      </div>
      <p v-else class="op-locked-text">完成上一项操作后解锁</p>

      <div v-if="status === 'done'" class="op-result">
        <slot name="result" />
      </div>
    </div>
  </section>
</template>
