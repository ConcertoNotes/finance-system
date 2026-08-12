<script setup>
import { computed, reactive, ref } from 'vue'
import {
  AlertTriangle, ArrowRight, BadgeCheck, Check, ClipboardList, Download, FileCheck2, FileSignature,
  LockKeyhole, PackageCheck, RotateCcw, Scale, ShieldCheck, ShoppingCart, Siren, Truck,
} from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import InsuranceCalcSteps from '../components/InsuranceCalcSteps.vue'
import RoleTaskPanel from '../components/RoleTaskPanel.vue'
import SplitSolverPanel from '../components/SplitSolverPanel.vue'
import StageHandoverPanel from '../components/StageHandoverPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import SupplierScoreSteps from '../components/SupplierScoreSteps.vue'
import { coverageScoreRules, insuranceCriteria, insuranceProducts, insuranceWeights } from '../data/procurement.js'
import {
  contractControls, deliveryBoard, directPriceControls, directPurchaseOrder, emergencyQuotes,
  executionPaths, fundControlChecks, gridPriorityOrder, gridTransfers, handoverStage2, incidentDecision,
  incidentDirectives, incidentOutputs, incidentSteps, initialContracts, materialRequirements,
  priceAlertThresholds, priceBenchmarkOutputs, priceBenchmarkSteps, priceQuotes, requirementFormula,
  requirementSteps, shelterPlan, splitModel, stage2BudgetCeiling, supplierCriteria, supplierIncident,
  supplierProfiles, supplierReviewChecks, supplierWeights, tentAvailability, transferRule,
} from '../data/procurementStage2.js'
import { getRoleTaskById, getRoleTasksByView, getStageHandover } from '../data/roleplay.js'
import { calculateInsuranceScores, formatCurrency } from '../domain/finance.js'
import {
  buildDirectPriceChecks, buildPriceBenchmarks, calculateChangeImpact, calculateEmergencyQuote,
  calculateNetRequirements, contractTotal, evaluateSplitCombos, getContractPortfolio, scoreSuppliers,
  solveSplitModel,
} from '../domain/procurementLogic.js'
import { buildContractChangeReport, buildInsuranceReport, downloadTextFile } from '../domain/workflowArtifacts.js'

const props = defineProps({
  stage: { type: String, default: 'baseline' },
  workflowState: { type: Object, default: () => ({ insuranceApproval: { status: 'draft', productId: 'II' }, contractChange: { status: 'pending' } }) },
})
const emit = defineEmits(['toast', 'workflow-action', 'task-completed'])
const activeTab = ref('demand')
const insuranceModalOpen = ref(false)
const changeModalOpen = ref(false)
const benchmarkLocked = ref(false)

const tabs = [
  { id: 'demand', label: '采购需求' },
  { id: 'pricing', label: '价格基准' },
  { id: 'suppliers', label: '供应商评分' },
  { id: 'contracts', label: '合同管理' },
  { id: 'incident', label: '突发处置' },
  { id: 'insurance', label: '保险比选' },
]

// 当前功能标签对应的任务与岗位原文分工（保险比选对应第一阶段任务8）
const roleTasks = computed(() => getRoleTasksByView('procurement', activeTab.value))
const stageHandover = getStageHandover(2)

// 阶段移交卡里的任务编号可直接跳到承接该口径的功能标签
function jumpToTask(taskId) {
  const target = getRoleTaskById(taskId)
  if (!target || target.view !== 'procurement') {
    emit('toast', `任务 ${taskId} 位于${target?.stageLabel ?? '其他阶段'}，请在应急协同页按任务索引查看`)
    return
  }
  activeTab.value = target.tab
  emit('toast', `已定位到任务 ${taskId}：${target.title}`)
}

// 任务1：采购需求——参数可调，净采购量实时重算
const requirementInputs = reactive(materialRequirements.map((item) => ({ ...item })))
const netById = computed(() => Object.fromEntries(
  calculateNetRequirements(requirementInputs).map((row) => [row.id, row.net]),
))
const contractInputs = computed(() => requirementInputs.filter((item) => item.channel === 'contract'))
const directInputs = computed(() => requirementInputs.filter((item) => item.channel === 'direct'))
const requirementDirty = computed(() => requirementInputs.some((item, index) => {
  const origin = materialRequirements[index]
  return ['demand', 'stock', 'transit', 'donated', 'transferable'].some((key) => item[key] !== origin[key])
}))

// 任务2：价格基准——4类合同物资比价 + 2类生活保障直采控制价核验
const quoteInputs = reactive(priceQuotes.map((quote) => ({ ...quote })))
const benchmarks = computed(() => buildPriceBenchmarks(quoteInputs, priceAlertThresholds))
const directChecks = computed(() => buildDirectPriceChecks(directPriceControls, priceAlertThresholds))
const quotesDirty = computed(() => quoteInputs.some((quote, index) =>
  ['history', 'market', 's1', 's2', 's3'].some((key) => quote[key] !== priceQuotes[index][key])))
const tentBenchmark = computed(() => benchmarks.value.find((row) => row.id === 'tent'))

// 任务3：供应商评分——权重可调，SUMPRODUCT 实时重算
const weightState = reactive({ ...supplierWeights })
const supplierScores = computed(() => scoreSuppliers(supplierProfiles, weightState))
const supplierWeightTotal = computed(() => Object.values(weightState).reduce((sum, value) => sum + value, 0))
const weightValid = computed(() => Math.abs(supplierWeightTotal.value - 1) < 0.001)
const scoredCriteria = computed(() => supplierCriteria.map((criterion) => ({
  ...criterion,
  weight: `${(weightState[criterion.key] * 100).toFixed(0)}%`,
})))

// 任务4/6：采购执行台账（合同采购与生活保障直采分列，随突发事件处置状态联动）
const changeResolved = computed(() => props.workflowState.contractChange?.status === 'resolved')
const portfolio = computed(() => getContractPortfolio(initialContracts, directPurchaseOrder, changeResolved.value, stage2BudgetCeiling))
const changeImpact = computed(() => calculateChangeImpact())
const changeReport = computed(() => buildContractChangeReport(props.workflowState.contractChange ?? { status: 'pending' }))
const ht001Items = computed(() => initialContracts[0].items.map((item) => ({
  ...item,
  actualQty: changeResolved.value && item.name === '帐篷' ? 350 : item.qty,
})))

