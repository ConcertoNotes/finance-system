<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowRight, Calculator, Check, CheckCircle2, CircleDollarSign, Download, FileCheck2, SlidersHorizontal, TrendingUp } from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import RoleTaskPanel from '../components/RoleTaskPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import WaterfallChart from '../components/WaterfallChart.vue'
import { baseBudgetBreakdown, budgetIncreaseDrivers, budgetParameters, budgetScenarios, costDriverFormulas } from '../data/budget.js'
import { getRoleTasksByView } from '../data/roleplay.js'
import { getGridSnapshot } from '../data/disaster.js'
import { fundSnapshots } from '../data/funds.js'
import { formatCurrency } from '../domain/finance.js'
import { determineResponse, summarizeDisaster } from '../domain/emergency.js'
import { buildResponseApprovalReport, downloadTextFile } from '../domain/workflowArtifacts.js'

const props = defineProps({
  stage: { type: String, default: 'baseline' },
  workflowState: { type: Object, default: () => ({ responseApproval: { status: 'pending' } }) },
})
const emit = defineEmits(['toast', 'workflow-action', 'task-completed'])
const selectedScenarioId = ref(props.stage === 'escalated' ? 'C' : 'B')
const activeTab = ref('scenarios')
const approvalOpen = ref(false)
const roleTasks = computed(() => getRoleTasksByView('budget', activeTab.value))
const scenario = computed(() => budgetScenarios.find((item) => item.id === selectedScenarioId.value))
const summary = computed(() => summarizeDisaster(getGridSnapshot(props.stage)))
const approval = computed(() => props.workflowState.responseApproval)
const response = computed(() => determineResponse({
  ...summary.value,
  shelterDays: props.stage === 'escalated' ? 5 : 3,
  fundingGap: fundSnapshots[props.stage].gap,
  fundingGapPending: props.stage !== 'escalated' && approval.value.status !== 'approved',
}))
const buildCostRows = (stage) => getGridSnapshot(stage).map((grid) => {
  const days = stage === 'escalated' ? 5 : 3
  const food = grid.relocated * days * 25
  const water = grid.relocated * days * 8
  const tents = Math.ceil(grid.relocated / 4) * 850
  const transport = Math.round(grid.distance * 2 * 8.5)
  const special = grid.special * 120
  return { ...grid, days, food, water, tents, transport, special, total: food + water + tents + transport + special }
})
const gridCostRows = computed(() => buildCostRows(props.stage))
const grid3Cost = computed(() => gridCostRows.value.find((grid) => grid.id === '甲3'))
const grid3Baseline = computed(() => buildCostRows('baseline').find((grid) => grid.id === '甲3'))
const costTotals = computed(() => gridCostRows.value.reduce((totals, grid) => ({
  relocated: totals.relocated + grid.relocated,
  personDays: totals.personDays + grid.relocated * grid.days,
  food: totals.food + grid.food,
  water: totals.water + grid.water,
  tents: totals.tents + grid.tents,
  special: totals.special + grid.special,
  transport: totals.transport + grid.transport,
  total: totals.total + grid.total,
}), { relocated: 0, personDays: 0, food: 0, water: 0, tents: 0, special: 0, transport: 0, total: 0 }))
const breakdownTotal = baseBudgetBreakdown.reduce((sum, item) => sum + item.amount, 0)
const breakdownMax = Math.max(...baseBudgetBreakdown.map((item) => item.amount))
const approvalReport = computed(() => buildResponseApprovalReport(approval.value))
const scenarioB = budgetScenarios.find((item) => item.id === 'B')
const scenarioC = budgetScenarios.find((item) => item.id === 'C')

