<script setup>
// 应急采购管理系统 · 变更后合同控制与阶段移交。
// 工作簿里的菜单路径要逐级点开，进入对应功能页办理业务。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { changeOrder, handoverSummary } from '../../data/procurement.js'
import { calculateChangeImpact } from '../../domain/procurement.js'
import { money, percent, signedPercent } from '../../domain/format.js'

const PAGES = ['recheck', 'contingency', 'mapping', 'approve']
const STEPS = [
  { id: 'recheck', label: '合同复核' },
  { id: 'contingency', label: '预备费动用' },
  { id: 'mapping', label: '核算映射' },
  { id: 'approve', label: '终审移交' },
]
const flow = useTaskFlow('s2-t6', PAGES)
const store = useFormPersist('s2-t6')

const menu = [
  {
    id: 'm-contract',
    label: '合同管理',
    children: [
      { id: 'm-contract-check', label: '交接核验', children: [{ id: 'recheck', label: '合同复核' }] },
      { id: 'm-contract-approve', label: '交接审批', children: [{ id: 'approve', label: '终审移交' }] },
    ],
  },
  {
    id: 'm-budget',
    label: '预算管理',
    children: [{ id: 'm-budget-contingency', label: '预备费', children: [{ id: 'contingency', label: '预备费动用' }] }],
  },
  {
    id: 'm-fund',
    label: '资金核算',
    children: [{ id: 'm-fund-map', label: '科目映射', children: [{ id: 'mapping', label: '核算映射' }] }],
  },
]

const leafLabels = {}
function collectLeaves(nodes) {
  nodes.forEach((node) => (node.children ? collectLeaves(node.children) : (leafLabels[node.id] = node.label)))
}
collectLeaves(menu)

const BASELINE_PRICE = 846.25

const CONTRACT_MAPPING = ['合同主体', '收款账户', '预算项目', '资金来源']
const DIRECT_MAPPING = ['商超或框架供货方', '采购审批', '订单', '票据', '收款账户', '预算项目']

const emergency = changeOrder.emergencyContract
const impact = computed(() => calculateChangeImpact())

const EMPTY_RECHECK = {
  tentBefore: '',
  tentAfter: '',
  emergencyQty: '',
  emergencyHours: '',
  contractAmount: '',
  emergencyAmount: '',
  directTotal: '',
}

const EMPTY_CONTINGENCY = {
  budgetCap: '',
  total: '',
  used: '',
}

const recheck = reactive({ ...EMPTY_RECHECK })
const contingency = reactive({ ...EMPTY_CONTINGENCY })
const contractMapping = reactive(Object.fromEntries(CONTRACT_MAPPING.map((item) => [item, false])))
const directMapping = reactive(Object.fromEntries(DIRECT_MAPPING.map((item) => [item, false])))

const activeId = ref('')
const error = ref('')

function n(value) {
  return Number(value) || 0
}

const contractsTotal = computed(() => n(recheck.contractAmount) + n(recheck.emergencyAmount))
const executionTotal = computed(() => contractsTotal.value + n(recheck.directTotal))
const contingencyRate = computed(() => (n(contingency.total) ? n(contingency.used) / n(contingency.total) : 0))
const contingencyLeft = computed(() => n(contingency.total) - n(contingency.used))
const deviation = computed(() => (impact.value.goodsUnitCost - BASELINE_PRICE) / BASELINE_PRICE)
const mappedContract = computed(() => CONTRACT_MAPPING.filter((item) => contractMapping[item]))
const mappedDirect = computed(() => DIRECT_MAPPING.filter((item) => directMapping[item]))
const pendingPages = computed(() =>
  PAGES.filter((id) => id !== 'approve' && !flow.isDone(id)).map((id) => leafLabels[id]),
)

store.restore({ recheck, contingency, contractMapping, directMapping })

