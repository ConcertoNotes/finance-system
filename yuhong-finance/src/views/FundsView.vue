<script setup>
import { computed, reactive, ref } from 'vue'
import { AlertTriangle, ArrowRight, Banknote, Check, CircleDollarSign, Download, FileCheck2, FileText, Landmark, Link2, Power, Scale, ShieldCheck, Siren, UsersRound, WalletCards } from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import MetricCard from '../components/MetricCard.vue'
import RoleTaskPanel from '../components/RoleTaskPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { auditTrail, fundSnapshots, ledgerAccounts, riskChecks } from '../data/funds.js'
import { getRoleTasksByView } from '../data/roleplay.js'
import {
  PROJECT_CODE, acceptanceOutputs, acceptanceSections, accountingOutputs, accountingSteps, bankReconciliation,
  fourFlowDefinitions, fourFlowItems, fundBalances, fundCategories, fundEntries, fundLedgerSkills, fundMismatchIncident,
  fundTotalAvailable, gridReadinessBoard, gridSubAccounts, handoverStage3, journalEntries, multiRoleShowcase,
  paymentApplications, paymentConditions, paymentFormulas, qualityIncident,
} from '../data/fundsStage3.js'
import { formatCurrency } from '../domain/finance.js'
import { getFourFlowStatus, getFundAccountBalances, splitPayment, summarizeFundEntries } from '../domain/fundControl.js'
import { buildFundSwapReport, buildLedgerActivationReport, buildQualityReleaseReport, downloadTextFile } from '../domain/workflowArtifacts.js'

const props = defineProps({
  stage: { type: String, default: 'baseline' },
  workflowState: { type: Object, default: () => ({ ledger: { status: 'pending', ledgerName: '洪涝救援专项账套', accountingPeriod: '2026-08' }, fundSwap: { status: 'pending' }, qualityHold: { status: 'pending' } }) },
})
const emit = defineEmits(['toast', 'workflow-action', 'task-completed'])

const activeTab = ref('overview')
const roleTasks = computed(() => getRoleTasksByView('funds', activeTab.value))
const tabs = [
  { id: 'overview', label: '资金总览' },
  { id: 'ledger', label: '资金分类台账' },
  { id: 'grids', label: '网格资金下沉' },
  { id: 'payments', label: '付款匹配' },
  { id: 'fourflow', label: '验收与四流' },
  { id: 'accounting', label: '核算对账' },
]

const fund = computed(() => fundSnapshots[props.stage])
const activationOpen = ref(false)
const reportOpen = ref(false)
const swapModalOpen = ref(false)
const releaseModalOpen = ref(false)
const subAccountsActivated = ref(false)
const form = reactive({ ledgerName: props.workflowState.ledger.ledgerName, accountingPeriod: props.workflowState.ledger.accountingPeriod })
const ledgerActive = computed(() => props.workflowState.ledger.status === 'active')
const report = computed(() => buildLedgerActivationReport(props.workflowState.ledger))

// 第三次突发事件：限定性捐赠用途错配
const swapResolved = computed(() => props.workflowState.fundSwap?.status === 'resolved')
const swapReport = computed(() => buildFundSwapReport(props.workflowState.fundSwap ?? { status: 'pending' }))
const accountBalances = computed(() => getFundAccountBalances(fundEntries, swapResolved.value))
const categorySummary = computed(() => summarizeFundEntries(fundEntries, fundCategories))

// 第四次突发事件：帐篷质量验收异常
const qualityReleased = computed(() => props.workflowState.qualityHold?.status === 'released')
const releaseReport = computed(() => buildQualityReleaseReport(props.workflowState.qualityHold ?? { status: 'pending' }))
const fourFlow = computed(() => getFourFlowStatus(fourFlowItems, qualityReleased.value))
const paymentSplit = computed(() => splitPayment({ contractQty: 150, qualifiedQty: 140, unitPrice: 880, extras: 3000 }))

