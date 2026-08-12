<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle, Check, Play, RotateCcw, Sigma } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import { formatCurrency } from '../domain/finance.js'

const props = defineProps({
  quotes: { type: Array, required: true },
  model: { type: Object, required: true },
  solution: { type: Object, required: true },
})
const emit = defineEmits(['toast'])

const demand = computed(() => props.model.demand)
const s1 = computed(() => props.quotes.find((quote) => quote.id === 'S1'))
const s3 = computed(() => props.quotes.find((quote) => quote.id === 'S3'))

const x1 = ref(props.model.demand)
const solving = ref(false)
let timer

const x3 = computed(() => Math.max(0, demand.value - x1.value))
const y1 = computed(() => (x1.value > 0 ? 1 : 0))
const y3 = computed(() => (x3.value > 0 ? 1 : 0))

const goodsCost = computed(() => x1.value * s1.value.price + x3.value * s3.value.price)
const fixedCost = computed(() => y1.value * s1.value.fixedCost + y3.value * s3.value.fixedCost)
const totalCost = computed(() => goodsCost.value + fixedCost.value)

const capacityOk = computed(() => x1.value <= s1.value.capacity && x3.value <= s3.value.capacity)
const deadlineOk = computed(() =>
  (y1.value === 0 || s1.value.arrivalHours <= 12) && (y3.value === 0 || s3.value.arrivalHours <= 12))
const feasible = computed(() => capacityOk.value && deadlineOk.value)
const isOptimal = computed(() => feasible.value && totalCost.value === props.solution.cost)
const gapToBest = computed(() => Math.round((totalCost.value - props.solution.cost) * 100) / 100)

// 到货时间取所启用供应商中的最慢者，全部未启用时视为0
const arrivalHours = computed(() => Math.max(
  y1.value ? s1.value.arrivalHours : 0,
  y3.value ? s3.value.arrivalHours : 0,
))

const expression = computed(() =>
  `Z = ${s1.value.price}×${x1.value} + ${s3.value.price}×${x3.value} + ${s1.value.fixedCost}×${y1.value} + ${s3.value.fixedCost}×${y3.value}`)

const constraintChecks = computed(() => [
  { label: `x1 + x3 = ${demand.value}`, value: `${x1.value} + ${x3.value} = ${x1.value + x3.value}`, pass: x1.value + x3.value === demand.value },
  { label: `0 ≤ x1 ≤ ${s1.value.capacity}·y1`, value: `x1 = ${x1.value}，上限 ${s1.value.capacity * y1.value}`, pass: x1.value <= s1.value.capacity * y1.value || x1.value === 0 },
  { label: `0 ≤ x3 ≤ ${s3.value.capacity}·y3`, value: `x3 = ${x3.value}，上限 ${s3.value.capacity * y3.value}`, pass: x3.value <= s3.value.capacity * y3.value || x3.value === 0 },
  { label: '到货时间 ≤ 12小时', value: `实际最迟 ${arrivalHours.value} 小时`, pass: deadlineOk.value },
])

function applyCombo(nextX1) {
  x1.value = Math.min(Math.max(nextX1, 0), demand.value)
}

// 逐步逼近最优解，让求解过程在界面上可见
function runSolver() {
  if (solving.value) return
  const target = props.solution.allocation?.S1 ?? 0
  if (x1.value === target) {
    emit('toast', `当前已是规划求解最优解 x1=${target}、x3=${demand.value - target}`)
    return
  }
  solving.value = true
  const stepSize = x1.value < target ? 10 : -10
  timer = window.setInterval(() => {
    const next = x1.value + stepSize
    const reached = stepSize > 0 ? next >= target : next <= target
    x1.value = reached ? target : next
    if (reached) {
      window.clearInterval(timer)
      solving.value = false
      emit('toast', `规划求解完成：x1=${target}、x3=${demand.value - target}、y1=${target > 0 ? 1 : 0}、y3=${demand.value - target > 0 ? 1 : 0}，最低综合成本 ${formatCurrency(props.solution.cost)}`)
    }
  }, 90)
}

function reset() {
  window.clearInterval(timer)
  solving.value = false
  x1.value = demand.value
}

