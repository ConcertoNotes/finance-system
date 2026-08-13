<script setup>
// 救援人员保险方案评审操作台。学生录入报价、配置评分规则，平台逐项回写评审结果。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import {
  INSURANCE_WORKBOOK,
  RESCUER_COUNT,
  coverageTiers,
  insuranceCriteria,
  insuranceProducts,
} from '../../data/insurance.js'
import { buildScoreBreakdown, getInsuranceDecision, standardizeScores } from '../../domain/insurance.js'
import { money, num } from '../../domain/format.js'

const OPS = ['quotes', 'rules', 'standard', 'weighted', 'decision']
const flow = useTaskFlow('s1-t4', OPS)

const quoteFields = [
  { key: 'premium', label: '保费', unit: '元/人', type: 'number', step: 10 },
  { key: 'death', label: '意外身故保额', unit: '万元', type: 'number', step: 10 },
  { key: 'disability', label: '意外伤残保额', unit: '万元', type: 'number', step: 10 },
  { key: 'medical', label: '医疗保额', unit: '万元', type: 'number', step: 1 },
  { key: 'deductible', label: '免赔额', unit: '元', type: 'number', step: 50 },
  { key: 'waiting', label: '等待期', unit: '天', type: 'number', step: 1 },
  { key: 'coverage', label: '洪涝救援承保范围', unit: '', type: 'text' },
  { key: 'documents', label: '理赔资料要求', unit: '', type: 'text' },
  { key: 'settlementDays', label: '赔付时效', unit: '天', type: 'number', step: 1 },
]
const numericKeys = quoteFields.filter((field) => field.type === 'number').map((field) => field.key)

const typeLabel = { cost: '成本型', benefit: '效益型', tier: '分档赋值' }
const typeRule = {
  cost: '(最大值－本方案值)/(最大值－最小值)×100',
  benefit: '(本方案值－最小值)/(最大值－最小值)×100',
  tier: 'XLOOKUP(承保表述, 分档表, 标准分)',
}

const FUND_SOURCE = '政府财政拨款保障资金'
const fundSources = [FUND_SOURCE, '限定性社会捐赠', '非限定性社会捐赠', '其他合规项目资金']

const products = reactive(insuranceProducts.map((item) => ({ ...item })))
const weights = reactive(Object.fromEntries(insuranceCriteria.map((c) => [c.key, Math.round(c.weight * 100)])))
const headcount = ref(RESCUER_COUNT)
const fundSource = ref(FUND_SOURCE)
const selected = ref('B')
const error = ref('')

function weightOf(key) {
  return (Number(weights[key]) || 0) / 100
}

/** 送入评审引擎的报价：清洗掉编辑过程中出现的空值。 */
const quotes = computed(() =>
  products.map((item) => {
    const row = { ...item }
    numericKeys.forEach((key) => { row[key] = Number(row[key]) || 0 })
    return row
  }),
)

const weightTotal = computed(() =>
  insuranceCriteria.reduce((sum, c) => sum + (Number(weights[c.key]) || 0), 0),
)
const weightBalanced = computed(() => Math.abs(weightTotal.value - 100) <= 0.001)
const isStandardRule = computed(() =>
  insuranceCriteria.every((c) => Math.abs(weightOf(c.key) - c.weight) < 1e-9),
)

const standardized = computed(() => standardizeScores(quotes.value))

const weightedRows = computed(() => {
  const rows = standardized.value.map((entry) => {
    const weighted = {}
    let total = 0
    for (const criterion of insuranceCriteria) {
      weighted[criterion.key] = entry.scores[criterion.key] * weightOf(criterion.key)
      total += weighted[criterion.key]
    }
    return { ...entry, weighted, total }
  })
  const best = Math.max(...rows.map((row) => row.total))
  return rows.map((row) => ({ ...row, rank: row.total === best ? 1 : 2, recommended: row.total === best }))
})

const breakdown = computed(() =>
  buildScoreBreakdown(selected.value, quotes.value).map((row) => ({
    ...row,
    weight: weightOf(row.key),
    weighted: row.score * weightOf(row.key),
  })),
)
const breakdownTotal = computed(() => breakdown.value.reduce((sum, row) => sum + row.weighted, 0))