const paymentRows = computed(() => paymentApplications.map((application) => {
  if (application.id !== 'PAY-04') return { ...application, statusLabel: '进入验收后付款队列', tone: 'success' }
  if (swapResolved.value) {
    return { ...application, source: '非限定性捐赠 U01（已替换）', conclusion: '资金来源合规，重新进入付款流程', statusLabel: '已替换 D01→U01', tone: 'success' }
  }
  return { ...application, statusLabel: '用途错配 · 已冻结', tone: 'danger' }
}))

function activateLedger() {
  if (!form.ledgerName.trim() || !/^\d{4}-\d{2}$/.test(form.accountingPeriod)) {
    emit('toast', '请填写账套名称，并按 YYYY-MM 填写会计期间')
    return
  }
  emit('workflow-action', { action: 'activate-ledger', payload: { ...form, operator: '财务主管统筹岗' } })
  emit('task-completed', 1)
  emit('toast', '专项账套已启用，启用单已生成')
  activationOpen.value = false
  reportOpen.value = true
}

function downloadReport() {
  downloadTextFile('专项账套启用单.txt', report.value)
  emit('toast', '专项账套启用单已下载')
}

function downloadFundLedger() {
  const header = ['编号', '资金分类', '捐赠人/拨款单位', '金额', '到账时间', '可使用用途', '可使用网格', '使用期限', '公开要求']
  const rows = fundEntries.map((entry) => [entry.id, fundCategories.find((category) => category.id === entry.category)?.name, entry.donor, entry.amount, entry.arrival, entry.usage, entry.grids, entry.deadline, entry.disclosure])
  downloadTextFile('救灾项目资金分类台账.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('task-completed', 15)
  emit('toast', '资金分类台账已建立：4 类资金、8 笔标签完整，项目编码 ZYCD-2025-001')
}

function activateSubAccounts() {
  subAccountsActivated.value = true
  emit('task-completed', 16)
  emit('toast', '9 个网格子账户已激活：每账户 50 万元，合计 450 万元入账，流水号已同步资金台账')
}

function confirmPaymentMatching() {
  emit('task-completed', 17)
  emit('toast', '4 笔付款申请完成 8 项条件核验，3 笔进入验收后付款队列')
}

function resolveFundSwap() {
  emit('workflow-action', { action: 'resolve-fund-swap', payload: { approver: '财务主管统筹岗' } })
  emit('task-completed', 18)
  emit('toast', '资金来源已替换 D01→U01，付款申请4重新进入付款流程')
  swapModalOpen.value = true
}

function downloadSwapReport() {
  downloadTextFile('资金替换测算表.txt', swapReport.value)
  emit('toast', '资金替换测算表已下载')
}

function confirmAcceptance() {
  emit('task-completed', 19)
  emit('toast', '四部分验收完成：验收单、质检记录、无人机影像索引与机器狗扫码记录已归档')
}

function confirmFourFlow() {
  emit('task-completed', 20)
  emit('toast', `四流匹配核验完成：首次通过率 ${getFourFlowStatus(fourFlowItems, false).passRate}%，异常项已冻结`)
}

function releaseQualityHold() {
  emit('workflow-action', { action: 'release-quality-hold', payload: { approver: '财务主管统筹岗' } })
  emit('task-completed', 21)
  emit('toast', '补货复验合格，冻结 8,800 元已放行，四流匹配整改后通过率 100%')
  releaseModalOpen.value = true
}

function downloadReleaseReport() {
  downloadTextFile('付款拆分与放行审批单.txt', releaseReport.value)
  emit('toast', '付款拆分与放行审批单已下载')
}

function completeAccounting() {
  emit('task-completed', 22)
  emit('toast', '会计核算与银行对账完成，账表核对一致，移交复盘阶段')
}
</script>

<template>
  <div class="page-content funds-page">
    <section class="page-intro"><div><p class="eyebrow">STAGE 3 · FUND CONTROL</p><h1>资金核算风控</h1><p>灾后6—24小时：双资金匹配、验收核验与支付控制</p></div><div class="tab-switch wrap"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></div></section>

    <RoleTaskPanel v-if="roleTasks.length" :tasks="roleTasks" />

    <template v-if="activeTab === 'overview'">
      <section class="page-actions-row"><StatusBadge :label="ledgerActive ? '专项账套运行中' : '专项账套待启用'" :tone="ledgerActive ? 'success' : 'warning'" dot /><button v-if="!ledgerActive" class="primary-button" type="button" @click="activationOpen = true"><Power :size="16" />启用专项账套</button><button v-else class="secondary-button" type="button" @click="reportOpen = true"><FileText :size="16" />专项账套启用单</button></section>
      <section class="metric-grid metric-grid-4"><MetricCard label="当前可用资金" :value="(fund.available / 10000).toFixed(0)" unit="万元" detail="政府协同保障资金" trend="无限制" :icon="Landmark" tone="green" /><MetricCard label="6 小时可支付" :value="(fund.payableIn6h / 10000).toFixed(0)" unit="万元" :detail="stage === 'escalated' ? '全部资金可立即支付' : '初始支付准备状态'" :trend="`${(fund.payableIn6h / fund.available * 100).toFixed(0)}%`" :icon="WalletCards" tone="cyan" /><MetricCard label="预计资金需求" :value="(fund.demand / 10000).toFixed(1)" unit="万元" :detail="stage === 'escalated' ? 'C 持续灾情保障方案' : 'B 标准救援保障方案'" :trend="`${fund.coverage.toFixed(2)}%覆盖`" :icon="CircleDollarSign" tone="gold" /><MetricCard label="当前资金缺口" :value="fund.gap.toLocaleString()" unit="元" :detail="fund.gap ? '待捐赠资金补充' : '资金余额充足'" :trend="fund.gap ? '需处置' : '正常'" :icon="ShieldCheck" :tone="fund.gap ? 'danger' : 'green'" /></section>

      <section class="funds-layout">
        <article class="panel fund-capacity-panel"><header class="panel-header"><div><p class="section-index">PAYMENT CAPACITY</p><h3>资金可用性与韧性</h3></div><StatusBadge :label="stage === 'escalated' ? 'II级资金状态' : 'III级资金状态'" :tone="stage === 'escalated' ? 'danger' : 'warning'" /></header><div class="fund-gauge"><div class="gauge-ring" :style="{ '--coverage': `${Math.min(fund.coverage, 100) * 3.6}deg` }"><strong>{{ fund.coverage.toFixed(2) }}%</strong><span>资金覆盖率</span></div><div class="gauge-stats"><div><span>预算需求</span><strong>{{ formatCurrency(fund.demand) }}</strong></div><div><span>应急预备费</span><strong>{{ formatCurrency(fund.reserve) }}</strong></div><div><span>应急缓冲率</span><strong>{{ fund.bufferRate.toFixed(1) }}%</strong></div></div></div><div v-if="fund.gap" class="fund-alert"><CircleDollarSign :size="18" /><div><strong>新增资金缺口 {{ formatCurrency(fund.gap) }}</strong><p>向红十字会募集捐赠资金，预计在复盘阶段到账。</p></div></div></article>
        <article class="panel risk-check-panel"><header class="panel-header"><div><p class="section-index">CONTROL CHECKS</p><h3>资金风控检查</h3></div><FileCheck2 :size="19" /></header><div class="risk-check-list"><div v-for="check in riskChecks" :key="check.label"><StatusBadge :label="check.status" :tone="check.status === '通过' ? 'success' : 'danger'" /><div><strong>{{ check.label }}</strong><p>{{ check.detail }}</p></div></div></div></article>
      </section>

      <section class="panel ledger-panel"><header class="panel-header"><div><p class="section-index">SPECIAL LEDGER</p><h3>专项账套核算科目</h3></div><span class="panel-caption">账实相符 · 全程可溯</span></header><div class="ledger-grid"><div v-for="account in ledgerAccounts" :key="account.code"><span>{{ account.code }}</span><strong>{{ account.name }}</strong><p>{{ account.direction }} · {{ formatCurrency(account.amount) }}</p><StatusBadge :label="account.status" :tone="account.status === '待补充' ? 'warning' : 'info'" /></div></div></section>

      <section class="panel audit-panel"><header class="panel-header"><div><p class="section-index">LINKED AUDIT TRAIL</p><h3>需求—物资—资金—凭证联动链路</h3></div><Link2 :size="19" /></header><div class="audit-chain"><template v-for="(item, index) in auditTrail" :key="item.id"><div class="audit-node"><span>{{ item.type }}</span><strong>{{ item.id }}</strong><p>{{ item.content }}</p><small>{{ item.time }} · {{ item.status }}</small></div><ArrowRight v-if="index < auditTrail.length - 1" :size="19" /></template></div></section>
    </template>

    <template v-else-if="activeTab === 'ledger'">
      <section class="fund-category-grid">
        <article v-for="category in categorySummary" :key="category.id" class="panel fund-category-card" :style="{ '--cat-color': category.color }"><span>{{ category.name }}</span><strong>{{ formatCurrency(category.total) }}</strong><p>{{ category.count }} 笔资金</p></article>
      </section>

      <section class="panel fund-ledger-panel">
        <header class="panel-header"><div><p class="section-index">TASK 1 · FUND LEDGER</p><h3>救灾项目资金分类台账（项目编码 {{ PROJECT_CODE }}）</h3></div><div class="panel-actions"><StatusBadge :label="`合计可用 ${formatCurrency(fundTotalAvailable)}`" tone="success" /><button class="primary-button" type="button" @click="downloadFundLedger"><Download :size="15" />建立台账并下载</button></div></header>
        <div class="data-table-wrap"><table class="data-table fund-table"><thead><tr><th>编号</th><th>资金分类</th><th>捐赠人/拨款单位</th><th>金额</th><th>到账时间</th><th>可使用用途</th><th>可使用网格</th><th>使用期限</th><th>公开</th><th>当前余额</th></tr></thead><tbody><tr v-for="entry in accountBalances" :key="entry.id" :class="{ 'restricted-row': entry.category === 'restricted' }"><td><strong>{{ entry.id }}</strong></td><td>{{ fundCategories.find((category) => category.id === entry.category)?.name }}</td><td>{{ entry.donor }}</td><td>{{ formatCurrency(entry.amount) }}</td><td>{{ entry.arrival }}</td><td :class="{ 'cell-warning': entry.usage !== '不限' && entry.category === 'restricted' }">{{ entry.usage }}</td><td>{{ entry.grids }}</td><td>{{ entry.deadline }}</td><td><StatusBadge :label="entry.disclosure" :tone="entry.disclosure === '公开' ? 'info' : 'neutral'" /></td><td><strong>{{ formatCurrency(entry.balance) }}</strong><small v-if="entry.note" class="unit-hint">{{ entry.note }}</small></td></tr></tbody></table></div>
        <div class="formula-line"><code>XLOOKUP 匹配资金用途标签 · SUMIFS 计算各类资金剩余余额</code><span>现场技能：{{ fundLedgerSkills.join('、') }}</span></div>
      </section>

      <section class="panel balance-summary-panel"><header class="panel-header"><div><p class="section-index">BALANCES</p><h3>资金余额</h3></div><Banknote :size="19" /></header><div class="balance-grid"><div v-for="balance in fundBalances" :key="balance.label"><span>{{ balance.label }}</span><strong>{{ formatCurrency(balance.amount) }}</strong><p>{{ balance.note }}</p></div><div class="balance-total"><span>合计可用</span><strong>{{ formatCurrency(fundTotalAvailable) }}</strong><p>4 类资金分类核算，每笔资金标签完整</p></div></div></section>
    </template>

    <template v-else-if="activeTab === 'grids'">
      <section class="panel subaccount-panel">
        <header class="panel-header"><div><p class="section-index">ONE-PERSON MULTI-POST</p><h3>9 网格资金下沉管理（一人多岗多能）</h3></div><div class="panel-actions"><StatusBadge :label="`每账户 ${formatCurrency(gridSubAccounts.initialQuota)} · 合计 ${formatCurrency(gridSubAccounts.total)}`" tone="info" /><button class="primary-button" type="button" :disabled="subAccountsActivated" @click="activateSubAccounts"><Power :size="15" />{{ subAccountsActivated ? '子账户已激活' : '激活子账户' }}</button></div></header>
        <div class="priority-chain"><template v-for="(grid, index) in gridSubAccounts.priority" :key="grid"><span class="priority-node" :class="{ top: index < 2 }">{{ grid }}</span><i v-if="index < gridSubAccounts.priority.length - 1">&gt;</i></template></div>
        <ul class="term-list inline"><li v-for="rule in gridSubAccounts.rules" :key="rule"><Check :size="14" />{{ rule }}</li></ul>
      </section>

      <section class="two-column-layout">
        <article class="panel"><header class="panel-header"><div><p class="section-index">READINESS BOARD</p><h3>9 网格物资到位率看板</h3></div><StatusBadge label="甲5 52% 标红预警" tone="danger" dot /></header><div class="readiness-list"><div v-for="row in gridReadinessBoard" :key="row.grid" :class="{ alert: row.alert }"><strong>{{ row.grid }}</strong><div class="readiness-track"><i :style="{ width: `${row.readiness}%` }" /></div><b>{{ row.readiness }}%</b><span>到账率 {{ row.arrivalRate }}%</span></div></div></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">SUB-ROLE SHOWCASE</p><h3>副岗切换与产出</h3></div><UsersRound :size="19" /></header><div class="subrole-list"><article v-for="showcase in multiRoleShowcase" :key="showcase.subRole"><div><StatusBadge :label="showcase.subRole" tone="info" /><small>{{ showcase.mainRole }} 切换</small></div><p>{{ showcase.action }}</p><span><FileCheck2 :size="13" />《{{ showcase.output }}》</span></article></div></article>
      </section>
    </template>

    <template v-else-if="activeTab === 'payments'">
      <section class="panel conditions-panel"><header class="panel-header"><div><p class="section-index">TASK 2 · 8 CONDITIONS</p><h3>每笔付款必须核验的 8 项匹配条件</h3></div><div class="panel-actions"><StatusBadge :label="paymentFormulas.join(' · ')" tone="info" /><button class="primary-button" type="button" @click="confirmPaymentMatching"><Check :size="15" />完成匹配核验</button></div></header><div class="condition-chips"><span v-for="(condition, index) in paymentConditions" :key="condition"><b>{{ String(index + 1).padStart(2, '0') }}</b>{{ condition }}</span></div></section>

      <section class="payment-grid">
        <article v-for="application in paymentRows" :key="application.id" class="panel payment-card" :class="{ mismatch: application.id === 'PAY-04' && !swapResolved }">
          <header><div><span>{{ application.id }} · {{ application.contract }}</span><strong>{{ application.subject }}</strong></div><StatusBadge :label="application.statusLabel" :tone="application.tone" dot /></header>
          <strong class="payment-amount">{{ formatCurrency(application.amount) }}</strong>
          <p class="payment-source">资金来源：{{ application.source }}</p>
          <ul><li v-for="check in application.checks" :key="check.label" :class="{ fail: !check.pass && !(application.id === 'PAY-04' && swapResolved) }"><component :is="check.pass || (application.id === 'PAY-04' && swapResolved) ? Check : AlertTriangle" :size="14" /><span><b>{{ check.label }}</b>{{ check.result }}</span></li></ul>
          <footer>{{ application.conclusion }}</footer>
        </article>
      </section>

      <section class="incident-banner" :class="{ resolved: swapResolved }">
        <Siren :size="22" />
        <div><strong>第三次突发事件 · 限定性捐赠用途错配</strong><p>{{ fundMismatchIncident.alert }}</p><small>捐赠协议约定："{{ fundMismatchIncident.agreement }}"</small></div>
        <StatusBadge :label="swapResolved ? '已替换 D01→U01' : '付款已冻结'" :tone="swapResolved ? 'success' : 'danger'" dot />
      </section>

      <section class="two-column-layout">
        <article class="panel"><header class="panel-header"><div><p class="section-index">TASK 3 · TEN-STEP FIX</p><h3>十步处置流程</h3></div><StatusBadge :label="swapResolved ? '10/10 完成' : '处置中'" :tone="swapResolved ? 'success' : 'warning'" /></header><ol class="numbered-steps dense"><li v-for="step in fundMismatchIncident.steps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p></div></li></ol></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">CROSS-ROLE REVIEW</p><h3>跨岗位复核与决策</h3></div><Scale :size="19" /></header><div class="review-stack"><div v-for="review in fundMismatchIncident.reviews" :key="review.role"><StatusBadge :label="review.role" tone="info" /><p>{{ review.text }}</p></div></div><div class="approval-actions"><button v-if="!swapResolved" class="primary-button" type="button" @click="resolveFundSwap"><Check :size="15" />批准资金替换 D01→U01</button><template v-else><button class="secondary-button" type="button" @click="swapModalOpen = true"><FileCheck2 :size="15" />查看替换测算表</button><button class="secondary-button" type="button" @click="downloadSwapReport"><Download :size="15" />下载测算表</button></template></div><div class="output-chips small"><span v-for="output in fundMismatchIncident.outputs" :key="output">《{{ output }}》</span></div></article>
      </section>
    </template>

    <template v-else-if="activeTab === 'fourflow'">
      <section class="panel acceptance-panel">
        <header class="panel-header"><div><p class="section-index">TASK 4 · ACCEPTANCE</p><h3>采购、调拨和捐赠物资验收入库</h3></div><div class="panel-actions"><StatusBadge label="机器狗扫码 · 无人机影像存证" tone="info" /><button class="primary-button" type="button" @click="confirmAcceptance"><Check :size="15" />确认验收归档</button></div></header>
        <div class="acceptance-sections"><article v-for="section in acceptanceSections" :key="section.id"><h4>{{ section.title }}</h4><div class="data-table-wrap"><table class="data-table"><thead><tr><th>物资</th><th>合同/应收</th><th>实际到货</th><th>质检结果</th><th>说明</th></tr></thead><tbody><tr v-for="row in section.rows" :key="row.name"><td><strong>{{ row.name }}</strong></td><td>{{ row.contract }}</td><td>{{ row.received }}</td><td :class="{ 'cell-warning': !row.pass && !qualityReleased }">{{ qualityReleased && !row.pass ? '补货复验150顶全部合格' : row.qualified }}</td><td class="table-note">{{ row.note }}</td></tr></tbody></table></div></article></div>
        <div class="output-chips small"><span v-for="output in acceptanceOutputs" :key="output">《{{ output }}》</span></div>
      </section>

      <section class="panel fourflow-panel">
        <header class="panel-header"><div><p class="section-index">TASK 5 · FOUR FLOWS</p><h3>四流匹配核验</h3></div><div class="panel-actions"><StatusBadge :label="`通过率 ${fourFlow.passRate}%（${fourFlow.passed}/${fourFlow.total}）`" :tone="fourFlow.passRate === 100 ? 'success' : 'warning'" dot /><button class="primary-button" type="button" @click="confirmFourFlow"><Check :size="15" />完成四流核验</button></div></header>
        <div class="fourflow-defs"><div v-for="definition in fourFlowDefinitions" :key="definition.flow"><strong>{{ definition.flow }}</strong><span>{{ definition.checks }}</span></div></div>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>项目</th><th>合同流</th><th>物资流</th><th>票据流</th><th>资金流</th><th>核验结果</th></tr></thead><tbody><tr v-for="row in fourFlow.rows" :key="row.id" :class="{ 'anomaly-row': !row.pass }"><td>{{ row.id }}</td><td><strong>{{ row.name }}</strong></td><td>{{ row.contract }}</td><td>{{ row.goods }}</td><td>{{ row.invoice }}</td><td>{{ row.payment }}</td><td><StatusBadge :label="row.status" :tone="row.pass ? 'success' : 'danger'" /></td></tr></tbody></table></div>
      </section>

      <section class="incident-banner" :class="{ resolved: qualityReleased }">
        <Siren :size="22" />
        <div><strong>第四次突发事件 · 紧急分单帐篷质量验收异常</strong><p>{{ qualityIncident.alert }}</p></div>
        <StatusBadge :label="qualityReleased ? '冻结款已放行' : `冻结 ${formatCurrency(qualityIncident.frozenAmount)}`" :tone="qualityReleased ? 'success' : 'danger'" dot />
      </section>

      <section class="two-column-layout">
        <article class="panel"><header class="panel-header"><div><p class="section-index">TASK 6 · PAYMENT SPLIT</p><h3>付款拆分与整改流程</h3></div><StatusBadge :label="qualityReleased ? '10/10 完成' : '处置中'" :tone="qualityReleased ? 'success' : 'warning'" /></header><div class="split-summary"><div><span>可支付</span><strong>{{ formatCurrency(paymentSplit.payable) }}</strong><p>140顶×880 + 车辆2,160 + 人工840</p></div><i>+</i><div><span>冻结</span><strong>{{ formatCurrency(paymentSplit.frozen) }}</strong><p>10顶×880，补货复验后放行</p></div><i>=</i><div><span>合同总额</span><strong>{{ formatCurrency(paymentSplit.total) }}</strong><p>HT-2025-003</p></div></div><ol class="numbered-steps dense"><li v-for="step in qualityIncident.steps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}<i class="step-role">{{ step.role }}</i></strong><p>{{ step.detail }}</p></div></li></ol></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">COMMANDER DECISION</p><h3>财务主管处理决定</h3></div><AlertTriangle :size="19" /></header><p class="decision-text">{{ qualityIncident.decision }}</p><div class="approval-actions"><button v-if="!qualityReleased" class="primary-button" type="button" @click="releaseQualityHold"><Check :size="15" />补货复验合格，放行冻结款</button><template v-else><button class="secondary-button" type="button" @click="releaseModalOpen = true"><FileCheck2 :size="15" />查看放行审批单</button><button class="secondary-button" type="button" @click="downloadReleaseReport"><Download :size="15" />下载审批单</button></template></div><div class="quality-stats"><div><span>首次总体验收合格率</span><strong>98.0%</strong><p>S2 合格350 + S1 合格140 = 490/500</p></div><div><span>整改后总体合格率</span><strong>100%</strong><p>10顶补货前由网格机动库存保障40人</p></div></div><div class="output-chips small"><span v-for="output in qualityIncident.outputs" :key="output">《{{ output }}》</span></div></article>
      </section>
    </template>

    <template v-else>
      <section class="two-column-layout">
        <article class="panel"><header class="panel-header"><div><p class="section-index">TASK 7 · ACCOUNTING</p><h3>会计核算与银行对账流程</h3></div><FileText :size="19" /></header><ol class="numbered-steps"><li v-for="step in accountingSteps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p></div></li></ol><div class="output-chips"><span v-for="output in accountingOutputs" :key="output"><FileCheck2 :size="13" />《{{ output }}》</span></div></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">BANK RECONCILIATION</p><h3>银行对账与未达账项</h3></div><Landmark :size="19" /></header><div class="reconciliation-grid"><div><span>台账余额</span><strong>{{ formatCurrency(bankReconciliation.ledgerBalance) }}</strong></div><div><span>银行流水余额</span><strong>{{ formatCurrency(bankReconciliation.bankBalance) }}</strong></div></div><div class="unrecorded-list"><div v-for="item in bankReconciliation.unrecordedItems" :key="item.label"><AlertTriangle :size="15" /><span>{{ item.label }}</span><strong>{{ formatCurrency(item.amount) }}</strong></div></div><p class="priority-note">{{ bankReconciliation.adjustedNote }}。</p><div class="handover-block"><strong>第三阶段移交</strong><p>资金核算风控岗移交：{{ handoverStage3.fundRisk.join('、') }}</p><p>采购成本保障岗移交：{{ handoverStage3.procurement.join('、') }}</p><button class="secondary-button" type="button" @click="completeAccounting"><ArrowRight :size="15" />完成核算并移交复盘</button></div></article>
      </section>

      <section class="panel journal-panel"><header class="panel-header"><div><p class="section-index">JOURNAL ENTRIES</p><h3>记账凭证（按项目编码 {{ PROJECT_CODE }} 归集）</h3></div><StatusBadge label="账证相符" tone="success" /></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>凭证号</th><th>时点</th><th>摘要</th><th>借方</th><th>贷方</th><th>资金来源</th><th>状态</th></tr></thead><tbody><tr v-for="entry in journalEntries" :key="entry.id"><td><strong>{{ entry.id }}</strong></td><td>{{ entry.date }}</td><td>{{ entry.summary }}</td><td>{{ entry.debit }}</td><td>{{ entry.credit }}</td><td>{{ entry.source }}</td><td><StatusBadge :label="entry.id === 'VCH-104' && qualityReleased ? '已放行' : entry.status" :tone="entry.status === '待放行' && !qualityReleased ? 'warning' : 'success'" /></td></tr></tbody></table></div></section>
    </template>

    <BaseModal :open="activationOpen" title="启用专项账套" description="由财务主管统筹岗确认账套信息和核算范围" @close="activationOpen = false"><div class="document-form"><label><span>账套名称</span><input v-model="form.ledgerName" /></label><label><span>会计期间</span><input v-model="form.accountingPeriod" placeholder="YYYY-MM" /></label><div class="document-checklist"><strong>预设专项核算科目</strong><span v-for="account in ledgerAccounts" :key="account.code"><Check :size="14" />{{ account.code }} · {{ account.name }}</span></div><div class="document-checklist"><strong>联动核算体系</strong><span><Check :size="14" />需求单</span><span><Check :size="14" />物资单</span><span><Check :size="14" />资金单</span><span><Check :size="14" />记账凭证</span></div></div><template #footer><button class="secondary-button" type="button" @click="activationOpen = false">取消</button><button class="primary-button" type="button" @click="activateLedger"><Power :size="15" />确认启用</button></template></BaseModal>
    <BaseModal :open="reportOpen" title="专项账套启用单" description="任务1正式业务产出" width="720px" @close="reportOpen = false"><pre class="report-preview">{{ report }}</pre><template #footer><button class="secondary-button" type="button" @click="reportOpen = false">关闭</button><button class="primary-button" type="button" @click="downloadReport"><Download :size="15" />下载启用单</button></template></BaseModal>
    <BaseModal :open="swapModalOpen" title="资金替换测算表" description="第三次突发事件处置产出单据" width="720px" @close="swapModalOpen = false"><pre class="report-preview">{{ swapReport }}</pre><template #footer><button class="secondary-button" type="button" @click="swapModalOpen = false">关闭</button><button class="primary-button" type="button" @click="downloadSwapReport"><Download :size="15" />下载测算表</button></template></BaseModal>
    <BaseModal :open="releaseModalOpen" title="付款拆分与放行审批单" description="第四次突发事件处置产出单据" width="720px" @close="releaseModalOpen = false"><pre class="report-preview">{{ releaseReport }}</pre><template #footer><button class="secondary-button" type="button" @click="releaseModalOpen = false">关闭</button><button class="primary-button" type="button" @click="downloadReleaseReport"><Download :size="15" />下载审批单</button></template></BaseModal>
  </div>
</template>
