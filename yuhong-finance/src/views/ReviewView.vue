<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, BadgeCheck, Check, ClipboardCheck, Download, Eye, FileCheck2, HeartPulse, Landmark, RefreshCcw, Scale, Send, ShieldCheck, Siren, TrendingUp } from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import StatusBadge from '../components/StatusBadge.vue'
import {
  auditChain, auditFindings, auditOutputs, closedLoop, collaborationReview, disclosureNote, disclosureTiers,
  executionSummary, insuranceClaim, parameterWritebacks, performanceDimensions, performanceOutputs,
  stage4Summary, varianceCategories, varianceItems, varianceOutputs, WRITEBACK_THRESHOLD, writebackSkills,
} from '../data/review.js'
import { formatCurrency } from '../domain/finance.js'
import { calculateClaim, calculateExecutionStats, countPerformanceItems, unitBenefitCost } from '../domain/reviewLogic.js'
import { downloadTextFile } from '../domain/workflowArtifacts.js'

const props = defineProps({
  stage: { type: String, default: 'baseline' },
  workflowState: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['toast', 'task-completed'])

const activeTab = ref('claim')
const tabs = [
  { id: 'claim', label: '保险理赔' },
  { id: 'variance', label: '差异分析' },
  { id: 'performance', label: '绩效评价' },
  { id: 'audit', label: '审计公开' },
  { id: 'writeback', label: '参数回写' },
]

const claimRegistered = ref(false)
const auditSubmitted = ref(false)
const fixedFindings = ref([])
const resubmitted = ref(false)
const writebackApplied = ref(false)
const performanceModalOpen = ref(false)

const claimAmount = computed(() => calculateClaim({ medicalCost: insuranceClaim.medicalCost, deductible: insuranceClaim.deductible, payoutRatio: insuranceClaim.payoutRatio }))
const execution = computed(() => calculateExecutionStats({ budget: executionSummary.budget, actual: executionSummary.actual }))
const performanceCount = computed(() => countPerformanceItems(performanceDimensions))
const unitCost = computed(() => unitBenefitCost(executionSummary.actual, 8100))
const allFindingsFixed = computed(() => fixedFindings.value.length === auditFindings.length)

const performanceReport = computed(() => {
  const lines = performanceDimensions.map((dimension) => `【${dimension.name}】\n${dimension.items.map((item) => `- ${item.label}：${item.value}（${item.formula}）`).join('\n')}`)
  return `项目绩效评价表（6维度${performanceCount.value}项）\n报告编号：PER-F-20260803\n\n${lines.join('\n\n')}\n\n岗位协同评价：\n${collaborationReview.map((review) => `- ${review.role}：${review.text}`).join('\n')}`
})

function registerClaim() {
  claimRegistered.value = true
  emit('task-completed', 23)
  emit('toast', `保险理赔完成：赔款 ${formatCurrency(claimAmount.value)} 已登记入账`)
}

function downloadVariance() {
  const header = ['项目', '预算', '实际', '差异', '方向', '原因']
  const rows = varianceItems.map((item) => [item.item, item.budget, item.actual, item.variance, item.direction, item.reason])
  downloadTextFile('预算执行差异分析表.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('task-completed', 24)
  emit('toast', '预算执行差异分析表已下载：执行率 98.12%，偏差率 1.88%')
}

function downloadPerformance() {
  downloadTextFile('项目绩效评价表.txt', performanceReport.value)
  emit('task-completed', 25)
  emit('toast', '6 维度 20 项绩效评价表已下载')
}

function submitAudit() {
  auditSubmitted.value = true
  emit('toast', '资料已一键报送内审部门。注意：内审系统反馈 3 条异常数据，请逐条核查')
}

function fixFinding(id) {
  if (fixedFindings.value.includes(id)) return
  fixedFindings.value = [...fixedFindings.value, id]
  const finding = auditFindings.find((item) => item.id === id)
  emit('toast', `${finding.owner}已整改：${finding.fix}`)
}

function resubmitAudit() {
  resubmitted.value = true
  emit('task-completed', 26)
  emit('toast', '各岗位补充资料均已收到，二次审计申报完成，分层信息公开已发布')
}

function applyWriteback() {
  writebackApplied.value = true
  emit('task-completed', 27)
  emit('toast', '预算参数库已更新：运输系数 9.2、质量损耗 2.5%、特殊人群 135 元/人')
}

function downloadWriteback() {
  const header = ['参数', '原标准', '实际', '偏差率', '处理', '回写后']
  const rows = parameterWritebacks.map((item) => [
    item.name,
    item.original === null ? '规则' : `${item.original}${item.unit}`,
    item.actual === null ? '规则优化' : `${item.actual}${item.unit}`,
    `${item.deviation}%`,
    item.action === 'update' ? '直接更新' : item.action === 'weighted' ? '加权更新' : item.action === 'keep' ? '不更新' : '规则优化',
    item.newValue === null ? '动态预备费规则' : `${item.newValue}${item.unit}`,
  ])
  downloadTextFile('预算参数回写记录.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('toast', '预算参数回写记录已下载')
}
</script>

<template>
  <div class="page-content review-page">
    <section class="page-intro"><div><p class="eyebrow">STAGE 4 · REVIEW & FEEDBACK</p><h1>复盘与绩效</h1><p>灾后复盘：保险理赔、绩效评价、审计公开与参数回写</p></div><div class="tab-switch wrap"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></div></section>

    <template v-if="activeTab === 'claim'">
      <section class="incident-banner" :class="{ resolved: claimRegistered }">
        <Siren :size="22" />
        <div><strong>御洪星通报</strong><p>{{ insuranceClaim.alert }}</p></div>
        <StatusBadge :label="claimRegistered ? '理赔已登记入账' : '待理赔处理'" :tone="claimRegistered ? 'success' : 'danger'" dot />
      </section>

      <section class="two-column-layout">
        <article class="panel"><header class="panel-header"><div><p class="section-index">TASK 1 · CLAIM FLOW</p><h3>八步理赔流程（{{ insuranceClaim.product }}）</h3></div><HeartPulse :size="19" /></header><ol class="numbered-steps"><li v-for="step in insuranceClaim.steps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p></div></li></ol></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">CLAIM CALCULATION</p><h3>赔款测算与会计处理</h3></div><Scale :size="19" /></header><div class="claim-calc"><div><span>医疗费用</span><strong>{{ formatCurrency(insuranceClaim.medicalCost) }}</strong></div><i>−</i><div><span>免赔额</span><strong>{{ formatCurrency(insuranceClaim.deductible) }}</strong></div><i>=</i><div class="claim-result"><span>赔款（赔付比例 100%）</span><strong>{{ formatCurrency(claimAmount) }}</strong></div></div><div class="journal-preview"><strong>会计分录</strong><code>借：银行存款 34,900</code><code>贷：营业外收入—保险赔款 34,900</code></div><div class="impact-note"><ShieldCheck :size="16" /><p>{{ insuranceClaim.impact }}</p></div><div class="approval-actions"><button class="primary-button" type="button" :disabled="claimRegistered" @click="registerClaim"><Check :size="15" />{{ claimRegistered ? '赔款已登记入账' : '登记赔款并完成会计处理' }}</button></div></article>
      </section>
    </template>

    <template v-else-if="activeTab === 'variance'">
      <section class="metric-grid metric-grid-4">
        <article class="panel shelter-fact"><span>C 方案预算</span><strong>{{ formatCurrency(executionSummary.budget) }}</strong><p>预算上限</p></article>
        <article class="panel shelter-fact"><span>实际支付</span><strong>{{ formatCurrency(executionSummary.actual) }}</strong><p>四类资金来源合计</p></article>
        <article class="panel shelter-fact highlight"><span>预算执行率</span><strong>{{ execution.executionRate }}%</strong><p>偏差率 {{ execution.deviationRate }}%</p></article>
        <article class="panel shelter-fact"><span>尚未执行</span><strong>{{ formatCurrency(execution.unexecuted) }}</strong><p>4,275,091 − 4,194,750</p></article>
      </section>

      <section class="two-column-layout">
        <article class="panel"><header class="panel-header"><div><p class="section-index">TASK 2 · FUNDING SOURCES</p><h3>资金来源使用金额</h3></div><Landmark :size="19" /></header><div class="source-bars"><div v-for="source in executionSummary.sources" :key="source.label"><div><span>{{ source.label }}</span><strong>{{ formatCurrency(source.amount) }}</strong></div><div class="driver-track"><i :style="{ width: `${(source.amount / executionSummary.actual) * 100}%` }" /></div></div><div class="balance-total"><span>合计</span><strong>{{ formatCurrency(executionSummary.actual) }}</strong><p>与实际支付一致</p></div></div></article>
        <article class="panel"><header class="panel-header"><div><p class="section-index">VARIANCE TYPES</p><h3>差异原因分类</h3></div><TrendingUp :size="19" /></header><div class="variance-types"><div v-for="category in varianceCategories" :key="category.type"><strong>{{ category.type }}</strong><p>{{ category.cause }}</p></div></div><div class="output-chips"><span v-for="output in varianceOutputs" :key="output"><FileCheck2 :size="13" />《{{ output }}》</span></div></article>
      </section>

      <section class="panel variance-panel"><header class="panel-header"><div><p class="section-index">ITEM VARIANCE</p><h3>分项目差异分析</h3></div><button class="primary-button" type="button" @click="downloadVariance"><Download :size="15" />下载差异分析表</button></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>项目</th><th>预算</th><th>实际</th><th>差异</th><th>方向</th><th>原因</th></tr></thead><tbody><tr v-for="item in varianceItems" :key="item.item"><td><strong>{{ item.item }}</strong></td><td>{{ formatCurrency(item.budget) }}</td><td>{{ formatCurrency(item.actual) }}</td><td :class="{ 'cell-warning': item.variance > 0 }">{{ item.variance > 0 ? '+' : '' }}{{ formatCurrency(item.variance) }}</td><td><StatusBadge :label="item.direction" :tone="item.direction === '不利' ? 'danger' : item.direction === '有利' ? 'success' : 'neutral'" /></td><td class="table-note">{{ item.reason }}</td></tr></tbody></table></div></section>
    </template>

    <template v-else-if="activeTab === 'performance'">
      <section class="page-actions-row"><StatusBadge :label="`6 维度 ${performanceCount} 项指标`" tone="info" dot /><StatusBadge :label="`单位受益成本 ${unitCost} 元/人`" tone="success" /><button class="secondary-button" type="button" @click="performanceModalOpen = true"><Eye :size="15" />查看绩效评价表</button><button class="primary-button" type="button" @click="downloadPerformance"><Download :size="15" />下载绩效评价表</button></section>
      <section class="performance-grid">
        <article v-for="dimension in performanceDimensions" :key="dimension.id" class="panel performance-card"><header><strong>{{ dimension.name }}</strong><StatusBadge :label="`${dimension.items.length} 项`" tone="neutral" /></header><div class="performance-items"><div v-for="item in dimension.items" :key="item.label"><div><span>{{ item.label }}</span><code>{{ item.formula }}</code></div><strong :class="{ warn: !item.good }">{{ item.value }}</strong></div></div></article>
      </section>
      <section class="panel"><header class="panel-header"><div><p class="section-index">CROSS-ROLE REVIEW</p><h3>岗位协同评价</h3></div><BadgeCheck :size="19" /></header><div class="review-stack"><div v-for="review in collaborationReview" :key="review.role"><StatusBadge :label="review.role" tone="info" /><p>{{ review.text }}</p></div></div><div class="output-chips"><span v-for="output in performanceOutputs" :key="output"><FileCheck2 :size="13" />《{{ output }}》</span></div></section>
    </template>

    <template v-else-if="activeTab === 'audit'">
      <section class="panel audit-chain-panel">
        <header class="panel-header"><div><p class="section-index">TASK 4 · EVIDENCE CHAIN</p><h3>审计证据链归集顺序（11 环节）</h3></div><div class="panel-actions"><button class="primary-button" type="button" :disabled="auditSubmitted" @click="submitAudit"><Send :size="15" />{{ auditSubmitted ? '已报送内审部门' : '一键报送内审部门' }}</button></div></header>
        <div class="evidence-chain"><template v-for="(node, index) in auditChain" :key="node"><span class="evidence-node">{{ node }}</span><ArrowRight v-if="index < auditChain.length - 1" :size="14" /></template></div>
      </section>

      <section v-if="auditSubmitted" class="incident-banner" :class="{ resolved: resubmitted }">
        <Siren :size="22" />
        <div><strong>内审系统反馈</strong><p>内审系统反馈 3 条异常数据，请逐条核查整改后进行二次审计申报。</p></div>
        <StatusBadge :label="resubmitted ? '二次报审完成' : `整改进度 ${fixedFindings.length}/3`" :tone="resubmitted ? 'success' : 'warning'" dot />
      </section>

      <section v-if="auditSubmitted" class="findings-grid">
        <article v-for="finding in auditFindings" :key="finding.id" class="panel finding-card" :class="{ fixed: fixedFindings.includes(finding.id) }"><header><span>异常 {{ finding.id }}</span><StatusBadge :label="fixedFindings.includes(finding.id) ? '已整改' : '待整改'" :tone="fixedFindings.includes(finding.id) ? 'success' : 'danger'" /></header><strong>{{ finding.issue }}</strong><p>责任岗位：{{ finding.owner }}</p><p class="fix-text">{{ finding.fix }}</p><button class="secondary-button" type="button" :disabled="fixedFindings.includes(finding.id)" @click="fixFinding(finding.id)"><Check :size="14" />{{ fixedFindings.includes(finding.id) ? '整改完成' : '完成整改' }}</button></article>
      </section>
      <section v-if="auditSubmitted" class="page-actions-row"><button class="primary-button" type="button" :disabled="!allFindingsFixed || resubmitted" @click="resubmitAudit"><ClipboardCheck :size="15" />{{ resubmitted ? '二次报审已完成' : '二次审计申报' }}</button><StatusBadge v-if="!allFindingsFixed" label="3 条异常全部整改后方可二次报审" tone="warning" /></section>

      <section class="disclosure-grid">
        <article v-for="tier in disclosureTiers" :key="tier.tier" class="panel disclosure-card"><header><strong>{{ tier.tier }}</strong><span>{{ tier.audience }}</span></header><ul><li v-for="item in tier.items" :key="item"><Check :size="13" />{{ item }}</li></ul></article>
      </section>
      <section class="panel disclosure-note-panel"><ShieldCheck :size="17" /><p>{{ disclosureNote }}</p><div class="output-chips small"><span v-for="output in auditOutputs" :key="output">《{{ output }}》</span></div></section>
    </template>

    <template v-else>
      <section class="page-actions-row"><StatusBadge :label="`回写阈值 ${WRITEBACK_THRESHOLD}%`" tone="info" dot /><button class="primary-button" type="button" :disabled="writebackApplied" @click="applyWriteback"><RefreshCcw :size="15" />{{ writebackApplied ? '参数库已更新' : '更新预算参数库' }}</button><button class="secondary-button" type="button" @click="downloadWriteback"><Download :size="15" />下载回写记录</button></section>
      <section class="writeback-grid">
        <article v-for="item in parameterWritebacks" :key="item.id" class="panel writeback-card" :class="`action-${item.action}`">
          <header><strong>{{ item.name }}</strong><StatusBadge :label="item.action === 'update' ? '直接更新' : item.action === 'weighted' ? '加权更新' : item.action === 'keep' ? '不更新' : '规则优化'" :tone="item.action === 'keep' ? 'neutral' : item.action === 'optimize' ? 'info' : 'success'" /></header>
          <div v-if="item.original !== null" class="writeback-values"><div><span>原标准</span><strong>{{ item.original }}{{ item.unit }}</strong></div><ArrowRight :size="15" /><div><span>实际</span><strong>{{ item.actual }}{{ item.unit }}</strong></div><ArrowRight :size="15" /><div class="new-value"><span>回写后</span><strong>{{ writebackApplied ? `${item.newValue}${item.unit}` : '待更新' }}</strong></div></div>
          <div class="deviation-line"><span>偏差率</span><b :class="{ over: Math.abs(item.deviation) > WRITEBACK_THRESHOLD }">{{ item.deviation > 0 ? '+' : '' }}{{ item.deviation }}%</b><small>阈值 ±{{ WRITEBACK_THRESHOLD }}%</small></div>
          <p>{{ item.reason }}</p>
        </article>
      </section>
      <section class="panel closed-loop-panel"><header class="panel-header"><div><p class="section-index">CLOSED LOOP</p><h3>项目最终闭环</h3></div><RefreshCcw :size="19" /></header><div class="evidence-chain loop"><template v-for="(node, index) in closedLoop" :key="node"><span class="evidence-node">{{ node }}</span><ArrowRight v-if="index < closedLoop.length - 1" :size="14" /></template></div><p class="priority-note">现场技能：{{ writebackSkills.join('、') }}。</p><p class="stage-summary">{{ stage4Summary }}</p></section>
    </template>

    <BaseModal :open="performanceModalOpen" title="项目绩效评价表" description="6 维度 20 项指标" width="760px" @close="performanceModalOpen = false"><pre class="report-preview">{{ performanceReport }}</pre><template #footer><button class="secondary-button" type="button" @click="performanceModalOpen = false">关闭</button><button class="primary-button" type="button" @click="downloadPerformance"><Download :size="15" />下载绩效评价表</button></template></BaseModal>
  </div>
</template>
