<script setup>
// 应急财务平台 · B方案预算审批。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { abcPlanMap } from '../../data/abcBudget.js'
import {
  bApproval,
  confirmedFundsAtHalfHour,
  fiscalAtHalfHour,
  plannedFiscal,
} from '../../data/emergencyUpdate.js'
import { bCoverage } from '../../domain/emergencyUpdate.js'
import { money, percent } from '../../domain/format.js'

const PAGES = ['register', 'load-plan', 'funds', 'coverage', 'control', 'approve', 'sync']
const flow = useTaskFlow('s1-t7', PAGES)
const store = useFormPersist('s1-t7')

const menu = [
  {
    id: 'm-resp',
    label: '响应管理',
    children: [
      { id: 'register', label: '响应通知登记' },
      { id: 'load-plan', label: '载入B方案' },
    ],
  },
  {
    id: 'm-fund',
    label: '资金管理',
    children: [{ id: 'funds', label: '财政资金到账台账' }],
  },
  {
    id: 'm-budget',
    label: '预算管理',
    children: [
      {
        id: 'm-budget-cover',
        label: '资金保障分析',
        children: [{ id: 'coverage', label: '覆盖率测算' }],
      },
      {
        id: 'm-budget-start',
        label: '应急预算',
        children: [{ id: 'control', label: '预算启动' }],
      },
      { id: 'approve', label: '预算审批' },
    ],
  },
  {
    id: 'm-share',
    label: '数据共享中心',
    children: [{ id: 'sync', label: '同步发布' }],
  },
]

const leafLabels = {}
function collectLeaves(nodes) {
  nodes.forEach((node) => (node.children ? collectLeaves(node.children) : (leafLabels[node.id] = node.label)))
}
collectLeaves(menu)

const plan = abcPlanMap.B
const activeId = ref('')
const error = ref('')

const notice = reactive({
  eventName: '',
  level: '',
  source: '',
  effective: '',
  status: '',
  project: '',
  document: '',
})

const funds = reactive(fiscalAtHalfHour.map((row) => ({ ...row, arrivedInput: '' })))
const fundBasis = ref('')
const selectedPlan = ref('')
const controlMode = ref('')
const opinion = ref('')
const decided = ref('')

store.restore({ notice, funds, fundBasis, selectedPlan, controlMode, opinion, decided })

const confirmed = computed(() =>
  funds.reduce((sum, row) => sum + (Number(row.arrivedInput) || 0), 0),
)
const coverage = computed(() => bCoverage(confirmed.value || 0, plan.total))
const pendingPages = computed(() => PAGES.filter((id) => id !== 'sync' && !flow.isDone(id)))

