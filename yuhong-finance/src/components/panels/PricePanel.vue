<script setup>
// 分层采购价格基准操作台。学生逐项执行，系统按操作返回价格测算与预警结果。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { priceAlertThresholds, priceQuotes } from '../../data/procurement.js'
import { calculatePriceBaseline, getDirectControlPrices } from '../../domain/procurement.js'
import { money, num, signedPercent } from '../../domain/format.js'

const OPS = ['collect', 'caliber', 'stats', 'baseline', 'deviation', 'platform']
const flow = useTaskFlow('s2-t2', OPS)

const CALIBER_RULES = [
  '4类合同采购物资的供应商报价统一转换为含税货物单价',
  '运输费用和应急人工成本单独列示，不并入货物单价',
  '食品、饮用水按含税零售价/框架协议结算价核验',
  '配送费如单独发生则单列，避免与货价混同',
]

const EVIDENCE = [
  '合同采购物资：历史采购价、最近市场参考价、三家供应商有效报价、税费口径、正常运输费用和应急交付附加成本',
  '生活保障直采物资：历史价、市场参考价及大型商超即时价/框架协议价',
  '全部询价过程留存询价截图、订单或销售凭证备查',
]

const OUTPUTS = [
  '《4类合同物资价格基准表》',
  '《2类生活保障物资应急零售/框架直采价格核验表》',
  '《价格偏差分析表》',
  '《报价口径校验单》',
]

const quotes = reactive(Object.fromEntries(priceQuotes.map((item) => [item.id, { ...item }])))
const caliber = reactive(Object.fromEntries(CALIBER_RULES.map((rule) => [rule, false])))
const thresholds = reactive({
  yellow: priceAlertThresholds.yellow * 100,
  red: priceAlertThresholds.red * 100,
})

const error = ref('')
const focus = ref('tent')

const quoteList = computed(() => priceQuotes.map((item) => quotes[item.id]))
const contractQuotes = computed(() => quoteList.value.filter((item) => item.channel === 'contract'))
const directQuotes = computed(() => getDirectControlPrices(quoteList.value))
const rows = computed(() => calculatePriceBaseline(quoteList.value))
const current = computed(() => rows.value.find((row) => row.id === focus.value) ?? rows.value[0])
const chosenCaliber = computed(() => CALIBER_RULES.filter((rule) => caliber[rule]))

function level(rate) {
  const scale = Math.abs(rate) * 100
  if (scale >= thresholds.red) return 'red'
  if (scale >= thresholds.yellow) return 'yellow'
  return 'normal'
}

function levelText(rate) {
  const tier = level(rate)
  if (tier === 'red') return '红色预警 · 启动重点复核'
  return tier === 'yellow' ? '黄色预警 · 提示复核' : '正常'
}

function levelClass(rate) {
  const tier = level(rate)
  return tier === 'red' ? 'fail' : tier === 'yellow' ? 'warn' : 'pass'
}

const alerts = computed(() =>
  rows.value.flatMap((row) =>
    row.deviations
      .filter((item) => level(item.rate) !== 'normal')
      .map((item) => ({ key: `${row.id}-${item.supplierId}`, material: row.name, unit: row.unit, ...item })),
  ),
)

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function checkCollect() {
  const missing = quoteList.value.filter((item) => {
    if (!(item.history > 0) || !(item.market > 0)) return true
    return item.channel === 'contract'
      ? !(item.s1 > 0) || !(item.s2 > 0) || !(item.s3 > 0)
      : !(item.control > 0)
  })
  if (!missing.length) return ''
  return `${missing.map((item) => item.name).join('、')} 价格数据不完整，合同采购物资须取得三家有效报价，生活保障物资须录入直采控制价`
}

function checkCaliber() {
  const rest = CALIBER_RULES.length - chosenCaliber.value.length
  return rest ? `还有 ${rest} 条价格口径规则未确认` : ''
}

function checkThresholds() {
  if (!(thresholds.yellow > 0) || !(thresholds.red > 0)) return '黄色与红色预警阈值均须大于 0'
  if (thresholds.red <= thresholds.yellow) return '红色预警阈值须高于黄色预警阈值'
  return ''
}

function resetAll() {
  flow.reset()
  priceQuotes.forEach((item) => Object.assign(quotes[item.id], item))
  CALIBER_RULES.forEach((rule) => { caliber[rule] = false })
  thresholds.yellow = priceAlertThresholds.yellow * 100
  thresholds.red = priceAlertThresholds.red * 100
  focus.value = 'tent'
  error.value = ''
}
</script>

