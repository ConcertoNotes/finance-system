<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { CheckCircle2, Code2, Download, Eye, RefreshCcw, ScanSearch, Server, ShieldCheck } from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import RoleTaskPanel from '../components/RoleTaskPanel.vue'
import SigmaAnalysisPanel from '../components/SigmaAnalysisPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { cleaningSteps, complianceChecks, dataSources, getGridSnapshot, pipelineMilestones } from '../data/disaster.js'
import { getRoleTasksByView } from '../data/roleplay.js'
import { buildComplianceReport, buildQualityReport, downloadTextFile } from '../domain/workflowArtifacts.js'

const props = defineProps({ stage: { type: String, default: 'baseline' } })
const emit = defineEmits(['toast', 'task-completed'])
const collecting = ref(false)
const progress = ref(100)
const activeSource = ref(3)
const reportType = ref('')
let timer

const roleTasks = getRoleTasksByView('data')
const grids = computed(() => getGridSnapshot(props.stage))
const qualityReport = computed(() => buildQualityReport())
const complianceReport = computed(() => buildComplianceReport())
const activeReport = computed(() => reportType.value === 'quality' ? qualityReport.value : complianceReport.value)
const activeReportTitle = computed(() => reportType.value === 'quality' ? '灾情数据质量校验单' : '数据建模合规检测报告')

function openReport(type) {
  reportType.value = type
}

function downloadReport(type) {
  const isQuality = type === 'quality'
  downloadTextFile(`${isQuality ? '灾情数据质量校验单' : '数据建模合规检测报告'}.txt`, isQuality ? qualityReport.value : complianceReport.value)
  emit('task-completed', isQuality ? 2 : 3)
  emit('toast', `${isQuality ? '质量校验单' : '合规检测报告'}已下载`)
}

function exportDataset() {
  const header = ['网格编号', '网格名称', '受灾人数', '被困人数', '转移安置人数', '特殊人群数', '道路状态', '累计降雨量(mm)', '实时水位(m)', '距仓库距离(km)']
  const rows = grids.value.map((grid) => [grid.id, grid.name, grid.affected, grid.trapped, grid.relocated, grid.special, grid.roadBlocked ? '中断' : '畅通', grid.rainfall, grid.waterLevel, grid.distance])
  downloadTextFile('9网格灾情标准数据.csv', `\ufeff${[header, ...rows].map((row) => row.join(',')).join('\n')}`)
  emit('toast', '9网格标准数据已导出')
}