function snapshot() {
  return { notice, funds, fundBasis, selectedPlan, controlMode, opinion, decided }
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

function fillOpinion() {
  opinion.value = bApproval.opinion
}

function checkRegister() {
  if (notice.eventName.trim() !== '洪涝应急救援') return '事件名称须登记为洪涝应急救援'
  if (notice.level !== 'III级') return '当前响应等级须为 III 级'
  if (notice.source !== '上级部门通知') return '响应来源须为上级部门通知'
  if (notice.effective.trim() !== '灾后0.5h') return '生效时间须为灾后0.5h'
  if (notice.status !== '已确认') return '通知状态须为已确认'
  if (notice.project !== '洪涝应急救援专项') return '须关联洪涝应急救援专项项目'
  if (!notice.document.includes('III级')) return '须关联《III级应急响应通知》'
  return ''
}

function checkFunds() {
  const mismatch = funds.find((row, index) => Number(row.arrivedInput) !== fiscalAtHalfHour[index].arrived)
  if (mismatch) return `${mismatch.id} 已到账金额与台账不一致`
  if (confirmed.value !== confirmedFundsAtHalfHour) return `已确认到账须为 ${money(confirmedFundsAtHalfHour, 0)} 元`
  if (fundBasis.value !== '仅计已确认到账资金') return '资金计算口径须为仅计已确认到账资金'
  return ''
}

function checkCoverage() {
  if (!flow.isDone('funds')) return '尚未核验财政资金到账，无法测算覆盖率'
  if (Math.abs(coverage.value.percent - 125.82) > 0.02) return '覆盖率须按已确认资金 ÷ B方案预算测算'
  if (coverage.value.status.level !== 'green') return '当前资金不足以覆盖 B 方案，不能生成绿色保障分析'
  return ''
}

function checkControl() {
  if (selectedPlan.value !== 'B') return '须选择 B 方案建立预算控制'
  if (controlMode.value !== bApproval.controlMode) return '预算控制方式须为总额控制 + 分项控制'
  return ''
}

function checkApprove() {
  if (pendingPages.value.filter((id) => id !== 'approve').length) {
    return `还有功能页未办理（${pendingPages.value.filter((id) => id !== 'approve').map((id) => leafLabels[id]).join('、')}）`
  }
  if (decided.value !== '通过') return '须点击审核通过'
  const text = opinion.value.trim()
  if (!text.includes('B方案') || !text.includes('125.82')) return '审批意见须写明 III 级对应 B 方案及 125.82% 覆盖率'
  return ''
}

function checkSync() {
  if (!flow.isDone('approve')) return 'B 方案尚未审批通过，不能同步共享中心'
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  Object.assign(notice, {
    eventName: '',
    level: '',
    source: '',
    effective: '',
    status: '',
    project: '',
    document: '',
  })
  funds.forEach((row, index) => {
    Object.assign(row, { ...fiscalAtHalfHour[index], arrivedInput: '' })
  })
  fundBasis.value = ''
  selectedPlan.value = ''
  controlMode.value = ''
  opinion.value = ''
  decided.value = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="B方案预算审批" source="应急财务平台">
    <SystemShell
      system="应急财务平台"
      operator="财务主管统筹岗"
      login-hint="登录后从响应管理进入通知登记，再完成资金核验与 B 方案审批。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'register'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('register', checkRegister)">确认接收</button>
          </div>
          <p class="form-desc">应急财务平台 → 响应管理 → 响应通知登记。收到御洪星通报后，先登记上级部门 III 级应急响应通知。</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">事件名称</span>
              <input v-model="notice.eventName" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label required">当前响应等级</span>
              <select v-model="notice.level" class="form-control">
                <option value="">请选择</option><option>IV级</option><option>III级</option><option>II级</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">响应来源</span>
              <select v-model="notice.source" class="form-control">
                <option value="">请选择</option><option>上级部门通知</option><option>本级自行研判</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">生效时间</span>
              <input v-model="notice.effective" class="form-control" />
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">通知状态</span>
              <select v-model="notice.status" class="form-control">
                <option value="">请选择</option><option>待确认</option><option>已确认</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">关联项目</span>
              <select v-model="notice.project" class="form-control">
                <option value="">请选择</option><option>洪涝应急救援专项</option><option>日常业务项目</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">上传或关联</span>
              <input v-model="notice.document" class="form-control" placeholder="III级应急响应通知" />
            </label>
          </div>
          <template v-if="flow.isDone('register')">
            <p class="sys-toast">III 级应急响应通知已确认接收，并与洪涝应急救援专项项目关联。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'load-plan'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('load-plan')">载入B方案</button>
          </div>
          <p class="form-desc">系统按 III 级响应自动匹配标准救援保障方案。</p>
          <template v-if="flow.isDone('load-plan')">
            <p class="sys-toast">B 方案参数已载入。</p>
            <dl class="block-fields">
              <div class="field-row"><dt>总预算</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
              <div class="field-row"><dt>基础执行预算</dt><dd>{{ money(plan.execution, 1) }} 元</dd></div>
              <div class="field-row"><dt>预备费</dt><dd>{{ money(plan.reserve, 1) }} 元</dd></div>
              <div class="field-row"><dt>预备费比例</dt><dd>{{ percent(plan.reserveRatio, 0) }}</dd></div>
              <div class="field-row"><dt>覆盖人数</dt><dd>{{ plan.people }} 人</dd></div>
              <div class="field-row"><dt>安置期</dt><dd>{{ plan.days }} 天</dd></div>
            </dl>
          </template>
        </template>

        <template v-else-if="leaf === 'funds'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('funds', checkFunds)">确认到账口径</button>
          </div>
          <p class="form-desc">资金管理 → 财政资金到账台账。政府财政资金计划协调 402 万元，按已确认到账口径测算。</p>
          <table class="calc-table">
            <thead>
              <tr><th>资金项目</th><th>计划金额（元）</th><th>已到账（元）</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in funds" :key="row.id">
                <th scope="row">{{ row.id }}</th>
                <td>{{ money(row.plan, 0) }}</td>
                <td><input v-model="row.arrivedInput" type="number" min="0" step="10000" /></td>
                <td>{{ row.status }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">合计</th>
                <td>{{ money(plannedFiscal, 0) }}</td>
                <td>{{ money(confirmed, 0) }}</td>
                <td>{{ confirmed === confirmedFundsAtHalfHour ? '部分到账' : '待核验' }}</td>
              </tr>
            </tfoot>
          </table>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">资金计算口径</span>
              <select v-model="fundBasis" class="form-control">
                <option value="">请选择</option>
                <option>仅计已确认到账资金</option>
                <option>按计划协调金额全额计入</option>
              </select>
            </label>
          </div>
          <template v-if="flow.isDone('funds')">
            <p class="sys-toast">当前可确认资金 {{ money(confirmedFundsAtHalfHour, 0) }} 元，G03 剩余 36 万元仍在追加审批。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'coverage'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('coverage', checkCoverage)">生成资金保障分析</button>
          </div>
          <p class="form-desc">资金覆盖率 = 已确认可用资金 ÷ 预算需求 × 100%。≥100% 绿色，95%—100% 黄色，＜95% 红色。</p>
          <dl class="block-fields">
            <div class="field-row"><dt>当前已确认可用资金</dt><dd>{{ money(confirmed || confirmedFundsAtHalfHour, 0) }} 元</dd></div>
            <div class="field-row"><dt>B方案预算需求</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
            <div class="field-row"><dt>资金覆盖率</dt><dd>{{ coverage.percent.toFixed(2) }}%</dd></div>
            <div class="field-row"><dt>状态</dt><dd>{{ coverage.status.mark }} {{ coverage.status.label }}</dd></div>
            <div class="field-row"><dt>当前资金缺口</dt><dd>{{ money(coverage.gap, 0) }} 元</dd></div>
          </dl>
          <template v-if="flow.isDone('coverage')">
            <p class="sys-toast">3,660,000 ÷ 2,909,004 × 100% = 125.82%，状态：🟢 资金充足。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'control'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('control', checkControl)">建立预算控制</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">选择方案</span>
              <select v-model="selectedPlan" class="form-control">
                <option value="">请选择</option><option value="A">A方案</option><option value="B">B方案</option><option value="C">C方案</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">预算控制方式</span>
              <select v-model="controlMode" class="form-control">
                <option value="">请选择</option>
                <option>总额控制</option>
                <option>总额控制 + 分项控制</option>
              </select>
            </label>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>预算总额</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
            <div class="field-row"><dt>基础执行预算</dt><dd>{{ money(plan.execution, 1) }} 元</dd></div>
            <div class="field-row"><dt>预备费</dt><dd>{{ money(plan.reserve, 1) }} 元</dd></div>
            <div class="field-row"><dt>总预算上限</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
          </dl>
          <p class="form-desc">系统规则：累计预算占用不得超过 2,909,004 元。</p>
          <template v-if="flow.isDone('control')">
            <p class="sys-toast">B 方案预算控制额度已建立，总额控制 + 分项控制生效。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="fillOpinion">填入建议意见</button>
            <button type="button" class="primary-button" @click="decided = '通过'; run('approve', checkApprove)">审核通过</button>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>响应等级</dt><dd>III级</dd></div>
            <div class="field-row"><dt>对应预算</dt><dd>B方案</dd></div>
            <div class="field-row"><dt>总预算</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
            <div class="field-row"><dt>基础执行预算</dt><dd>{{ money(plan.execution, 1) }} 元</dd></div>
            <div class="field-row"><dt>预备费</dt><dd>{{ money(plan.reserve, 1) }} 元</dd></div>
            <div class="field-row"><dt>已确认可用资金</dt><dd>{{ money(confirmedFundsAtHalfHour, 0) }} 元</dd></div>
            <div class="field-row"><dt>资金覆盖率</dt><dd>125.82%</dd></div>
            <div class="field-row"><dt>资金缺口</dt><dd>0 元</dd></div>
            <div class="field-row"><dt>风险状态</dt><dd>绿色</dd></div>
          </dl>
          <label class="form-item">
            <span class="form-label required">审批意见</span>
            <textarea v-model="opinion" class="form-control" rows="4" />
          </label>
          <template v-if="flow.isDone('approve')">
            <p class="sys-toast">B 方案状态：已批准。预算额度已生效，当前占用 0 元，余额 {{ money(plan.total, 0) }} 元，预备费余额 {{ money(plan.reserve, 1) }} 元。</p>
            <ul class="sys-lines">
              <li>《B方案应急预算审批单》</li>
              <li>《资金保障测算表》</li>
              <li>《预备费控制台账》</li>
            </ul>
          </template>
        </template>

        <template v-else-if="leaf === 'sync'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('sync', checkSync)">同步数据共享中心</button>
          </div>
          <p class="form-desc">同步 III 级响应状态、B 方案预算、预算上限、当前可用财政资金、资金覆盖率、预备费额度与审批结果。</p>
          <template v-if="flow.isDone('sync')">
            <p class="sys-toast">B 方案预算审批已完成，数据共享成功。</p>
            <dl class="block-fields">
              <div class="field-row"><dt>御洪星 · 响应等级</dt><dd>III级</dd></div>
              <div class="field-row"><dt>预算方案</dt><dd>B方案</dd></div>
              <div class="field-row"><dt>预算上限</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
              <div class="field-row"><dt>基础执行预算</dt><dd>{{ money(plan.execution, 1) }} 元</dd></div>
              <div class="field-row"><dt>预备费</dt><dd>{{ money(plan.reserve, 1) }} 元</dd></div>
              <div class="field-row"><dt>审批人</dt><dd>财务主管统筹岗</dd></div>
            </dl>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
