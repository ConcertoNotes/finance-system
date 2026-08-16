<script setup>
// 按当前《洪涝阶段二.xlsx》任务2：接收报价 → 下载/导入计算表 → 设置阈值。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { PRICE_OUTPUTS, PRICE_WORKBOOK, priceQuotes } from '../../data/procurement.js'
import { calculatePriceBaseline, getDirectControlPrices } from '../../domain/procurement.js'
import { money, num, signedPercent } from '../../domain/format.js'

const PAGES = ['receive', 'workbook', 'threshold']
const STEPS = [
  { id: 'receive', label: '采集报价' },
  { id: 'workbook', label: '价格计算表' },
  { id: 'threshold', label: '控制阈值' },
]
const flow = useTaskFlow('s2-t2', PAGES)
const store = useFormPersist('s2-t2')

const menu = [
  {
    id: 'm-price',
    label: '价格管理',
    children: [
      { id: 'receive', label: '采集价格数据' },
      { id: 'workbook', label: '打开分层采购价格计算表' },
      { id: 'threshold', label: '设置采购控制阈值' },
    ],
  },
]

const received = ref(false)
const imported = ref(false)
const thresholds = reactive({ yellow: '', red: '' })
const activeId = ref('')
const error = ref('')

const contractQuotes = computed(() => priceQuotes.filter((item) => item.channel === 'contract'))
const directQuotes = computed(() => getDirectControlPrices())
const rows = computed(() => calculatePriceBaseline())
const pendingPages = computed(() => PAGES.filter((id) => id !== 'threshold' && !flow.isDone(id)))

store.restore({ received, imported, thresholds })

function snapshot() {
  return { received: received.value, imported: imported.value, thresholds }
}

function downloadUrl() {
  return `${import.meta.env.BASE_URL}workbooks/${encodeURIComponent(PRICE_WORKBOOK)}`
}

function receiveQuotes() {
  received.value = true
  store.persist(snapshot())
  flow.complete('receive')
  error.value = ''
}

function importResults() {
  if (!received.value) {
    error.value = '请先接收供应商报价'
    return
  }
  imported.value = true
  store.persist(snapshot())
  flow.complete('workbook')
  error.value = ''
}

function checkThreshold() {
  if (pendingPages.value.length) return '请先完成报价接收与测算结果导入'
  if (Number(thresholds.yellow) !== 5) return '黄色预警阈值须设置为 5%'
  if (Number(thresholds.red) !== 10) return '红色预警阈值须设置为 10%'
  return ''
}

function saveThreshold() {
  const message = checkThreshold()
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  store.persist(snapshot())
  flow.complete('threshold')
}

function lamp(rate) {
  const scale = Math.abs(rate) * 100
  if (scale >= 10) return { text: '🔴 重点复核', cls: 'fail' }
  if (scale >= 5) return { text: '黄灯 重点关注', cls: 'warn' }
  return { text: '绿灯 正常', cls: 'pass' }
}

