<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { INSURANCE_WORKBOOK, insuranceCriteria, insuranceProducts } from '../data/insurance.js'
import { COST_DRIVER_WORKBOOK, budgetParameters, disasterGrids } from '../data/costDriver.js'
import { ABC_WORKBOOK, abcPlans, compareConclusions } from '../data/abcBudget.js'
import { PRICE_WORKBOOK, priceQuotes } from '../data/procurement.js'
import { getInsuranceDecision } from '../domain/insurance.js'
import { calculateBudgetSummary } from '../domain/costDriver.js'
import { summarizeAbcPlans } from '../domain/abcBudget.js'
import { calculatePriceBaseline, getDirectControlPrices } from '../domain/procurement.js'
import { money, num, signedPercent } from '../domain/format.js'

const router = useRouter()
const imported = ref({ insurance: false, costDriver: false, abcBudget: false, price: false })
const abcRows = computed(() => summarizeAbcPlans())
const priceRows = computed(() => calculatePriceBaseline())
const directPrices = computed(() => getDirectControlPrices())

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
    usedBy: { label: '编制ABC等级预算', roleId: 'budget-performance', taskKey: 's1-t6' },
    sheets: ['ABC三方案预算'],
    blocks: ['三方案基础参数', '预算测算与关键指标', '保障内容对比', '预算增量来源'],
  },
  {
    id: 'price',
    file: PRICE_WORKBOOK,
    title: '分层采购价格基准计算表',
    usedBy: { label: '建立分层采购价格基准', roleId: 'procurement', taskKey: 's2-t2' },
    sheets: ['分层采购价格基准'],
    blocks: ['价格数据采集', '4类合同物资价格基准', '2类生活保障直采核验', '价格偏差分析', '报价口径校验'],
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
          四份计算表分别是保险方案比较、成本动因转换、ABC 等级预算与分层采购价格基准的数据底稿。工作簿原文标注「弄到平台，学生可以下载」「点击导入，点完平台呈现效果」，此处提供下载与导入演示。
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
                <tr>
                  <th scope="row">适用灾情</th>
                  <td>{{ abcPlans[0].applicable }}</td>
                  <td>{{ abcPlans[1].applicable }}</td>
                  <td>{{ abcPlans[2].applicable }}</td>
                  <td>{{ compareConclusions.applicable }}</td>
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

        <template v-if="imported[book.id] && book.id === 'price'">
          <div class="calc-subhead"><h3>导入结果 · 价格数据采集</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr>
                  <th>物资</th><th>采购路径</th><th>历史价</th><th>市场参考价</th>
                  <th>S1</th><th>S2</th><th>S3 / 直采控制价</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in priceQuotes" :key="row.id">
                  <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                  <td>{{ row.channel === 'contract' ? '合同采购' : '应急零售/框架协议直采' }}</td>
                  <td>{{ num(row.history, 2) }}</td>
                  <td>{{ num(row.market, 2) }}</td>
                  <td>{{ row.channel === 'contract' ? num(row.s1, 2) : '—' }}</td>
                  <td>{{ row.channel === 'contract' ? num(row.s2, 2) : '—' }}</td>
                  <td>{{ row.channel === 'contract' ? num(row.s3, 2) : money(row.control, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="calc-subhead"><h3>导入结果 · 4类合同物资价格基准</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr>
                  <th>物资</th><th>平均价</th><th>中位数</th><th>报价区间</th><th class="col-total">综合基准价</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in priceRows" :key="row.id">
                  <th scope="row">{{ row.name }}</th>
                  <td>{{ num(row.average, 2) }}</td>
                  <td>{{ num(row.median, 2) }}</td>
                  <td>{{ num(row.low, 2) }} — {{ num(row.high, 2) }}</td>
                  <td class="col-total">{{ num(row.baseline, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="calc-subhead"><h3>导入结果 · 价格偏差</h3></div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr><th>物资</th><th>综合基准价</th><th>S1 偏差率</th><th>S2 偏差率</th><th>S3 偏差率</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in priceRows" :key="row.id">
                  <th scope="row">{{ row.name }}</th>
                  <td>{{ num(row.baseline, 2) }}</td>
                  <td v-for="item in row.deviations" :key="item.supplierId">{{ signedPercent(item.rate, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="calc-subhead"><h3>导入结果 · 2类生活保障直采控制价</h3></div>
          <table class="calc-table compact">
            <thead>
              <tr><th>物资</th><th>历史价</th><th>市场参考价</th><th class="col-total">直采控制价</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in directPrices" :key="row.id">
                <th scope="row">{{ row.name }}</th>
                <td>{{ num(row.history, 2) }}</td>
                <td>{{ num(row.market, 2) }}</td>
                <td class="col-total">{{ money(row.control, 2) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </section>
  </div>
</template>