// 权重维持标准评分规则时采用评审引擎结论；学生调整权重后按现行权重重新定标。
const decision = computed(() => {
  const base = getInsuranceDecision(quotes.value, headcount.value)
  if (isStandardRule.value) return base
  const winner = weightedRows.value.find((row) => row.recommended)
  const product = quotes.value.find((item) => item.id === winner.id)
  const totalPremium = product.premium * headcount.value
  return {
    ...base,
    winner,
    product,
    totalPremium,
    alternatives: quotes.value
      .filter((item) => item.id !== winner.id)
      .map((item) => ({
        ...item,
        totalPremium: item.premium * headcount.value,
        premiumGap: (item.premium - product.premium) * headcount.value,
      })),
    conclusion: `选择${product.name}：按现行指标权重综合得分最高 ${winner.total.toFixed(2)} 分，人均保费 ${money(product.premium, 0)} 元/人，总保费 ${money(totalPremium, 0)} 元。`,
  }
})

function tierOf(product) {
  return coverageTiers.find((tier) => tier.match === product.coverage)
}

function tierProducts(tier) {
  const matched = products.filter((item) => item.coverage === tier.match)
  return matched.length ? matched.map((item) => item.id).join('、') : '—'
}

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function checkQuotes() {
  const blank = products.some((item) =>
    numericKeys.some((key) => item[key] === '' || item[key] === null || Number.isNaN(Number(item[key]))),
  )
  if (blank) return '报价表存在未填写的数值项，无法导入'
  if (products.some((item) => Number(item.premium) <= 0)) return '保费须大于 0 元/人'
  return ''
}

function checkRules() {
  if (insuranceCriteria.some((c) => Number(weights[c.key]) < 0)) return '指标权重不得为负数'
  if (!weightBalanced.value) return `指标权重合计 ${num(weightTotal.value, 2)}%，须调整为 100% 后方可保存`
  return ''
}

function checkDecision() {
  if (!Number.isFinite(headcount.value) || headcount.value < 1) return '救援人数须为大于 0 的整数'
  if (fundSource.value !== FUND_SOURCE) return `救援人员保险支出须由${FUND_SOURCE}列支，资金用途校验未通过`
  return ''
}

function resetAll() {
  flow.reset()
  products.forEach((item, index) => Object.assign(item, insuranceProducts[index]))
  insuranceCriteria.forEach((c) => { weights[c.key] = Math.round(c.weight * 100) })
  headcount.value = RESCUER_COUNT
  fundSource.value = FUND_SOURCE
  selected.value = 'B'
  error.value = ''
}
</script>

