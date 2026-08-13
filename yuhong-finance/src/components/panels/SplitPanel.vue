<script setup>
// 应急采购管理系统 · S2 库存异常与紧急分单。登录后从左侧菜单逐级进入功能页办理。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import {
  changeOrder,
  emergencyQuotes,
  gridTransfers,
  incident,
  initialContract,
  shelterPlan,
  splitModel,
} from '../../data/procurement.js'
import {
  buildEmergencyQuotes,
  calculateChangeImpact,
  calculateContractAmount,
  evaluateSplit,
  solveSplitModel,
} from '../../domain/procurement.js'
import { money, num, percent, signedPercent } from '../../domain/format.js'

const PAGES = [
  'verify',
  'impact',
  'gridImpact',
  'transferable',
  'pause',
  'inquiry',
  'fixed',
  'model',
  'solve',
  'plan',
  'decision',
  'change',
  'emergency',
  'recost',
  'reoccupy',
  'payRules',
  'dispatch',
]
const flow = useTaskFlow('s2-t5', PAGES)
const store = useFormPersist('s2-t5')

const menu = [
  {
    id: 'm-inv',
    label: '库存管理',
    children: [
      {
        id: 'm-inv-alert',
        label: '异常监测',
        children: [{ id: 'verify', label: '库存异常核验' }],
      },
      {
        id: 'm-inv-impact',
        label: '影响分析',
        children: [
          { id: 'impact', label: '合同影响测算' },
          { id: 'gridImpact', label: '网格保障影响' },
        ],
      },
      {
        id: 'm-inv-transfer',
        label: '可调拨资源',
        children: [{ id: 'transferable', label: '可调拨核验' }],
      },
    ],
  },
  {
    id: 'm-exec',
    label: '采购执行',
    children: [
      {
        id: 'm-exec-contract',
        label: '合同执行',
        children: [{ id: 'pause', label: '暂停供货' }],
      },
      {
        id: 'm-exec-inquiry',
        label: '紧急询价',
        children: [
          { id: 'inquiry', label: '备选询价' },
          { id: 'fixed', label: '固定安置物资锁定' },
        ],
      },
      { id: 'dispatch', label: '调度下达' },
    ],
  },
  {
    id: 'm-split',
    label: '应急分单',
    children: [
      { id: 'model', label: '模型配置' },
      { id: 'solve', label: '模型求解' },
      { id: 'plan', label: '分单方案' },
      { id: 'decision', label: '处置决策' },
    ],
  },
  {
    id: 'm-contract',
    label: '合同管理',
    children: [
      {
        id: 'm-contract-change',
        label: '变更管理',
        children: [{ id: 'change', label: '变更单' }],
      },
      {
        id: 'm-contract-emergency',
        label: '紧急合同',
        children: [{ id: 'emergency', label: '紧急合同编制' }],
      },
    ],
  },
  {
    id: 'm-budget',
    label: '预算管理',
    children: [
      { id: 'recost', label: '成本重估' },
      { id: 'reoccupy', label: '预算重占用' },
    ],
  },
  {
    id: 'm-fund',
    label: '资金核算',
    children: [{ id: 'payRules', label: '付款规则调整' }],
  },
]

const EVIDENCE = ['S2实时库存台账', '仓库出入库记录', '车辆调度记录', '仓库视频', '物流预计到达时间']

const DECISION_PATHS = [
  { id: 'wait', label: '继续等待 S2 恢复供货', note: '成本最低，但无法满足安置时限' },
  { id: 'switch', label: '全部改由备选供应商供货', note: '成本高，且重新组织全量供货风险大' },
  {
    id: 'combo',
    label: 'S2 保留部分供货 + 备选供应商紧急分单 + 网格调拨 + 合同变更 + 预备费控制',
    note: '在时限内完成重点保障，并控制新增支出',
  },
]

const BASELINE_PRICE = 846.25
const SOLVER_NOTE =
  '在规划求解中将 Z 设为最小值，改变 x1、x3、y1、y3 四个决策单元格，添加数量、供应能力、整数、0-1 变量和时限约束。'

const activeId = ref('')
const error = ref('')

function n(value) {
  return Number(value) || 0
}

function blankQuote(src) {
  return {
    id: src.id,
    name: src.name,
    capacity: '',
    unitPrice: '',
    arrivalHours: '',
    vehicleCost: { vehicles: '', hours: '', rate: '' },
    laborCost: { workers: '', hours: '', rate: '' },
  }
}

function blankTransfer(row) {
  return { from: row.from, to: row.to, quantity: '', max: row.quantity }
}

function blankDelivery() {
  return { original: '', hours12: '', hours24: '' }
}

function blankChange() {
  return { tentBefore: '', tentAfter: '', unitPrice: '' }
}

function blankEmergency() {
  return { quantity: '', goodsAmount: '', vehicleCost: '', laborCost: '' }
}

function vehicleOf(row) {
  return n(row.vehicleCost.vehicles) * n(row.vehicleCost.hours) * n(row.vehicleCost.rate)
}

function laborOf(row) {
  return n(row.laborCost.workers) * n(row.laborCost.hours) * n(row.laborCost.rate)
}

