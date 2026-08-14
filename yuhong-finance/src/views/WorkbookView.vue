<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { INSURANCE_WORKBOOK, insuranceCriteria, insuranceProducts } from '../data/insurance.js'
import { COST_DRIVER_WORKBOOK, budgetParameters, disasterGrids } from '../data/costDriver.js'
import { ABC_WORKBOOK, abcPlans, compareConclusions } from '../data/abcBudget.js'
import { getInsuranceDecision } from '../domain/insurance.js'
import { calculateBudgetSummary } from '../domain/costDriver.js'
import { summarizeAbcPlans } from '../domain/abcBudget.js'
import { money, num } from '../domain/format.js'

const router = useRouter()
const imported = ref({ insurance: false, costDriver: false, abcBudget: false })
const abcRows = computed(() => summarizeAbcPlans())

const decision = computed(() => getInsuranceDecision())
const summary = computed(() => calculateBudgetSummary())

const workbooks = [
  {
    id: 'insurance',
    file: INSURANCE_WORKBOOK,
    title: '保险方案综合评分计算表',
    usedBy: { label: '救援人员保险方案比较', roleId: 'procurement', taskKey: 's1-t4' },
    sheets: ['保险方案评分计算'],
    blocks: ['三家保险产品基础数据', '评分指标与权重', '各指标标准分计算', '加权得分明细', '人均保费、总保费及预算影响'],
  },
  {
    id: 'costDriver',
    file: COST_DRIVER_WORKBOOK,
    title: '灾情数据成本动因转换计算表',
    usedBy: { label: '将灾情数据转换为成本动因', roleId: 'budget-performance', taskKey: 's1-t5' },
    sheets: ['成本动因转换'],
    blocks: ['预算参数表', '9网格灾情', '9网格成本动因测算', '保险及设备预算', '预算汇总', '成本构成汇总'],
  },
  {
    id: 'abcBudget',
    file: ABC_WORKBOOK,
    title: 'ABC三受灾等级预算计算表',
    usedBy: { label: '编制A、B、C三受灾等级预算', roleId: 'budget-performance', taskKey: 's1-t6' },
    sheets: ['ABC三方案预算'],
    blocks: ['三方案基础参数', '预算测算与关键指标', '保障内容对比', '预算增量来源'],
  },
]

function downloadUrl(file) {
  return `${import.meta.env.BASE_URL}workbooks/${encodeURIComponent(file)}`
}
</script>

