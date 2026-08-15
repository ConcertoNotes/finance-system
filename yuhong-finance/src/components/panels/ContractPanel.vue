<script setup>
// 按当前《洪涝阶段二.xlsx》任务4：完整合同/直采协议、占用率表、资金控制与五页审批。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import {
  PLAN_C_BUDGET_CAP,
  alertRules,
  directPurchase,
  fourFlowRules,
  fundMatchRules,
  initialContract,
  schemeReviewChecks,
} from '../../data/procurement.js'
import { calculateContractAmount, calculateDirectAmount } from '../../domain/procurement.js'
import { money, num, percent, rmbUpper } from '../../domain/format.js'

const PAGES = ['contract', 'direct', 'occupation', 'fund', 'approve', 'dispatch', 'monitor', 'alert', 'ledger']
const flow = useTaskFlow('s2-t4', PAGES)
const store = useFormPersist('s2-t4')

const menu = [
  {
    id: 'm-doc',
    label: '合同管理',
    children: [
      { id: 'contract', label: 'HT-2025-001合同' },
      { id: 'direct', label: '生活保障直采协议' },
    ],
  },
  {
    id: 'm-budget',
    label: '预算管理',
    children: [{ id: 'occupation', label: 'C方案预算占用率测算' }],
  },
  {
    id: 'm-fund',
    label: '资金核算',
    children: [{ id: 'fund', label: '采购资金控制' }],
  },
  {
    id: 'm-lead',
    label: '财务审批',
    children: [
      { id: 'approve', label: '采购方案审批' },
      { id: 'dispatch', label: '采购任务分流' },
      { id: 'monitor', label: '履约动态监测' },
      { id: 'alert', label: '履约预警设置' },
      { id: 'ledger', label: '食品饮用水直采台账' },
    ],
  },
]

const LEDGER_FILES = ['采购审批单', '框架协议', '订单', '销售凭证', '收货验收单']

const activeId = ref('')
const error = ref('')
const contractAmounts = reactive(initialContract.lines.map(() => ''))
const directAmounts = reactive(directPurchase.lines.map(() => ''))
const fund = reactive({
  project: '',
  plan: '',
  occupied: false,
  paymentPlan: false,
  ledgers: false,
  match: false,
  fourFlow: false,
})
const schemeChecks = reactive(Object.fromEntries(schemeReviewChecks.map((item) => [item, false])))
const uploads = reactive(Object.fromEntries(LEDGER_FILES.map((item) => [item, false])))

const officialContract = computed(() => calculateContractAmount())
const officialDirect = computed(() => calculateDirectAmount())
const occupied = computed(() => officialContract.value.total + officialDirect.value.total)
const occupationRate = computed(() => occupied.value / PLAN_C_BUDGET_CAP)
const remain = computed(() => PLAN_C_BUDGET_CAP - occupied.value)
const studentContractTotal = computed(() => contractAmounts.reduce((sum, value) => sum + (Number(value) || 0), 0))
const studentDirectTotal = computed(() => directAmounts.reduce((sum, value) => sum + (Number(value) || 0), 0))
const pendingBeforeApprove = computed(() => ['contract', 'direct', 'occupation', 'fund'].filter((id) => !flow.isDone(id)))

store.restore({ contractAmounts, directAmounts, fund, schemeChecks, uploads })

