<script setup>
// 应急采购管理系统 · 初始合同、直采控制与预算占用。
// 菜单路径需逐级点开进入对应功能页办理，不是扁平操作步骤。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { directPurchase, initialContract } from '../../data/procurement.js'
import { calculateContractAmount, calculateDirectAmount } from '../../domain/procurement.js'
import { money, num, percent } from '../../domain/format.js'

const PAGES = ['contract', 'direct', 'terms', 'occupation', 'ledger', 'approve']
const flow = useTaskFlow('s2-t4', PAGES)
const store = useFormPersist('s2-t4')

const menu = [
  {
    id: 'm-contract',
    label: '合同管理',
    children: [
      {
        id: 'm-contract-main',
        label: '主合同',
        children: [
          { id: 'contract', label: '合同明细编制' },
          { id: 'terms', label: '合同条款确认' },
        ],
      },
      {
        id: 'm-contract-direct',
        label: '直采订单',
        children: [{ id: 'direct', label: '生活保障直采' }],
      },
      {
        id: 'm-contract-approve',
        label: '合同审批',
        children: [{ id: 'approve', label: '提交审批' }],
      },
    ],
  },
  {
    id: 'm-budget',
    label: '预算管理',
    children: [
      {
        id: 'm-budget-occupy',
        label: '预算占用',
        children: [{ id: 'occupation', label: '合同占用登记' }],
      },
    ],
  },
  {
    id: 'm-fund',
    label: '资金核算',
    children: [
      {
        id: 'm-fund-ledger',
        label: '采购台账',
        children: [{ id: 'ledger', label: '台账登记' }],
      },
    ],
  },
]

const DIRECT_CHECKPOINTS = ['采购审批', '即时/协议价格', '订单或销售凭证', '批次保质期', '收货验收', '支付凭证']

const LEDGER_ITEMS = [
  'HT-2025-001 预算占用记录',
  'HT-2025-001 预计付款计划',
  '采购资金台账',
  '食品、饮用水应急零售/框架直采台账',
]

const activeId = ref('')
const error = ref('')

function blankLine(line) {
  return { ...line, quantity: '', price: '' }
}

const contractLines = reactive(initialContract.lines.map(blankLine))
const directLines = reactive(directPurchase.lines.map(blankLine))
const terms = reactive(Object.fromEntries(initialContract.terms.map((term) => [term, false])))
const ledgers = reactive(Object.fromEntries(LEDGER_ITEMS.map((item) => [item, false])))
const budgetCap = ref('')

/** 编辑过程中可能出现空值，送入测算前统一清洗为数值。 */
function normalize(lines) {
  return lines.map((line) => ({ ...line, quantity: Number(line.quantity) || 0, price: Number(line.price) || 0 }))
}

const contract = computed(() => calculateContractAmount({ lines: normalize(contractLines) }))
const direct = computed(() => calculateDirectAmount({ lines: normalize(directLines) }))
const occupied = computed(() => contract.value.total + direct.value.total)
const cap = computed(() => Number(budgetCap.value) || 0)
const occupationRate = computed(() => (cap.value ? occupied.value / cap.value : 0))

const contractExpression = computed(() =>
  contract.value.lines.map((line) => `${num(line.quantity, 0)}×${num(line.price, 2)}`).join(' + '),
)
const directExpression = computed(() =>
  direct.value.lines.map((line) => `${num(line.quantity, 0)}×${num(line.price, 2)}`).join(' + '),
)

const chosenTerms = computed(() => initialContract.terms.filter((term) => terms[term]))
const chosenLedgers = computed(() => LEDGER_ITEMS.filter((item) => ledgers[item]))
const pendingPages = computed(() => PAGES.filter((id) => id !== 'approve' && !flow.isDone(id)))

store.restore({ contractLines, directLines, terms, ledgers, budgetCap })

function snapshot() {
  return { contractLines, directLines, terms, ledgers, budgetCap }
}

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  store.persist(snapshot())
  flow.complete(id)
}

function checkContract() {
  const blank = contractLines.find((line) => !(Number(line.quantity) > 0) || !(Number(line.price) > 0))
  if (blank) return `${blank.name}的数量与合同单价须为大于 0 的数值`
  return ''
}

function checkDirect() {
  const blank = directLines.find((line) => !(Number(line.quantity) > 0) || !(Number(line.price) > 0))
  if (blank) return `${blank.name}的数量与直采控制价须为大于 0 的数值`
  return ''
}

function checkTerms() {
  const rest = initialContract.terms.length - chosenTerms.value.length
  return rest ? `还有 ${rest} 项合同控制条款未录入` : ''
}

function checkOccupation() {
  if (!(cap.value > 0)) return 'C方案预算上限须为大于 0 的数值'
  if (occupied.value > cap.value) {
    return `初始采购预算占用 ${money(occupied.value, 2)} 元已突破 C 方案预算上限 ${money(cap.value, 2)} 元`
  }
  return ''
}

