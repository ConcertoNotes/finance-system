<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ChevronLeft, ChevronRight, Play, Sigma } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  profiles: { type: Array, required: true },
  weights: { type: Object, required: true },
  criteria: { type: Array, required: true },
})

const current = ref(0)
const playing = ref(false)
let timer

const paneCount = computed(() => props.criteria.length + 1)

// 逐维度展开：每一步展示该指标下三家供应商的「标准分 × 权重 = 加权分」
const steps = computed(() => props.criteria.map((criterion, index) => ({
  index: index + 1,
  ...criterion,
  weightValue: props.weights[criterion.key],
  items: props.profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    raw: profile[criterion.key],
    weighted: Math.round(profile[criterion.key] * props.weights[criterion.key] * 100) / 100,
  })),
})))

const totals = computed(() => props.profiles
  .map((profile) => ({
    id: profile.id,
    name: profile.name,
    position: profile.position,
    expression: props.criteria
      .map((criterion) => `${profile[criterion.key]}×${(props.weights[criterion.key] * 100).toFixed(0)}%`)
      .join(' + '),
    score: Math.round(props.criteria.reduce((sum, criterion) => sum + profile[criterion.key] * props.weights[criterion.key], 0) * 10) / 10,
  }))
  .sort((a, b) => b.score - a.score))

const activeStep = computed(() => (current.value < steps.value.length ? steps.value[current.value] : null))
const ranking = computed(() => totals.value.map((item) => `${item.id} ${item.score.toFixed(1)}分`).join(' > '))

// 累计到当前步为止的加权分，展示得分是如何一步步堆叠出来的
const runningTotals = computed(() => {
  const upto = current.value < steps.value.length ? current.value + 1 : steps.value.length
  return Object.fromEntries(props.profiles.map((profile) => [
    profile.id,
    Math.round(props.criteria.slice(0, upto).reduce((sum, criterion) => sum + profile[criterion.key] * props.weights[criterion.key], 0) * 100) / 100,
  ]))
})

function go(index) {
  current.value = Math.min(Math.max(index, 0), paneCount.value - 1)
}

function autoPlay() {
  if (playing.value) return
  playing.value = true
  current.value = 0
  timer = window.setInterval(() => {
    if (current.value >= paneCount.value - 1) {
      window.clearInterval(timer)
      playing.value = false
      return
    }
    current.value += 1
  }, 1300)
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="panel calc-steps-panel">
    <header class="panel-header">
      <div>
        <p class="section-index">SUMPRODUCT WALKTHROUGH</p>
        <h3>六维加权评分逐步演算</h3>
      </div>
      <div class="panel-actions">
        <button class="secondary-button" type="button" :disabled="playing" @click="autoPlay">
          <Play :size="14" />{{ playing ? '正在演算' : '自动逐步演算' }}
        </button>
      </div>
    </header>

    <div class="calc-step-nav">
      <button
        v-for="index in paneCount"
        :key="index"
        type="button"
        :class="{ active: current === index - 1, passed: current > index - 1 }"
        @click="go(index - 1)"
      >{{ index <= steps.length ? steps[index - 1].label : '综合排序' }}</button>
    </div>

    <div v-if="activeStep" class="calc-step-pane">
      <div class="calc-step-title">
        <strong>第{{ activeStep.index }}步：计算{{ activeStep.label }}加权分</strong>
        <StatusBadge :label="`权重 ${activeStep.weight}`" tone="info" />
        <StatusBadge v-if="activeStep.key === 'price'" label="仅按4类合同物资综合报价测算" tone="neutral" />
      </div>
      <code class="calc-step-formula">{{ activeStep.label }}加权分 = 指标标准分 × {{ activeStep.weight }}</code>
      <div class="calc-step-rows">
        <div v-for="item in activeStep.items" :key="item.id">
          <strong>{{ item.id }}<small>{{ item.name }}</small></strong>
          <code>{{ item.raw }} × {{ activeStep.weight }} = {{ item.weighted }} 分（累计 {{ runningTotals[item.id] }} 分）</code>
          <b>{{ item.weighted.toFixed(2) }}</b>
        </div>
      </div>
    </div>

    <div v-else class="calc-step-pane">
      <div class="calc-step-title">
        <strong>六项加权分求和形成综合得分</strong>
        <StatusBadge label="=SUMPRODUCT(指标标准分区域, 权重区域)" tone="info" />
      </div>
      <div class="calc-step-rows weighted">
        <div v-for="(item, index) in totals" :key="item.id" :class="{ winner: index === 0 }">
          <strong>{{ item.id }}<small>{{ item.position }}</small></strong>
          <code>{{ item.expression }}</code>
          <b>{{ item.score.toFixed(1) }} 分</b>
        </div>
      </div>
      <p class="calc-step-conclusion"><Sigma :size="14" /> 形成初始排序：{{ ranking }}。</p>
    </div>

    <footer class="calc-step-footer">
      <button class="secondary-button" type="button" :disabled="current === 0" @click="go(current - 1)">
        <ChevronLeft :size="15" />上一步
      </button>
      <span>{{ current + 1 }} / {{ paneCount }}</span>
      <button class="secondary-button" type="button" :disabled="current === paneCount - 1" @click="go(current + 1)">
        下一步<ChevronRight :size="15" />
      </button>
    </footer>
  </section>
</template>