function quoteToDomain(row) {
  const vehicle = vehicleOf(row)
  const labor = laborOf(row)
  return {
    id: row.id,
    name: row.name,
    capacity: n(row.capacity),
    unitPrice: n(row.unitPrice),
    arrivalHours: n(row.arrivalHours),
    vehicleCost: {
      vehicles: n(row.vehicleCost.vehicles),
      hours: n(row.vehicleCost.hours),
      rate: n(row.vehicleCost.rate),
      total: vehicle,
    },
    laborCost: {
      workers: n(row.laborCost.workers),
      hours: n(row.laborCost.hours),
      rate: n(row.laborCost.rate),
      total: labor,
    },
    fixedCost: vehicle + labor,
  }
}

const evidence = reactive(Object.fromEntries(EVIDENCE.map((item) => [item, false])))
const delivery = reactive(blankDelivery())
const transferRows = reactive(gridTransfers.map((row) => blankTransfer(row)))
const quoteRows = reactive(emergencyQuotes.map((item) => blankQuote(item)))
const decision = reactive({ path: '' })
const x1 = ref('')
const changeForm = reactive(blankChange())
const emergencyForm = reactive(blankEmergency())

function snapshot() {
  return { evidence, delivery, transferRows, quoteRows, x1, decision, changeForm, emergencyForm }
}

store.restore(snapshot())
quoteRows.forEach((row, index) => {
  const blank = blankQuote(emergencyQuotes[index])
  row.vehicleCost = { ...blank.vehicleCost, ...(row.vehicleCost || {}) }
  row.laborCost = { ...blank.laborCost, ...(row.laborCost || {}) }
})

const chosenEvidence = computed(() => EVIDENCE.filter((item) => evidence[item]))

const original = computed(() => n(delivery.original))
const hours12 = computed(() => n(delivery.hours12))
const hours24 = computed(() => n(delivery.hours24))
const retained = computed(() => hours12.value + hours24.value)
const undeliverable = computed(() => original.value - retained.value)
const gap12h = computed(() => original.value - hours12.value)
const contractGap = computed(() => original.value - retained.value)

const affectedPeople = computed(() => gap12h.value * shelterPlan.tentCapacity)
const arrivalRate = computed(() => (original.value ? hours12.value / original.value : 0))

const transferTotal = computed(() => transferRows.reduce((sum, row) => sum + n(row.quantity), 0))
const transferPeople = computed(() => transferTotal.value * shelterPlan.tentCapacity)
const splitRequired = computed(() => gap12h.value - transferTotal.value)

const domainQuotes = computed(() => quoteRows.map((row) => quoteToDomain(row)))
const quotes = computed(() =>
  buildEmergencyQuotes(splitModel.required, domainQuotes.value).map((item) => ({
    ...item,
    unitLanded: n(item.unitLanded),
  })),
)
const solution = computed(() => {
  try {
    return solveSplitModel(splitModel.required, domainQuotes.value)
  } catch {
    return { candidates: [], optimal: null, saving: 0, worst: { total: 0 } }
  }
})
const x1n = computed(() => n(x1.value))
const current = computed(() => evaluateSplit(x1n.value, splitModel.required - x1n.value, domainQuotes.value))
const isOptimal = computed(() => {
  const best = solution.value.optimal
  return !!(best && current.value.total === best.total)
})

const arrival12h = computed(() => hours12.value + n(solution.value.optimal?.x1) + transferTotal.value)
const completionRate = computed(() => (original.value ? arrival12h.value / original.value : 0))

const impact = computed(() => calculateChangeImpact())
const initialContractAmount = computed(() => calculateContractAmount().total)
const otherLines = computed(() => initialContract.lines.filter((line) => line.id !== 'tent'))
const otherLineText = computed(() =>
  otherLines.value.map((line) => `${line.name}${num(line.quantity, 0)}${line.unit}`).join('、'),
)
const tentCostBefore = computed(() => changeOrder.tentBefore * changeOrder.unitPrice)
const tentCostAfter = computed(() => tentCostBefore.value + impact.value.increment)
const deviation = computed(() => (impact.value.goodsUnitCost - BASELINE_PRICE) / BASELINE_PRICE)
const pendingPages = computed(() => PAGES.filter((id) => id !== 'dispatch' && !flow.isDone(id)))
const emergencyTotal = computed(() =>
  n(emergencyForm.goodsAmount) + n(emergencyForm.vehicleCost) + n(emergencyForm.laborCost),
)

const emergency = changeOrder.emergencyContract

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  store.persist(snapshot())
  flow.complete(id)
}

function checkEvidence() {
  const rest = EVIDENCE.length - chosenEvidence.value.length
  return rest ? `还有 ${rest} 项证据来源未调取，无法完成交叉核验` : ''
}

function checkImpact() {
  if (!(original.value > 0)) return '原合同数量须大于 0 顶'
  if (hours12.value < 0 || hours24.value < 0) return '可交付数量不得为负'
  if (retained.value > original.value) return '12 小时与 24 小时可交付数量之和不得超过原合同数量'
  return ''
}

