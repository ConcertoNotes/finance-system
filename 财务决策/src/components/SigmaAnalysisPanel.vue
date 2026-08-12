<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { CheckCircle2, FunctionSquare, RotateCcw } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import { calculateSigmaAnalysis } from '../domain/emergency.js'

const props = defineProps({ grids: { type: Array, required: true } })

const analysis = computed(() => calculateSigmaAnalysis(props.grids))
const steps = computed(() => [
  {
    id: 1,
    title: '计算累计降雨量均值',
    tool: 'AVERAGE',
    formula: '=AVERAGE(I2:I10)',
    result: `均值 ${analysis.value.mean} mm`,
  },
  {
    id: 2,
    title: '计算样本标准差',
    tool: 'STDEV.S',
    formula: '=STDEV.S(I2:I10)',
    result: `标准差 ${analysis.value.stdev} mm`,
  },
  {
    id: 3,
    title: '计算 3σ 上下限',
    tool: '3σ 原则',
    formula: '上限 M3 = 均值 + 3×标准差 ｜ 下限 M4 = 均值 − 3×标准差',
    result: `上限 ${analysis.value.upper} mm ｜ 下限 ${analysis.value.lower} mm`,
  },
  {
    id: 4,
    title: '逐网格标记异常值，条件格式标红',
    tool: 'IF + OR',
    formula: '=IF(OR(I2>$M$3,I2<$M$4),"异常","正常")',
    result: `超出 3σ 范围异常值 ${analysis.value.outlierCount} 个`,
  },
])

const revealed = ref(4)
const playing = ref(false)
let timer

function replay() {
  if (playing.value) return
  playing.value = true
  revealed.value = 0
  timer = window.setInterval(() => {
    revealed.value += 1
    if (revealed.value >= steps.value.length) {
      window.clearInterval(timer)
      playing.value = false
    }
  }, 850)
}

const focusText = computed(() =>
  analysis.value.focusRows.map((row) => `${row.id} 降雨 ${row.rainfall}mm`).join('、'))

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="panel sigma-panel">
    <header class="panel-header">
      <div>
        <p class="section-index">3σ OUTLIER AUDIT</p>
        <h3>第四步 · 3σ 异常检测演算过程</h3>
      </div>
      <div class="panel-actions">
        <StatusBadge :label="`异常 ${analysis.outlierCount} 个`" :tone="analysis.outlierCount ? 'danger' : 'success'" dot />
        <button class="secondary-button" type="button" :disabled="playing" @click="replay">
          <RotateCcw :size="15" :class="{ spinning: playing }" />{{ playing ? '正在演算' : '重新逐步演算' }}
        </button>
      </div>
    </header>
    <div class="sigma-steps">
      <article
        v-for="(step, index) in steps"
        :key="step.id"
        class="sigma-step"
        :class="{ revealed: index < revealed, waiting: index >= revealed }"
      >
        <span class="sigma-step-no">{{ String(step.id).padStart(2, '0') }}</span>
        <div class="sigma-step-body">
          <div class="sigma-step-head">
            <strong>{{ step.title }}</strong>
            <StatusBadge :label="step.tool" tone="info" />
          </div>
          <code><FunctionSquare :size="13" />{{ step.formula }}</code>
          <b v-if="index < revealed">{{ step.result }}</b>
          <b v-else class="pending-result">待执行…</b>
        </div>
        <CheckCircle2 v-if="index < revealed" :size="17" class="sigma-step-check" />
      </article>
    </div>
    <div v-if="revealed >= steps.length" class="sigma-verdicts">
      <span
        v-for="row in analysis.rows"
        :key="row.id"
        class="sigma-chip"
        :class="{ focus: row.focus, outlier: row.outlier }"
      >{{ row.id }} · {{ row.rainfall }}mm · {{ row.outlier ? '异常' : row.focus ? '重点关注' : '正常' }}</span>
    </div>
    <p v-if="revealed >= steps.length" class="sigma-conclusion">
      经校验，{{ focusText }}略高于均值但仍在 3σ 范围内，属于真实灾情数据，保留并标记为重点关注。
    </p>
  </section>
</template>