<template>
  <PanelShell title="救援人员保险方案比较" source="保险方案评审">
    <div class="op-progress">
      <div class="op-progress-track">
        <span class="op-progress-fill" :style="{ width: `${(flow.progress.value.done / flow.progress.value.total) * 100}%` }" />
      </div>
      <span class="op-progress-text">{{ flow.progress.value.done }} / {{ flow.progress.value.total }} 项操作完成</span>
      <button type="button" class="text-button" @click="resetAll">重置</button>
    </div>

    <p v-if="error" class="sys-toast danger">{{ error }}</p>

    <div class="op-flow">
      <OperationBlock title="录入三家保险产品报价" :status="flow.status('quotes')" done-label="报价已导入">
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">报价文件</span>
            <input class="form-control locked" :value="INSURANCE_WORKBOOK" readonly />
          </label>
          <label class="form-item">
            <span class="form-label">报价家数</span>
            <input class="form-control locked" :value="`${products.length} 家`" readonly />
          </label>
        </div>
        <div class="score-table-wrap">
          <table class="calc-table compact">
            <thead>
              <tr>
                <th style="width: 150px">对比指标</th>
                <th v-for="p in products" :key="p.id">{{ p.name }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in quoteFields" :key="field.key">
                <th scope="row">
                  {{ field.label }}<em v-if="field.unit" class="row-unit">{{ field.unit }}</em>
                </th>
                <td v-for="p in products" :key="p.id">
                  <input
                    v-if="field.type === 'number'"
                    v-model.number="p[field.key]"
                    type="number"
                    min="0"
                    :step="field.step"
                  />
                  <span v-else>{{ p[field.key] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('quotes')"
            @click="run('quotes', checkQuotes)">导入报价</button>
        </div>

        <template #result>
          <p class="sys-toast">{{ products.length }} 家保险产品报价导入成功，共 {{ quoteFields.length }} 项对比指标。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr>
                  <th style="width: 150px">对比指标</th>
                  <th v-for="p in quotes" :key="p.id">{{ p.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="field in quoteFields" :key="field.key">
                  <th scope="row">
                    {{ field.label }}<em v-if="field.unit" class="row-unit">{{ field.unit }}</em>
                  </th>
                  <td v-for="p in quotes" :key="p.id">
                    {{ field.type === 'number' ? num(p[field.key], 2) : p[field.key] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </OperationBlock>

      <OperationBlock title="设置指标权重与承保范围分档" :status="flow.status('rules')" done-label="评分规则已生效">
        <table class="calc-table compact">
          <thead>
            <tr>
              <th>评分指标</th>
              <th style="width: 90px">指标类型</th>
              <th>标准化规则</th>
              <th style="width: 96px">权重（%）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in insuranceCriteria" :key="c.key">
              <th scope="row">{{ c.label }}<em v-if="c.unit" class="row-unit">{{ c.unit }}</em></th>
              <td>{{ typeLabel[c.type] }}</td>
              <td>{{ typeRule[c.type] }}</td>
              <td><input v-model.number="weights[c.key]" type="number" min="0" max="100" step="1" /></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">权重合计</th>
              <td colspan="2">须等于 100% 方可保存评分规则</td>
              <td class="col-total">{{ num(weightTotal, 2) }}%</td>
            </tr>
          </tfoot>
        </table>

        <p class="form-desc">洪涝救援承保范围分档赋值表</p>
        <table class="calc-table compact">
          <thead>
            <tr><th>承保情况</th><th style="width: 96px">标准分</th><th style="width: 120px">对应报价</th></tr>
          </thead>
          <tbody>
            <tr v-for="tier in coverageTiers" :key="tier.label">
              <th scope="row">{{ tier.label }}</th>
              <td>{{ tier.score }}</td>
              <td>{{ tierProducts(tier) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('rules')"
            @click="run('rules', checkRules)">保存评分规则</button>
        </div>

        <template #result>
          <p class="sys-toast" :class="{ warn: !weightBalanced }">
            {{ insuranceCriteria.length }} 项指标权重合计 {{ num(weightTotal, 2) }}%，{{
              weightBalanced ? '评分规则已生效' : '偏离 100%，下方评分结果仅供试算'
            }}。
          </p>
          <div class="weight-row">
            <span v-for="c in insuranceCriteria" :key="c.key" class="weight-chip">
              {{ c.label }}<em>{{ num(weights[c.key], 2) }}%</em>
            </span>
          </div>
          <ul class="sys-lines">
            <li v-for="p in products" :key="p.id">
              {{ p.name }} · {{ p.coverage }} → 分档标准分 {{ tierOf(p)?.score ?? 0 }}
            </li>
            <li class="info">承保表述未落入分档表时按 0 分处理，触发条款确认提示</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock title="计算各指标标准分" :status="flow.status('standard')" done-label="标准分已生成">
        <ul class="formula-list">
          <li>成本型指标标准分 =（最大值－本方案值）/（最大值－最小值）× 100</li>
          <li>效益型指标标准分 =（本方案值－最小值）/（最大值－最小值）× 100</li>
          <li>分档赋值指标标准分 = XLOOKUP(承保表述, 分档表, 标准分)</li>
        </ul>
        <p class="calc-caption">三方案取值相同（极差为 0）的指标统一计 100 分。</p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('standard')"
            @click="run('standard')">计算标准分</button>
        </div>

        <template #result>
          <p class="sys-toast">3 家方案 × 8 项指标标准分计算完成。</p>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr>
                  <th>保险公司</th>
                  <th v-for="c in insuranceCriteria" :key="c.key">{{ c.label }}<em>标准分</em></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in standardized" :key="row.id" :class="{ active: selected === row.id }" @click="selected = row.id">
                  <th scope="row">{{ row.name }}</th>
                  <td v-for="c in insuranceCriteria" :key="c.key">{{ num(row.scores[c.key], 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="calc-subhead">
            <h3>{{ selected }}保险公司 · 逐指标演算</h3>
            <div class="pill-group">
              <button
                v-for="p in products"
                :key="p.id"
                type="button"
                :class="{ active: selected === p.id }"
                @click="selected = p.id"
              >{{ p.id }}</button>
            </div>
          </div>
          <ul class="breakdown-list">
            <li v-for="row in breakdown" :key="row.key">
              <div class="breakdown-head">
                <span class="breakdown-label">{{ row.label }}</span>
                <span class="breakdown-type" :class="row.type">{{ typeLabel[row.type] }}</span>
                <span class="breakdown-raw">{{ row.raw }}{{ row.unit }}</span>
              </div>
              <p class="breakdown-formula">{{ row.formula }}</p>
              <div class="breakdown-foot">
                <span>标准分 {{ num(row.score, 2) }}</span>
                <span>× 权重 {{ num(row.weight * 100, 2) }}%</span>
                <strong>= {{ num(row.weighted, 2) }}</strong>
              </div>
            </li>
          </ul>
          <div class="calc-result">
            <p class="result-line">{{ selected }}保险公司加权合计 = {{ num(breakdownTotal, 4) }} 分</p>
          </div>
        </template>
      </OperationBlock>

      <OperationBlock title="计算加权综合得分" :status="flow.status('weighted')" done-label="综合得分已排名">
        <p class="block-formula">综合得分 = Σ（各指标标准分 × 对应指标权重）</p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('weighted')"
            @click="run('weighted')">计算综合得分</button>
        </div>

        <template #result>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr>
                  <th>保险公司</th>
                  <th v-for="c in insuranceCriteria" :key="c.key">{{ c.label }}<em>{{ num(weights[c.key], 2) }}%</em></th>
                  <th class="col-total">综合得分</th>
                  <th style="width: 60px">排名</th>
                  <th style="width: 72px">结论</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in weightedRows"
                  :key="row.id"
                  :class="{ winner: row.recommended, active: selected === row.id }"
                  @click="selected = row.id"
                >
                  <th scope="row">{{ row.name }}</th>
                  <td v-for="c in insuranceCriteria" :key="c.key">{{ num(row.weighted[c.key], 2) }}</td>
                  <td class="col-total">{{ num(row.total, 2) }}</td>
                  <td>{{ row.rank }}</td>
                  <td>
                    <span class="verdict" :class="row.recommended ? 'pass' : 'neutral'">
                      {{ row.recommended ? '推荐' : '备选' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="sys-toast">综合得分最高方案：{{ decision.winner.name }}（{{ num(decision.winner.total, 2) }} 分）。</p>
        </template>
      </OperationBlock>

      <OperationBlock title="测算总保费并确定方案" :status="flow.status('decision')" done-label="方案已确定">
        <div class="input-row">
          <label>救援人数</label>
          <input v-model.number="headcount" type="number" min="1" step="1" />
          <span class="input-unit">人</span>
        </div>
        <div class="form-row">
          <label class="form-item">
            <span class="form-label required">支付资金来源</span>
            <select v-model="fundSource" class="form-control">
              <option v-for="item in fundSources" :key="item">{{ item }}</option>
            </select>
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('decision')"
            @click="run('decision', checkDecision)">确定方案</button>
        </div>

        <template #result>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">中选方案</span>
              <strong class="stat-value">{{ decision.product.name }}</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">人均保费</span>
              <strong class="stat-value">{{ money(decision.product.premium, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">总保费</span>
              <strong class="stat-value accent">{{ money(decision.totalPremium, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">支付资金来源</span>
              <strong class="stat-value small">{{ fundSource }}</strong>
            </div>
          </div>

          <table class="calc-table compact">
            <thead>
              <tr>
                <th>对比方案</th>
                <th>人均保费</th>
                <th>总保费</th>
                <th>与中选方案差额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="alt in decision.alternatives" :key="alt.id">
                <th scope="row">{{ alt.name }}</th>
                <td>{{ money(alt.premium, 0) }} 元</td>
                <td>{{ money(alt.totalPremium, 0) }} 元</td>
                <td :class="alt.premiumGap > 0 ? 'negative' : 'positive'">
                  {{ alt.premiumGap > 0 ? '+' : '' }}{{ money(alt.premiumGap, 0) }} 元
                </td>
              </tr>
            </tbody>
          </table>

          <p class="conclusion">{{ decision.conclusion }}</p>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>
