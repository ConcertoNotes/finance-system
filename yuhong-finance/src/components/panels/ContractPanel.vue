<script setup>
// 初始合同、生活保障直采控制与预算占用操作台。采购岗拟定合同与直采，预算岗测算占用率，风控岗建账核对，主管审批。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { PLAN_C_BUDGET_CAP, directPurchase, initialContract } from '../../data/procurement.js'
import { calculateContractAmount, calculateDirectAmount } from '../../domain/procurement.js'
import { money, num, percent } from '../../domain/format.js'

const OPS = ['contract', 'direct', 'terms', 'occupation', 'ledger', 'approve']
const flow = useTaskFlow('s2-t4', OPS)

const DIRECT_CHECKPOINTS = ['采购审批', '即时/协议价格', '订单或销售凭证', '批次保质期', '收货验收', '支付凭证']

const LEDGER_ITEMS = [
  'HT-2025-001 预算占用记录',
  'HT-2025-001 预计付款计划',
  '采购资金台账',
  '食品、饮用水应急零售/框架直采台账',
]

const contractLines = reactive(initialContract.lines.map((line) => ({ ...line })))
const directLines = reactive(directPurchase.lines.map((line) => ({ ...line })))
const terms = reactive(Object.fromEntries(initialContract.terms.map((term) => [term, false])))
const ledgers = reactive(Object.fromEntries(LEDGER_ITEMS.map((item) => [item, false])))
const budgetCap = ref(PLAN_C_BUDGET_CAP)

const error = ref('')

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

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
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

function resetAll() {
  flow.reset()
  contractLines.forEach((line, index) => Object.assign(line, initialContract.lines[index]))
  directLines.forEach((line, index) => Object.assign(line, directPurchase.lines[index]))
  initialContract.terms.forEach((term) => { terms[term] = false })
  LEDGER_ITEMS.forEach((item) => { ledgers[item] = false })
  budgetCap.value = PLAN_C_BUDGET_CAP
  error.value = ''
}
</script>

<template>
  <PanelShell title="初始合同、直采控制与预算占用" source="合同与预算占用控制">
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
        :title="`拟定 ${initialContract.code} 合同明细`"
        hint="采购成本保障岗"
        :status="flow.status('contract')"
        done-label="合同金额已生成"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">合同编号</span>
            <input class="form-control locked" :value="initialContract.code" readonly />
          </label>
          <label class="form-item">
            <span class="form-label">履行供应商</span>
            <input class="form-control locked" :value="initialContract.supplierId" readonly />
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
                <input v-model.number="contractLines[index].quantity" type="number" min="0" step="1" :disabled="flow.isDone('contract')" />
              </td>
              <td>
                <input v-model.number="contractLines[index].price" type="number" min="0" step="1" :disabled="flow.isDone('contract')" />
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('contract')" @click="run('contract', checkContract)">
            生成合同金额
          </button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="设置生活保障直采控制价"
        hint="采购成本保障岗"
        :status="flow.status('direct')"
        done-label="直采金额已确认"
      >
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
                <input v-model.number="directLines[index].quantity" type="number" min="0" step="1" :disabled="flow.isDone('direct')" />
              </td>
              <td>
                <input v-model.number="directLines[index].price" type="number" min="0" step="0.5" :disabled="flow.isDone('direct')" />
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('direct')" @click="run('direct', checkDirect)">
            确认直采金额
          </button>
        </div>

        <template #result>
          <p class="sys-toast">饮用水、食品应急零售/框架协议直采金额确认为 {{ money(direct.total, 2) }} 元。</p>
          <ul class="sys-lines">
            <li v-for="line in direct.lines" :key="line.id">
              {{ line.name }} {{ num(line.quantity, 0) }}{{ line.unit }} × {{ money(line.price, 2) }} 元 = {{ money(line.amount, 2) }} 元
            </li>
            <li class="info">食品、饮用水不纳入该供应商采购合同，与 {{ initialContract.code }} 分别建账</li>
          </ul>
          <p class="block-formula">直采金额 = {{ directExpression }} = {{ money(direct.total, 2) }} 元</p>
        </template>
      </OperationBlock>

      <OperationBlock
        title="录入合同控制条款"
        hint="采购成本保障岗"
        :status="flow.status('terms')"
        done-label="控制条款已保存"
      >
        <div class="checkbox-group">
          <label v-for="term in initialContract.terms" :key="term" class="checkbox-item">
            <input v-model="terms[term]" type="checkbox" :disabled="flow.isDone('terms')" />{{ term }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('terms')" @click="run('terms', checkTerms)">
            保存合同条款
          </button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="预算占用率测算"
        hint="应急预算绩效岗"
        :status="flow.status('occupation')"
        done-label="占用率已测算"
      >
        <div class="input-row">
          <label>C方案预算上限</label>
          <input v-model.number="budgetCap" type="number" min="0" step="1000" :disabled="flow.isDone('occupation')" />
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('occupation')" @click="run('occupation', checkOccupation)">
            测算占用率
          </button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="金额核对与台账建立"
        hint="资金核算风控岗"
        :status="flow.status('ledger')"
        done-label="核对完成、台账已建立"
      >
        <div class="checkbox-group">
          <label v-for="item in LEDGER_ITEMS" :key="item" class="checkbox-item">
            <input v-model="ledgers[item]" type="checkbox" :disabled="flow.isDone('ledger')" />{{ item }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('ledger')" @click="run('ledger', checkLedger)">
            提交核对结果
          </button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="初始合同与直采方案审批"
        hint="财务主管统筹岗"
        :status="flow.status('approve')"
        done-label="审批通过"
      >
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('approve')" @click="run('approve')">审批通过</button>
        </div>

        <template #result>
          <p class="sys-toast">合同采购和生活保障直采方案审批通过。</p>
          <p class="conclusion">
            4 类合同物资进入供应商履约动态监测，食品、饮用水按应急零售/框架协议直采台账跟踪。
          </p>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>
