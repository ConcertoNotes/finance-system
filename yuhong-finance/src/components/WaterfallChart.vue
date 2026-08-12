<script setup>
import { computed } from 'vue'

const props = defineProps({
  base: { type: Object, required: true },
  increments: { type: Array, required: true },
  total: { type: Object, required: true },
})

const SLOT = 106
const BAR = 66
const TOP = 30
const BOTTOM = 40
const HEIGHT = 252

const bars = computed(() => {
  let cumulative = props.base.value
  const items = [{ type: 'base', label: props.base.label, display: props.base.value, start: 0, end: props.base.value }]
  for (const increment of props.increments) {
    items.push({ type: 'increment', label: increment.label, display: increment.amount, start: cumulative, end: cumulative + increment.amount })
    cumulative += increment.amount
  }
  items.push({ type: 'total', label: props.total.label, display: props.total.value, start: 0, end: props.total.value })
  return items
})

const width = computed(() => bars.value.length * SLOT + 14)
const chartHeight = HEIGHT - TOP - BOTTOM
const max = computed(() => props.total.value)

const y = (value) => TOP + chartHeight - (value / max.value) * chartHeight
const barX = (index) => 7 + index * SLOT + (SLOT - BAR) / 2

const fills = { base: '#186ade', increment: '#f59e0b', total: '#dc2626' }
const formatValue = (bar) => `${bar.type === 'increment' ? '+' : ''}${bar.display.toLocaleString('zh-CN')}`
</script>

<template>
  <svg class="waterfall-chart" :viewBox="`0 0 ${width} ${HEIGHT}`" role="img" aria-label="B 方案至 C 方案预算增量瀑布图">
    <line :x1="4" :y1="TOP + chartHeight" :x2="width - 4" :y2="TOP + chartHeight" class="waterfall-axis" />
    <template v-for="(bar, index) in bars" :key="bar.label">
      <line
        v-if="index < bars.length - 1"
        :x1="barX(index) + BAR"
        :y1="y(bar.end)"
        :x2="barX(index + 1)"
        :y2="y(bar.end)"
        class="waterfall-connector"
      />
      <rect
        :x="barX(index)"
        :y="y(bar.end)"
        :width="BAR"
        :height="Math.max(3, y(bar.start) - y(bar.end))"
        :fill="fills[bar.type]"
        :fill-opacity="bar.type === 'increment' ? 0.9 : 0.94"
        rx="3"
      />
      <text :x="barX(index) + BAR / 2" :y="y(bar.end) - 7" text-anchor="middle" class="waterfall-value">{{ formatValue(bar) }}</text>
      <text :x="barX(index) + BAR / 2" :y="TOP + chartHeight + 16" text-anchor="middle" class="waterfall-label">{{ bar.label }}</text>
    </template>
  </svg>
</template>
