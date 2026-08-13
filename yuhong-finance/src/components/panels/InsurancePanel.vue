<script setup>
// 采购共享平台 · 保险方案比选。
// 菜单路径需逐级点开，学生进入功能页填表保存后，结果写回当前页。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import {
  coverageTiers,
  insuranceCriteria,
  insuranceProducts,
} from '../../data/insurance.js'
import { buildScoreBreakdown, getInsuranceDecision, standardizeScores } from '../../domain/insurance.js'
import { money, num } from '../../domain/format.js'

const PAGES = ['quotes', 'rules', 'standard', 'weighted', 'decision']
const flow = useTaskFlow('s1-t4', PAGES)
const store = useFormPersist('s1-t4')

const menu = [
  {
    id: 'm-purchase',
    label: '采购管理',
    children: [
      {
        id: 'm-insure',
        label: '保险管理',
        children: [
          {
            id: 'm-compare',
            label: '保险方案比选',
            children: [{ id: 'quotes', label: '录入产品报价' }],
          },
        ],
      },
    ],
  },
  {
    id: 'm-base',
    label: '基础设置',
    children: [
      {
        id: 'm-score-rule',
        label: '评分规则',
        children: [{ id: 'rules', label: '指标权重配置' }],
      },
    ],
  },
  {
    id: 'm-review',
    label: '保险评审',
    children: [
      { id: 'standard', label: '标准分计算' },
      { id: 'weighted', label: '加权综合得分' },
      { id: 'decision', label: '方案确定与保费测算' },
    ],
  },
]

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

function blankProduct(src) {
  return {
    id: src.id,
    name: src.name,
    premium: '',
    death: '',
    disability: '',
    medical: '',
    deductible: '',
    waiting: '',
    coverage: '',
    documents: '',
    settlementDays: '',
  }
}

const activeId = ref('')
const workbookName = ref('')
const quoteCount = ref('')
const products = reactive(insuranceProducts.map((item) => blankProduct(item)))
const weights = reactive(Object.fromEntries(insuranceCriteria.map((c) => [c.key, ''])))
const headcount = ref('')
const fundSource = ref('')
const selected = ref('')
const error = ref('')

function weightOf(key) {
  return (Number(weights[key]) || 0) / 100
}

function headcountNum() {
  return Number(headcount.value) || 0
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
  const count = headcountNum()
  const base = getInsuranceDecision(quotes.value, count)
  if (isStandardRule.value) return base
  const winner = weightedRows.value.find((row) => row.recommended)
  const product = quotes.value.find((item) => item.id === winner.id)
  const totalPremium = (Number(product.premium) || 0) * count
  return {
    ...base,
    winner,
    product,
    totalPremium,
    alternatives: quotes.value
      .filter((item) => item.id !== winner.id)
      .map((item) => ({
        ...item,
        totalPremium: (Number(item.premium) || 0) * count,
        premiumGap: ((Number(item.premium) || 0) - (Number(product.premium) || 0)) * count,
      })),
    conclusion: `选择${product.name}：按现行指标权重综合得分最高 ${winner.total.toFixed(2)} 分，人均保费 ${money(Number(product.premium) || 0, 0)} 元/人，总保费 ${money(totalPremium, 0)} 元。`,
  }
})

const pendingPages = computed(() => PAGES.filter((id) => id !== 'decision' && !flow.isDone(id)))

function snapshot() {
  return { workbookName, quoteCount, products, weights, headcount, fundSource, selected }
}

store.restore(snapshot())

function tierOf(product) {
  return coverageTiers.find((tier) => tier.match === product.coverage)
}

function tierProducts(tier) {
  const matched = products.filter((item) => item.coverage === tier.match)
  return matched.length ? matched.map((item) => item.id).join('、') : '—'
}

