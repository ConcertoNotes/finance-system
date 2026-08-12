<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ChevronLeft, ChevronRight, Play, Sigma } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import { buildInsuranceCalcSteps } from '../domain/finance.js'

const props = defineProps({
  products: { type: Array, required: true },
  weights: { type: Object, required: true },
})

const calc = computed(() => buildInsuranceCalcSteps(props.products, props.weights))
const paneCount = computed(() => calc.value.steps.length + 1)
const current = ref(0)
const playing = ref(false)
let timer

const typeLabel = { cost: '成本型 · 越低越优', benefit: '效益型 · 越高越优', fixed: '分档赋值' }
const typeFormula = {
  cost: '成本型指标标准分 =（最大值 − 本方案值）÷（最大值 − 最小值）× 100',
  benefit: '效益型指标标准分 =（本方案值 − 最小值）÷（最大值 − 最小值）× 100',
  fixed: '承保范围分档赋值：明确承保100分 / 一般条款80分 / 需补充协议60分 / 表述不明确40分 / 不承保0分',
}

const activeStep = computed(() => (current.value < calc.value.steps.length ? calc.value.steps[current.value] : null))
const ranking = computed(() =>
  calc.value.weighted.map((item) => `保险${item.id} ${item.score.toFixed(2)}分`).join(' > '))

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
  }, 1400)
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="panel calc-steps-panel">
    <header class="panel-header">
      <div>
        <p class="section-index">STANDARDIZATION WALKTHROUGH</p>
        <h3>八步标准分演算 + 加权评分过程</h3>
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
      >{{ index <= calc.steps.length ? `第${index}步` : '加权评分' }}</button>
    </div>

    <div v-if="activeStep" class="calc-step-pane">
      <div class="calc-step-title">
        <strong>第{{ activeStep.index }}步：计算{{ activeStep.label }}标准分</strong>
        <StatusBadge :label="typeLabel[activeStep.type]" :tone="activeStep.type === 'benefit' ? 'success' : activeStep.type === 'cost' ? 'warning' : 'info'" />
        <StatusBadge :label="`权重 ${(activeStep.weight * 100).toFixed(0)}%`" tone="neutral" />
      </div>
      <code class="calc-step-formula">{{ typeFormula[activeStep.type] }}</code>
      <p v-if="activeStep.type !== 'fixed'" class="calc-step-bounds">
        三款产品{{ activeStep.label }}最小值 {{ activeStep.min }}{{ activeStep.unit }}、最大值 {{ activeStep.max }}{{ activeStep.unit }}
      </p>
      <div class="calc-step-rows">
        <div v-for="item in activeStep.items" :key="item.id">
          <strong>保险{{ item.id }}<small>{{ item.name }}</small></strong>
          <code>{{ item.expression }}</code>
          <b>{{ item.score.toFixed(2) }} 分</b>
        </div>
      </div>
    </div>

    <div v-else class="calc-step-pane">
      <div class="calc-step-title">
        <strong>进行加权评分——八项标准分 × 指标权重求和</strong>
        <StatusBadge label="SUMPRODUCT" tone="info" />
      </div>
      <div class="calc-step-rows weighted">
        <div v-for="(item, index) in calc.weighted" :key="item.id" :class="{ winner: index === 0 }">
          <strong>保险{{ item.id }}<small>{{ item.name }}</small></strong>
          <code>{{ item.expression }}</code>
          <b>{{ item.score.toFixed(2) }} 分</b>
        </div>
      </div>
      <p class="calc-step-conclusion"><Sigma :size="14" /> 形成产品排序：{{ ranking }}。</p>
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
