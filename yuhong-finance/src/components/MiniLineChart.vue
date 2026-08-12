<script setup>
import { computed } from 'vue'

const props = defineProps({ values: { type: Array, required: true }, color: { type: String, default: '#55b7df' }, height: { type: Number, default: 120 } })
const width = 320
const points = computed(() => {
  const min = Math.min(...props.values)
  const max = Math.max(...props.values)
  const span = max - min || 1
  return props.values.map((value, index) => {
    const x = (index / Math.max(props.values.length - 1, 1)) * width
    const y = props.height - 10 - ((value - min) / span) * (props.height - 24)
    return `${x},${y}`
  }).join(' ')
})
</script>

<template>
  <svg class="mini-line-chart" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" role="img" aria-label="趋势图">
    <line v-for="n in 4" :key="n" x1="0" :x2="width" :y1="n * height / 5" :y2="n * height / 5" class="chart-gridline" />
    <polyline :points="points" fill="none" :stroke="color" stroke-width="3" vector-effect="non-scaling-stroke" />
  </svg>
</template>