// 任务5：突发事件——紧急询价与混合整数规划求解
const emergencyQuoteRows = computed(() => emergencyQuotes.map((quote) => calculateEmergencyQuote(quote, splitModel.demand)))
const s1Quote = computed(() => emergencyQuoteRows.value[0])
const s3Quote = computed(() => emergencyQuoteRows.value[1])
const combos = computed(() => evaluateSplitCombos(splitModel.combos, s1Quote.value, s3Quote.value))
const solverResult = computed(() => solveSplitModel(emergencyQuoteRows.value, splitModel.demand, 12))
const solverSolution = computed(() => ({
  ...splitModel.solution,
  cost: solverResult.value.best.cost,
  saving: solverResult.value.saving,
  allocation: solverResult.value.best.allocation,
}))

// 保险比选（第一阶段既有能力）
const weights = reactive({ ...insuranceWeights })
const scores = computed(() => calculateInsuranceScores(insuranceProducts, weights))
const weightTotal = computed(() => Object.values(weights).reduce((sum, value) => sum + value, 0))
const insuranceApproval = computed(() => props.workflowState.insuranceApproval)
const insuranceReport = computed(() => buildInsuranceReport(insuranceApproval.value))

function resetRequirements() {
  requirementInputs.forEach((item, index) => Object.assign(item, materialRequirements[index]))
  emit('toast', '物资需求参数已恢复为9网格需求清单口径')
}