function runCollection() {
  if (collecting.value) return
  collecting.value = true
  progress.value = 0
  activeSource.value = 0
  timer = window.setInterval(() => {
    progress.value = Math.min(100, progress.value + 4)
    activeSource.value = Math.min(3, Math.floor(progress.value / 26))
    if (progress.value === 100) {
      window.clearInterval(timer)
      collecting.value = false
      emit('task-completed', 2)
      emit('toast', '多源灾情数据采集与清洗已完成')
    }
  }, 55)
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="page-content data-page">
    <section class="page-intro"><div><p class="eyebrow">DATA ACQUISITION & GOVERNANCE</p><h1>灾情数据中心</h1><p>多源采集、质量清洗、3σ 异常检查与合规校验</p></div><button class="primary-button" type="button" :disabled="collecting" @click="runCollection"><RefreshCcw :size="16" :class="{ spinning: collecting }" />{{ collecting ? '正在采集' : '重新执行采集' }}</button></section>

    <RoleTaskPanel :tasks="roleTasks" />

    <section class="source-grid">
      <article v-for="(source, index) in dataSources" :key="source.id" class="source-card" :class="{ active: index <= activeSource }">
        <div class="source-icon"><Server :size="19" /></div><div><span>{{ source.type }}</span><strong>{{ source.name }}</strong><small>{{ source.records }} 条记录 · {{ source.latency }}</small></div><StatusBadge :label="index <= activeSource ? '已连接' : '等待中'" :tone="index <= activeSource ? 'success' : 'neutral'" dot />
      </article>
    </section>

    <section class="panel pipeline-panel">
      <header class="panel-header"><div><p class="section-index">END-TO-END PIPELINE</p><h3>采集、提取与安全监测阶段</h3></div><StatusBadge label="全链路已留痕" tone="success" dot /></header>
      <div class="pipeline-milestones"><article v-for="(milestone, index) in pipelineMilestones" :key="milestone.id" :class="`pipeline-${milestone.status}`"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><strong>{{ milestone.label }}</strong><p>{{ milestone.detail }}</p></div><b>{{ milestone.progress }}</b><ShieldCheck v-if="milestone.status === 'secured'" :size="15" /><CheckCircle2 v-else :size="15" /></article></div>
    </section>

    <section class="panel collection-console">
      <header class="panel-header"><div><p class="section-index">PYTHON PIPELINE</p><h3>洪涝应急救援数据采集任务</h3></div><Code2 :size="19" /></header>
      <div class="console-grid"><div class="code-window"><div class="code-toolbar"><i /><i /><i /><span>flood_data_pipeline.py</span></div><pre><code><span class="code-blue">sources</span> = [<span class="code-gold">"emergency"</span>, <span class="code-gold">"weather"</span>, <span class="code-gold">"rescue"</span>, <span class="code-gold">"drone"</span>]
<span class="code-blue">dataset</span> = collect(sources, grid=<span class="code-gold">"甲1:甲9"</span>)
dataset.standardize(time=<span class="code-gold">"灾后0小时"</span>, rainfall=<span class="code-gold">"mm"</span>, water=<span class="code-gold">"m"</span>)
dataset.deduplicate(primary_key=<span class="code-gold">"grid_id"</span>)
dataset.detect_outliers(rule=<span class="code-gold">"3σ"</span>)</code></pre></div><div class="run-status"><div class="progress-ring" :style="{ '--progress': `${progress * 3.6}deg` }"><strong>{{ progress }}%</strong><span>提取进度</span></div><p>{{ collecting ? `正在同步 ${dataSources[activeSource].name}` : '数据采集、提取与清洗任务已完成' }}</p><div class="progress-track wide"><i :style="{ width: `${progress}%` }" /></div></div></div>
    </section>

    <section class="two-column-layout">
      <article class="panel cleaning-panel">
        <header class="panel-header"><div><p class="section-index">QUALITY PIPELINE</p><h3>五步数据清洗</h3></div><ScanSearch :size="19" /></header>
        <div class="cleaning-list"><div v-for="step in cleaningSteps" :key="step.id"><span>{{ String(step.id).padStart(2, '0') }}</span><div><strong>{{ step.title }}</strong><p>{{ step.detail }}</p><code v-if="step.formula" class="cleaning-formula">{{ step.formula }}</code></div><CheckCircle2 :size="18" /></div></div>
      </article>
      <article class="panel compliance-panel">
        <header class="panel-header"><div><p class="section-index">95% COMPLIANCE GATE</p><h3>四维合规检测</h3></div><StatusBadge label="无合规风险" tone="success" dot /></header>
        <div class="score-bars"><div v-for="check in complianceChecks" :key="check.label"><div><strong>{{ check.label }}</strong><span>{{ check.score }}%</span></div><p>{{ check.basis }}</p><div class="score-track"><i :style="{ width: `${check.score}%` }" /></div></div></div>
        <div class="report-actions"><button class="secondary-button" type="button" @click="openReport('compliance')"><Eye :size="15" />查看合规报告</button><button class="secondary-button" type="button" @click="downloadReport('compliance')"><Download :size="15" />下载合规报告</button></div>
      </article>
    </section>

    <SigmaAnalysisPanel :grids="grids" class="sigma-panel-section" />

    <section class="panel report-delivery-panel"><div><p class="section-index">QUALITY DELIVERABLE</p><h3>灾情数据质量校验单</h3><p>包含COUNTBLANK完整性检查、3σ异常确认、XLOOKUP来源匹配和9/9影像核验。</p></div><div class="report-actions"><button class="secondary-button" type="button" @click="openReport('quality')"><Eye :size="15" />查看质量校验单</button><button class="primary-button" type="button" @click="downloadReport('quality')"><Download :size="15" />下载质量校验单</button></div></section>

    <section class="panel grid-data-panel">
      <header class="panel-header"><div><p class="section-index">CLEAN DATASET</p><h3>9 网格灾情标准数据</h3></div><button class="text-button" type="button" @click="exportDataset"><Download :size="15" />导出数据源</button></header>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>网格</th><th>网格名称</th><th>受灾人数</th><th>被困人数</th><th>转移安置</th><th>特殊人群</th><th>道路</th><th>累计降雨</th><th>实时水位</th><th>仓库距离</th></tr></thead><tbody><tr v-for="grid in grids" :key="grid.id"><td><strong>{{ grid.id }}</strong></td><td>{{ grid.name }}</td><td>{{ grid.affected.toLocaleString() }}</td><td>{{ grid.trapped }}</td><td>{{ grid.relocated.toLocaleString() }}</td><td>{{ grid.special }}</td><td><StatusBadge :label="grid.roadBlocked ? '中断' : '畅通'" :tone="grid.roadBlocked ? 'danger' : 'success'" /></td><td :class="{ 'cell-warning': grid.rainfall >= 145 }">{{ grid.rainfall }} mm</td><td>{{ grid.waterLevel }} m</td><td>{{ grid.distance }} km</td></tr></tbody></table></div>
    </section>
    <BaseModal :open="Boolean(reportType)" :title="activeReportTitle" description="报告可直接用于现场展示与任务交付" width="760px" @close="reportType = ''"><pre class="report-preview">{{ activeReport }}</pre><template #footer><button class="secondary-button" type="button" @click="reportType = ''">关闭</button><button class="primary-button" type="button" @click="downloadReport(reportType)"><Download :size="15" />下载报告</button></template></BaseModal>
  </div>
</template>