<template>
  <div class="page">
    <header class="page-title-bar">
      <div class="page-title-main">
        <h1 class="page-title">补充数据表</h1>
        <p class="page-subtitle">
          三份计算表分别是保险方案比较、成本动因转换与 A/B/C 三受灾等级预算的数据底稿。工作簿原文标注「弄到平台，学生可以下载」「点击导入，点完平台呈现效果」，此处提供下载与导入演示。
        </p>
      </div>
    </header>

    <section v-for="book in workbooks" :key="book.id" class="panel">
      <div class="panel-header">
        <h2>{{ book.title }}</h2>
        <span class="panel-source">{{ book.file }}</span>
      </div>
      <div class="panel-body">
        <div class="workbook-meta">
          <div class="workbook-info">
            <p><span class="limit-label">工作表</span>{{ book.sheets.join('、') }}</p>
            <p><span class="limit-label">内容分区</span>{{ book.blocks.join(' / ') }}</p>
            <p>
              <span class="limit-label">支撑任务</span>
              <button
                type="button"
                class="text-button"
                @click="router.push({ name: 'task', params: { roleId: book.usedBy.roleId, taskKey: book.usedBy.taskKey } })"
              >{{ book.usedBy.label }}</button>
            </p>
          </div>
          <div class="workbook-actions">
            <a class="secondary-button" :href="downloadUrl(book.file)" :download="book.file">下载计算表</a>
            <button type="button" class="primary-button" @click="imported[book.id] = !imported[book.id]">
              {{ imported[book.id] ? '收起导入结果' : '点击导入' }}
            </button>
          </div>
        </div>

        <template v-if="imported[book.id] && book.id === 'insurance'">
          <div class="calc-subhead"><h3>导入结果 · 三家保险产品基础数据</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr>
                  <th>保险公司</th><th>保费</th><th>身故保额</th><th>伤残保额</th><th>医疗保额</th>
                  <th>免赔额</th><th>等待期</th><th>承保范围</th><th>赔付时效</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in insuranceProducts" :key="p.id">
                  <th scope="row">{{ p.name }}</th>
                  <td>{{ p.premium }} 元/人</td><td>{{ p.death }} 万元</td><td>{{ p.disability }} 万元</td>
                  <td>{{ p.medical }} 万元</td><td>{{ p.deductible }} 元</td><td>{{ p.waiting }} 天</td>
                  <td>{{ p.coverage }}</td><td>{{ p.settlementDays }} 天</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="calc-subhead"><h3>导入结果 · 加权得分明细</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr>
                  <th>保险公司</th>
                  <th v-for="c in insuranceCriteria" :key="c.key">{{ c.label }}</th>
                  <th class="col-total">综合得分</th><th>排名</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in decision.rows" :key="row.id" :class="{ winner: row.recommended }">
                  <th scope="row">{{ row.name }}</th>
                  <td v-for="c in insuranceCriteria" :key="c.key">{{ num(row.weighted[c.key], 2) }}</td>
                  <td class="col-total">{{ num(row.total, 2) }}</td>
                  <td>{{ row.recommended ? '推荐' : '备选' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="calc-result"><p class="result-line">{{ decision.conclusion }}</p></div>
        </template>

        <template v-if="imported[book.id] && book.id === 'costDriver'">
          <div class="calc-subhead"><h3>导入结果 · 预算参数表</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th>参数名称</th><th>数值</th><th>单位</th><th>说明</th></tr></thead>
              <tbody>
                <tr v-for="p in budgetParameters" :key="p.key">
                  <th scope="row">{{ p.name }}</th><td>{{ p.value }}</td><td>{{ p.unit }}</td><td>{{ p.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="calc-subhead"><h3>导入结果 · 9网格灾情与预算</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr><th>网格</th><th>转移安置人数</th><th>特殊人群数</th><th>距仓库距离</th><th>棉被需求量</th><th class="col-total">网格预算合计</th></tr>
              </thead>
              <tbody>
                <tr v-for="(grid, i) in disasterGrids" :key="grid.id">
                  <th scope="row">{{ grid.id }}</th>
                  <td>{{ num(grid.relocated, 0) }}</td><td>{{ num(grid.special, 0) }}</td>
                  <td>{{ num(grid.distance, 2) }} km</td><td>{{ num(grid.quilts, 0) }}</td>
                  <td class="col-total">{{ money(summary.rows[i].total, 0) }} 元</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">9网格合计</th>
                  <td>{{ num(summary.totals.relocated, 0) }}</td><td>{{ num(summary.totals.special, 0) }}</td>
                  <td>—</td><td>{{ num(summary.totals.quilts, 0) }}</td>
                  <td class="col-total">{{ money(summary.gridBudget, 0) }} 元</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">9网格预算需求</span>
              <strong class="stat-value">{{ money(summary.gridBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">保险预算</span>
              <strong class="stat-value">{{ money(summary.insuranceBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">设备预算</span>
              <strong class="stat-value">{{ money(summary.equipmentBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">总预算需求</span>
              <strong class="stat-value accent">{{ money(summary.totalBudget, 0) }} 元</strong>
            </div>
          </div>
        </template>

        <template v-if="imported[book.id] && book.id === 'abcBudget'">
          <div class="calc-subhead"><h3>导入结果 · ABC三方案预算</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr><th>指标</th><th>A方案</th><th>B方案</th><th>C方案</th><th>结论</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">总预算（元）</th>
                  <td>{{ money(abcPlans[0].total, 0) }}</td>
                  <td>{{ money(abcPlans[1].total, 0) }}</td>
                  <td>{{ money(abcPlans[2].total, 1) }}</td>
                  <td>{{ compareConclusions.total }}</td>
                </tr>
                <tr>
                  <th scope="row">安置期（天）</th>
                  <td>{{ abcPlans[0].days }}</td>
                  <td>{{ abcPlans[1].days }}</td>
                  <td>{{ abcPlans[2].days }}</td>
                  <td>{{ compareConclusions.days }}</td>
                </tr>
                <tr>
                  <th scope="row">覆盖人数（人）</th>
                  <td>{{ num(abcPlans[0].people, 0) }}</td>
                  <td>{{ num(abcPlans[1].people, 0) }}</td>
                  <td>{{ num(abcPlans[2].people, 0) }}</td>
                  <td>{{ compareConclusions.people }}</td>
                </tr>
                <tr>
                  <th scope="row">单位受益成本（元/人）</th>
                  <td>{{ num(abcRows[0].unitCost, 2) }}</td>
                  <td>{{ num(abcRows[1].unitCost, 3) }}</td>
                  <td>{{ num(abcRows[2].unitCost, 2) }}</td>
                  <td>{{ compareConclusions.unitCost }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="stat-grid">
            <div v-for="row in abcRows" :key="row.id" class="stat-cell">
              <span class="stat-label">{{ row.name }} · {{ row.level }}</span>
              <strong class="stat-value">{{ money(row.total, row.id === 'C' ? 1 : 0) }} 元</strong>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