function save(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  store.persist(snapshot())
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
  if (pendingPages.value.length) {
    return `还有 ${pendingPages.value.length} 个功能页未办理，无法确定方案`
  }
  const count = Number(headcount.value)
  if (!Number.isFinite(count) || count < 1) return '救援人数须为大于 0 的整数'
  if (fundSource.value !== FUND_SOURCE) return `救援人员保险支出须由${FUND_SOURCE}列支，资金用途校验未通过`
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  workbookName.value = ''
  quoteCount.value = ''
  products.forEach((item, index) => Object.assign(item, blankProduct(insuranceProducts[index])))
  insuranceCriteria.forEach((c) => { weights[c.key] = '' })
  headcount.value = ''
  fundSource.value = ''
  selected.value = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="救援人员保险方案比较" source="保险方案评审">
    <SystemShell
      system="采购共享平台"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级进入保险比选功能页。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 采购管理 → 保险管理 → 保险方案比选 → 录入产品报价 -->
        <template v-if="leaf === 'quotes'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('quotes', checkQuotes)">保存</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">报价文件</span>
              <input v-model="workbookName" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">报价家数</span>
              <input v-model="quoteCount" class="form-control" />
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
                      v-model="p[field.key]"
                      type="number"
                      min="0"
                      :step="field.step"
                    />
                    <input v-else v-model="p[field.key]" type="text" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-if="flow.isDone('quotes')">
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
        </template>

        <!-- 基础设置 → 评分规则 → 指标权重配置 -->
        <template v-else-if="leaf === 'rules'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('rules', checkRules)">保存</button>
          </div>
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
                <td>
                  <input
                    v-model="weights[c.key]"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                  />
                </td>
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
          <template v-if="flow.isDone('rules')">
            <p class="sys-toast" :class="{ warn: !weightBalanced }">
              {{ insuranceCriteria.length }} 项指标权重合计 {{ num(weightTotal, 2) }}%，{{
                weightBalanced ? '评分规则已生效' : '偏离 100%，下方评分结果仅供试算'
              }}。
            </p>
            <dl class="block-fields">
              <div v-for="c in insuranceCriteria" :key="c.key" class="field-row">
                <dt>{{ c.label }}</dt>
                <dd>{{ num(weights[c.key], 2) }}%</dd>
              </div>
            </dl>
            <ul class="formula-list">
              <li v-for="p in products" :key="p.id">
                {{ p.name }} · {{ p.coverage }} → 分档标准分 {{ tierOf(p)?.score ?? 0 }}
              </li>
              <li>承保表述未落入分档表时按 0 分处理，触发条款确认提示</li>
            </ul>
          </template>
        </template>

        <!-- 保险评审 → 标准分计算 -->
        <template v-else-if="leaf === 'standard'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('standard')">保存</button>
          </div>
          <ul class="formula-list">
            <li>成本型指标标准分 =（最大值－本方案值）/（最大值－最小值）× 100</li>
            <li>效益型指标标准分 =（本方案值－最小值）/（最大值－最小值）× 100</li>
            <li>分档赋值指标标准分 = XLOOKUP(承保表述, 分档表, 标准分)</li>
          </ul>
          <template v-if="flow.isDone('standard')">
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
            <div class="form-row">
              <label class="form-item">
                <span class="form-label">逐指标演算方案</span>
                <select v-model="selected" class="form-control">
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </label>
            </div>
            <ul class="formula-list">
              <li v-for="row in breakdown" :key="row.key">
                {{ row.label }}（{{ typeLabel[row.type] }}）{{ row.raw }}{{ row.unit }}
                · {{ row.formula }}
                · 标准分 {{ num(row.score, 2) }} × 权重 {{ num(row.weight * 100, 2) }}% = {{ num(row.weighted, 2) }}
              </li>
            </ul>
            <p class="sys-toast">{{ selected }}保险公司加权合计 = {{ num(breakdownTotal, 4) }} 分</p>
          </template>
        </template>

        <!-- 保险评审 → 加权综合得分 -->
        <template v-else-if="leaf === 'weighted'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('weighted')">保存</button>
          </div>
          <ul class="formula-list">
            <li>综合得分 = Σ（各指标标准分 × 对应指标权重）</li>
          </ul>
          <template v-if="flow.isDone('weighted')">
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
                    <td>{{ row.recommended ? '推荐' : '备选' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="sys-toast">综合得分最高方案：{{ decision.winner.name }}（{{ num(decision.winner.total, 2) }} 分）。</p>
          </template>
        </template>

        <!-- 保险评审 → 方案确定与保费测算 -->
        <template v-else-if="leaf === 'decision'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('decision', checkDecision)">保存</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">救援人数</span>
              <input
                v-model="headcount"
                class="form-control"
                type="number"
                min="1"
                step="1"
              />
            </label>
            <label class="form-item">
              <span class="form-label required">支付资金来源</span>
              <select v-model="fundSource" class="form-control">
                <option value="">请选择</option>
                <option v-for="item in fundSources" :key="item">{{ item }}</option>
              </select>
            </label>
          </div>
          <template v-if="flow.isDone('decision')">
            <dl class="block-fields">
              <div class="field-row"><dt>中选方案</dt><dd>{{ decision.product.name }}</dd></div>
              <div class="field-row"><dt>人均保费</dt><dd>{{ money(Number(decision.product.premium) || 0, 0) }} 元</dd></div>
              <div class="field-row"><dt>总保费</dt><dd>{{ money(Number(decision.totalPremium) || 0, 0) }} 元</dd></div>
              <div class="field-row"><dt>支付资金来源</dt><dd>{{ fundSource }}</dd></div>
            </dl>
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
                  <td>{{ money(Number(alt.premium) || 0, 0) }} 元</td>
                  <td>{{ money(Number(alt.totalPremium) || 0, 0) }} 元</td>
                  <td>{{ alt.premiumGap > 0 ? '+' : '' }}{{ money(Number(alt.premiumGap) || 0, 0) }} 元</td>
                </tr>
              </tbody>
            </table>
            <p class="sys-toast">{{ decision.conclusion }}</p>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
