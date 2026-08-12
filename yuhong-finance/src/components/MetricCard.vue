<script setup>
defineProps({
  label: String,
  value: [String, Number],
  unit: String,
  detail: String,
  trend: String,
  tone: { type: String, default: 'cyan' },
  icon: [Object, Function],
})
</script>

<template>
  <article class="metric-card" :class="`tone-${tone}`">
    <div class="metric-card__top">
      <span>{{ label }}</span>
      <component :is="icon" v-if="icon" :size="18" />
    </div>
    <div class="metric-card__value"><strong>{{ value }}</strong><span v-if="unit">{{ unit }}</span></div>
    <div class="metric-card__detail"><span>{{ detail }}</span><b v-if="trend">{{ trend }}</b></div>
  </article>
</template>
