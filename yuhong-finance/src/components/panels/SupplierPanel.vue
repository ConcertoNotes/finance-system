<script setup>
// 应急采购管理系统 · 合同物资供应商综合评分与初始遴选。
// 菜单路径与工作簿一致，学生需逐级点开菜单进入对应功能页办理业务。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { materialDemands, supplierCriteria, suppliers } from '../../data/procurement.js'
import { calculatePriceBaseline, scoreSuppliers } from '../../domain/procurement.js'
import { money, num, percent } from '../../domain/format.js'

const PAGES = ['scope', 'weights', 'score', 'budget', 'risk', 'approve']
const flow = useTaskFlow('s2-t3', PAGES)
const store = useFormPersist('s2-t3')

const menu = [
  {
    id: 'm-proc',
    label: '采购管理',
    children: [
      {
        id: 'm-proc-supplier',
        label: '供应商管理',
        children: [{ id: 'scope', label: '遴选范围确认' }],
      },
    ],
  },
  {
    id: 'm-base',
    label: '基础设置',
    children: [
      {
        id: 'm-base-criteria',
        label: '评价指标',
        children: [{ id: 'weights', label: '权重配置' }],
      },
    ],
  },
  {
    id: 'm-eval',
    label: '供应商评价',
    children: [
      { id: 'score', label: '综合评分' },
      { id: 'budget', label: '预算符合性核验' },
      { id: 'risk', label: '主体资质核验' },
      { id: 'approve', label: '中选审批' },
    ],
  },
]

const leafLabels = {}
function collectLeaves(nodes) {
  nodes.forEach((node) => (node.children ? collectLeaves(node.children) : (leafLabels[node.id] = node.label)))
}
collectLeaves(menu)

const VERIFY_ITEMS = [
  '营业资质：营业执照、经营范围与供货能力证明齐备',
  '收款账户：合同主体、发票主体与收款账户三者一致',
  '关联关系：与本单位及其他报价供应商无关联交易',
  '历史付款记录：既往结算无欠款、无违约扣款记录',
]

function emptyWeights() {
  return Object.fromEntries(supplierCriteria.map((item) => [item.key, '']))
}

function emptyScores() {
  return suppliers.map((item) => ({
    id: item.id,
    name: item.name,
    ...Object.fromEntries(supplierCriteria.map((criterion) => [criterion.key, ''])),
  }))
}

const weights = reactive(emptyWeights())
const scores = reactive(emptyScores())
const verified = reactive(Object.fromEntries(VERIFY_ITEMS.map((item) => [item, false])))
const approval = reactive({ primary: '', backup1: '', backup2: '' })

const activeId = ref('')
const error = ref('')

const scopeRows = computed(() =>
  materialDemands.map((item) => ({
    id: item.id,
    name: item.name,
    channel: item.channel === 'contract' ? 'HT-2025-001 合同采购' : '大型商超应急零售/框架协议直采',
    scored: item.channel === 'contract',
  })),
)
const scopedIn = computed(() => scopeRows.value.filter((row) => row.scored))
const scopedOut = computed(() => scopeRows.value.filter((row) => !row.scored))

const criteria = computed(() =>
  supplierCriteria.map((item) => ({ ...item, weight: (Number(weights[item.key]) || 0) / 100 })),
)
const weightTotal = computed(() =>
  supplierCriteria.reduce((sum, item) => sum + (Number(weights[item.key]) || 0), 0),
)

const scoredList = computed(() =>
  scores.map((item) => ({
    ...item,
    ...Object.fromEntries(
      supplierCriteria.map((criterion) => [criterion.key, Number(item[criterion.key]) || 0]),
    ),
  })),
)
const rows = computed(() => scoreSuppliers(scoredList.value, criteria.value))
const ranked = computed(() => [...rows.value].sort((a, b) => a.rank - b.rank))
const winner = computed(() => ranked.value[0])

const tentBaseline = computed(() => calculatePriceBaseline().find((row) => row.id === 'tent'))
const winnerTentQuote = computed(() => {
  const row = tentBaseline.value
  const quotes = { S1: row.s1, S2: row.s2, S3: row.s3 }
  return quotes[winner.value.id] ?? row.s2
})
const priceGap = computed(() => winnerTentQuote.value - tentBaseline.value.baseline)
const gapWord = computed(() => (priceGap.value <= 0 ? '低于' : '高于'))

const chosenVerify = computed(() => VERIFY_ITEMS.filter((item) => verified[item]))
const pendingPages = computed(() => PAGES.filter((p) => p !== 'approve' && !flow.isDone(p)).map((id) => leafLabels[id]))

store.restore({ weights, scores, verified, approval })