function downloadCostDetail() {
  const header = ['网格', '网格名称', '转移人数', '安置人天', '食品预算', '饮水预算', '帐篷预算', '特殊人群预算', '运输预算', '动因小计']
  const rows = gridCostRows.value.map((grid) => [grid.id, grid.name, grid.relocated, grid.relocated * grid.days, grid.food, grid.water, grid.tents, grid.special, grid.transport, grid.total])
  downloadTextFile('网格成本动因明细表.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('task-completed', 4)
  emit('toast', '网格成本动因明细表已下载')
}

function submitApproval() {
  emit('workflow-action', { action: 'submit-response', payload: { proposer: '应急预算绩效岗', level: response.value.level, planId: response.value.planId } })
  emit('toast', '响应建议已提交财务主管统筹岗')
  approvalOpen.value = true
}

function approveResponse() {
  emit('workflow-action', { action: 'approve-response', payload: { approver: '财务主管统筹岗', level: response.value.level, planId: response.value.planId } })
  emit('task-completed', 6)
  emit('toast', `${response.value.level}级响应与${response.value.planId}方案已审批通过`)
}

function downloadApproval() {
  downloadTextFile('响应等级审批记录.txt', approvalReport.value)
  emit('toast', '响应等级审批记录已下载')
}

watch(() => props.stage, (nextStage) => {
  selectedScenarioId.value = nextStage === 'escalated' ? 'C' : 'B'
})
</script>

<template>
  <div class="page-content budget-page">
    <section class="page-intro"><div><p class="eyebrow">SCENARIO BUDGETING</p><h1>预算决策中心</h1><p>从灾情到成本动因，从情景预算到响应等级</p></div><div class="tab-switch"><button type="button" :class="{ active: activeTab === 'scenarios' }" @click="activeTab = 'scenarios'">情景预算</button><button type="button" :class="{ active: activeTab === 'drivers' }" @click="activeTab = 'drivers'">成本动因</button><button type="button" :class="{ active: activeTab === 'response' }" @click="activeTab = 'response'">响应判级</button></div></section>

    <RoleTaskPanel v-if="roleTasks.length" :tasks="roleTasks" />

    <template v-if="activeTab === 'scenarios'">
      <section class="scenario-grid">
        <button v-for="item in budgetScenarios" :key="item.id" type="button" class="scenario-card" :class="{ selected: selectedScenarioId === item.id, recommended: item.id === response.planId }" @click="selectedScenarioId = item.id">
          <span class="scenario-letter">{{ item.id }}</span><div class="scenario-heading"><span>{{ item.response }}</span><strong>{{ item.name }}</strong></div><strong class="scenario-total">{{ formatCurrency(item.total) }}</strong><p>{{ item.description }}</p><div class="scenario-meta"><span>{{ item.days }} 天</span><span>{{ item.beneficiaries.toLocaleString() }} 人</span><span>{{ item.unitCost }} 元/人</span></div><StatusBadge v-if="item.id === response.planId" label="当前推荐" :tone="props.stage === 'escalated' ? 'danger' : 'info'" dot />
        </button>
      </section>

      <section class="two-column-layout budget-detail-layout">
        <article class="panel budget-detail-panel"><header class="panel-header"><div><p class="section-index">{{ scenario.id }} PLAN DETAIL</p><h3>{{ scenario.name }}</h3></div><StatusBadge :label="`适用于 ${scenario.response}`" tone="info" /></header><div class="budget-big-number"><span>预算总额</span><strong>{{ formatCurrency(scenario.total) }}</strong><small>单位受益成本 {{ scenario.unitCost }} 元/人</small></div><div class="coverage-tags"><span v-for="item in scenario.coverage" :key="item"><CheckCircle2 :size="13" />{{ item }}</span></div><div class="budget-footer-stats"><div><span>覆盖人数</span><strong>{{ scenario.beneficiaries.toLocaleString() }} 人</strong></div><div><span>安置周期</span><strong>{{ scenario.days }} 天</strong></div><div><span>预备费</span><strong>{{ formatCurrency(scenario.reserve) }}</strong></div></div></article>
        <article class="panel increase-panel"><header class="panel-header"><div><p class="section-index">B → C INCREMENT</p><h3>预算增量来源（瀑布图）</h3></div><TrendingUp :size="19" /></header><div class="increase-total"><span>预算增加</span><strong>+{{ formatCurrency(1366087) }}</strong></div><div class="waterfall-wrap"><WaterfallChart :base="{ label: 'B 方案预算', value: scenarioB.total }" :increments="budgetIncreaseDrivers.map((driver) => ({ label: driver.label, amount: driver.amount }))" :total="{ label: 'C 方案预算', value: scenarioC.total }" /></div><div class="driver-bars compact"><div v-for="driver in budgetIncreaseDrivers" :key="driver.label"><div><span>{{ driver.label }}</span><strong>{{ driver.share }}% · {{ formatCurrency(driver.amount) }}</strong></div><div class="driver-track"><i :style="{ width: `${driver.share}%` }" /></div></div></div></article>
      </section>
    </template>

    <template v-else-if="activeTab === 'drivers'">
      <section class="driver-formulas"><article v-for="(item, index) in costDriverFormulas" :key="item.id"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><strong>{{ item.name }}</strong><p>{{ item.formula }}</p></div><ArrowRight :size="18" /><b>{{ item.id === 'person-days' ? `${summary.relocated.toLocaleString()} × ${stage === 'escalated' ? 5 : 3} 天` : item.basis }}</b></article></section>
      <section class="budget-audit-grid">
        <article class="panel formula-audit-panel"><header class="panel-header"><div><p class="section-index">FORMULA AUDIT</p><h3>Excel 公式审计</h3></div><Calculator :size="19" /></header><div class="formula-audit-list"><div><span>按网格汇总</span><strong>SUMIFS</strong><code>=SUMIFS(灾情表!C:C,灾情表!A:A,A2)</code></div><div><span>匹配预算标准</span><strong>XLOOKUP</strong><code>=XLOOKUP("食品标准",参数表!A:A,参数表!B:B)</code></div></div></article>
        <article class="panel budget-bridge-panel"><header class="panel-header"><div><p class="section-index">BUDGET BRIDGE</p><h3>预算需求汇总桥接</h3></div><CircleDollarSign :size="19" /></header><div class="budget-bridge"><div><span>9 网格基础需求</span><strong>2,729,906 元</strong></div><i>+</i><div><span>保险预算</span><strong>11,000 元</strong></div><i>+</i><div><span>设备预算</span><strong>76,000 元</strong></div><i>=</i><div class="bridge-total"><span>总预算需求</span><strong>2,816,906 元</strong></div></div></article>
      </section>
      <section class="panel breakdown-panel"><header class="panel-header"><div><p class="section-index">PIVOT SUMMARY</p><h3>预算构成透视汇总（对应数据透视表）</h3></div><StatusBadge :label="`合计 ${formatCurrency(breakdownTotal)}`" tone="info" /></header><div class="breakdown-bars"><div v-for="item in baseBudgetBreakdown" :key="item.label"><div class="breakdown-meta"><span><i :style="{ background: item.color }" />{{ item.label }}</span><strong>{{ formatCurrency(item.amount) }}</strong><small>{{ ((item.amount / breakdownTotal) * 100).toFixed(1) }}%</small></div><div class="breakdown-track"><i :style="{ width: `${(item.amount / breakdownMax) * 100}%`, background: item.color }" /></div></div></div><p class="breakdown-note">以数据透视表口径汇总 9 网格预算科目：8 类科目合计 {{ formatCurrency(breakdownTotal) }}，与 A 方案总预算需求一致。</p></section>
      <section class="panel grid-cost-panel"><header class="panel-header"><div><p class="section-index">GRID COST DRIVER DETAIL</p><h3>9 网格成本动因明细</h3></div><div class="panel-actions"><StatusBadge :label="`${gridCostRows.length} 个网格`" tone="info" /><button class="secondary-button" type="button" @click="downloadCostDetail"><Download :size="15" />下载成本明细</button></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>网格</th><th>转移人数</th><th>安置人天</th><th>食品预算</th><th>饮水预算</th><th>帐篷预算</th><th>特殊人群</th><th>运输预算</th><th>动因小计</th></tr></thead><tbody><tr v-for="grid in gridCostRows" :key="grid.id"><td><strong>{{ grid.id }} · {{ grid.name }}</strong></td><td>{{ grid.relocated.toLocaleString() }}</td><td>{{ (grid.relocated * grid.days).toLocaleString() }}</td><td>{{ formatCurrency(grid.food) }}</td><td>{{ formatCurrency(grid.water) }}</td><td>{{ formatCurrency(grid.tents) }}</td><td>{{ formatCurrency(grid.special) }}</td><td>{{ formatCurrency(grid.transport) }}</td><td><strong>{{ formatCurrency(grid.total) }}</strong></td></tr></tbody><tfoot><tr class="cost-total-row"><td><strong>直接动因合计</strong></td><td><strong>{{ costTotals.relocated.toLocaleString() }}</strong></td><td><strong>{{ costTotals.personDays.toLocaleString() }}</strong></td><td><strong>{{ formatCurrency(costTotals.food) }}</strong></td><td><strong>{{ formatCurrency(costTotals.water) }}</strong></td><td><strong>{{ formatCurrency(costTotals.tents) }}</strong></td><td><strong>{{ formatCurrency(costTotals.special) }}</strong></td><td><strong>{{ formatCurrency(costTotals.transport) }}</strong></td><td><strong>{{ formatCurrency(costTotals.total) }}</strong></td></tr></tfoot></table></div><p class="cost-bridge-note">{{ stage === 'escalated' ? `逐网格直接动因合计 ${formatCurrency(costTotals.total)}；叠加道路绕行、设备连续运行、多轮配送等跨网格统筹项与预备费后，对应 C 方案总预算 4,275,091 元。` : `逐网格直接动因合计 ${formatCurrency(costTotals.total)}；叠加多轮物资配送、机动运力与安全冗余等跨网格统筹项后，9 网格基础需求为 2,729,906 元，再加保险 11,000 元与设备 76,000 元，总预算需求 2,816,906 元。` }}</p></section>
      <section class="panel example-calculation"><header class="panel-header"><div><p class="section-index">GRID EXAMPLE</p><h3>甲3成本计算示例{{ stage === 'escalated' ? '（突发事件后重算）' : '' }}</h3></div><Calculator :size="19" /></header><div class="calculation-steps"><div><span>食品</span><code>{{ grid3Cost.relocated }}人 × {{ grid3Cost.days }}天 × 25元</code><strong>{{ formatCurrency(grid3Cost.food) }}<em v-if="stage === 'escalated'" class="calc-delta">原 {{ formatCurrency(grid3Baseline.food) }} · 增加 {{ formatCurrency(grid3Cost.food - grid3Baseline.food) }}</em></strong></div><div><span>饮水</span><code>{{ grid3Cost.relocated }}人 × {{ grid3Cost.days }}天 × 8元</code><strong>{{ formatCurrency(grid3Cost.water) }}<em v-if="stage === 'escalated'" class="calc-delta">原 {{ formatCurrency(grid3Baseline.water) }} · 增加 {{ formatCurrency(grid3Cost.water - grid3Baseline.water) }}</em></strong></div><div><span>帐篷</span><code>ROUNDUP({{ grid3Cost.relocated }} ÷ 4) × 850元</code><strong>{{ formatCurrency(grid3Cost.tents) }}<em v-if="stage === 'escalated'" class="calc-delta">原 {{ formatCurrency(grid3Baseline.tents) }} · 增加 {{ formatCurrency(grid3Cost.tents - grid3Baseline.tents) }}</em></strong></div></div></section>
      <section class="panel parameter-panel"><header class="panel-header"><div><p class="section-index">BUDGET PARAMETERS</p><h3>预算参数表</h3></div><SlidersHorizontal :size="19" /></header><div class="parameter-grid"><div v-for="parameter in budgetParameters" :key="parameter.id"><span>{{ parameter.name }}</span><strong>{{ parameter.value }} <small>{{ parameter.unit }}</small></strong><p>{{ parameter.note || '专项预算标准' }}</p></div></div></section>
    </template>

    <template v-else>
      <section class="response-workbench">
        <article class="response-decision" :class="{ escalated: response.level === 'II' }"><div><p class="eyebrow">RESPONSE RECOMMENDATION</p><span>综合判定</span><strong>{{ response.level }}级响应</strong><p>{{ response.level === 'II' ? '三项核心指标达到 II 级阈值，对应 C 持续灾情保障方案。' : '四项指标达到 III 级及以上，对应 B 标准救援保障方案。' }}</p></div><div class="decision-arrow"><Calculator :size="28" /></div><div><span>预算上限</span><strong>{{ formatCurrency(budgetScenarios.find((item) => item.id === response.planId).total) }}</strong><p>{{ response.planId }}方案 · {{ response.level === 'II' ? '预备费 37.6 万元' : '预备费比例 10%' }}</p></div></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">HARD THRESHOLD + REVIEW</p><h3>五项判级指标</h3></div><StatusBadge :label="approval.status === 'approved' ? '审批通过' : approval.status === 'submitted' ? '待主管审批' : '待提交'" :tone="approval.status === 'approved' ? 'success' : 'warning'" /></header><div class="response-table"><div class="table-head"><span>判级指标</span><span>当前值</span><span>III级阈值</span><span>II级阈值</span><span>触发结果</span></div><div v-for="item in response.indicators" :key="item.key"><strong>{{ item.label }}</strong><span>{{ item.pending ? '待定（需先算预算）' : `${item.value.toLocaleString()} ${item.unit}` }}</span><span>≥{{ item.level3.toLocaleString() }}</span><span>≥{{ item.level2.toLocaleString() }}</span><StatusBadge :label="item.pending ? '暂按III级' : `${item.level}级`" :tone="item.pending ? 'warning' : item.level === 'II' ? 'danger' : item.level === 'III' ? 'warning' : 'neutral'" /></div></div><p class="threshold-note">统计触发条件数量：{{ response.level3OrAboveCount }} 项触发 III 级及以上，其中 {{ response.level2Count }} 项触发 II 级{{ response.indicators.some((item) => item.pending) ? '；救灾资金缺口暂按 III 级列示，不计入触发统计' : '' }}。</p><div class="approval-actions"><button class="primary-button" type="button" @click="submitApproval"><FileCheck2 :size="15" />提交响应审批</button><button v-if="approval.status !== 'pending'" class="secondary-button" type="button" @click="approvalOpen = true"><FileCheck2 :size="15" />查看审批记录</button></div></article>
      </section>
    </template>
    <BaseModal :open="approvalOpen" title="响应等级审批" description="应急预算绩效岗提交，财务主管统筹岗审核确认" width="720px" @close="approvalOpen = false"><div class="approval-summary"><div><span>建议响应</span><strong>{{ response.level }}级</strong></div><div><span>对应方案</span><strong>{{ response.planId }}方案</strong></div><div><span>预算上限</span><strong>{{ formatCurrency(budgetScenarios.find((item) => item.id === response.planId).total) }}</strong></div><div><span>当前状态</span><StatusBadge :label="approval.status === 'approved' ? '审核通过' : '待财务主管审批'" :tone="approval.status === 'approved' ? 'success' : 'warning'" /></div></div><pre v-if="approval.status === 'approved'" class="report-preview compact">{{ approvalReport }}</pre><template #footer><button class="secondary-button" type="button" @click="approvalOpen = false">关闭</button><button v-if="approval.status !== 'approved'" class="primary-button" type="button" @click="approveResponse"><Check :size="15" />确认审批</button><button v-else class="primary-button" type="button" @click="downloadApproval"><Download :size="15" />下载审批记录</button></template></BaseModal>
  </div>
</template>