watch(demand, (value) => { x1.value = Math.min(x1.value, value) })
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <section class="panel solver-panel">
    <header class="panel-header">
      <div>
        <p class="section-index">MIXED INTEGER PROGRAMMING</p>
        <h3>分单组合优化模型（Excel 规划求解）</h3>
      </div>
      <div class="panel-actions">
        <StatusBadge :label="isOptimal ? '当前为最优解' : `高于最优 ${formatCurrency(gapToBest)}`" :tone="isOptimal ? 'success' : 'warning'" dot />
        <button class="secondary-button" type="button" @click="reset"><RotateCcw :size="14" />重置</button>
        <button class="primary-button" type="button" :disabled="solving" @click="runSolver">
          <Play :size="15" />{{ solving ? '求解中…' : '运行规划求解' }}
        </button>
      </div>
    </header>

    <div class="solver-model">
      <div>
        <span>目标函数</span>
        <code>{{ model.objective }}</code>
      </div>
      <div>
        <span>决策变量</span>
        <p>{{ model.variables }}</p>
      </div>
      <div>
        <span>固定成本口径</span>
        <p>{{ model.fixedCostNote }}</p>
      </div>
    </div>

    <div class="solver-controls">
      <label>
        <div>
          <span>向 S1 采购数量 x1</span>
          <strong>{{ x1 }} 顶</strong>
        </div>
        <input v-model.number="x1" type="range" min="0" :max="demand" step="10" :disabled="solving" />
      </label>
      <div class="solver-vars">
        <div><span>x1</span><strong>{{ x1 }}</strong></div>
        <div><span>x3</span><strong>{{ x3 }}</strong></div>
        <div :class="{ on: y1 === 1 }"><span>y1</span><strong>{{ y1 }}</strong></div>
        <div :class="{ on: y3 === 1 }"><span>y3</span><strong>{{ y3 }}</strong></div>
      </div>
      <div class="solver-quick">
        <button v-for="combo in model.combos" :key="combo.id" type="button" :class="{ active: x1 === combo.s1 }" :disabled="solving" @click="applyCombo(combo.s1)">
          方案{{ combo.id }}
        </button>
      </div>
    </div>

    <div class="solver-breakdown">
      <div><span>S1 货物成本</span><strong>{{ formatCurrency(x1 * s1.price) }}</strong><small>{{ x1 }} × {{ s1.price }} 元/顶</small></div>
      <div><span>S3 货物成本</span><strong>{{ formatCurrency(x3 * s3.price) }}</strong><small>{{ x3 }} × {{ s3.price }} 元/顶</small></div>
      <div :class="{ muted: y1 === 0 }"><span>S1 订单级固定成本</span><strong>{{ formatCurrency(y1 * s1.fixedCost) }}</strong><small>车辆 {{ s1.vehicleExtra }} + 人工 {{ s1.laborExtra }}，y1={{ y1 }}</small></div>
      <div :class="{ muted: y3 === 0 }"><span>S3 订单级固定成本</span><strong>{{ formatCurrency(y3 * s3.fixedCost) }}</strong><small>车辆 {{ s3.vehicleExtra }} + 人工 {{ s3.laborExtra }}，y3={{ y3 }}</small></div>
      <div class="solver-total" :class="{ optimal: isOptimal, infeasible: !feasible }">
        <span>综合成本 Z</span>
        <strong>{{ formatCurrency(totalCost) }}</strong>
        <small>{{ expression }}</small>
      </div>
    </div>

    <div class="solver-constraints">
      <div v-for="check in constraintChecks" :key="check.label" :class="{ fail: !check.pass }">
        <Check v-if="check.pass" :size="14" />
        <AlertTriangle v-else :size="14" />
        <strong>{{ check.label }}</strong>
        <span>{{ check.value }}</span>
      </div>
    </div>

    <p class="solver-note">
      <Sigma :size="14" />
      {{ model.solverNote }}。规划求解结果 x1={{ solution.x1 }}、x3={{ solution.x3 }}、y1={{ solution.y1 }}、y3={{ solution.y3 }}，
      综合成本 {{ formatCurrency(solution.cost) }}，相较全部选择 S3 节约 {{ formatCurrency(solution.saving) }}；
      S1 虽比 S3 晚 2 小时到达，但 8 小时仍满足 12 小时保障时限。
    </p>
  </section>
</template>