function checkTransfers() {
  const over = transferRows.find((row) => n(row.quantity) > n(row.max))
  if (over) return `${over.from}网格最多可调出 ${over.max} 顶，超出后最低保障完成率将低于 80%`
  if (transferRows.some((row) => n(row.quantity) < 0)) return '调拨数量不得为负'
  if (transferTotal.value <= 0) return '请填写各网格可调拨数量'
  if (splitRequired.value !== splitModel.required) {
    return `剩余需紧急分单 ${num(splitRequired.value, 0)} 顶，与备选供应商紧急分单口径 ${splitModel.required} 顶不一致，请复核 12 小时缺口与网格可调拨量`
  }
  return ''
}

function checkSolve() {
  if (current.value.violations.length) return `约束不满足：${current.value.violations.join('；')}`
  const best = solution.value.optimal
  if (!best) return '当前询价数据无法求出可行解，请复核备选询价'
  if (current.value.total !== best.total) {
    return `当前组合 x1=${current.value.x1}、x3=${current.value.x3} 综合成本 ${money(current.value.total, 0)} 元，比最优解高 ${money(current.value.total - best.total, 0)} 元，请继续调整分单数量`
  }
  return ''
}

function checkDecision() {
  const picked = DECISION_PATHS.find((item) => item.id === decision.path)
  if (!picked) return '请先选择处置路径'
  if (picked.id !== 'combo') return `${picked.label}：${picked.note}，不予批准`
  return ''
}

