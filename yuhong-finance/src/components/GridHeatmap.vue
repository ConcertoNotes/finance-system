<script setup>
import { getGridRiskScore } from '../domain/emergency.js'

defineProps({ grids: { type: Array, required: true }, selectedId: String })
defineEmits(['select'])

function riskMeta(grid) {
  if (grid.roadBlocked || grid.waterLevel >= 5) return { label: '高风险', tone: 'danger', color: '#ef4444' }
  if (grid.waterLevel >= 3.5 || grid.rainfall >= 120) return { label: '重点关注', tone: 'warning', color: '#f59e0b' }
  return { label: '运行平稳', tone: 'safe', color: '#00b4d8' }
}
</script>

<template>
  <div class="grid-heatmap">
    <button
      v-for="grid in grids"
      :key="grid.id"
      type="button"
      :class="[{ selected: selectedId === grid.id, blocked: grid.roadBlocked }, `risk-${riskMeta(grid).tone}`]"
      :style="{ '--risk': `${Math.min(0.9, 0.22 + getGridRiskScore(grid) / 5000)}`, '--risk-color': riskMeta(grid).color }"
      @click="$emit('select', grid.id)"
    >
      <span class="grid-card-status"><i />{{ riskMeta(grid).label }}</span>
      <span class="grid-card-id">{{ grid.id }}</span>
      <strong>{{ grid.affected.toLocaleString() }}<small> 人</small></strong>
      <span class="grid-card-name">{{ grid.name }}</span>
      <span class="grid-card-people"><b>被困 {{ grid.trapped }}</b><b>转移 {{ grid.relocated.toLocaleString() }}</b></span>
      <span class="grid-card-water">水位 {{ grid.waterLevel }} m · 降雨 {{ grid.rainfall }} mm</span>
    </button>
  </div>
</template>