<template>
  <PanelShell title="分层采购价格基准" source="采购控制平台">
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
        title="采集价格数据"
        hint="4类合同采购物资建立供应商比价基准，2类生活保障物资建立应急零售/框架协议直采价格核验"
        :status="flow.status('collect')"
        done-label="价格数据已采集"
      >
        <div class="score-table-wrap">
          <table class="calc-table">
            <thead>
              <tr><th>物资</th><th>历史采购价</th><th>市场参考价</th><th>S1报价</th><th>S2报价</th><th>S3报价</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in quoteList" :key="row.id">
                <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                <td><input v-model.number="row.history" type="number" min="0" step="0.5" :disabled="flow.isDone('collect')" /></td>
                <td><input v-model.number="row.market" type="number" min="0" step="0.5" :disabled="flow.isDone('collect')" /></td>
                <template v-if="row.channel === 'contract'">
                  <td><input v-model.number="row.s1" type="number" min="0" step="0.5" :disabled="flow.isDone('collect')" /></td>
                  <td><input v-model.number="row.s2" type="number" min="0" step="0.5" :disabled="flow.isDone('collect')" /></td>
                  <td><input v-model.number="row.s3" type="number" min="0" step="0.5" :disabled="flow.isDone('collect')" /></td>
                </template>
                <td v-else colspan="3">
                  <input v-model.number="row.control" type="number" min="0" step="0.5" :disabled="flow.isDone('collect')" />
                  <em class="row-unit">应急零售/框架协议直采控制价，不纳入 S1、S2、S3 供应商评分</em>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('collect')" @click="run('collect', checkCollect)">
            采集价格数据
          </button>
        </div>

        <template #result>
          <p class="sys-toast">6 类物资价格数据采集完成，其中 4 类合同采购物资取得 S1/S2/S3 三家有效报价。</p>
          <ul class="sys-lines">
            <li v-for="row in contractQuotes" :key="row.id">
              {{ row.name }}（{{ row.unit }}）：历史价 {{ num(row.history, 2) }}、市场参考价 {{ num(row.market, 2) }}、S1 {{ num(row.s1, 2) }}、S2 {{ num(row.s2, 2) }}、S3 {{ num(row.s3, 2) }}
            </li>
            <li v-for="row in directQuotes" :key="row.id" class="info">
              {{ row.name }}（{{ row.unit }}）：历史价 {{ num(row.history, 2) }}、市场参考价 {{ num(row.market, 2) }}、应急零售/框架协议直采控制价 {{ money(row.control, 2) }}
            </li>
          </ul>
          <div class="calc-subhead"><h3>须留存的采集证据</h3></div>
          <ul class="check-list">
            <li v-for="item in EVIDENCE" :key="item">{{ item }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="统一价格口径"
        hint="口径不统一将导致比价失真，须逐条确认后方可进入基准测算"
        :status="flow.status('caliber')"
        done-label="口径已统一"
      >
        <div class="checkbox-group">
          <label v-for="rule in CALIBER_RULES" :key="rule" class="checkbox-item">
            <input v-model="caliber[rule]" type="checkbox" :disabled="flow.isDone('caliber')" />{{ rule }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('caliber')" @click="run('caliber', checkCaliber)">
            确认口径
          </button>
        </div>

        <template #result>
          <p class="sys-toast">价格口径校验通过，{{ chosenCaliber.length }} 条口径规则已生效，后续报价一律按此口径录入。</p>
          <ul class="sys-lines">
            <li v-for="rule in chosenCaliber" :key="rule">{{ rule }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="计算平均价、中位数与价格区间"
        hint="样本为 S1、S2、S3 三家有效报价"
        :status="flow.status('stats')"
        done-label="报价分布已测算"
      >
        <p class="form-desc">平均价反映整体报价水平，中位数削弱极端值影响，报价区间用于判断离散程度。</p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('stats')" @click="run('stats')">计算报价分布</button>
        </div>

        <template #result>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr><th>物资</th><th>S1</th><th>S2</th><th>S3</th><th class="col-total">平均价</th><th>中位数</th><th>报价区间</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.id">
                  <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                  <td>{{ num(row.s1, 2) }}</td>
                  <td>{{ num(row.s2, 2) }}</td>
                  <td>{{ num(row.s3, 2) }}</td>
                  <td class="col-total">{{ num(row.average, 2) }}</td>
                  <td>{{ num(row.median, 2) }}</td>
                  <td>{{ num(row.low, 2) }} — {{ num(row.high, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="formula-list">
            <li v-for="row in rows" :key="row.id">
              {{ row.name }}平均价 = ({{ num(row.s1, 2) }} + {{ num(row.s2, 2) }} + {{ num(row.s3, 2) }}) / 3 = {{ num(row.average, 2) }}，中位数 {{ num(row.median, 2) }}，区间 {{ num(row.low, 2) }}—{{ num(row.high, 2) }}
            </li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="建立综合价格基准"
        hint="为避免异常高价拉高基准，S3 报价不计入基准样本"
        :status="flow.status('baseline')"
        done-label="基准价已生成"
      >
        <p class="block-formula">综合基准价 = (历史采购价 + 市场参考价 + S1有效报价 + S2有效报价) / 4</p>
        <p class="form-desc">基准样本刻意剔除最高报价，使基准价贴近合理成本水平，而不是被单家高报价带偏。</p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('baseline')" @click="run('baseline')">生成基准价</button>
        </div>

        <template #result>
          <p class="sys-toast">4 类合同物资综合价格基准已生成。</p>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr><th>物资</th><th>历史采购价</th><th>市场参考价</th><th>S1</th><th>S2</th><th class="col-total">综合基准价</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.id">
                  <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                  <td>{{ num(row.history, 2) }}</td>
                  <td>{{ num(row.market, 2) }}</td>
                  <td>{{ num(row.s1, 2) }}</td>
                  <td>{{ num(row.s2, 2) }}</td>
                  <td class="col-total">{{ num(row.baseline, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="formula-list">
            <li v-for="row in rows" :key="row.id">
              {{ row.name }}基准价 = ({{ num(row.history, 2) }} + {{ num(row.market, 2) }} + {{ num(row.s1, 2) }} + {{ num(row.s2, 2) }}) / 4 = {{ num(row.baseline, 2) }}
            </li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="计算价格偏差率"
        hint="切换物资可查看该物资逐家供应商的偏差演算"
        :status="flow.status('deviation')"
        done-label="偏差率已计算"
      >
        <div class="pill-group">
          <button
            v-for="row in rows"
            :key="row.id"
            type="button"
            :class="{ active: focus === row.id }"
            @click="focus = row.id"
          >{{ row.name }}</button>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('deviation')" @click="run('deviation')">计算偏差率</button>
        </div>

        <template #result>
          <p class="block-formula">价格偏差率 =（供应商报价 － 综合基准价）/ 综合基准价 × 100%</p>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr><th>物资</th><th>综合基准价</th><th>S1 偏差率</th><th>S2 偏差率</th><th>S3 偏差率</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.id" :class="{ active: focus === row.id }" @click="focus = row.id">
                  <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                  <td>{{ num(row.baseline, 2) }}</td>
                  <td
                    v-for="item in row.deviations"
                    :key="item.supplierId"
                    :class="item.rate > 0 ? 'negative' : 'positive'"
                  >{{ signedPercent(item.rate, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="current" class="calc-subhead"><h3>{{ current.name }}逐家演算</h3></div>
          <ul v-if="current" class="formula-list">
            <li v-for="item in current.deviations" :key="item.supplierId">
              {{ item.supplierId }}{{ current.name }}偏差率 = ({{ num(item.quote, 2) }} － {{ num(current.baseline, 2) }}) / {{ num(current.baseline, 2) }} × 100% = {{ signedPercent(item.rate, 2) }}
            </li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="写入采购控制平台"
        hint="阈值写入后，合同变更、紧急分单或商超临时补货均须重新校验"
        :status="flow.status('platform')"
        done-label="基准已写入平台"
      >
        <div class="input-row">
          <label>黄色预警阈值</label>
          <input v-model.number="thresholds.yellow" type="number" min="0" step="0.5" :disabled="flow.isDone('platform')" />
          <span class="input-unit">%</span>
        </div>
        <div class="input-row">
          <label>红色预警阈值</label>
          <input v-model.number="thresholds.red" type="number" min="0" step="0.5" :disabled="flow.isDone('platform')" />
          <span class="input-unit">%</span>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('platform')" @click="run('platform', checkThresholds)">
            写入控制平台
          </button>
        </div>

        <template #result>
          <p class="sys-toast">
            4 类合同物资价格基准与 2 类生活保障直采控制价已写入采购控制平台，黄色预警阈值 {{ num(thresholds.yellow, 2) }}%、红色预警阈值 {{ num(thresholds.red, 2) }}%。
          </p>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr><th>物资</th><th>供应商</th><th>报价</th><th>偏差率</th><th>平台处置</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in alerts" :key="item.key">
                  <th scope="row">{{ item.material }}<em class="row-unit">{{ item.unit }}</em></th>
                  <td>{{ item.supplierId }}</td>
                  <td>{{ num(item.quote, 2) }}</td>
                  <td :class="item.rate > 0 ? 'negative' : 'positive'">{{ signedPercent(item.rate, 2) }}</td>
                  <td><span class="verdict" :class="levelClass(item.rate)">{{ levelText(item.rate) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!alerts.length" class="empty-hint">当前阈值下无报价触发预警。</p>

          <div class="calc-subhead"><h3>2 类生活保障物资直采控制价核验</h3></div>
          <table class="calc-table compact">
            <thead>
              <tr><th>物资</th><th>历史价</th><th>市场参考价</th><th class="col-total">直采控制价</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in directQuotes" :key="row.id">
                <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                <td>{{ num(row.history, 2) }}</td>
                <td>{{ num(row.market, 2) }}</td>
                <td class="col-total">{{ money(row.control, 2) }}</td>
              </tr>
            </tbody>
          </table>

          <p class="conclusion">
            S3 报价有效，但经济性较弱，列为高价备选供应商，不直接判定为违规报价。
          </p>
          <div class="calc-subhead"><h3>输出文档</h3></div>
          <div class="tag-row">
            <span v-for="item in OUTPUTS" :key="item" class="soft-tag">{{ item }}</span>
          </div>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>