function checkDispatch() {
  if (pendingPages.value.length) {
    return `还有 ${pendingPages.value.length} 个功能页未办理，无法下达调度`
  }
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  EVIDENCE.forEach((item) => { evidence[item] = false })
  Object.assign(delivery, blankDelivery())
  transferRows.forEach((row, index) => Object.assign(row, blankTransfer(gridTransfers[index])))
  quoteRows.forEach((row, index) => {
    const blank = blankQuote(emergencyQuotes[index])
    row.capacity = blank.capacity
    row.unitPrice = blank.unitPrice
    row.arrivalHours = blank.arrivalHours
    Object.assign(row.vehicleCost, blank.vehicleCost)
    Object.assign(row.laborCost, blank.laborCost)
  })
  Object.assign(changeForm, blankChange())
  Object.assign(emergencyForm, blankEmergency())
  decision.path = ''
  x1.value = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="突发事件处置：S2库存异常与紧急分单" source="履约异常处置">
    <SystemShell
      system="应急采购管理系统"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 库存管理 → 异常监测 → 库存异常核验 -->
        <template v-if="leaf === 'verify'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('verify', checkEvidence)">
              交叉核验
            </button>
          </div>
          <p class="form-desc">{{ incident.title }}，调取以下证据来源交叉核验。</p>
          <div class="checkbox-group">
            <label v-for="item in EVIDENCE" :key="item" class="checkbox-item">
              <input v-model="evidence[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <template v-if="flow.isDone('verify')">
            <p class="sys-toast warn">经交叉核验，S2 仓库局部进水属实，不属于虚假库存或恶意拒绝履约。</p>
            <ul class="sys-lines">
              <li v-for="item in chosenEvidence" :key="item">{{ item }} · 已调取比对</li>
            </ul>
          </template>
        </template>

        <!-- 库存管理 → 影响分析 → 合同影响测算 -->
        <template v-else-if="leaf === 'impact'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('impact', checkImpact)">
              测算缺口
            </button>
          </div>
          <div class="input-row">
            <label>原合同帐篷数量</label>
            <input v-model.number="delivery.original" type="number" min="0" step="10" />
            <span class="input-unit">顶</span>
          </div>
          <div class="input-row">
            <label>12 小时内可交付</label>
            <input v-model.number="delivery.hours12" type="number" min="0" step="10" />
            <span class="input-unit">顶</span>
          </div>
          <div class="input-row">
            <label>24 小时内可交付</label>
            <input v-model.number="delivery.hours24" type="number" min="0" step="10" />
            <span class="input-unit">顶</span>
          </div>
          <template v-if="flow.isDone('impact')">
            <p class="sys-toast warn">
              原合同 {{ num(original, 0) }} 顶中，{{ num(hours12, 0) }} 顶 12 小时内可交付、{{ num(hours24, 0) }} 顶 24 小时内可交付，
              无法确定交付 {{ num(undeliverable, 0) }} 顶。
            </p>
            <p class="block-formula">12 小时保障缺口 = {{ num(original, 0) }} － {{ num(hours12, 0) }} = {{ num(gap12h, 0) }} 顶</p>
            <p class="block-formula">最终合同供应缺口 = {{ num(original, 0) }} － {{ num(retained, 0) }} = {{ num(contractGap, 0) }} 顶</p>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">12 小时保障缺口</span>
                <strong class="stat-value warn">{{ num(gap12h, 0) }} 顶</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">最终合同供应缺口</span>
                <strong class="stat-value accent">{{ num(contractGap, 0) }} 顶</strong>
              </div>
            </div>
          </template>
        </template>

        <!-- 库存管理 → 影响分析 → 网格保障影响 -->
        <template v-else-if="leaf === 'gridImpact'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('gridImpact')">
              测算影响
            </button>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>12 小时保障缺口</dt><dd>{{ num(gap12h, 0) }} 顶</dd></div>
            <div class="field-row"><dt>每顶帐篷容纳</dt><dd>{{ shelterPlan.tentCapacity }} 人</dd></div>
            <div class="field-row"><dt>重点保障网格</dt><dd>甲3、甲6</dd></div>
          </dl>
          <template v-if="flow.isDone('gridImpact')">
            <p class="sys-toast warn">
              如不调整，甲3、甲6 约 {{ num(affectedPeople, 0) }} 名受灾群众无法按计划完成临时安置。
            </p>
            <p class="block-formula">
              受影响人数 = {{ num(gap12h, 0) }} 顶 × {{ shelterPlan.tentCapacity }} 人/顶 = {{ num(affectedPeople, 0) }} 人
            </p>
            <p class="block-formula">
              第一批帐篷到位率 = {{ num(hours12, 0) }} / {{ num(original, 0) }} × 100% = {{ percent(arrivalRate, 0) }}
            </p>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">受影响安置人数</span>
                <strong class="stat-value warn">{{ num(affectedPeople, 0) }} 人</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">第一批帐篷到位率</span>
                <strong class="stat-value warn">{{ percent(arrivalRate, 0) }}</strong>
              </div>
            </div>
          </template>
        </template>

        <!-- 库存管理 → 可调拨资源 → 可调拨核验 -->
        <template v-else-if="leaf === 'transferable'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('transferable', checkTransfers)">
              汇总可调拨量
            </button>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr>
                <th>调出网格</th>
                <th>调入网格</th>
                <th style="width: 120px">可调出上限</th>
                <th style="width: 130px">本次调出</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in transferRows" :key="`${row.from}-${row.to}`">
                <th scope="row">{{ row.from }}</th>
                <td>{{ row.to }}</td>
                <td>{{ num(row.max, 0) }} 顶</td>
                <td>
                  <input v-model.number="row.quantity" type="number" min="0" :max="row.max" step="5" />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">合计</th>
                <td colspan="2">—</td>
                <td class="col-total">{{ num(transferTotal, 0) }} 顶</td>
              </tr>
            </tfoot>
          </table>
          <p class="form-desc">按数据透视表汇总各网格帐篷到位量和最低保障线，调出量不得突破本网格最低保障线。</p>
          <template v-if="flow.isDone('transferable')">
            <p class="sys-toast">
              临时调拨量 {{ num(transferTotal, 0) }} 顶，可暂时保障 {{ num(transferPeople, 0) }} 人。
            </p>
            <p class="block-formula">
              临时调拨量 = {{ transferRows.map((row) => num(row.quantity, 0)).join(' + ') }} = {{ num(transferTotal, 0) }} 顶
            </p>
            <p class="block-formula">
              剩余需紧急分单采购数量 = {{ num(gap12h, 0) }} － {{ num(transferTotal, 0) }} = {{ num(splitRequired, 0) }} 顶
            </p>
            <ul class="sys-lines">
              <li v-for="row in transferRows" :key="`${row.from}-${row.to}`">
                {{ row.from }} 可调出 {{ num(row.quantity, 0) }} 顶至 {{ row.to }}
              </li>
              <li class="info">调拨后各网格最低保障完成率仍不低于 80%</li>
            </ul>
          </template>
        </template>

        <!-- 采购执行 → 合同执行 → 暂停供货 -->
        <template v-else-if="leaf === 'pause'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('pause')">暂停付款</button>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>合同编号</dt><dd>{{ changeOrder.contractCode }}</dd></div>
            <div class="field-row"><dt>当前状态</dt><dd>履约中</dd></div>
            <div class="field-row"><dt>拟调整为</dt><dd>履约变更审核中</dd></div>
          </dl>
          <template v-if="flow.isDone('pause')">
            <p class="sys-toast warn">
              {{ changeOrder.contractCode }} 状态调整为「履约变更审核中」，暂停 {{ num(original, 0) }} 顶帐篷对应预计付款。
            </p>
            <ul class="sys-lines">
              <li class="info">不影响{{ otherLineText }}等合同物资正常履约</li>
              <li class="info">不影响食品、饮用水应急零售/框架协议直采执行</li>
            </ul>
          </template>
        </template>

        <!-- 采购执行 → 紧急询价 → 备选询价 -->
        <template v-else-if="leaf === 'inquiry'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('inquiry')">
              发起紧急询价
            </button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr>
                  <th>供应商</th>
                  <th>可供应量</th>
                  <th>货物报价</th>
                  <th>到货时间</th>
                  <th>车辆应急调度</th>
                  <th>装卸人工</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in quoteRows" :key="row.id">
                  <th scope="row">{{ row.id }}</th>
                  <td><input v-model.number="row.capacity" type="number" min="0" step="10" /></td>
                  <td><input v-model.number="row.unitPrice" type="number" min="0" step="1" /></td>
                  <td><input v-model.number="row.arrivalHours" type="number" min="0" step="1" /></td>
                  <td>
                    <input v-model.number="row.vehicleCost.vehicles" type="number" min="0" />辆 ×
                    <input v-model.number="row.vehicleCost.hours" type="number" min="0" />小时 ×
                    <input v-model.number="row.vehicleCost.rate" type="number" min="0" />元/车小时
                    = {{ money(vehicleOf(row), 0) }} 元
                  </td>
                  <td>
                    <input v-model.number="row.laborCost.workers" type="number" min="0" />人 ×
                    <input v-model.number="row.laborCost.hours" type="number" min="0" />小时 ×
                    <input v-model.number="row.laborCost.rate" type="number" min="0" />元/人小时
                    = {{ money(laborOf(row), 0) }} 元
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="form-desc">重点比较货物价格、运费增加、人工增加成本、可供应量和到货时间。</p>
          <template v-if="flow.isDone('inquiry')">
            <p class="sys-toast">S1、S3 紧急询价结果已回传，按 {{ splitModel.required }} 顶口径测算综合到岸成本。</p>
            <ul class="sys-lines">
              <li v-for="q in quotes" :key="q.id">
                {{ q.id }} 货物金额 {{ num(q.quantity, 0) }} × {{ money(q.unitPrice, 0) }} = {{ money(q.goods, 0) }} 元，
                运费和人工增加成本 {{ money(q.vehicleCost.total, 0) }} + {{ money(q.laborCost.total, 0) }} = {{ money(q.fixedCost, 0) }} 元
              </li>
            </ul>
            <div class="score-table-wrap">
              <table class="calc-table compact">
                <thead>
                  <tr>
                    <th>供应商</th>
                    <th>货物金额</th>
                    <th>运费与人工增加</th>
                    <th class="col-total">综合到岸成本</th>
                    <th>综合到岸单价</th>
                    <th>到货时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="q in quotes" :key="q.id">
                    <th scope="row">{{ q.id }}</th>
                    <td>{{ money(q.goods, 0) }} 元</td>
                    <td>{{ money(q.fixedCost, 0) }} 元</td>
                    <td class="col-total">{{ money(q.landed, 0) }} 元</td>
                    <td>{{ money(q.unitLanded, 2) }} 元/顶</td>
                    <td>{{ q.arrivalHours }} 小时</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </template>

        <!-- 采购执行 → 紧急询价 → 固定安置物资锁定 -->
        <template v-else-if="leaf === 'fixed'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('fixed')">识别固定成本</button>
          </div>
          <template v-if="flow.isDone('fixed')">
            <ul class="sys-lines">
              <li v-for="q in quotes" :key="q.id">
                {{ q.id }} 订单固定附加成本 = {{ money(q.vehicleCost.total, 0) }} + {{ money(q.laborCost.total, 0) }} = {{ money(q.fixedCost, 0) }} 元；
                若由 {{ q.id }} 独立供应 {{ num(q.quantity, 0) }} 顶，满量综合成本 {{ money(q.landed, 0) }} 元
              </li>
              <li class="warn">车辆应急调度和装卸人工属于启用某供应商即发生的订单级固定成本，不按采购数量简单线性分摊</li>
              <li class="info">单位综合成本仅作为满量采购的参考口径</li>
            </ul>
          </template>
        </template>

        <!-- 应急分单 → 模型配置 -->
        <template v-else-if="leaf === 'model'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('model')">建立模型</button>
          </div>
          <p class="form-desc">
            设 x1、x3 分别为向 S1、S3 采购的帐篷数量，y1、y3 分别表示是否启用该供应商（启用=1，不启用=0）。
          </p>
          <template v-if="flow.isDone('model')">
            <p class="sys-toast">分单组合优化模型已建立。</p>
            <p class="block-formula">{{ splitModel.objective }}</p>
            <ul class="constraint-list">
              <li v-for="(item, index) in splitModel.constraints" :key="index">{{ item }}</li>
            </ul>
            <p class="calc-note">{{ SOLVER_NOTE }}</p>
          </template>
        </template>

        <!-- 应急分单 → 模型求解 -->
        <template v-else-if="leaf === 'solve'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('solve', checkSolve)">
              执行求解
            </button>
          </div>
          <div class="solver">
            <label class="solver-label">
              向 S1 采购 x1 =
              <input v-model.number="x1" type="number" min="0" :max="splitModel.required" step="10" />
              顶
            </label>
            <input
              :value="x1n"
              type="range"
              min="0"
              :max="splitModel.required"
              step="10"
              class="solver-range"
              @input="x1 = Number($event.target.value)"
            />
            <p class="solver-derived">
              向 S3 采购 x3 = {{ splitModel.required - x1n }} 顶 ｜ y1 = {{ current.y1 }}，y3 = {{ current.y3 }}
            </p>

            <div class="solver-breakdown">
              <div><span>货物成本</span><strong>{{ money(current.goods, 0) }} 元</strong></div>
              <div><span>订单固定成本</span><strong>{{ money(current.fixed, 0) }} 元</strong></div>
              <div class="solver-total"><span>目标函数 Z</span><strong>{{ money(current.total, 0) }} 元</strong></div>
            </div>

            <p v-if="current.violations.length" class="solver-violation">约束不满足：{{ current.violations.join('；') }}</p>
            <p v-else-if="isOptimal" class="solver-optimal">
              当前组合即为最优解 x1={{ solution.optimal.x1 }}、x3={{ solution.optimal.x3 }}。
            </p>
            <p v-else-if="solution.optimal" class="solver-gap">
              比最优解高 {{ money(current.total - solution.optimal.total, 0) }} 元，继续调整 x1 可进一步降低综合成本。
            </p>
          </div>
          <template v-if="flow.isDone('solve') && solution.optimal">
            <p class="sys-toast">
              规划求解结果：x1={{ solution.optimal.x1 }}、x3={{ solution.optimal.x3 }}、y1={{ solution.optimal.y1 }}、y3={{ solution.optimal.y3 }}，
              综合成本 {{ money(solution.optimal.total, 0) }} 元。
            </p>
            <div class="score-table-wrap">
              <table class="calc-table compact">
                <thead>
                  <tr>
                    <th>方案</th><th>x1</th><th>x3</th><th>货物成本</th><th>固定成本</th><th class="col-total">综合成本</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in solution.candidates" :key="c.label" :class="{ winner: c.total === solution.optimal.total }">
                    <th scope="row">{{ c.label }}</th>
                    <td>{{ c.x1 }}</td>
                    <td>{{ c.x3 }}</td>
                    <td>{{ money(c.goods, 0) }}</td>
                    <td>{{ money(c.fixed, 0) }}</td>
                    <td class="col-total">{{ money(c.total, 0) }} 元</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul class="sys-lines">
              <li>相较全部选择 S3，节约成本 = {{ money(solution.worst.total, 0) }} － {{ money(solution.optimal.total, 0) }} = {{ money(solution.saving, 0) }} 元</li>
              <li class="info">S1 虽比 S3 晚 2 小时到达，但 8 小时仍满足 {{ splitModel.deadlineHours }} 小时保障时限</li>
            </ul>
          </template>
        </template>

        <!-- 应急分单 → 分单方案 -->
        <template v-else-if="leaf === 'plan'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('plan')">生成处置方案</button>
          </div>
          <template v-if="flow.isDone('plan')">
            <p class="sys-toast">总体处置方案已生成，12 小时内可到位 {{ num(arrival12h, 0) }} 顶。</p>
            <table class="calc-table compact">
              <thead>
                <tr><th>供应来源</th><th>数量</th><th>到位时间</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">S2 保留</th>
                  <td>{{ num(retained, 0) }} 顶</td>
                  <td>{{ num(hours12, 0) }} 顶 12 小时内到达、{{ num(hours24, 0) }} 顶 24 小时内到达</td>
                </tr>
                <tr>
                  <th scope="row">S1 紧急分单</th>
                  <td>{{ num(solution.optimal?.x1, 0) }} 顶</td>
                  <td>{{ quotes[0].arrivalHours }} 小时内到达</td>
                </tr>
                <tr>
                  <th scope="row">{{ transferRows.map((row) => row.from).join('、') }} 临时调拨</th>
                  <td>{{ num(transferTotal, 0) }} 顶</td>
                  <td>2 小时内到达</td>
                </tr>
              </tbody>
            </table>
            <p class="block-formula">
              12 小时内可到位数量 = {{ num(hours12, 0) }} + {{ num(solution.optimal?.x1, 0) }} + {{ num(transferTotal, 0) }} = {{ num(arrival12h, 0) }} 顶
            </p>
            <p class="block-formula">
              第一批重点保障完成率 = {{ num(arrival12h, 0) }} / {{ num(original, 0) }} × 100% = {{ percent(completionRate, 0) }}
            </p>
            <ul class="sys-lines">
              <li class="info">S2 后续 {{ num(hours24, 0) }} 顶到达后，补回三个调出网格</li>
            </ul>
          </template>
        </template>

        <!-- 应急分单 → 处置决策 -->
        <template v-else-if="leaf === 'decision'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('decision', checkDecision)">
              批准方案
            </button>
          </div>
          <div class="checkbox-group">
            <label v-for="path in DECISION_PATHS" :key="path.id" class="checkbox-item">
              <input v-model="decision.path" type="radio" :value="path.id" />
              {{ path.label }}（{{ path.note }}）
            </label>
          </div>
          <template v-if="flow.isDone('decision')">
            <p class="sys-toast">
              决定采用组合方案：S2 保留 {{ num(retained, 0) }} 顶 + S1 分单 {{ num(solution.optimal?.x1, 0) }} 顶 +
              网格调拨 {{ num(transferTotal, 0) }} 顶 + 合同变更 + 预备费控制。
            </p>
            <ul class="sys-lines">
              <li>批准 {{ changeOrder.contractCode }} 合同变更方案</li>
              <li>批准 {{ emergency.code }} 紧急分单采购</li>
              <li>批准临时调拨 {{ num(transferTotal, 0) }} 顶</li>
              <li>批准使用预备费 {{ money(impact.contingencyUsed, 0) }} 元</li>
              <li class="info">授权采购成本保障岗按审批结果办理合同变更和紧急采购合同签订</li>
            </ul>
          </template>
        </template>

        <!-- 合同管理 → 变更管理 → 变更单 -->
        <template v-else-if="leaf === 'change'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('change')">提交变更审批</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">变更前帐篷数量</span>
              <input v-model.number="changeForm.tentBefore" type="number" min="0" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">变更后帐篷数量</span>
              <input v-model.number="changeForm.tentAfter" type="number" min="0" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">合同单价</span>
              <input v-model.number="changeForm.unitPrice" type="number" min="0" class="form-control" />
            </label>
          </div>
          <template v-if="flow.isDone('change')">
            <p class="sys-toast">
              {{ changeOrder.contractCode }} 帐篷数量由 {{ changeOrder.tentBefore }} 顶调整为 {{ changeOrder.tentAfter }} 顶，
              减少 {{ changeOrder.reducedQuantity }} 顶。
            </p>
            <p class="block-formula">
              合同减少金额 = {{ changeOrder.reducedQuantity }} × {{ money(changeOrder.unitPrice, 0) }} = {{ money(impact.reduction, 0) }} 元
            </p>
            <p class="block-formula">
              变更后金额 = {{ money(initialContractAmount, 0) }} － {{ money(impact.reduction, 0) }} = {{ money(impact.contractAfter, 0) }} 元
            </p>
            <ul class="sys-lines">
              <li class="info">其他合同物资（{{ otherLineText }}）的数量、单价、质量标准和付款条件不变</li>
              <li class="info">食品、饮用水直采路径不受本次帐篷合同变更影响</li>
            </ul>
          </template>
        </template>

        <!-- 合同管理 → 紧急合同 → 紧急合同编制 -->
        <template v-else-if="leaf === 'emergency'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('emergency')">提交审批</button>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr><th>合同要素</th><th class="col-total">内容</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">供应商</th><td class="col-total">{{ emergency.supplierId }}</td></tr>
              <tr>
                <th scope="row">采购帐篷</th>
                <td class="col-total"><input v-model.number="emergencyForm.quantity" type="number" min="0" /> 顶</td>
              </tr>
              <tr>
                <th scope="row">货物金额</th>
                <td class="col-total"><input v-model.number="emergencyForm.goodsAmount" type="number" min="0" /> 元</td>
              </tr>
              <tr>
                <th scope="row">车辆应急增加成本</th>
                <td class="col-total"><input v-model.number="emergencyForm.vehicleCost" type="number" min="0" /> 元</td>
              </tr>
              <tr>
                <th scope="row">装卸人工增加成本</th>
                <td class="col-total"><input v-model.number="emergencyForm.laborCost" type="number" min="0" /> 元</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><th scope="row">合同总额</th><td class="col-total">{{ money(emergencyTotal, 0) }} 元</td></tr>
            </tfoot>
          </table>
          <template v-if="flow.isDone('emergency')">
            <p class="sys-toast">
              {{ emergency.code }} 紧急分单合同已提交审批，与 {{ emergency.supplierId }} 采购帐篷 {{ num(emergency.quantity, 0) }} 顶，
              合同总额 {{ money(emergency.total, 0) }} 元。
            </p>
            <p class="block-formula">
              合同总额 = {{ money(emergency.goodsAmount, 0) }} + {{ money(emergency.vehicleCost, 0) }} + {{ money(emergency.laborCost, 0) }}
              = {{ money(emergency.total, 0) }} 元
            </p>
            <ul class="sys-lines">
              <li>交付时间 {{ emergency.arrivalHours }} 小时</li>
              <li>验收合格后 7 日内付款</li>
              <li class="warn">未验收部分暂停付款</li>
            </ul>
          </template>
        </template>

        <!-- 预算管理 → 成本重估 -->
        <template v-else-if="leaf === 'recost'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('recost')">重新测算</button>
          </div>
          <template v-if="flow.isDone('recost')">
            <p class="block-formula">
              原帐篷采购成本 = {{ changeOrder.tentBefore }} × {{ money(changeOrder.unitPrice, 0) }} = {{ money(tentCostBefore, 0) }} 元
            </p>
            <p class="block-formula">
              变更后帐篷及紧急保障成本 = {{ changeOrder.tentAfter }} × {{ money(changeOrder.unitPrice, 0) }} +
              {{ emergency.quantity }} × {{ money(quotes[0].unitPrice, 0) }} + {{ money(emergency.vehicleCost, 0) }} +
              {{ money(emergency.laborCost, 0) }} = {{ money(tentCostAfter, 0) }} 元
            </p>
            <table class="calc-table compact">
              <thead>
                <tr><th>新增支出构成</th><th>计算</th><th class="col-total">金额</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">采购价差</th>
                  <td>{{ emergency.quantity }} × ({{ money(quotes[0].unitPrice, 0) }} － {{ money(changeOrder.unitPrice, 0) }})</td>
                  <td class="col-total">{{ money(impact.priceGap, 0) }} 元</td>
                </tr>
                <tr>
                  <th scope="row">运费和人工增加成本</th>
                  <td>{{ money(emergency.vehicleCost, 0) }} + {{ money(emergency.laborCost, 0) }}</td>
                  <td class="col-total">{{ money(impact.logisticsGap, 0) }} 元</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">突发事件新增支出</th>
                  <td>{{ money(tentCostAfter, 0) }} － {{ money(tentCostBefore, 0) }}</td>
                  <td class="col-total">{{ money(impact.increment, 0) }} 元</td>
                </tr>
              </tfoot>
            </table>
            <div class="gauge-track">
              <span class="gauge-fill warn" :style="{ width: percent(impact.contingencyRate, 2) }"></span>
            </div>
            <p class="gauge-caption">
              阶段性预备费使用率 = {{ money(impact.contingencyUsed, 0) }} / {{ money(impact.contingencyTotal, 0) }} × 100%
              = {{ percent(impact.contingencyRate, 2) }}，当前预备费阶段性余额 {{ money(impact.contingencyLeft, 0) }} 元。
            </p>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">变更后 {{ changeOrder.tentBefore }} 顶综合平均成本</span>
                <strong class="stat-value">{{ money(impact.averageUnitCost, 2) }} 元/顶</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">剔除应急运输和人工后</span>
                <strong class="stat-value">{{ money(impact.goodsUnitCost, 2) }} 元/顶</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">与基准价 {{ BASELINE_PRICE }} 元偏差</span>
                <strong class="stat-value">{{ signedPercent(deviation, 2) }}</strong>
              </div>
            </div>
          </template>
        </template>

        <!-- 预算管理 → 预算重占用 -->
        <template v-else-if="leaf === 'reoccupy'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('reoccupy')">重新占用</button>
          </div>
          <template v-if="flow.isDone('reoccupy')">
            <p class="block-formula">
              两份合同合计 = {{ money(impact.contractAfter, 0) }} + {{ money(impact.emergency, 0) }} = {{ money(impact.contractsTotal, 0) }} 元
            </p>
            <p class="block-formula">
              采购执行总额 = {{ money(impact.contractsTotal, 0) }} + {{ money(impact.directTotal, 2) }} = {{ money(impact.executionTotal, 2) }} 元
            </p>
            <p class="block-formula">
              较初始方案增加 = {{ money(impact.executionTotal, 2) }} － {{ money(impact.initialTotal, 2) }} = {{ money(impact.increment, 0) }} 元
            </p>
            <ul class="sys-lines">
              <li class="warn">新增 {{ money(impact.increment, 0) }} 元全部由帐篷紧急分单产生，从 C 方案预备费项目列支</li>
              <li class="info">食品、饮用水直采金额不因本次合同变更增加</li>
              <li class="info">资金来源为政府财政拨款保障资金，不使用限定性食品捐赠和特殊人群保障资金</li>
            </ul>
          </template>
        </template>

        <!-- 资金核算 → 付款规则调整 -->
        <template v-else-if="leaf === 'payRules'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('payRules')">保存控制规则</button>
          </div>
          <template v-if="flow.isDone('payRules')">
            <p class="sys-toast">变更后付款和四流控制规则已保存并生效。</p>
            <table class="calc-table compact">
              <thead>
                <tr><th>控制对象</th><th>核验要求</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{{ changeOrder.contractCode }}</th>
                  <td>按变更后合同验收付款</td>
                </tr>
                <tr>
                  <th scope="row">{{ emergency.code }}</th>
                  <td>
                    分别核验 {{ num(emergency.quantity, 0) }} 顶帐篷、{{ money(emergency.goodsAmount, 0) }} 元货款、
                    {{ money(emergency.vehicleCost, 0) }} 元车辆应急增加成本、{{ money(emergency.laborCost, 0) }} 元人工增加成本
                  </td>
                </tr>
                <tr>
                  <th scope="row">食品、饮用水直采</th>
                  <td>按框架协议/采购审批单、零售或订单凭证、到货验收、发票/小票及付款记录分项核验</td>
                </tr>
                <tr>
                  <th scope="row">网格调拨 {{ num(transferTotal, 0) }} 顶</th>
                  <td>不形成对外付款，但须形成出库单、调拨单、运输记录和接收确认单</td>
                </tr>
              </tbody>
            </table>
          </template>
        </template>

        <!-- 采购执行 → 调度下达 -->
        <template v-else-if="leaf === 'dispatch'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('dispatch', checkDispatch)">
              执行调拨
            </button>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr><th>调出网格</th><th>调入网格</th><th class="col-total">数量</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in transferRows" :key="`${row.from}-${row.to}`">
                <th scope="row">{{ row.from }}</th>
                <td>{{ row.to }}</td>
                <td class="col-total">{{ num(row.quantity, 0) }} 顶</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><th scope="row">合计</th><td>—</td><td class="col-total">{{ num(transferTotal, 0) }} 顶</td></tr>
            </tfoot>
          </table>
          <template v-if="flow.isDone('dispatch')">
            <p class="sys-toast">
              网格调拨执行完成，合计 {{ num(transferTotal, 0) }} 顶，可暂时保障 {{ num(transferPeople, 0) }} 人。
            </p>
            <ul class="sys-lines">
              <li v-for="row in transferRows" :key="`${row.from}-${row.to}`">
                {{ row.from }} 调出 {{ num(row.quantity, 0) }} 顶至 {{ row.to }}
              </li>
              <li class="info">系统记录批次、调出时间、到达时间、经办人、接收人和 24 小时补回计划</li>
            </ul>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