function snapshot() {
  return { weights, scores, verified, approval }
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

function checkWeights() {
  if (supplierCriteria.some((item) => !(Number(weights[item.key]) >= 0))) return '各维度权重须为非负数'
  if (Math.abs(weightTotal.value - 100) > 0.01) return `六个维度权重合计为 ${num(weightTotal.value, 2)}%，须调整为 100%`
  return ''
}

function checkScores() {
  const invalid = scores.filter((item) =>
    supplierCriteria.some((criterion) => {
      const value = Number(item[criterion.key])
      return !(value >= 0) || value > 100
    }),
  )
  if (invalid.length) return `${invalid.map((item) => item.id).join('、')} 存在超出 0—100 区间的标准分`
  return ''
}

function checkVerify() {
  const rest = VERIFY_ITEMS.length - chosenVerify.value.length
  return rest ? `还有 ${rest} 项主体资质未核验` : ''
}

function checkApproval() {
  if (pendingPages.value.length) {
    return `还有 ${pendingPages.value.length} 个功能页未办理：${pendingPages.value.join('、')}，无法提交中选审批`
  }
  const picks = [approval.primary, approval.backup1, approval.backup2]
  if (picks.some((item) => !item)) return '主供应商、第一备选和第二备选均须指定'
  if (new Set(picks).size !== 3) return '同一供应商不得同时占据两个定位'
  if (approval.primary !== winner.value.id) {
    return `综合得分最高的是 ${winner.value.id}（${money(winner.value.total, 1)} 分），主供应商应定位为 ${winner.value.id}`
  }
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  Object.assign(weights, emptyWeights())
  scores.splice(0, scores.length, ...emptyScores())
  VERIFY_ITEMS.forEach((item) => { verified[item] = false })
  Object.assign(approval, { primary: '', backup1: '', backup2: '' })
  error.value = ''
}
</script>

<template>
  <PanelShell title="合同物资供应商综合评分与初始遴选" source="供应商管理">
    <SystemShell
      system="应急采购管理系统"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 采购管理 → 供应商管理 → 遴选范围确认 -->
        <template v-if="leaf === 'scope'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('scope')">
              确认评分范围
            </button>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr><th>物资</th><th>采购执行路径</th><th style="width: 150px">是否纳入供应商评分</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in scopeRows" :key="row.id">
                <th scope="row">{{ row.name }}</th>
                <td>{{ row.channel }}</td>
                <td>
                  <span class="verdict" :class="row.scored ? 'pass' : 'neutral'">{{ row.scored ? '纳入' : '不纳入' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="form-desc">食品、饮用水通过大型商超应急零售/框架协议直采，不与主合同打包，因此不参与本次供应商综合遴选。</p>
          <template v-if="flow.isDone('scope')">
            <p class="sys-toast">评分范围已确认：{{ scopedIn.length }} 类合同采购物资纳入供应商综合评分。</p>
            <div class="tag-row">
              <span v-for="row in scopedIn" :key="row.id" class="soft-tag">{{ row.name }}</span>
            </div>
            <ul class="sys-lines">
              <li class="info">{{ scopedOut.map((row) => row.name).join('、') }} 通过大型商超应急零售/框架协议直采，排除在评分范围之外</li>
              <li>报价得分按 4 类合同物资综合报价测算</li>
            </ul>
          </template>
        </template>

        <!-- 基础设置 → 评价指标 → 权重配置 -->
        <template v-else-if="leaf === 'weights'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('weights', checkWeights)">
              保存权重
            </button>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr><th>评分维度</th><th style="width: 140px">权重（%）</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in supplierCriteria" :key="item.key">
                <th scope="row">{{ item.label }}</th>
                <td><input v-model.number="weights[item.key]" type="number" min="0" max="100" /></td>
              </tr>
              <tr>
                <th scope="row">合计</th>
                <td class="col-total">{{ num(weightTotal, 2) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="form-desc">六个维度权重合计须等于 100%，否则综合得分不可比。</p>
          <template v-if="flow.isDone('weights')">
            <p class="sys-toast">评分维度权重已保存，合计 {{ num(weightTotal, 2) }}%。</p>
            <div class="weight-row">
              <span v-for="item in criteria" :key="item.key" class="weight-chip">
                {{ item.label }}<em>{{ percent(item.weight, 0) }}</em>
              </span>
            </div>
          </template>
        </template>

        <!-- 供应商评价 → 综合评分 -->
        <template v-else-if="leaf === 'score'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('score', checkScores)">
              计算综合得分
            </button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr>
                  <th>供应商</th>
                  <th v-for="item in criteria" :key="item.key">{{ item.label }}<em>{{ percent(item.weight, 0) }}</em></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in rows" :key="row.id">
                  <th scope="row">{{ row.id }}</th>
                  <td v-for="item in criteria" :key="item.key">
                    <input v-model.number="scores[index][item.key]" type="number" min="0" max="100" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-if="flow.isDone('score')">
            <p class="block-formula">综合得分 = SUMPRODUCT(指标标准分区域, 权重区域)</p>
            <ul class="breakdown-list">
              <li v-for="row in ranked" :key="row.id">
                <div class="breakdown-head">
                  <span class="breakdown-label">{{ row.id }}</span>
                  <span class="breakdown-type" :class="row.selected ? 'benefit' : 'cost'">第 {{ row.rank }} 名</span>
                  <span class="breakdown-raw">{{ money(row.total, 1) }} 分</span>
                </div>
                <p class="breakdown-formula">
                  {{ row.parts.map((part) => `${part.score}×${percent(part.weight, 0)}`).join(' + ') }} = {{ money(row.total, 1) }} 分
                </p>
              </li>
            </ul>
            <div class="score-table-wrap">
              <table class="calc-table">
                <thead>
                  <tr>
                    <th>供应商</th>
                    <th v-for="item in criteria" :key="item.key">{{ item.label }}</th>
                    <th class="col-total">综合得分</th>
                    <th>排名</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in ranked" :key="row.id" :class="{ winner: row.selected }">
                    <th scope="row">{{ row.id }}</th>
                    <td v-for="part in row.parts" :key="part.key">{{ part.score }}</td>
                    <td class="col-total">{{ money(row.total, 1) }}</td>
                    <td><span class="verdict" :class="row.selected ? 'pass' : 'neutral'">{{ row.rank }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="conclusion">
              形成初始排序：{{ ranked.map((row) => `${row.id} ${money(row.total, 1)}分`).join(' > ') }}。
            </p>
          </template>
        </template>

        <!-- 供应商评价 → 预算符合性核验 -->
        <template v-else-if="leaf === 'budget'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('budget')">
              提交复核意见
            </button>
          </div>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">{{ winner.id }} 帐篷报价</span>
              <strong class="stat-value">{{ num(winnerTentQuote, 2) }} 元/顶</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">帐篷综合基准价</span>
              <strong class="stat-value">{{ num(tentBaseline.baseline, 2) }} 元/顶</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">单价差额</span>
              <strong class="stat-value" :class="priceGap <= 0 ? 'accent' : 'warn'">{{ num(priceGap, 2) }} 元/顶</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">交付承诺</span>
              <strong class="stat-value small">12 小时送达重点网格</strong>
            </div>
          </div>
          <template v-if="flow.isDone('budget')">
            <p class="sys-toast">应急预算绩效岗复核通过。</p>
            <ul class="sys-lines">
              <li>{{ winner.id }} 帐篷单价 {{ num(winnerTentQuote, 2) }} 元{{ gapWord }} {{ num(tentBaseline.baseline, 2) }} 元基准价</li>
              <li>12 小时交付承诺可满足甲3、甲6 重点保障时限</li>
              <li>初始方案未突破 C 方案预算</li>
            </ul>
            <p class="conclusion">
              从预算和网格保障角度复核：{{ winner.id }} 帐篷单价 {{ num(winnerTentQuote, 2) }} 元{{ gapWord }} {{ num(tentBaseline.baseline, 2) }} 元基准价，
              12 小时交付承诺可满足甲3、甲6 重点保障时限，初始方案未突破 C 方案预算。
            </p>
          </template>
        </template>

        <!-- 供应商评价 → 主体资质核验 -->
        <template v-else-if="leaf === 'risk'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('risk', checkVerify)">
              提交核验结果
            </button>
          </div>
          <div class="checkbox-group">
            <label v-for="item in VERIFY_ITEMS" :key="item" class="checkbox-item">
              <input v-model="verified[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <template v-if="flow.isDone('risk')">
            <p class="sys-toast">{{ winner.id }} 合同主体、发票主体、收款账户一致，无关联交易预警。</p>
            <ul class="sys-lines">
              <li v-for="item in chosenVerify" :key="item">{{ item }}</li>
            </ul>
          </template>
        </template>

        <!-- 供应商评价 → 中选审批 -->
        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('approve', checkApproval)">
              审批通过
            </button>
          </div>
          <ul v-if="pendingPages.length" class="sys-lines">
            <li v-for="label in pendingPages" :key="label" class="warn">{{ label }} 尚未办理</li>
          </ul>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">主供应商</span>
              <select v-model="approval.primary" class="form-control">
                <option value="">请选择</option>
                <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">第一备选供应商</span>
              <select v-model="approval.backup1" class="form-control">
                <option value="">请选择</option>
                <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">第二备选及兜底供应商</span>
              <select v-model="approval.backup2" class="form-control">
                <option value="">请选择</option>
                <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
              </select>
            </label>
          </div>
          <template v-if="flow.isDone('approve')">
            <p class="sys-toast">
              同意 {{ approval.primary }} 为 HT-2025-001 四类合同物资唯一初始主供应商，{{ approval.backup1 }} 第一备选，{{ approval.backup2 }} 第二备选兼极端情况兜底。
            </p>
            <ul class="sys-lines">
              <li>{{ approval.primary }} · 唯一初始主供应商，承担{{ scopedIn.map((row) => row.name).join('、') }}四类合同物资</li>
              <li class="info">{{ approval.backup1 }} · 第一备选供应商</li>
              <li class="info">{{ approval.backup2 }} · 第二备选和极端情况下的兜底供应商</li>
              <li class="warn">备选供应商在主供应商出现库存、交付等异常后方启动，不参与初始合同分单</li>
              <li class="warn">{{ scopedOut.map((row) => row.name).join('、') }}按应急零售/框架协议直采执行，不随主供应商打包</li>
            </ul>
            <p class="conclusion">
              合同采购和生活保障直采方案审批通过。4 类合同物资进入供应商履约动态监测，
              {{ scopedOut.map((row) => row.name).join('、') }}按应急零售/框架协议直采台账跟踪。
            </p>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