function downloadRequirements() {
  const header = ['物资', '执行路径', '网格总需求', '现有库存', '在途', '已确认捐赠', '可调拨', '净采购量']
  const rows = requirementInputs.map((item) => [
    item.name, item.channel === 'contract' ? '合同采购' : '生活保障直采',
    item.demand, item.stock, item.transit, item.donated, item.transferable, netById.value[item.id],
  ])
  downloadTextFile('物资需求测算表.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('task-completed', 9)
  emit('toast', '物资需求测算表已下载：4类合同采购物资进入供应商遴选，2类生活保障物资转应急零售直采')
}

function resetQuotes() {
  quoteInputs.forEach((quote, index) => Object.assign(quote, priceQuotes[index]))
  emit('toast', '供应商报价已恢复为询价原始数据')
}

function lockBenchmark() {
  benchmarkLocked.value = true
  emit('task-completed', 10)
  emit('toast', '4类合同物资价格基准与2类生活保障直采控制价已写入采购控制平台：黄色预警 5%、红色预警 10%')
}

function resetSupplierWeights() {
  Object.assign(weightState, supplierWeights)
  emit('toast', '供应商评分权重已恢复为文档标准：报价40% 交付20% 质量15% 资质10% 履约10% 距离5%')
}

function confirmSuppliers() {
  if (!weightValid.value) {
    emit('toast', `权重合计 ${(supplierWeightTotal.value * 100).toFixed(0)}%，需调整为 100% 后才能确认遴选结果`)
    return
  }
  emit('task-completed', 11)
  emit('toast', `已确认 ${supplierScores.value[0].id} 为主供应商、${supplierScores.value[1].id} 第一备选、${supplierScores.value[2].id} 兜底供应商`)
}

function approveInitialContracts() {
  emit('task-completed', 12)
  emit('toast', `初始合同与直采方案审批通过：占用 ${formatCurrency(portfolio.value.total)}，预算占用率 ${portfolio.value.occupancyRate}%`)
}

function downloadDirectLedger() {
  const header = ['物资', '数量', '控制价', '金额', '核验要点']
  const rows = directChecks.value.map((row) => [
    row.name, `${row.qty}箱`, `${row.control}${row.unit}`, row.amount, directPurchaseOrder.controls.join('/'),
  ])
  downloadTextFile('生活保障物资直采台账.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('toast', '生活保障直采台账已下载，付款前以框架协议或采购审批单+订单作为合同流依据')
}

function resolveIncident() {
  emit('workflow-action', { action: 'resolve-contract-change', payload: { approver: '财务主管统筹岗' } })
  emit('task-completed', 13)
  emit('toast', '组合处置方案已批准：HT-001 变更 + HT-003 分单 + 调拨 50 顶，预备费列支 9,750 元')
  changeModalOpen.value = true
}

function downloadChangeReport() {
  downloadTextFile('HT-001合同变更单与HT-003紧急分单合同.txt', changeReport.value)
  emit('toast', '合同变更单据已下载')
}

function completeHandover() {
  emit('task-completed', 14)
  emit('toast', '第二阶段移交完成，启动第三阶段资金匹配、验收核验与支付控制')
}

function resetWeights() {
  Object.assign(weights, insuranceWeights)
  emit('toast', '保险指标权重已恢复为文档标准')
}

function submitInsurance() {
  emit('workflow-action', { action: 'submit-insurance', payload: { submitter: '采购成本保障岗', productId: scores.value[0].id } })
  emit('toast', '保险II方案已提交财务主管统筹岗')
  insuranceModalOpen.value = true
}

function approveInsurance() {
  emit('workflow-action', { action: 'approve-insurance', payload: { approver: '财务主管统筹岗' } })
  emit('task-completed', 8)
  emit('toast', '保险II方案审批通过，已纳入保险支出专项科目')
}

function downloadInsuranceReport() {
  downloadTextFile('救援人员保险比选报告.txt', insuranceReport.value)
  emit('toast', '救援人员保险比选报告已下载')
}
</script>

<template>
  <div class="page-content procurement-page">
    <section class="page-intro">
      <div>
        <p class="eyebrow">STAGE 2 · PROCUREMENT &amp; COST ASSURANCE</p>
        <h1>采购与成本</h1>
        <p>灾后1—6小时：应急采购、价格控制与合同决策</p>
      </div>
      <div class="tab-switch wrap">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
      </div>
    </section>

    <StageHandoverPanel v-if="activeTab === 'demand'" :handover="stageHandover" @jump-task="jumpToTask" />
    <RoleTaskPanel v-if="roleTasks.length" :tasks="roleTasks" />

    <template v-if="activeTab === 'demand'">
      <section class="shelter-strip">
        <article class="panel shelter-fact"><span>转移安置总人数</span><strong>{{ shelterPlan.relocated.toLocaleString() }} 人</strong><p>9 网格合计</p></article>
        <article class="panel shelter-fact"><span>固定场所安置</span><strong>{{ shelterPlan.fixedSheltered.toLocaleString() }} 人</strong><p>{{ shelterPlan.fixedShelterTypes.join('、') }}</p></article>
        <article class="panel shelter-fact highlight"><span>甲3、甲6帐篷安置</span><strong>{{ shelterPlan.tentSheltered.toLocaleString() }} 人</strong><p>{{ shelterPlan.formula }}</p></article>
        <article class="panel shelter-fact"><span>帐篷重点保障需求</span><strong>{{ shelterPlan.tentDemand }} 顶</strong><p>现有 {{ tentAvailability.onHand }} 顶与在途 {{ tentAvailability.inTransit }} 顶已锁定，不可冲减</p></article>
      </section>

      <section class="panel tent-verify-panel">
        <header class="panel-header">
          <div><p class="section-index">STEP 2 · TENT AVAILABILITY</p><h3>帐篷可用量核验</h3></div>
          <StatusBadge label="重点网格需求不可冲减" tone="warning" />
        </header>
        <div class="verify-grid">
          <div><span>现有帐篷</span><strong>{{ tentAvailability.onHand }} 顶</strong><small>已锁定：{{ tentAvailability.lockedFor }}</small></div>
          <div><span>在途帐篷</span><strong>{{ tentAvailability.inTransit }} 顶</strong><small>同步锁定用于基础保障与安全库存</small></div>
          <div><span>已确认捐赠</span><strong>{{ tentAvailability.donated }} 顶</strong><small>暂无帐篷类捐赠到账</small></div>
          <div><span>可调拨量</span><strong>{{ tentAvailability.transferable }} 顶</strong><small>初始测算时不计入冲减</small></div>
        </div>
        <div class="formula-line"><code>{{ tentAvailability.formula }}</code></div>
      </section>

      <section class="panel requirement-panel">
        <header class="panel-header">
          <div><p class="section-index">TASK 1 · NET REQUIREMENT</p><h3>物资需求测算表（参数可调，净采购量实时重算）</h3></div>
          <div class="panel-actions">
            <StatusBadge label="MAX(0, 需求−库存−在途−捐赠−调拨)" tone="info" />
            <button v-if="requirementDirty" class="secondary-button" type="button" @click="resetRequirements"><RotateCcw :size="14" />恢复原始口径</button>
            <button class="primary-button" type="button" @click="downloadRequirements"><Download :size="15" />下载测算表</button>
          </div>
        </header>
        <div class="data-table-wrap">
          <table class="data-table editable-table">
            <thead>
              <tr><th>物资</th><th>网格总需求</th><th>现有库存</th><th>在途</th><th>已确认捐赠</th><th>可调拨</th><th>净采购量</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr class="channel-divider"><td colspan="8"><ClipboardList :size="13" />合同采购路径 · 纳入 HT-2025-001 主合同与供应商遴选</td></tr>
              <tr v-for="row in contractInputs" :key="row.id">
                <td><strong>{{ row.name }}</strong><small class="unit-hint">{{ row.unit }}</small></td>
                <td><input v-model.number="row.demand" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.stock" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.transit" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.donated" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.transferable" type="number" min="0" class="cell-input" /></td>
                <td><strong class="net-qty">{{ netById[row.id].toLocaleString() }} {{ row.unit }}</strong></td>
                <td class="table-note">{{ row.note || '—' }}</td>
              </tr>
              <tr class="channel-divider direct"><td colspan="8"><ShoppingCart :size="13" />生活保障直采路径 · 大型商超应急零售 / 框架协议直采，不纳入供应商遴选</td></tr>
              <tr v-for="row in directInputs" :key="row.id">
                <td><strong>{{ row.name }}</strong><small class="unit-hint">{{ row.unit }}</small></td>
                <td><input v-model.number="row.demand" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.stock" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.transit" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.donated" type="number" min="0" class="cell-input" /></td>
                <td><input v-model.number="row.transferable" type="number" min="0" class="cell-input" /></td>
                <td><strong class="net-qty">{{ netById[row.id].toLocaleString() }} {{ row.unit }}</strong></td>
                <td class="table-note">{{ row.note || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="formula-line">
          <code>{{ requirementFormula }}</code>
          <span>SUMIFS 按网格汇总需求 · XLOOKUP 匹配库存与捐赠 · MAX 计算净采购量 · 条件格式标识超预算项目。总需求由前序灾情数据和保障标准形成，不根据供应商报价反推。</span>
        </div>
      </section>

      <section class="two-column-layout">
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">FIVE-STEP CALCULATION</p><h3>需求测算五步法</h3></div><ClipboardList :size="19" /></header>
          <ol class="numbered-steps">
            <li v-for="step in requirementSteps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p></div></li>
          </ol>
        </article>
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">EXECUTION PATHS</p><h3>两类执行路径</h3></div><PackageCheck :size="19" /></header>
          <div class="path-cards">
            <div v-for="path in executionPaths" :key="path.id" class="path-card" :class="path.id">
              <div><strong>{{ path.title }}</strong><StatusBadge :label="path.id === 'contract' ? '供应商遴选' : '直采免遴选'" :tone="path.id === 'contract' ? 'info' : 'success'" /></div>
              <span>{{ path.subtitle }}</span>
              <div class="path-materials"><i v-for="material in path.materials" :key="material">{{ material }}</i></div>
              <p>{{ path.control }}</p>
            </div>
          </div>
          <div class="priority-chain">
            <template v-for="(grid, index) in gridPriorityOrder" :key="grid">
              <span class="priority-node" :class="{ top: index < 2 }">{{ grid }}</span><i v-if="index < gridPriorityOrder.length - 1">&gt;</i>
            </template>
          </div>
          <p class="priority-note">按保障优先级安排采购与配送顺序，甲3、甲6 重点网格 12 小时内送达。</p>
        </article>
      </section>
    </template>

    <template v-else-if="activeTab === 'pricing'">
      <section class="panel benchmark-panel">
        <header class="panel-header">
          <div><p class="section-index">TASK 2 · PRICE BENCHMARK</p><h3>4 类合同物资供应商比价基准（报价可调）</h3></div>
          <div class="panel-actions">
            <StatusBadge :label="`黄色预警 ${priceAlertThresholds.yellow}% · 红色预警 ${priceAlertThresholds.red}%`" tone="warning" />
            <button v-if="quotesDirty" class="secondary-button" type="button" @click="resetQuotes"><RotateCcw :size="14" />恢复原始报价</button>
            <button class="primary-button" type="button" :disabled="benchmarkLocked" @click="lockBenchmark"><LockKeyhole :size="15" />{{ benchmarkLocked ? '已写入控制平台' : '立即锁价并写入平台' }}</button>
          </div>
        </header>
        <div class="data-table-wrap">
          <table class="data-table benchmark-table editable-table">
            <thead>
              <tr><th>物资</th><th>历史价</th><th>市场参考价</th><th>S1报价</th><th>S2报价</th><th>S3报价</th><th>综合基准价</th><th>S1偏差</th><th>S2偏差</th><th>S3偏差</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in benchmarks" :key="row.id">
                <td><strong>{{ row.name }}</strong><small class="unit-hint">{{ row.unit }}</small></td>
                <td><input v-model.number="quoteInputs[index].history" type="number" min="0" step="0.5" class="cell-input" /></td>
                <td><input v-model.number="quoteInputs[index].market" type="number" min="0" step="0.5" class="cell-input" /></td>
                <td><input v-model.number="quoteInputs[index].s1" type="number" min="0" step="0.5" class="cell-input" /></td>
                <td><input v-model.number="quoteInputs[index].s2" type="number" min="0" step="0.5" class="cell-input" /></td>
                <td><input v-model.number="quoteInputs[index].s3" type="number" min="0" step="0.5" class="cell-input" /></td>
                <td><strong class="net-qty">{{ row.base }}</strong><small class="unit-hint">均价 {{ row.average }} · 中位 {{ row.median }}</small></td>
                <td v-for="supplier in row.suppliers" :key="supplier.id"><span class="deviation-chip" :class="supplier.alert">{{ supplier.deviation > 0 ? '+' : '' }}{{ supplier.deviation }}%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="benchmark-note">
          <ShieldCheck :size="16" />
          <p>综合基准价 =（历史价 + 市场价 + S1 + S2 有效报价）÷ 4，避免异常高价拉高基准。以帐篷为例：(850+820+880+835)÷4 = {{ tentBenchmark.base }} 元；S3 报价 {{ tentBenchmark.s3 }} 元偏差 {{ tentBenchmark.suppliers[2].deviation }}% 超过 10%，启动重点复核——报价有效但经济性较弱，列为高价备选供应商，不判定为违规报价。</p>
        </div>
      </section>

      <section class="panel direct-price-panel">
        <header class="panel-header">
          <div><p class="section-index">RETAIL / FRAMEWORK CONTROL</p><h3>2 类生活保障物资应急零售 / 框架协议直采价格核验</h3></div>
          <div class="panel-actions">
            <StatusBadge label="不纳入 S1、S2、S3 供应商评分" tone="neutral" />
            <button class="secondary-button" type="button" @click="downloadDirectLedger"><Download :size="14" />下载直采台账</button>
          </div>
        </header>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>物资</th><th>历史价</th><th>市场参考价</th><th>核验基准</th><th>直采控制价</th><th>偏差</th><th>采购量</th><th>直采金额</th><th>留存凭证</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in directChecks" :key="row.id">
                <td><strong>{{ row.name }}</strong><small class="unit-hint">{{ row.unit }}</small></td>
                <td>{{ row.history }}</td>
                <td>{{ row.market }}</td>
                <td>{{ row.base }}</td>
                <td><strong class="net-qty">{{ row.control }}</strong></td>
                <td><span class="deviation-chip" :class="row.alert">{{ row.deviation > 0 ? '+' : '' }}{{ row.deviation }}%</span></td>
                <td>{{ row.qty.toLocaleString() }} 箱</td>
                <td><strong>{{ formatCurrency(row.amount) }}</strong></td>
                <td class="table-note">{{ row.evidence }}</td>
              </tr>
              <tr class="summary-row">
                <td colspan="7"><strong>生活保障直采金额合计</strong></td>
                <td><strong class="net-qty">{{ formatCurrency(portfolio.directAmount) }}</strong></td>
                <td class="table-note">629×23.5 + 1,704×79 = 149,397.50 元</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="priority-note">食品、饮用水按含税零售价 / 框架协议结算价核验，配送费如单独发生则单列，避免与货价混同；如已有框架协议则按协议直接下单，不纳入供应商综合遴选和主合同打包。</p>
      </section>

      <section class="two-column-layout">
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">SIX-STEP CONTROL</p><h3>价格基准六步法</h3></div><Scale :size="19" /></header>
          <ol class="numbered-steps"><li v-for="step in priceBenchmarkSteps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p></div></li></ol>
        </article>
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">DELIVERABLES</p><h3>任务输出与口径</h3></div><FileCheck2 :size="19" /></header>
          <div class="output-chips"><span v-for="output in priceBenchmarkOutputs" :key="output"><FileCheck2 :size="13" />《{{ output }}》</span></div>
          <div class="calc-sample">
            <div><span>帐篷平均价</span><code>({{ tentBenchmark.s1 }}+{{ tentBenchmark.s2 }}+{{ tentBenchmark.s3 }})÷3</code><strong>{{ tentBenchmark.average }} 元</strong></div>
            <div><span>中位数 / 区间</span><code>MEDIAN / MIN—MAX</code><strong>{{ tentBenchmark.median }} 元 · {{ tentBenchmark.range[0] }}—{{ tentBenchmark.range[1] }} 元</strong></div>
            <div><span>偏差率公式</span><code>(报价−基准)÷基准×100%</code><strong>超 10% 重点复核</strong></div>
          </div>
          <p class="priority-note">4 类合同采购物资的供应商报价统一转换为含税货物单价；运输费用和应急人工成本单独列示。后续合同变更、紧急分单或商超临时补货均须重新校验价格基准。</p>
        </article>
      </section>
    </template>

    <template v-else-if="activeTab === 'suppliers'">
      <section class="panel supplier-score-panel">
        <header class="panel-header">
          <div><p class="section-index">TASK 3 · WEIGHTED SCORING</p><h3>供应商综合评分（SUMPRODUCT 加权，权重可调）</h3></div>
          <div class="panel-actions">
            <StatusBadge :label="`权重合计 ${(supplierWeightTotal * 100).toFixed(0)}%`" :tone="weightValid ? 'info' : 'danger'" />
            <button class="secondary-button" type="button" @click="resetSupplierWeights"><RotateCcw :size="14" />恢复标准权重</button>
            <button class="primary-button" type="button" @click="confirmSuppliers"><Check :size="15" />确认遴选结果</button>
          </div>
        </header>
        <div class="weight-slider-row">
          <label v-for="criterion in supplierCriteria" :key="criterion.key">
            <div><span>{{ criterion.label }}</span><strong>{{ (weightState[criterion.key] * 100).toFixed(0) }}%</strong></div>
            <input v-model.number="weightState[criterion.key]" type="range" min="0" max="0.6" step="0.05" />
          </label>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>供应商</th><th v-for="criterion in scoredCriteria" :key="criterion.key">{{ criterion.label }}<small class="unit-hint">{{ criterion.weight }}</small></th><th>综合得分</th><th>定位</th></tr>
            </thead>
            <tbody>
              <tr v-for="(supplier, index) in supplierScores" :key="supplier.id" :class="{ 'selected-row': index === 0 }">
                <td><strong>{{ supplier.name }}</strong><small class="unit-hint">承诺 {{ supplier.deliveryPromise }} 交付</small></td>
                <td v-for="criterion in supplierCriteria" :key="criterion.key">{{ supplier[criterion.key] }}</td>
                <td><strong class="score-figure">{{ supplier.score.toFixed(1) }}</strong></td>
                <td><StatusBadge :label="supplier.position" :tone="index === 0 ? 'success' : index === 1 ? 'info' : 'neutral'" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="formula-line">
          <code>=SUMPRODUCT(指标标准分区域, 权重区域)</code>
          <span>报价得分按 4 类合同物资综合报价测算，食品、饮用水通过大型商超应急零售 / 框架协议直采，不参与本次评分。</span>
        </div>
      </section>

      <SupplierScoreSteps :profiles="supplierProfiles" :weights="weightState" :criteria="scoredCriteria" />

      <section class="review-check-grid">
        <article v-for="check in supplierReviewChecks" :key="check.role" class="panel review-check-card"><StatusBadge :label="check.role" tone="info" /><p>{{ check.text }}</p><BadgeCheck :size="18" /></article>
      </section>
    </template>

    <template v-else-if="activeTab === 'contracts'">
      <section class="panel contract-panel">
        <header class="panel-header">
          <div><p class="section-index">TASK 4 / 6 · EXECUTION LEDGER</p><h3>采购执行台账与预算占用</h3></div>
          <div class="panel-actions">
            <StatusBadge :label="`${changeResolved ? '变更后' : '初始'}采购执行合计 ${formatCurrency(portfolio.total)}`" :tone="changeResolved ? 'warning' : 'info'" />
            <button class="primary-button" type="button" @click="approveInitialContracts"><FileSignature :size="15" />审批初始合同与直采方案</button>
          </div>
        </header>
        <div class="contract-cards">
          <article v-for="contract in [...portfolio.contracts, portfolio.direct]" :key="contract.id" class="contract-card" :class="{ changed: contract.id === 'HT-2025-001' && changeResolved, emergency: contract.id === 'HT-2025-003', direct: contract.kind === 'direct' }">
            <div class="contract-head"><strong>{{ contract.id }}</strong><StatusBadge :label="contract.supplier" tone="neutral" /></div>
            <span>{{ contract.name }}</span>
            <strong class="contract-amount">{{ formatCurrency(contract.amount) }}</strong>
            <p>{{ contract.status }}</p>
          </article>
        </div>
        <div class="occupancy-line">
          <div><span>合同采购小计</span><strong>{{ formatCurrency(portfolio.contractSubtotal) }}</strong></div>
          <div><span>生活保障直采</span><strong>{{ formatCurrency(portfolio.directAmount) }}</strong></div>
          <div><span>采购执行合计</span><strong>{{ formatCurrency(portfolio.total) }}</strong></div>
          <div><span>C 方案预算上限<small class="unit-hint">阶段二复核口径</small></span><strong>{{ formatCurrency(stage2BudgetCeiling) }}</strong></div>
          <div><span>预算占用率</span><strong>{{ portfolio.occupancyRate }}%</strong></div>
          <div class="occupancy-track"><i :style="{ width: `${portfolio.occupancyRate}%` }" /></div>
        </div>
      </section>

      <section class="two-column-layout">
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">HT-2025-001 DETAIL</p><h3>主合同物资明细（S2 统一供货）</h3></div><PackageCheck :size="19" /></header>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>物资</th><th>数量</th><th>合同单价</th><th>金额</th></tr></thead>
              <tbody>
                <tr v-for="item in ht001Items" :key="item.name">
                  <td><strong>{{ item.name }}</strong></td>
                  <td>{{ item.actualQty.toLocaleString() }} {{ item.unit }}<small v-if="item.actualQty !== item.qty" class="unit-hint">变更前 {{ item.qty }} {{ item.unit }}</small></td>
                  <td>{{ item.price }} 元</td>
                  <td>{{ formatCurrency(item.actualQty * item.price) }}</td>
                </tr>
                <tr class="summary-row"><td colspan="3"><strong>合同金额合计</strong></td><td><strong class="net-qty">{{ formatCurrency(portfolio.contracts[0].amount) }}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p class="priority-note">食品、饮用水不纳入该供应商采购合同，按应急零售 / 框架协议直采规则单独执行。</p>
        </article>
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">DIRECT PURCHASE</p><h3>生活保障直采台账</h3></div><ShoppingCart :size="19" /></header>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>物资</th><th>数量</th><th>控制价</th><th>金额</th></tr></thead>
              <tbody>
                <tr v-for="item in directPurchaseOrder.items" :key="item.name">
                  <td><strong>{{ item.name }}</strong></td>
                  <td>{{ item.qty.toLocaleString() }} {{ item.unit }}</td>
                  <td>{{ item.price }} 元</td>
                  <td>{{ formatCurrency(item.qty * item.price) }}</td>
                </tr>
                <tr class="summary-row"><td colspan="3"><strong>直采金额合计</strong></td><td><strong class="net-qty">{{ formatCurrency(portfolio.directAmount) }}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <div class="output-chips"><span v-for="control in directPurchaseOrder.controls" :key="control"><Check :size="13" />{{ control }}</span></div>
        </article>
      </section>

      <section class="two-column-layout">
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">CONTROL TERMS</p><h3>合同控制条款</h3></div><ShieldCheck :size="19" /></header>
          <ul class="term-list"><li v-for="term in contractControls" :key="term"><Check :size="14" />{{ term }}</li></ul>
          <div class="handover-block">
            <strong>第二阶段移交</strong>
            <p>采购移交：{{ handoverStage2.procurement.slice(0, 4).join('、') }} 等 {{ handoverStage2.procurement.length }} 项</p>
            <p>预算移交：{{ handoverStage2.budget.join('、') }}</p>
            <p>{{ handoverStage2.closing }}</p>
            <button class="secondary-button" type="button" @click="completeHandover"><ArrowRight :size="15" />完成阶段移交</button>
          </div>
        </article>
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">FUND CONTROL</p><h3>资金核算风控岗核验要求</h3></div><FileCheck2 :size="19" /></header>
          <ul class="term-list"><li v-for="check in fundControlChecks" :key="check"><Check :size="14" />{{ check }}</li></ul>
          <div class="calc-sample">
            <div><span>HT-001 申请</span><code>500×835+6604×64+468×74+324×178</code><strong>932,460 元</strong></div>
            <div><span>直采申请</span><code>629×23.5+1704×79</code><strong>149,397.50 元</strong></div>
            <div><span>初始预算占用</span><code>932460+149397.50</code><strong>1,081,857.50 元</strong></div>
          </div>
        </article>
      </section>
    </template>

    <template v-else-if="activeTab === 'incident'">
      <section class="incident-banner" :class="{ resolved: changeResolved }">
        <Siren :size="22" />
        <div><strong>第二次突发事件 · 供应商库存突变</strong><p>{{ supplierIncident.alert }}</p><small>核验结论：{{ supplierIncident.verification }}</small></div>
        <StatusBadge :label="changeResolved ? '已处置闭环' : '待组合处置'" :tone="changeResolved ? 'success' : 'danger'" dot />
      </section>

      <section class="metric-grid metric-grid-4">
        <article class="panel shelter-fact"><span>12 小时保障缺口</span><strong>{{ supplierIncident.gap12h }} 顶</strong><p>500 − 300 = 200 顶</p></article>
        <article class="panel shelter-fact"><span>最终合同供应缺口</span><strong>{{ supplierIncident.contractGap }} 顶</strong><p>500 − 350 = 150 顶</p></article>
        <article class="panel shelter-fact highlight"><span>影响安置人数</span><strong>{{ supplierIncident.affectedPeople }} 人</strong><p>200 顶 × 4 人/顶，不调整则到位率仅 {{ supplierIncident.firstBatchRate }}%</p></article>
        <article class="panel shelter-fact"><span>网格可调拨</span><strong>50 顶</strong><p>甲1 20 + 甲2 15 + 甲8 15，2 小时到达，可暂时保障 200 人</p></article>
      </section>

      <section class="panel quote-panel">
        <header class="panel-header">
          <div><p class="section-index">EMERGENCY QUOTES</p><h3>S1 / S3 紧急询价与订单级固定附加成本</h3></div>
          <StatusBadge label="固定成本不按采购量线性分摊" tone="warning" />
        </header>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>供应商</th><th>可供量</th><th>货物报价</th><th>到货</th><th>车辆应急</th><th>装卸人工</th><th>订单固定成本</th><th>满量综合成本</th><th>综合单价</th></tr></thead>
            <tbody>
              <tr v-for="quote in emergencyQuoteRows" :key="quote.id" :class="{ 'selected-row': quote.id === 'S1' }">
                <td><strong>{{ quote.id }}</strong></td>
                <td>{{ quote.capacity }} 顶</td>
                <td>{{ quote.price }} 元/顶</td>
                <td>{{ quote.arrival }}</td>
                <td>{{ formatCurrency(quote.vehicleExtra) }}<small class="unit-hint">{{ quote.vehicles }}辆×{{ quote.vehicleHours }}h×{{ quote.vehicleRate }}元</small></td>
                <td>{{ formatCurrency(quote.laborExtra) }}<small class="unit-hint">{{ quote.workers }}人×{{ quote.workerHours }}h×{{ quote.workerRate }}元</small></td>
                <td><strong>{{ formatCurrency(quote.fixedCost) }}</strong></td>
                <td><strong>{{ formatCurrency(quote.landedCost) }}</strong><small class="unit-hint">按 {{ quote.qty }} 顶测算</small></td>
                <td>{{ quote.unitLandedCost }} 元/顶</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="formula-line"><code>综合到岸成本 = 货物金额 + 车辆应急增加成本 + 装卸人工增加成本</code><span>{{ splitModel.fixedCostNote }}</span></div>
      </section>

      <SplitSolverPanel :quotes="emergencyQuoteRows" :model="splitModel" :solution="solverSolution" @toast="emit('toast', $event)" />

      <section class="two-column-layout">
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">COMBINATION COMPARISON</p><h3>四种可行组合成本比较</h3></div><Scale :size="19" /></header>
          <div class="combo-grid">
            <article v-for="combo in combos" :key="combo.id" class="combo-card" :class="{ optimal: combo.optimal }">
              <span>方案{{ combo.id }}</span>
              <p>S1 {{ combo.s1 }} 顶 · S3 {{ combo.s3 }} 顶</p>
              <strong>{{ formatCurrency(combo.cost) }}</strong>
              <small class="unit-hint">货物 {{ formatCurrency(combo.goods) }} + 固定 {{ formatCurrency(combo.fixed) }}（y1={{ combo.y1 }}、y3={{ combo.y3 }}）</small>
              <StatusBadge v-if="combo.optimal" :label="`规划求解最优 · 节约 ${formatCurrency(combo.saving)}`" tone="success" dot />
              <StatusBadge v-else :label="`高于最优 ${formatCurrency(combo.gapToBest)}`" tone="neutral" />
            </article>
          </div>
          <div class="transfer-list"><span v-for="transfer in gridTransfers" :key="`${transfer.from}-${transfer.to}`"><ArrowRight :size="13" />{{ transfer.from }} 调出 {{ transfer.qty }} 顶 → {{ transfer.to }}</span></div>
          <p class="priority-note">{{ transferRule }}</p>
        </article>
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">RESPONSE FLOW</p><h3>十六步处置流程</h3></div><StatusBadge :label="changeResolved ? '16/16 完成' : '处置中'" :tone="changeResolved ? 'success' : 'warning'" /></header>
          <ol class="numbered-steps dense"><li v-for="step in incidentSteps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}<i class="step-role">{{ step.role }}</i></strong><p>{{ step.detail }}</p></div></li></ol>
        </article>
      </section>

      <section class="panel decision-panel">
        <header class="panel-header"><div><p class="section-index">COMMANDER DECISION</p><h3>财务主管统筹岗三路径决策</h3></div><AlertTriangle :size="19" /></header>
        <div class="decision-paths"><article v-for="path in incidentDecision.paths" :key="path.label" :class="{ accepted: path.accepted }"><StatusBadge :label="path.accepted ? '采用' : '否决'" :tone="path.accepted ? 'success' : 'neutral'" /><strong>{{ path.label }}</strong><p>{{ path.verdict }}</p></article></div>
        <div class="incident-directives"><div v-for="directive in incidentDirectives" :key="directive.role"><StatusBadge :label="directive.role" tone="info" /><span>{{ directive.text }}</span></div></div>
        <ul v-if="changeResolved" class="term-list inline"><li v-for="approval in incidentDecision.approvals" :key="approval"><Check :size="14" />{{ approval }}</li></ul>
        <div class="approval-actions">
          <button v-if="!changeResolved" class="primary-button" type="button" @click="resolveIncident"><Check :size="15" />批准组合处置方案</button>
          <button v-else class="secondary-button" type="button" @click="changeModalOpen = true"><FileCheck2 :size="15" />查看变更单据</button>
          <button v-if="changeResolved" class="secondary-button" type="button" @click="downloadChangeReport"><Download :size="15" />下载变更单据</button>
        </div>
      </section>

      <section v-if="changeResolved" class="two-column-layout">
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">DELIVERY BOARD</p><h3>帐篷到货进度看板</h3></div><Truck :size="19" /></header>
          <div class="delivery-board"><div v-for="row in deliveryBoard" :key="row.label"><strong>{{ row.label }}</strong><span>{{ row.status }}</span><StatusBadge :label="row.eta" :tone="row.tone" /></div></div>
          <p class="priority-note">12 小时内可到位数量 = 300 + 150 + 50 = 500 顶，第一批重点保障完成率 100%；S2 后续 50 顶到达后补回三个调出网格。</p>
        </article>
        <article class="panel">
          <header class="panel-header"><div><p class="section-index">COST IMPACT</p><h3>变更成本与预备费</h3></div><Scale :size="19" /></header>
          <div class="impact-grid">
            <div><span>原帐篷采购成本</span><strong>{{ formatCurrency(changeImpact.originalCost) }}</strong><small>500 × 835 元/顶</small></div>
            <div><span>变更后帐篷及紧急保障成本</span><strong>{{ formatCurrency(changeImpact.changedCost) }}</strong><small>350×835 + 150×880 + 2,160 + 840</small></div>
            <div><span>突发新增支出</span><strong>{{ formatCurrency(changeImpact.increase) }}</strong><small>价差 {{ formatCurrency(changeImpact.priceDiff) }} + 运费人工 {{ formatCurrency(changeImpact.extraCost) }}</small></div>
            <div><span>预备费使用率</span><strong>{{ changeImpact.reserveUseRate }}%</strong><small>阶段性余额 {{ formatCurrency(changeImpact.reserveRemaining) }}</small></div>
            <div><span>500 顶综合平均成本</span><strong>{{ changeImpact.avgUnitCost }} 元/顶</strong><small>427,250 ÷ 500</small></div>
            <div><span>货物均价与基准偏差</span><strong>{{ changeImpact.goodsAvgPrice }} 元/顶 · {{ changeImpact.benchmarkDeviation }}%</strong><small>剔除 3,000 元应急运输人工后对比 846.25 元基准</small></div>
          </div>
          <div class="output-chips small"><span v-for="output in incidentOutputs" :key="output">《{{ output }}》</span></div>
        </article>
      </section>
    </template>

    <template v-else>
      <section class="insurance-hero panel"><div><p class="section-index">TASK 8 · RECOMMENDATION</p><h2>救援人员保险方案比较</h2><p>一线救援人员直面山洪与塌方风险，通过八项指标标准化和加权评分形成推荐。</p></div><div class="recommendation-result"><BadgeCheck :size="28" /><div><span>推荐方案</span><strong>保险{{ scores[0].id }} · {{ scores[0].name }}</strong><p>{{ scores[0].score.toFixed(2) }} 分 · 50 人总保费 {{ formatCurrency(scores[0].totalPremium) }}</p></div></div></section>

      <section class="insurance-layout">
        <article class="panel weight-panel"><header class="panel-header"><div><p class="section-index">WEIGHT MATRIX</p><h3>八项指标权重</h3></div><button class="text-button" type="button" @click="resetWeights">恢复标准</button></header><div class="weight-total" :class="{ invalid: Math.abs(weightTotal - 1) > 0.001 }"><span>权重合计</span><strong>{{ (weightTotal * 100).toFixed(0) }}%</strong></div><div class="weight-list"><label v-for="criterion in insuranceCriteria" :key="criterion.key"><div><span>{{ criterion.label }}</span><strong>{{ (weights[criterion.key] * 100).toFixed(0) }}%</strong></div><input v-model.number="weights[criterion.key]" type="range" min="0" max="0.4" step="0.05" /></label></div></article>
        <article class="panel ranking-panel"><header class="panel-header"><div><p class="section-index">WEIGHTED SCORE</p><h3>方案综合排序</h3></div><Scale :size="19" /></header><div class="insurance-ranking"><div v-for="(product, index) in scores" :key="product.id" :class="{ winner: index === 0 }"><span class="ranking-number">0{{ index + 1 }}</span><div><strong>保险{{ product.id }} · {{ product.name }}</strong><p>{{ product.coverageText }} · 等待期 {{ product.waitingDays }} 天 · 赔付 {{ product.payoutDays }} 天</p></div><b>{{ product.score.toFixed(2) }}</b></div></div><div class="insurance-note"><ShieldCheck :size="17" /><p>保险II综合得分最高，洪涝救援明确承保，等待期和赔付时效最短，保障与保费投入更均衡。</p></div></article>
      </section>

      <section class="panel insurance-table-panel"><header class="panel-header"><div><p class="section-index">PRODUCT COMPARISON</p><h3>三款保险产品明细</h3></div><StatusBadge label="50 名救援人员" tone="info" /></header><div class="data-table-wrap"><table class="data-table insurance-table"><thead><tr><th>产品</th><th>保费</th><th>身故保额</th><th>伤残保额</th><th>医疗保额</th><th>免赔额</th><th>等待期</th><th>承保范围</th><th>理赔资料</th><th>赔付时效</th><th>总保费</th><th>得分</th></tr></thead><tbody><tr v-for="product in scores" :key="product.id" :class="{ 'selected-row': product.id === scores[0].id }"><td><strong>保险{{ product.id }}<small>{{ product.name }}</small></strong></td><td>{{ product.premium }}元/人</td><td>{{ product.deathBenefit }}万</td><td>{{ product.disabilityBenefit }}万</td><td>{{ product.medicalBenefit }}万</td><td>{{ product.deductible }}元</td><td>{{ product.waitingDays }}天</td><td>{{ product.coverageText }}</td><td>{{ product.claims }}</td><td>{{ product.payoutDays }}天</td><td>{{ formatCurrency(product.totalPremium) }}</td><td><strong>{{ product.score.toFixed(2) }}</strong></td></tr></tbody></table></div></section>

      <InsuranceCalcSteps :products="insuranceProducts" :weights="weights" class="insurance-calc-section" />

      <section class="insurance-decision-grid"><article class="panel decision-fact"><span>预算影响</span><strong>保险 III 比保险 II 多支出 3,000 元</strong><p>占 C 方案预算 0.07%，影响极小</p></article><article class="panel decision-fact"><span>审批状态</span><strong>{{ insuranceApproval.status === 'approved' ? '财务主管统筹岗审核通过' : insuranceApproval.status === 'submitted' ? '等待财务主管统筹岗审批' : '采购岗尚未提交' }}</strong><p>{{ insuranceApproval.status === 'approved' ? '保险 II 纳入保险支出专项科目' : '提交后生成正式审批记录' }}</p></article><article class="panel decision-fact"><span>支付来源</span><strong>政府协同保障资金</strong><p>50 人总保费 11,000 元，可立即支付</p></article></section>

      <section class="panel insurance-delivery"><div><p class="section-index">APPROVAL &amp; DELIVERABLE</p><h3>保险方案提交与审批</h3><p>采购成本保障岗提交推荐方案，财务主管统筹岗复核预算范围和资金来源。</p></div><div class="report-actions"><button class="primary-button" type="button" @click="submitInsurance"><FileCheck2 :size="15" />提交保险方案</button><button class="secondary-button" type="button" @click="insuranceModalOpen = true"><FileCheck2 :size="15" />查看比选报告</button><button v-if="insuranceApproval.status === 'approved'" class="secondary-button" type="button" @click="downloadInsuranceReport"><Download :size="15" />下载比选报告</button></div></section>

      <section class="panel coverage-rule-panel"><header class="panel-header"><div><p class="section-index">COVERAGE SCORE</p><h3>承保范围分档赋值</h3></div></header><div class="coverage-rules"><div v-for="rule in coverageScoreRules" :key="rule.score"><strong>{{ rule.score }}</strong><span>{{ rule.text }}</span></div></div><p class="formula-note">成本型指标 =（最大值－本方案值）÷（最大值－最小值）×100；效益型指标 =（本方案值－最小值）÷（最大值－最小值）×100。</p></section>
    </template>

    <BaseModal :open="changeModalOpen" title="HT-001 合同变更与 HT-003 紧急分单" description="第二次突发事件处置产出单据" width="760px" @close="changeModalOpen = false"><pre class="report-preview">{{ changeReport }}</pre><template #footer><button class="secondary-button" type="button" @click="changeModalOpen = false">关闭</button><button class="primary-button" type="button" @click="downloadChangeReport"><Download :size="15" />下载变更单据</button></template></BaseModal>
    <BaseModal :open="insuranceModalOpen" title="救援人员保险比选报告" description="采购岗提交，财务主管统筹岗审批" width="760px" @close="insuranceModalOpen = false"><div class="approval-summary"><div><span>推荐方案</span><strong>保险II</strong></div><div><span>综合得分</span><strong>74.45分</strong></div><div><span>总保费</span><strong>11,000元</strong></div><div><span>审批状态</span><StatusBadge :label="insuranceApproval.status === 'approved' ? '审核通过' : insuranceApproval.status === 'submitted' ? '待主管审批' : '草稿'" :tone="insuranceApproval.status === 'approved' ? 'success' : 'warning'" /></div></div><pre class="report-preview compact">{{ insuranceReport }}</pre><template #footer><button class="secondary-button" type="button" @click="insuranceModalOpen = false">关闭</button><button v-if="insuranceApproval.status === 'submitted'" class="primary-button" type="button" @click="approveInsurance"><Check :size="15" />确认保险审批</button><button v-else-if="insuranceApproval.status === 'approved'" class="primary-button" type="button" @click="downloadInsuranceReport"><Download :size="15" />下载比选报告</button><button v-else class="primary-button" type="button" @click="submitInsurance"><FileCheck2 :size="15" />提交保险方案</button></template></BaseModal>
  </div>
</template>
