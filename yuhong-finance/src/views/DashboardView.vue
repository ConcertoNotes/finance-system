<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { AlertTriangle, CircleDollarSign, CloudRain, DatabaseZap, Route, ShieldCheck, Users } from '@lucide/vue'
import GridHeatmap from '../components/GridHeatmap.vue'
import MetricCard from '../components/MetricCard.vue'
import RoleTaskPanel from '../components/RoleTaskPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { budgetScenarios } from '../data/budget.js'
import { getRoleTasksByView } from '../data/roleplay.js'
import { dataQuality, disasterTrends, getGridSnapshot } from '../data/disaster.js'
import { fundSnapshots } from '../data/funds.js'
import { calculateGridFundingRows, formatCurrency } from '../domain/finance.js'
import { determineResponse, summarizeDisaster } from '../domain/emergency.js'

const HydrologyChart = defineAsyncComponent(() => import('../components/HydrologyChart.vue'))

const props = defineProps({
  stage: { type: String, default: 'baseline' },
  workflowState: { type: Object, default: () => ({}) },
})
const selectedGridId = ref('甲3')
const roleTasks = getRoleTasksByView('dashboard')

const grids = computed(() => getGridSnapshot(props.stage))
const summary = computed(() => summarizeDisaster(grids.value))
const fund = computed(() => fundSnapshots[props.stage])
const responseApproved = computed(() => props.workflowState?.responseApproval?.status === 'approved')
// Excel 台词：御洪星初次同步时"预计资金需求待定、资金覆盖率待定"，响应判级审批后才有预算口径
const fundPending = computed(() => props.stage === 'baseline' && !responseApproved.value)
const response = computed(() => determineResponse({ ...summary.value, shelterDays: props.stage === 'escalated' ? 5 : 3, fundingGap: fund.value.gap, fundingGapPending: fundPending.value }))
const budget = computed(() => budgetScenarios.find((item) => item.id === response.value.planId))
const selectedGrid = computed(() => grids.value.find((grid) => grid.id === selectedGridId.value))
const priorityRows = computed(() => calculateGridFundingRows(grids.value, budget.value, fund.value))
const originalResponse = computed(() => props.stage === 'escalated' ? 'III级' : 'IV级')
const approvalAuthority = computed(() => props.stage === 'escalated' ? '财务主管统筹岗专项审批' : '财务主管统筹岗审核确认')
const trendData = computed(() => {
  if (props.stage === 'baseline') return disasterTrends
  return {
    labels: disasterTrends.labels,
    rainfall: disasterTrends.rainfall.map((value, index) => value + [0, 3, 5, 8, 12, 20][index]),
    waterLevel: disasterTrends.waterLevel.map((value, index) => value + [0, 0.1, 0.2, 0.3, 0.5, 0.8][index]),
  }
})
</script>