function checkLedger() {
  const rest = LEDGER_ITEMS.length - chosenLedgers.value.length
  return rest ? `还有 ${rest} 项台账未建立` : ''
}

function checkApprove() {
  return pendingPages.value.length
    ? `还有 ${pendingPages.value.length} 个功能页未办理，无法提交审批`
    : ''
}

function resetAll() {
  flow.reset()
  store.clear()
  contractLines.forEach((line, index) => Object.assign(line, blankLine(initialContract.lines[index])))
  directLines.forEach((line, index) => Object.assign(line, blankLine(directPurchase.lines[index])))
  initialContract.terms.forEach((term) => { terms[term] = false })
  LEDGER_ITEMS.forEach((item) => { ledgers[item] = false })
  budgetCap.value = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="初始合同、直采控制与预算占用" source="应急采购管理系统">
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
        <template v-if="leaf === 'contract'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('contract', checkContract)">
              生成合同金额
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">合同编号</span>
              <input class="form-control" :value="initialContract.code" />
            </label>
            <label class="form-item">
              <span class="form-label">履行供应商</span>
              <input class="form-control" :value="initialContract.supplierId" />
            </label>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr>
                <th>物资</th>
                <th style="width: 130px">数量</th>
                <th style="width: 130px">合同单价（元）</th>
                <th class="col-total">金额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in contract.lines" :key="line.id">
                <th scope="row">{{ line.name }}<em class="row-unit">{{ line.unit }}</em></th>
                <td>
                  <input v-model.number="contractLines[index].quantity" type="number" min="0" step="1" />
                </td>
                <td>
                  <input v-model.number="contractLines[index].price" type="number" min="0" step="1" />
                </td>
                <td class="col-total">{{ money(line.amount, 0) }} 元</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">合同金额</th>
                <td colspan="2">—</td>
                <td class="col-total">{{ money(contract.total, 0) }} 元</td>
              </tr>
            </tfoot>
          </table>
          <template v-if="flow.isDone('contract')">
            <p class="sys-toast">{{ initialContract.code }} 合同金额生成成功，合计 {{ money(contract.total, 0) }} 元。</p>
            <ul class="sys-lines">
              <li v-for="line in contract.lines" :key="line.id">
                {{ line.name }} {{ num(line.quantity, 0) }}{{ line.unit }} × {{ money(line.price, 0) }} 元 = {{ money(line.amount, 0) }} 元
              </li>
            </ul>
            <p class="block-formula">
              {{ initialContract.code }} 合同金额 = {{ contractExpression }} = {{ money(contract.total, 0) }} 元
            </p>
          </template>
        </template>

        <template v-else-if="leaf === 'direct'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('direct', checkDirect)">
              确认直采金额
            </button>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr>
                <th>物资</th>
                <th style="width: 130px">数量</th>
                <th style="width: 140px">直采控制价（元）</th>
                <th class="col-total">金额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in direct.lines" :key="line.id">
                <th scope="row">{{ line.name }}<em class="row-unit">{{ line.unit }}</em></th>
                <td>
                  <input v-model.number="directLines[index].quantity" type="number" min="0" step="1" />
                </td>
                <td>
                  <input v-model.number="directLines[index].price" type="number" min="0" step="0.5" />
                </td>
                <td class="col-total">{{ money(line.amount, 2) }} 元</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">直采金额</th>
                <td colspan="2">—</td>
                <td class="col-total">{{ money(direct.total, 2) }} 元</td>
              </tr>
            </tfoot>
          </table>
          <p class="form-desc">大型商超应急零售；如已有框架协议，则按框架协议直接下单。</p>
          <template v-if="flow.isDone('direct')">
            <p class="sys-toast">饮用水、食品应急零售/框架协议直采金额确认为 {{ money(direct.total, 2) }} 元。</p>
            <ul class="sys-lines">
              <li v-for="line in direct.lines" :key="line.id">
                {{ line.name }} {{ num(line.quantity, 0) }}{{ line.unit }} × {{ money(line.price, 2) }} 元 = {{ money(line.amount, 2) }} 元
              </li>
              <li class="info">食品、饮用水不纳入该供应商采购合同，与 {{ initialContract.code }} 分别建账</li>
            </ul>
            <p class="block-formula">直采金额 = {{ directExpression }} = {{ money(direct.total, 2) }} 元</p>
          </template>
        </template>

        <template v-else-if="leaf === 'terms'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('terms', checkTerms)">
              保存合同条款
            </button>
          </div>
          <div class="checkbox-group">
            <label v-for="term in initialContract.terms" :key="term" class="checkbox-item">
              <input v-model="terms[term]" type="checkbox" />{{ term }}
            </label>
          </div>
          <template v-if="flow.isDone('terms')">
            <p class="sys-toast">{{ chosenTerms.length }} 项控制条款已写入 {{ initialContract.code }}。</p>
            <ul class="sys-lines">
              <li v-for="term in chosenTerms" :key="term">{{ term }}</li>
            </ul>
            <div class="calc-subhead"><h3>食品、饮用水直采核验要点</h3></div>
            <div class="tag-row">
              <span v-for="item in DIRECT_CHECKPOINTS" :key="item" class="soft-tag">{{ item }}</span>
            </div>
            <p class="calc-note">{{ directPurchase.note }}</p>
          </template>
        </template>

        <template v-else-if="leaf === 'occupation'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('occupation', checkOccupation)">
              测算占用率
            </button>
          </div>
          <div class="input-row">
            <label>C方案预算上限</label>
            <input v-model.number="budgetCap" type="number" min="0" step="1000" />
            <span class="input-unit">元</span>
          </div>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">{{ initialContract.code }} 合同金额</span>
              <strong class="stat-value">{{ money(contract.total, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">生活保障直采金额</span>
              <strong class="stat-value">{{ money(direct.total, 2) }} 元</strong>
            </div>
          </div>
          <template v-if="flow.isDone('occupation')">
            <p class="sys-toast">
              初始采购预算占用合计 {{ money(occupied, 2) }} 元，预算占用率 {{ percent(occupationRate, 2) }}。
            </p>
            <p class="block-formula">
              初始采购预算占用合计 = {{ money(contract.total, 0) }} + {{ money(direct.total, 2) }} = {{ money(occupied, 2) }} 元
            </p>
            <p class="block-formula">
              预算占用率 = {{ money(occupied, 2) }} / {{ money(cap, 2) }} × 100% = {{ percent(occupationRate, 2) }}
            </p>
            <div class="gauge-track">
              <span class="gauge-fill" :style="{ width: percent(occupationRate, 2) }"></span>
            </div>
            <p class="gauge-caption">
              占用 {{ money(occupied, 2) }} 元 / 上限 {{ money(cap, 2) }} 元 = {{ percent(occupationRate, 2) }}，未突破 C 方案预算上限。
            </p>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">初始采购预算占用合计</span>
                <strong class="stat-value accent">{{ money(occupied, 2) }} 元</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">C方案预算上限</span>
                <strong class="stat-value">{{ money(cap, 2) }} 元</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">预算占用率</span>
                <strong class="stat-value">{{ percent(occupationRate, 2) }}</strong>
              </div>
            </div>
          </template>
        </template>

        <template v-else-if="leaf === 'ledger'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('ledger', checkLedger)">
              提交核对结果
            </button>
          </div>
          <div class="checkbox-group">
            <label v-for="item in LEDGER_ITEMS" :key="item" class="checkbox-item">
              <input v-model="ledgers[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <template v-if="flow.isDone('ledger')">
            <p class="sys-toast">金额核对完成，{{ chosenLedgers.length }} 项台账已建立。</p>
            <ul class="sys-lines">
              <li>{{ initialContract.code }} 合同申请金额 {{ money(contract.total, 0) }} 元</li>
              <li>饮用水、食品应急零售/框架协议直采金额 {{ money(direct.total, 2) }} 元</li>
              <li>两部分初始预算占用合计 {{ money(occupied, 2) }} 元，均纳入 C 方案采购预算控制</li>
              <li v-for="item in chosenLedgers" :key="item">{{ item }} · 已建立</li>
              <li class="info">具体付款时再按限定性捐赠用途和政府财政资金规则进行来源匹配</li>
              <li class="warn">付款前均须完成四流匹配</li>
              <li class="info">直采业务以框架协议或采购审批单+订单作为合同流依据</li>
            </ul>
          </template>
        </template>

        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('approve', checkApprove)">
              审批通过
            </button>
          </div>
          <dl class="block-fields">
            <div class="field-row">
              <dt>{{ initialContract.code }} 合同金额</dt>
              <dd>{{ money(contract.total, 0) }} 元 · 由 {{ initialContract.supplierId }} 履行</dd>
            </div>
            <div class="field-row">
              <dt>生活保障直采金额</dt>
              <dd>{{ money(direct.total, 2) }} 元 · 大型商超应急零售/框架协议</dd>
            </div>
            <div class="field-row">
              <dt>初始预算占用</dt>
              <dd>{{ money(occupied, 2) }} 元 · 占 C 方案预算上限 {{ percent(occupationRate, 2) }}</dd>
            </div>
          </dl>
          <template v-if="flow.isDone('approve')">
            <p class="sys-toast">合同采购和生活保障直采方案审批通过。</p>
            <p class="conclusion">
              4 类合同物资进入供应商履约动态监测，食品、饮用水按应急零售/框架协议直采台账跟踪。
            </p>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