function resetAll() {
  flow.reset()
  store.clear()
  received.value = false
  imported.value = false
  thresholds.yellow = ''
  thresholds.red = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="建立分层采购价格基准" source="采购控制平台">
    <SystemShell
      system="应急采购管理系统"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :steps="STEPS"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'receive'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="receiveQuotes">点击接收供应商报价</button>
          </div>
          <p class="form-desc">第一步：采集价格数据。点完后出现合同采购物资价格采集表与生活保障直采物资价格核验表。</p>
          <template v-if="received">
            <div class="score-table-wrap">
              <table class="calc-table compact center-text">
                <caption>合同采购物资价格采集表</caption>
                <thead>
                  <tr>
                    <th>物资</th><th>历史采购价</th><th>最近市场参考价</th>
                    <th>S1报价</th><th>S2报价</th><th>S3报价</th>
                    <th>税费口径</th><th>运输及应急成本要求</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in contractQuotes" :key="row.id">
                    <th scope="row">{{ row.name }}</th>
                    <td>{{ num(row.history, 0) }}{{ row.unit.replace('元', '') }}</td>
                    <td>{{ num(row.market, 0) }}{{ row.unit.replace('元', '') }}</td>
                    <td>{{ num(row.s1, 0) }}{{ row.unit.replace('元', '') }}</td>
                    <td>{{ num(row.s2, 0) }}{{ row.unit.replace('元', '') }}</td>
                    <td>{{ num(row.s3, 0) }}{{ row.unit.replace('元', '') }}</td>
                    <td>{{ row.tax }}</td>
                    <td>{{ row.freight }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="score-table-wrap">
              <table class="calc-table compact center-text">
                <caption>生活保障直采物资价格核验表</caption>
                <thead>
                  <tr>
                    <th>物资</th><th>历史价</th><th>市场参考价</th>
                    <th>应急零售/框架协议控制价</th><th>采购方式</th>
                    <th>供应商评分</th><th>凭证留存要求</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in directQuotes" :key="row.id">
                    <th scope="row">{{ row.name }}</th>
                    <td>{{ money(row.history, 0) }}元/{{ row.unit.slice(-1) }}</td>
                    <td>{{ money(row.market, 0) }}元/{{ row.unit.slice(-1) }}</td>
                    <td>{{ money(row.control, 1) }}元/{{ row.unit.slice(-1) }}</td>
                    <td>{{ row.method }}</td>
                    <td>{{ row.scored }}</td>
                    <td>{{ row.evidence }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="sys-toast">供应商报价已接收，可打开分层采购价格计算表继续测算。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'workbook'">
          <p class="form-desc">第二步：打开分层采购价格计算表。弄到平台，学生可以下载；点击导入测算结果后呈现平台效果。</p>
          <div class="download-footer">
            <a class="file-link" :href="downloadUrl()" :download="PRICE_WORKBOOK">{{ PRICE_WORKBOOK }}</a>
          </div>
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="importResults">导入测算结果</button>
          </div>
          <template v-if="imported">
            <div class="score-table-wrap">
              <table class="calc-table compact center-text">
                <caption>导入后的价格基准与偏差</caption>
                <thead>
                  <tr><th>物资</th><th>综合基准价</th><th>S1偏差率</th><th>S2偏差率</th><th>S3偏差率</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.id">
                    <th scope="row">{{ row.name }}</th>
                    <td>{{ num(row.baseline, 2) }}</td>
                    <td v-for="item in row.deviations" :key="item.supplierId">{{ signedPercent(item.rate, 2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="sys-toast">测算结果已导入，可设置采购控制阈值。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'threshold'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="saveThreshold">输出控制规则</button>
          </div>
          <p class="form-desc">第三步：设置采购控制阈值。</p>
          <p class="block-formula">价格偏差率 =（当前报价－控制基准价）÷控制基准价 ×100%</p>
          <div class="input-row">
            <label>偏差率＜5%：绿色，正常</label>
            <input v-model.number="thresholds.yellow" type="number" min="0" class="student-input" />
            <span class="input-unit">% 黄灯起点</span>
          </div>
          <div class="input-row">
            <label>偏差率≥10%：红色预警</label>
            <input v-model.number="thresholds.red" type="number" min="0" class="student-input" />
            <span class="input-unit">% 红灯起点</span>
          </div>
          <ul class="sys-lines">
            <li>偏差率＜5%：绿灯正常</li>
            <li>偏差率≥5%且＜10%：黄灯重点关注</li>
            <li>偏差率≥10%：🔴 重点复核</li>
          </ul>
          <template v-if="flow.isDone('threshold')">
            <div class="score-table-wrap">
              <table class="calc-table compact center-text">
                <thead>
                  <tr><th>物资</th><th>供应商</th><th>报价</th><th>偏差率</th><th>灯号</th></tr>
                </thead>
                <tbody>
                  <template v-for="row in rows" :key="row.id">
                    <tr v-for="(item, index) in row.deviations" :key="item.supplierId">
                      <th v-if="index === 0" scope="row" :rowspan="row.deviations.length">{{ row.name }}</th>
                      <td>{{ item.supplierId }}</td>
                      <td>{{ num(item.quote, 2) }}</td>
                      <td>{{ signedPercent(item.rate, 2) }}</td>
                      <td><span class="verdict" :class="lamp(item.rate).cls">{{ lamp(item.rate).text }}</span></td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <p class="sys-toast">已输出四份控制成果。</p>
            <div class="tag-row">
              <span v-for="item in PRICE_OUTPUTS" :key="item" class="soft-tag">{{ item }}</span>
            </div>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