<template>
  <div class="page-content dashboard-page">
    <section class="page-intro">
      <div><p class="eyebrow">FLOOD FINANCE COMMAND</p><h1>洪涝应急救援全景监控</h1><p>9 网格灾情、预算、资金与保障优先级实时联动</p></div>
      <StatusBadge :label="`数据完整率 ${dataQuality[0].value}%`" tone="success" dot />
    </section>

    <RoleTaskPanel :tasks="roleTasks" />

    <section class="metric-grid metric-grid-4">
      <MetricCard label="受灾人数" :value="summary.affected.toLocaleString()" unit="人" :detail="stage === 'escalated' ? '较初始态 +1,500' : '9 网格实时汇总'" :trend="stage === 'escalated' ? '+14.0%' : '已核验'" :icon="Users" :tone="stage === 'escalated' ? 'danger' : 'cyan'" />
      <MetricCard label="转移安置" :value="summary.relocated.toLocaleString()" unit="人" :detail="stage === 'escalated' ? '达到 II 级阈值' : '覆盖 7,000 人'" :trend="stage === 'escalated' ? '+1,100' : 'III级'" :icon="Route" :tone="stage === 'escalated' ? 'danger' : 'gold'" />
      <MetricCard label="当前预算需求" :value="(budget.total / 10000).toFixed(1)" unit="万元" :detail="`${budget.id}方案 · ${budget.days}天保障`" :trend="`${budget.unitCost}元/人`" :icon="CircleDollarSign" tone="gold" />
      <MetricCard label="资金覆盖率" :value="fundPending ? '待定' : fund.coverage.toFixed(2)" :unit="fundPending ? '' : '%'" :detail="fundPending ? '待响应判级审批后同步' : `可用 ${formatCurrency(fund.available)}`" :trend="fundPending ? '御洪星待同步' : fund.gap ? `缺口 ${formatCurrency(fund.gap)}` : '资金充足'" :icon="ShieldCheck" :tone="fundPending ? 'cyan' : fund.gap ? 'danger' : 'green'" />
    </section>

    <section class="dashboard-layout">
      <article class="panel map-panel">
        <header class="panel-header"><div><p class="section-index">01 · 灾情概况</p><h3>9 网格风险热力分布</h3></div><StatusBadge :label="`${summary.blockedRoads} 个道路中断`" :tone="summary.blockedRoads >= 4 ? 'danger' : 'warning'" dot /></header>
        <GridHeatmap :grids="grids" :selected-id="selectedGridId" @select="selectedGridId = $event" />
        <div class="selected-grid-strip">
          <div><span>当前选中</span><strong>{{ selectedGrid.id }} · {{ selectedGrid.name }}</strong></div>
          <div><span>受灾人数</span><strong>{{ selectedGrid.affected.toLocaleString() }} 人</strong></div>
          <div><span>被困人数</span><strong>{{ selectedGrid.trapped }} 人</strong></div>
          <div><span>转移安置人数</span><strong>{{ selectedGrid.relocated.toLocaleString() }} 人</strong></div>
          <div><span>特殊人群数</span><strong>{{ selectedGrid.special }} 人</strong></div>
          <div><span>降雨</span><strong>{{ selectedGrid.rainfall }} mm</strong></div>
          <div><span>水位</span><strong>{{ selectedGrid.waterLevel }} m</strong></div>
        </div>
      </article>

      <article class="panel response-panel">
        <header class="panel-header"><div><p class="section-index">03 · 响应判级</p><h3>内部资金保障响应</h3></div><span class="response-level" :class="{ danger: response.level === 'II' }">{{ response.level }}级</span></header>
        <div class="response-summary"><span>对应预算方案</span><strong>{{ budget.id }} · {{ budget.name }}</strong><p>{{ stage === 'escalated' ? '三项核心指标达到 II 级，建议立即升级响应。' : '四项指标触发 III 级及以上，其中一项达到 II 级。' }}</p></div>
        <div class="response-facts"><div><span>原响应等级</span><strong>{{ originalResponse }}</strong></div><div><span>建议响应等级</span><strong>{{ response.level }}级</strong></div><div><span>预算上限</span><strong>{{ formatCurrency(budget.total) }}</strong></div><div><span>预备费比例</span><strong>{{ fund.bufferRate }}%</strong></div><div><span>审批权限变化</span><strong>{{ approvalAuthority }}</strong></div></div>
        <div class="threshold-list">
          <div v-for="item in response.indicators" :key="item.key"><span>{{ item.label }}</span><strong>{{ item.pending ? '待定' : `${item.value.toLocaleString()} ${item.unit}` }}</strong><StatusBadge :label="item.pending ? '暂按III级' : `${item.level}级`" :tone="item.pending ? 'warning' : item.level === 'II' ? 'danger' : item.level === 'III' ? 'warning' : 'neutral'" /></div>
        </div>
      </article>

      <article class="panel trend-panel">
        <header class="panel-header"><div><p class="section-index">趋势监测</p><h3>降雨量与实时水位</h3></div><CloudRain :size="19" /></header>
        <div class="hydrology-summary"><div><span>累计降雨量</span><strong>{{ stage === 'escalated' ? 171 : 156 }} <small>mm</small></strong></div><i /><div><span>最高实时水位</span><strong>{{ stage === 'escalated' ? 6.4 : 5.8 }} <small>m</small></strong></div></div>
        <HydrologyChart :labels="trendData.labels" :rainfall="trendData.rainfall" :water-level="trendData.waterLevel" />
      </article>

      <article class="panel quality-panel">
        <header class="panel-header"><div><p class="section-index">02 · 数据质量</p><h3>预算依据可信度</h3></div><DatabaseZap :size="19" /></header>
        <div class="quality-grid"><div v-for="item in dataQuality" :key="item.label"><strong>{{ item.value }}{{ item.unit }}</strong><span>{{ item.label }}</span></div></div>
        <div class="compliance-line"><ShieldCheck :size="16" /><span>自然灾害救助条例 · 应急物资保障管理办法</span><b>通过</b></div>
      </article>

      <article class="panel funding-panel">
        <header class="panel-header"><div><p class="section-index">04 · 资金状态</p><h3>可用性与支付能力</h3></div><CircleDollarSign :size="19" /></header>
        <div class="fund-main"><div><span>当前可用资金</span><strong>{{ formatCurrency(fund.available) }}</strong></div><div><span>6 小时内可支付资金</span><strong>{{ formatCurrency(fund.payableIn6h) }}</strong></div><div><span>已占用预算</span><strong>{{ formatCurrency(fund.occupied) }}</strong></div><div><span>预计资金需求</span><strong :class="{ 'fund-pending': fundPending }">{{ fundPending ? '待定' : formatCurrency(fund.demand) }}</strong></div></div>
        <div class="fund-bar"><i :style="{ width: fundPending ? '0%' : `${Math.min(100, fund.coverage)}%` }" /></div>
        <div class="fund-foot"><span>{{ fundPending ? '资金覆盖率 待定 · 完成响应判级审批后由御洪星同步' : `资金覆盖率 ${fund.coverage.toFixed(2)}%` }}</span><b :class="{ risk: fund.gap }">{{ fundPending ? '当前资金缺口 待定' : `当前资金缺口 ${formatCurrency(fund.gap)}` }}</b></div>
      </article>

      <article class="panel priority-panel">
        <header class="panel-header"><div><p class="section-index">05 · 网格保障优先级</p><h3>资金建议投向</h3></div><AlertTriangle :size="19" /></header>
        <div class="priority-table-wrap"><div class="compact-table priority-table"><div class="table-head"><span>网格</span><span>最低保障预算</span><span>资金缺口</span><span>单位受益成本</span><span>建议追加金额</span><span>保障优先级</span></div><div v-for="(grid, index) in priorityRows" :key="grid.id"><strong>{{ grid.id }} · {{ grid.name }}</strong><span>{{ formatCurrency(grid.minimumBudget) }}</span><span>{{ formatCurrency(grid.fundingGap) }}</span><span>{{ grid.unitCost }} 元/人</span><span>{{ formatCurrency(grid.suggestedIncrease) }}</span><StatusBadge :label="`P${index + 1}`" :tone="index < 2 ? 'danger' : index < 4 ? 'warning' : 'neutral'" /></div></div></div>
      </article>
    </section>
  </div>
</template>