function snapshot() {
  return { recheck, contingency, contractMapping, directMapping }
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

function checkMapping() {
  const rest =
    CONTRACT_MAPPING.length - mappedContract.value.length + (DIRECT_MAPPING.length - mappedDirect.value.length)
  return rest ? `还有 ${rest} 项映射关系未确认` : ''
}

function checkApprove() {
  if (!pendingPages.value.length) return ''
  return `还有 ${pendingPages.value.length} 个功能页未办理：${pendingPages.value.join('、')}`
}

function resetAll() {
  flow.reset()
  store.clear()
  Object.assign(recheck, { ...EMPTY_RECHECK })
  Object.assign(contingency, { ...EMPTY_CONTINGENCY })
  CONTRACT_MAPPING.forEach((item) => { contractMapping[item] = false })
  DIRECT_MAPPING.forEach((item) => { directMapping[item] = false })
  error.value = ''
}
</script>

<template>
  <PanelShell title="变更后合同控制与阶段移交" source="合同履约与阶段移交">
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
        <!-- 合同管理 → 交接核验 → 合同复核 -->
        <template v-if="leaf === 'recheck'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('recheck')">
              复核合同
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">变更前帐篷数量（顶）</span>
              <input v-model="recheck.tentBefore" type="number" min="0" step="1" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">变更后帐篷数量（顶）</span>
              <input v-model="recheck.tentAfter" type="number" min="0" step="1" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">紧急分单数量（顶）</span>
              <input v-model="recheck.emergencyQty" type="number" min="0" step="1" class="form-control" />
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">紧急分单到货时限（小时）</span>
              <input v-model="recheck.emergencyHours" type="number" min="0" step="1" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">生活保障直采金额（元）</span>
              <input v-model="recheck.directTotal" type="number" min="0" step="0.01" class="form-control" />
            </label>
            <div class="form-item" />
          </div>
          <table class="calc-table compact">
            <thead>
              <tr><th>合同</th><th>履行方</th><th>内容</th><th class="col-total">金额（元）</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{{ changeOrder.contractCode }}</th>
                <td>{{ handoverSummary.contractExecutor[changeOrder.contractCode] }}</td>
                <td>帐篷数量变更，其余合同物资不变</td>
                <td class="col-total">
                  <input v-model="recheck.contractAmount" type="number" min="0" step="0.01" />
                </td>
              </tr>
              <tr>
                <th scope="row">{{ emergency.code }}</th>
                <td>{{ handoverSummary.contractExecutor[emergency.code] }}</td>
                <td>紧急分单帐篷</td>
                <td class="col-total">
                  <input v-model="recheck.emergencyAmount" type="number" min="0" step="0.01" />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">两份合同合计</th>
                <td colspan="2">—</td>
                <td class="col-total">{{ money(contractsTotal, 0) }} 元</td>
              </tr>
            </tfoot>
          </table>
          <template v-if="flow.isDone('recheck')">
            <p class="sys-toast">
              变更后合同复核完成，采购执行合计 {{ money(executionTotal, 2) }} 元。
            </p>
            <ul class="sys-lines">
              <li>
                {{ changeOrder.contractCode }} 金额 {{ money(n(recheck.contractAmount), 0) }} 元，
                帐篷 {{ recheck.tentBefore }} → {{ recheck.tentAfter }} 顶，
                由 {{ handoverSummary.contractExecutor[changeOrder.contractCode] }} 履行
              </li>
              <li>
                {{ emergency.code }} 金额 {{ money(n(recheck.emergencyAmount), 0) }} 元，
                紧急分单 {{ recheck.emergencyQty }} 顶、{{ recheck.emergencyHours }} 小时到货，
                由 {{ handoverSummary.contractExecutor[emergency.code] }} 履行
              </li>
              <li>食品、饮用水应急零售/框架协议直采 {{ money(n(recheck.directTotal), 2) }} 元</li>
              <li class="info">{{ handoverSummary.note }}</li>
            </ul>
            <p class="block-formula">
              两份合同合计 = {{ money(n(recheck.contractAmount), 0) }} + {{ money(n(recheck.emergencyAmount), 0) }} = {{ money(contractsTotal, 0) }} 元
            </p>
            <p class="block-formula">
              采购执行合计 = {{ money(contractsTotal, 0) }} + {{ money(n(recheck.directTotal), 2) }} = {{ money(executionTotal, 2) }} 元
            </p>
          </template>
        </template>

        <!-- 预算管理 → 预备费 → 预备费动用 -->
        <template v-else-if="leaf === 'contingency'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('contingency')">
              确认结余
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">C方案总预算上限（元）</span>
              <input v-model="contingency.budgetCap" type="number" min="0" step="0.01" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">预备费总额（元）</span>
              <input v-model="contingency.total" type="number" min="0" step="0.01" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">本次紧急分单使用（元）</span>
              <input v-model="contingency.used" type="number" min="0" step="0.01" class="form-control" />
            </label>
          </div>
          <template v-if="flow.isDone('contingency')">
            <p class="sys-toast">
              新增 {{ money(n(contingency.used), 0) }} 元已纳入 C 方案预备费，C 方案总预算上限 {{ money(n(contingency.budgetCap), 2) }} 元不变。
            </p>
            <div class="gauge-track">
              <span class="gauge-fill warn" :style="{ width: percent(contingencyRate, 2) }"></span>
            </div>
            <p class="gauge-caption">
              预备费使用 {{ money(n(contingency.used), 0) }} / {{ money(n(contingency.total), 0) }} = {{ percent(contingencyRate, 2) }}，
              第二阶段结束时预备费阶段性余额 {{ money(contingencyLeft, 0) }} 元。
            </p>
            <div class="calc-subhead"><h3>帐篷综合成本复核</h3></div>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">{{ recheck.tentBefore || '—' }} 顶综合平均成本</span>
                <strong class="stat-value">{{ money(impact.averageUnitCost, 2) }} 元/顶</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">剔除应急运输和人工后</span>
                <strong class="stat-value">{{ money(impact.goodsUnitCost, 2) }} 元/顶</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">与基准价 {{ BASELINE_PRICE }} 元偏差</span>
                <strong class="stat-value">{{ signedPercent(deviation, 2) }}</strong>
              </div>
            </div>
            <p class="calc-note">最终余额待复盘阶段结合全部实际结算差异统一计算。</p>
          </template>
        </template>

        <!-- 资金核算 → 科目映射 → 核算映射 -->
        <template v-else-if="leaf === 'mapping'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('mapping', checkMapping)">
              确认映射
            </button>
          </div>
          <p class="form-desc">两份合同映射</p>
          <div class="checkbox-group">
            <label v-for="item in CONTRACT_MAPPING" :key="item" class="checkbox-item">
              <input v-model="contractMapping[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <p class="form-desc">食品、饮用水直采业务映射</p>
          <div class="checkbox-group">
            <label v-for="item in DIRECT_MAPPING" :key="item" class="checkbox-item">
              <input v-model="directMapping[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <template v-if="flow.isDone('mapping')">
            <p class="sys-toast">映射已建立，后续按合同与直采业务分别核验，不得混同。</p>
            <ul class="sys-lines">
              <li>
                {{ changeOrder.contractCode }}、{{ emergency.code }} 已建立{{ mappedContract.join('、') }}映射
              </li>
              <li>食品、饮用水直采业务已建立{{ mappedDirect.join('、') }}映射</li>
            </ul>
          </template>
        </template>

        <!-- 合同管理 → 交接审批 → 终审移交 -->
        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('approve', checkApprove)">
              审核通过
            </button>
          </div>
          <p v-if="pendingPages.length" class="sys-toast warn">
            以下功能页尚未办理，无法终审移交：{{ pendingPages.join('、') }}。
          </p>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">两份合同合计</span>
              <strong class="stat-value">{{ money(contractsTotal, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">生活保障直采</span>
              <strong class="stat-value">{{ money(n(recheck.directTotal), 2) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">采购执行合计</span>
              <strong class="stat-value accent">{{ money(executionTotal, 2) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">预备费阶段性余额</span>
              <strong class="stat-value">{{ money(contingencyLeft, 0) }} 元</strong>
            </div>
          </div>
          <template v-if="flow.isDone('approve')">
            <p class="sys-toast">变更后合同控制审核通过。</p>
            <div class="calc-result">
              <p class="result-line">
                {{ changeOrder.contractCode }} {{ money(n(recheck.contractAmount), 0) }} 元与 {{ emergency.code }}
                {{ money(n(recheck.emergencyAmount), 0) }} 元合计 {{ money(contractsTotal, 0) }} 元，
                加生活保障直采 {{ money(n(recheck.directTotal), 2) }} 元，采购执行合计 {{ money(executionTotal, 2) }} 元，
                较初始方案增加 {{ money(executionTotal - impact.initialTotal, 0) }} 元并全部从 C 方案预备费列支，
                预备费阶段性余额 {{ money(contingencyLeft, 0) }} 元结转下一阶段。
              </p>
            </div>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
