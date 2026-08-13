<script setup>
// 合同物资供应商综合评分与初始遴选操作台。采购岗评分后，由预算绩效岗、资金风控岗、财务主管依次复核审批。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { materialDemands, supplierCriteria, suppliers } from '../../data/procurement.js'
import { calculatePriceBaseline, scoreSuppliers } from '../../domain/procurement.js'
import { money, num, percent } from '../../domain/format.js'

const OPS = ['scope', 'weights', 'score', 'budget', 'risk', 'approve']
const flow = useTaskFlow('s2-t3', OPS)

const VERIFY_ITEMS = [
  '营业资质：营业执照、经营范围与供货能力证明齐备',
  '收款账户：合同主体、发票主体与收款账户三者一致',
  '关联关系：与本单位及其他报价供应商无关联交易',
  '历史付款记录：既往结算无欠款、无违约扣款记录',
]

const weights = reactive(Object.fromEntries(supplierCriteria.map((item) => [item.key, item.weight * 100])))
const scores = reactive(suppliers.map((item) => ({ ...item })))
const verified = reactive(Object.fromEntries(VERIFY_ITEMS.map((item) => [item, false])))
const approval = reactive({ primary: '', backup1: '', backup2: '' })

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

const rows = computed(() => scoreSuppliers(scores, criteria.value))
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

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
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
  supplierCriteria.forEach((item) => { weights[item.key] = item.weight * 100 })
  scores.forEach((item, index) => Object.assign(item, suppliers[index]))
  VERIFY_ITEMS.forEach((item) => { verified[item] = false })
  Object.assign(approval, { primary: '', backup1: '', backup2: '' })
  error.value = ''
}
</script>

<template>
  <PanelShell title="合同物资供应商综合评分与初始遴选" source="供应商管理">
    <div class="op-progress">
      <div class="op-progress-track">
        <span class="op-progress-fill" :style="{ width: `${(flow.progress.value.done / flow.progress.value.total) * 100}%` }" />
      </div>
      <span class="op-progress-text">{{ flow.progress.value.done }} / {{ flow.progress.value.total }} 项操作完成</span>
      <button type="button" class="text-button" @click="resetAll">重置</button>
    </div>

    <p v-if="error" class="sys-toast danger">{{ error }}</p>

    <div class="op-flow">
      <OperationBlock
        title="确认评分范围"
        hint="采购成本保障岗"
        :status="flow.status('scope')"
        done-label="评分范围已确认"
      >
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('scope')" @click="run('scope')">确认评分范围</button>
        </div>

        <template #result>
          <p class="sys-toast">评分范围已确认：{{ scopedIn.length }} 类合同采购物资纳入供应商综合评分。</p>
          <div class="tag-row">
            <span v-for="row in scopedIn" :key="row.id" class="soft-tag">{{ row.name }}</span>
          </div>
          <ul class="sys-lines">
            <li class="info">{{ scopedOut.map((row) => row.name).join('、') }} 通过大型商超应急零售/框架协议直采，排除在评分范围之外</li>
            <li>报价得分按 4 类合同物资综合报价测算</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="设置评分维度权重"
        hint="采购成本保障岗"
        :status="flow.status('weights')"
        done-label="权重已保存"
      >
        <table class="calc-table compact">
          <thead>
            <tr><th>评分维度</th><th style="width: 140px">权重（%）</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in supplierCriteria" :key="item.key">
              <th scope="row">{{ item.label }}</th>
              <td><input v-model.number="weights[item.key]" type="number" min="0" max="100" :disabled="flow.isDone('weights')" /></td>
            </tr>
            <tr>
              <th scope="row">合计</th>
              <td class="col-total">{{ num(weightTotal, 2) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="form-desc">六个维度权重合计须等于 100%，否则综合得分不可比。</p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('weights')" @click="run('weights', checkWeights)">
            保存权重
          </button>
        </div>

        <template #result>
          <p class="sys-toast">评分维度权重已保存，合计 {{ num(weightTotal, 2) }}%。</p>
          <div class="weight-row">
            <span v-for="item in criteria" :key="item.key" class="weight-chip">
              {{ item.label }}<em>{{ percent(item.weight, 0) }}</em>
            </span>
          </div>
        </template>
      </OperationBlock>

      <OperationBlock
        title="录入供应商标准分并计算综合得分"
        hint="采购成本保障岗"
        :status="flow.status('score')"
        done-label="综合得分已生成"
      >
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
                  <input v-model.number="scores[index][item.key]" type="number" min="0" max="100" :disabled="flow.isDone('score')" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('score')" @click="run('score', checkScores)">
            计算综合得分
          </button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="预算与网格保障复核"
        hint="应急预算绩效岗"
        :status="flow.status('budget')"
        done-label="复核意见已提交"
      >
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('budget')" @click="run('budget')">提交复核意见</button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="供应商主体资质核验"
        hint="资金核算风控岗"
        :status="flow.status('risk')"
        done-label="主体资质已核验"
      >
        <div class="checkbox-group">
          <label v-for="item in VERIFY_ITEMS" :key="item" class="checkbox-item">
            <input v-model="verified[item]" type="checkbox" :disabled="flow.isDone('risk')" />{{ item }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('risk')" @click="run('risk', checkVerify)">
            提交核验结果
          </button>
        </div>

        <template #result>
          <p class="sys-toast">{{ winner.id }} 合同主体、发票主体、收款账户一致，无关联交易预警。</p>
          <ul class="sys-lines">
            <li v-for="item in chosenVerify" :key="item">{{ item }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="主备供应商定位审批"
        hint="财务主管统筹岗"
        :status="flow.status('approve')"
        done-label="审批通过"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label required">主供应商</span>
            <select v-model="approval.primary" class="form-control" :disabled="flow.isDone('approve')">
              <option value="">请选择</option>
              <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
            </select>
          </label>
          <label class="form-item">
            <span class="form-label required">第一备选供应商</span>
            <select v-model="approval.backup1" class="form-control" :disabled="flow.isDone('approve')">
              <option value="">请选择</option>
              <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
            </select>
          </label>
          <label class="form-item">
            <span class="form-label required">第二备选及兜底供应商</span>
            <select v-model="approval.backup2" class="form-control" :disabled="flow.isDone('approve')">
              <option value="">请选择</option>
              <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
            </select>
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('approve')" @click="run('approve', checkApproval)">
            审批通过
          </button>
        </div>

        <template #result>
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
      </OperationBlock>
    </div>
  </PanelShell>
</template>