function snapshot() {
  return { contractAmounts, directAmounts, fund, schemeChecks, uploads }
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

function near(actual, expected) {
  return Math.abs((Number(actual) || 0) - expected) < 0.01
}

function checkContract() {
  const wrong = officialContract.value.lines.filter((line, index) => !near(contractAmounts[index], line.amount))
  if (wrong.length) return `${wrong.map((line) => line.name).join('、')} 的含税金额须由学生按数量×单价算出`
  if (!near(studentContractTotal.value, officialContract.value.total)) return '合同合计金额不正确'
  return ''
}

function checkDirect() {
  const wrong = officialDirect.value.lines.filter((line, index) => !near(directAmounts[index], line.amount))
  if (wrong.length) return `${wrong.map((line) => line.name).join('、')} 的控制金额须由学生按数量×控制价算出`
  if (!near(studentDirectTotal.value, officialDirect.value.total)) return '直采合计金额不正确'
  return ''
}

function checkFund() {
  if (fund.project !== '洪涝应急救援专项' || fund.plan !== 'C方案') return '须选择洪涝应急救援专项与 C 方案'
  if (!fund.occupied || !fund.paymentPlan || !fund.ledgers || !fund.match || !fund.fourFlow) {
    return '占用预算、付款计划、资金台账、来源匹配和四流控制均须启用'
  }
  return ''
}

function checkApprove() {
  if (pendingBeforeApprove.value.length) return `前序 ${pendingBeforeApprove.value.length} 个功能页未办理`
  if (schemeReviewChecks.some((item) => !schemeChecks[item])) return '四项审核意见均须勾选'
  return ''
}

function checkDispatch() {
  return flow.isDone('approve') ? '' : '须先完成采购方案审批'
}

function resetAll() {
  flow.reset()
  store.clear()
  contractAmounts.forEach((_, index) => { contractAmounts[index] = '' })
  directAmounts.forEach((_, index) => { directAmounts[index] = '' })
  Object.assign(fund, { project: '', plan: '', occupied: false, paymentPlan: false, ledgers: false, match: false, fourFlow: false })
  schemeReviewChecks.forEach((item) => { schemeChecks[item] = false })
  LEDGER_FILES.forEach((item) => { uploads[item] = false })
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
            <button type="button" class="primary-button" @click="save('contract', checkContract)">点击提交</button>
          </div>
          <article class="contract-doc">
            <header class="brief-hero">
              <h2 class="brief-title">洪涝应急救援物资采购合同</h2>
              <p class="brief-lead">合同编号：{{ initialContract.code }} ｜ 供应商：{{ initialContract.supplierId }}</p>
            </header>
            <dl class="block-fields">
              <div class="field-row"><dt>甲方（采购方）</dt><dd>{{ initialContract.buyer }}</dd></div>
              <div class="field-row"><dt>乙方（供应方）</dt><dd>{{ initialContract.seller }}</dd></div>
              <div class="field-row"><dt>项目名称</dt><dd>{{ initialContract.project }}</dd></div>
              <div class="field-row"><dt>合同性质</dt><dd>{{ initialContract.nature }}</dd></div>
              <div class="field-row"><dt>合同金额</dt><dd>人民币 {{ money(officialContract.total, 2) }} 元（大写：{{ initialContract.amountUpper }}）</dd></div>
            </dl>
            <p class="form-desc">本合同仅包含帐篷、棉被、救生衣、急救包四类合同采购物资。食品、饮用水不纳入本合同。蓝色格子需要学生计算。</p>
            <h3 class="brief-subhead">第一条 采购标的、数量及合同价款</h3>
            <table class="calc-table compact center-text">
              <thead>
                <tr><th>序号</th><th>货物名称</th><th>单位</th><th>数量</th><th>含税合同单价（元）</th><th>含税金额（元）</th></tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in officialContract.lines" :key="line.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ line.name }}</td>
                  <td>{{ line.unit }}</td>
                  <td>{{ num(line.quantity, 0) }}</td>
                  <td>{{ num(line.price, 0) }}</td>
                  <td><input v-model.number="contractAmounts[index]" type="number" min="0" class="student-input" /></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="5">合计 / 大写人民币：{{ studentContractTotal ? rmbUpper(studentContractTotal) : '（待计算）' }}</th>
                  <td class="col-total">{{ studentContractTotal ? money(studentContractTotal, 0) : '—' }}</td>
                </tr>
              </tfoot>
            </table>
            <h3 class="brief-subhead">第二条 交付要求</h3>
            <p class="form-desc">乙方应在合同生效后12小时内将重点保障物资送达甲方指定的重点网格，优先保障甲3、甲6。库存或交付能力发生重大变化，应在发现后1小时内报告。</p>
            <h3 class="brief-subhead">第三条 验收标准与验收处理</h3>
            <table class="calc-table compact center-text">
              <thead><tr><th>物资</th><th>主要验收项目</th><th>不合格处理</th></tr></thead>
              <tbody>
                <tr v-for="line in initialContract.lines" :key="line.id">
                  <th scope="row">{{ line.name }}</th>
                  <td>{{ line.accept }}</td>
                  <td>{{ line.handle }}</td>
                </tr>
              </tbody>
            </table>
            <h3 class="brief-subhead">第四条至第八条</h3>
            <ul class="sys-lines">
              <li>验收合格后7日内办理对应合格部分付款；未验收、验收不合格或资料不完整的部分暂停付款。</li>
              <li>本合同付款受C方案预算控制及项目资金用途规则约束。</li>
              <li>乙方S2为唯一初始主供应商。备选供应商不参与初始合同分单。</li>
              <li>任何变更须形成书面补充协议或经平台审批留痕后生效。</li>
            </ul>
          </article>
          <p v-if="flow.isDone('contract')" class="sys-toast">{{ initialContract.code }} 已提交，合同金额 {{ money(officialContract.total, 0) }} 元。</p>
        </template>

        <template v-else-if="leaf === 'direct'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('direct', checkDirect)">点击提交</button>
          </div>
          <article class="contract-doc">
            <header class="brief-hero">
              <h2 class="brief-title">生活保障物资应急零售/框架协议直采协议</h2>
              <p class="brief-lead">适用物资：饮用水、食品 ｜ 不纳入{{ initialContract.code }}主合同</p>
            </header>
            <dl class="block-fields">
              <div class="field-row"><dt>甲方（采购方）</dt><dd>{{ initialContract.buyer }}</dd></div>
              <div class="field-row"><dt>乙方（商超/框架供应商）</dt><dd>{{ directPurchase.seller }}</dd></div>
              <div class="field-row"><dt>采购方式</dt><dd>大型商超应急零售或已签订框架协议直接下单</dd></div>
              <div class="field-row"><dt>当前控制金额</dt><dd>人民币 {{ money(officialDirect.total, 2) }} 元</dd></div>
            </dl>
            <h3 class="brief-subhead">第一条 物资、数量、控制价及金额测算</h3>
            <table class="calc-table compact center-text">
              <thead>
                <tr>
                  <th>序号</th><th>物资</th><th>单位</th><th>当前净需求量</th>
                  <th>历史价（元）</th><th>市场参考价（元）</th><th>直采控制价</th><th>控制金额（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in officialDirect.lines" :key="line.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ line.name }}</td>
                  <td>{{ line.unit }}</td>
                  <td>{{ num(line.quantity, 0) }}</td>
                  <td>{{ num(directPurchase.lines[index].history, 0) }}</td>
                  <td>{{ num(directPurchase.lines[index].market, 0) }}</td>
                  <td>{{ num(line.price, 1) }}</td>
                  <td><input v-model.number="directAmounts[index]" type="number" min="0" step="0.5" class="student-input" /></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="7">合计 / {{ studentDirectTotal ? rmbUpper(studentDirectTotal) : '（待计算）' }}</th>
                  <td class="col-total">{{ studentDirectTotal ? money(studentDirectTotal, 2) : '—' }}</td>
                </tr>
              </tfoot>
            </table>
            <p class="form-desc">该金额为按当前需求量和控制价测算的预算占用控制金额，不等同于无条件固定结算额。实际成交价原则上不得高于直采控制价。</p>
            <h3 class="brief-subhead">第二至七条</h3>
            <ul class="sys-lines">
              <li>饮用水、食品按含税零售价或框架协议结算价核验；配送费如单独发生应单列。</li>
              <li>每次采购应留存审批、询价截图或框架价依据、订单或销售凭证、发票、收货验收和支付凭证。</li>
              <li>直采金额不计入{{ initialContract.code }}主合同金额，与合同金额合并后统一受C方案预算限额控制。</li>
            </ul>
          </article>
          <p v-if="flow.isDone('direct')" class="sys-toast">直采协议已提交，控制金额 {{ money(officialDirect.total, 2) }} 元。</p>
        </template>

        <template v-else-if="leaf === 'occupation'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('occupation')">确认占用率测算</button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>C方案预算占用率测算表</caption>
              <thead><tr><th>计算项目</th><th>数值</th><th>单位</th><th>说明</th></tr></thead>
              <tbody>
                <tr><th scope="row">HT-2025-001合同采购金额</th><td>{{ money(officialContract.total, 2) }}</td><td>元</td><td>帐篷+棉被+救生衣+急救包</td></tr>
                <tr><th scope="row">食品、饮用水直采金额</th><td>{{ money(officialDirect.total, 2) }}</td><td>元</td><td>饮用水直采金额+食品直采金额</td></tr>
                <tr><th scope="row">初始采购预算占用合计</th><td class="col-total">{{ money(occupied, 2) }}</td><td>元</td><td>932,460.00+149,397.50</td></tr>
                <tr><th scope="row">C方案预算上限</th><td>{{ money(PLAN_C_BUDGET_CAP, 2) }}</td><td>元</td><td>已批准C方案预算</td></tr>
                <tr><th scope="row">预算占用率</th><td>{{ percent(occupationRate, 2) }}</td><td>—</td><td>1,081,857.50÷4,278,517.50×100%</td></tr>
                <tr><th scope="row">剩余预算额度</th><td>{{ money(remain, 2) }}</td><td>元</td><td>4,278,517.50－1,081,857.50</td></tr>
                <tr><th scope="row">剩余预算比例</th><td>{{ percent(1 - occupationRate, 2) }}</td><td>—</td><td>100%－25.29%</td></tr>
                <tr><th scope="row">预算控制状态</th><td colspan="3">✅ 未超预算</td></tr>
              </tbody>
            </table>
          </div>
          <p v-if="flow.isDone('occupation')" class="sys-toast">预算占用率 {{ percent(occupationRate, 2) }}，未突破C方案预算上限。</p>
        </template>

        <template v-else-if="leaf === 'fund'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('fund', checkFund)">启用控制</button>
          </div>
          <p class="form-desc">进入“采购资金控制”页面，选择项目并新增两类采购预算占用。</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">项目</span>
              <select v-model="fund.project" class="form-control">
                <option value="">请选择</option>
                <option value="洪涝应急救援专项">洪涝应急救援专项</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">预算方案</span>
              <select v-model="fund.plan" class="form-control">
                <option value="">请选择</option>
                <option value="C方案">C方案</option>
              </select>
            </label>
          </div>
          <ul class="sys-lines">
            <li>HT-2025-001合同采购：932,460元</li>
            <li>食品、饮用水直采：149,397.50元</li>
            <li>预算占用合计 = 1,081,857.50元</li>
          </ul>
          <div class="checkbox-group">
            <label class="checkbox-item"><input v-model="fund.occupied" type="checkbox" />占用预算：预算占用成功，未突破C方案额度</label>
            <label class="checkbox-item"><input v-model="fund.paymentPlan" type="checkbox" />生成付款计划：验收合格后7日内；直采按订单实际到货量付款</label>
            <label class="checkbox-item"><input v-model="fund.ledgers" type="checkbox" />生成资金台账：HT-001合同采购资金台账、生活保障直采资金台账</label>
            <label class="checkbox-item"><input v-model="fund.match" type="checkbox" />付款前资金来源匹配：待付款时匹配</label>
            <label class="checkbox-item"><input v-model="fund.fourFlow" type="checkbox" />启用四流匹配付款控制</label>
          </div>
          <ul class="sys-lines">
            <li v-for="item in fundMatchRules" :key="item">{{ item }}</li>
            <li>HT-2025-001：{{ fourFlowRules.contract }}</li>
            <li>食品、饮用水直采：{{ fourFlowRules.direct }}</li>
          </ul>
          <template v-if="flow.isDone('fund')">
            <p class="sys-toast">四流匹配通过后方可付款；不一致自动暂停。</p>
            <section class="status-board">
              <h3>C方案采购资金控制</h3>
              <ul>
                <li>HT-2025-001：932,460元｜已占用</li>
                <li>生活保障直采：149,397.50元｜已占用</li>
                <li>合计：1,081,857.50元</li>
                <li>预计付款计划：已建立</li>
                <li>采购资金台账：已建立</li>
                <li>资金来源：付款前匹配</li>
                <li>四流控制：已启用</li>
                <li>当前状态：🟢 等待履约验收</li>
              </ul>
            </section>
          </template>
        </template>

        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('approve', checkApprove)">审批通过</button>
          </div>
          <h3 class="brief-subhead">洪涝应急救援采购方案审批</h3>
          <div class="dual-pane">
            <article class="scheme-card">
              <h3>HT-2025-001合同采购</h3>
              <p>主供应商：S2</p>
              <p>帐篷：500顶 · 棉被：6604床 · 救生衣：468件 · 急救包：324套</p>
              <p>合同金额：932,460元</p>
            </article>
            <article class="scheme-card">
              <h3>生活保障应急直采</h3>
              <p>饮用水：629箱 · 食品：1704箱</p>
              <p>直采金额：149,397.50元</p>
              <p>采购方式：大型商超应急零售/框架协议直采</p>
            </article>
          </div>
          <p class="form-desc">采购预算占用合计：1,081,857.50元</p>
          <div class="checkbox-group">
            <label v-for="item in schemeReviewChecks" :key="item" class="checkbox-item">
              <input v-model="schemeChecks[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <p v-if="flow.isDone('approve')" class="sys-toast">审批成功。合同采购和生活保障直采方案已批准。</p>
        </template>

        <template v-else-if="leaf === 'dispatch'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('dispatch', checkDispatch)">确认分流</button>
          </div>
          <p class="form-desc">审批以后自动分成两条线，平台视觉上须非常清楚。</p>
          <div class="dual-pane">
            <article class="scheme-card">
              <h3>卡片A：合同采购</h3>
              <p>HT-2025-001 · 供应商：S2 · 物资：帐篷、棉被、救生衣、急救包</p>
              <p>状态：待启动履约监测</p>
              <button type="button" class="primary-button" @click="save('monitor')">启动履约监测</button>
            </article>
            <article class="scheme-card">
              <h3>卡片B：生活保障直采</h3>
              <p>物资：食品、饮用水 · 方式：应急零售/框架协议直采</p>
              <p>状态：待建立直采台账</p>
              <button type="button" class="primary-button" @click="save('ledger')">建立直采台账</button>
            </article>
          </div>
        </template>

        <template v-else-if="leaf === 'monitor'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('monitor')">启动监测</button>
          </div>
          <h3 class="brief-subhead">HT-2025-001供应商履约监测</h3>
          <table class="calc-table compact center-text">
            <thead><tr><th>监测指标</th><th>合同要求</th><th>当前状态</th></tr></thead>
            <tbody>
              <tr><th scope="row">主供应商</th><td>S2</td><td>🟢 正常</td></tr>
              <tr><th scope="row">帐篷数量</th><td>500顶</td><td>待交付</td></tr>
              <tr><th scope="row">棉被数量</th><td>6604床</td><td>待交付</td></tr>
              <tr><th scope="row">救生衣数量</th><td>468件</td><td>待交付</td></tr>
              <tr><th scope="row">急救包数量</th><td>324套</td><td>待交付</td></tr>
              <tr><th scope="row">重点交付时限</th><td>12小时</td><td>🟢 监测中</td></tr>
              <tr><th scope="row">供应商库存能力</th><td>满足合同要求</td><td>🟢 正常</td></tr>
              <tr><th scope="row">质量状态</th><td>待验收</td><td>待更新</td></tr>
            </tbody>
          </table>
          <p class="form-desc">监测频率：动态更新。重点网格：甲3、甲6。</p>
          <p v-if="flow.isDone('monitor')" class="sys-toast">S2履约动态监测已启动</p>
        </template>

        <template v-else-if="leaf === 'alert'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('alert')">启用规则</button>
          </div>
          <ul class="sys-lines">
            <li v-for="item in alertRules" :key="item.title"><strong>{{ item.title }}</strong> {{ item.text }}</li>
          </ul>
          <p v-if="flow.isDone('alert')" class="sys-toast">履约预警规则已启用。</p>
        </template>

        <template v-else-if="leaf === 'ledger'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('ledger')">保存直采台账</button>
          </div>
          <h3 class="brief-subhead">生活保障物资应急直采台账</h3>
          <table class="calc-table compact center-text">
            <thead>
              <tr><th>物资</th><th>计划数量</th><th>控制价</th><th>采购方式</th><th>订单状态</th><th>收货状态</th><th>付款状态</th></tr>
            </thead>
            <tbody>
              <tr><td>饮用水</td><td>629箱</td><td>23.5元/箱</td><td>商超/框架直采</td><td>待下单</td><td>待收货</td><td>待付款</td></tr>
              <tr><td>食品</td><td>1704箱</td><td>79元/箱</td><td>商超/框架直采</td><td>待下单</td><td>待收货</td><td>待付款</td></tr>
            </tbody>
          </table>
          <div class="checkbox-group">
            <label v-for="item in LEDGER_FILES" :key="item" class="checkbox-item">
              <input v-model="uploads[item]" type="checkbox" />上传{{ item }}
            </label>
          </div>
          <p v-if="flow.isDone('ledger')" class="sys-toast">食品、饮用水直采台账已建立。</p>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
