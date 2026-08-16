<script setup>
// 应急财务平台 · B方案预算审批。
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
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
const STEPS = [
  { id: 'register', label: '登记响应' },
  { id: 'load-plan', label: '载入B方案' },
  { id: 'funds', label: '核验到账' },
  { id: 'coverage', label: '覆盖率测算' },
  { id: 'control', label: '预算控制' },
  { id: 'approve', label: '预算审批' },
  { id: 'sync', label: '同步共享' },
]
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

// 确认审批后系统自动生成的三个可下载文件。
// 下载目标为 public/workbooks/ 下的同名 xlsx（当前为界面占位，文件放好后即可下载）。
const APPROVAL_FILES = [
  { name: '《B方案应急预算审批单》', file: 'B方案应急预算审批单.xlsx' },
  { name: '《资金保障测算表》', file: '资金保障测算表.xlsx' },
  { name: '《预备费控制台账》', file: '预备费控制台账.xlsx' },
]

function downloadUrl(file) {
  return `${import.meta.env.BASE_URL}workbooks/${encodeURIComponent(file)}`
}

// 响应通知登记记录列表（持久化），以及新增记录时的草稿表单
const notices = ref([])
const noticeDraft = reactive({
  eventName: '',
  level: '',
  source: '',
  effective: '',
  status: '',
  project: '',
  document: '',
})
const adding = ref(false)
const selectedId = ref('')
const draftFileKey = ref(0)

const funds = reactive(fiscalAtHalfHour.map((row) => ({
  ...row,
  arrivedInput: row.status === '已到账' ? String(row.arrived) : '',
})))
const fundBasis = ref('')
const selectedPlan = ref('')
const controlMode = ref('')
const opinion = ref('')
const decided = ref('')
// 预算审批三步状态：提交预算审批 → 审核通过 → 确认审批，每步按钮点击后转圈 3 秒。
const submitted = ref(false)
const approved = ref(false)
const submitLoading = ref(false)
const approveLoading = ref(false)
const confirmLoading = ref(false)
// 预算启动额度：选择 B 方案后显示的预算金额，各项可直接修改并自动保存。
const controlForm = reactive({
  total: String(plan.total),
  execution: String(plan.execution),
  reserve: String(plan.reserve),
  cap: String(plan.total),
})
// 覆盖率测算录入：录入已确认可用资金与预算需求，覆盖率、状态、缺口随之自动计算。
const coverageForm = reactive({
  note: '资金覆盖率 = 已确认可用资金 ÷ 预算需求 × 100%。≥100% 绿色，95%—100% 黄色，＜95% 红色。',
  currentFunds: '',
  budgetDemand: '',
})

store.restore({ notices, funds, fundBasis, selectedPlan, controlMode, opinion, decided, coverageForm, controlForm, submitted, approved })
// 恢复后默认选中最后一条登记记录
if (notices.value.length) selectedId.value = notices.value[notices.value.length - 1].id

const confirmed = computed(() =>
  funds.reduce((sum, row) => sum + (Number(row.arrivedInput) || 0), 0),
)
const pendingPages = computed(() => PAGES.filter((id) => id !== 'sync' && !flow.isDone(id)))

// 解析录入的金额文本（支持千分位与"万"），返回数值。
function parseAmount(text) {
  const clean = String(text ?? '').trim().replace(/[,\s]/g, '')
  const match = clean.match(/-?\d+(\.\d+)?/)
  if (!match) return 0
  const value = Number(match[0])
  return clean.includes('万') ? value * 10000 : value
}

// 覆盖率、状态、缺口随资金与预算的录入自动计算，不限制固定答案。
const coverageCalc = computed(() => {
  const available = parseAmount(coverageForm.currentFunds)
  const demand = parseAmount(coverageForm.budgetDemand)
  if (!available || !demand) {
    return { percent: 0, status: { level: 'none', label: '', mark: '' }, gap: 0 }
  }
  return bCoverage(available, demand)
})

function snapshot() {
  return {
    notices: notices.value,
    funds,
    fundBasis,
    selectedPlan,
    controlMode,
    opinion,
    decided,
    coverageForm,
    controlForm,
    submitted: submitted.value,
    approved: approved.value,
  }
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

// 载入 B 方案：模拟系统按 III 级响应自动匹配标准方案，转圈 3 秒后再展示参数。
const loadingPlan = ref(false)
let loadPlanTimer = null
let submitTimer = null
let approveTimer = null
let confirmTimer = null

function loadPlan() {
  if (loadingPlan.value) return
  error.value = ''
  loadingPlan.value = true
  loadPlanTimer = setTimeout(() => {
    loadingPlan.value = false
    loadPlanTimer = null
    store.persist(snapshot())
    flow.complete('load-plan')
  }, 3000)
}

// 填入建议意见：按覆盖率测算的实际结果动态生成，不写死固定覆盖率。
function fillOpinion() {
  opinion.value = `III级响应对应B方案，当前已确认财政资金覆盖率${coverageCalc.percent.toFixed(2)}%，${
    coverageCalc.gap > 0 ? `存在资金缺口${money(coverageCalc.gap, 0)}元` : '无资金缺口'
  }。同意启动B方案，预算上限${money(plan.total, 0)}元，其中预备费${money(plan.reserve, 1)}元单独控制。`
}

// 提交预算审批：按钮转圈 3 秒后展示审批信息表。
function submitApproval() {
  if (submitLoading.value) return
  error.value = ''
  submitLoading.value = true
  submitTimer = setTimeout(() => {
    submitLoading.value = false
    submitTimer = null
    submitted.value = true
    store.persist(snapshot())
  }, 3000)
}

// 审核通过：按钮转圈 3 秒后出现审批意见填写框，并预填按覆盖率生成的建议意见。
function approvePlan() {
  if (approveLoading.value) return
  if (!submitted.value) return
  error.value = ''
  approveLoading.value = true
  approveTimer = setTimeout(() => {
    approveLoading.value = false
    approveTimer = null
    approved.value = true
    decided.value = '通过'
    if (!opinion.value.trim() && coverageCalc.percent) fillOpinion()
    store.persist(snapshot())
  }, 3000)
}

// 确认审批：先校验前置条件与审批意见，再转圈 3 秒完成审批并展示执行结果与下载文件。
function confirmApproval() {
  if (confirmLoading.value) return
  if (!approved.value) return
  const message = checkApprove()
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  confirmLoading.value = true
  confirmTimer = setTimeout(() => {
    confirmLoading.value = false
    confirmTimer = null
    store.persist(snapshot())
    flow.complete('approve')
  }, 3000)
}

function checkRegister(record) {
  if (record.eventName.trim() !== '洪涝应急救援') return '事件名称须登记为洪涝应急救援'
  if (record.level !== 'III级') return '当前响应等级须为 III 级'
  if (record.source !== '上级部门通知') return '响应来源须为上级部门通知'
  if (record.effective.trim() !== '灾后0.5h') return '生效时间须为灾后0.5h'
  if (record.status !== '已确认') return '通知状态须为已确认'
  if (record.project !== '洪涝应急救援专项') return '须关联洪涝应急救援专项项目'
  if (!record.document) return '请上传《III级应急响应通知》附件'
  return ''
}

function onDraftFile(event) {
  const file = event.target.files?.[0]
  noticeDraft.document = file ? file.name : ''
}

// 当前选中展开的记录
const selectedRecord = computed(() => notices.value.find((n) => n.id === selectedId.value) ?? null)

// 开始新增：清空草稿、展开新增表单
function startAdd() {
  Object.assign(noticeDraft, {
    eventName: '',
    level: '',
    source: '',
    effective: '',
    status: '',
    project: '',
    document: '',
  })
  adding.value = true
  selectedId.value = ''
}

// 保存新增记录：必填校验通过后加入列表并持久化
function saveNotice() {
  const required = [
    ['eventName', '事件名称'],
    ['level', '当前响应等级'],
    ['source', '响应来源'],
    ['effective', '生效时间'],
    ['status', '通知状态'],
    ['project', '关联项目'],
  ]
  const missing = required.find(([key]) => !noticeDraft[key])
  if (missing) return (error.value = `请填写${missing[1]}`)
  if (!noticeDraft.document) return (error.value = '请上传《III级应急响应通知》附件')
  error.value = ''
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  notices.value.push({ id, ...noticeDraft })
  adding.value = false
  selectedId.value = id
  draftFileKey.value += 1
  store.persist(snapshot())
}

// 确认接收：对当前选中的记录校验并完成登记步骤
function confirmSelected() {
  const record = notices.value.find((n) => n.id === selectedId.value)
  if (!record) return (error.value = '请先新增并选择一条记录')
  const message = checkRegister(record)
  if (message) return (error.value = message)
  error.value = ''
  record.received = true
  store.persist(snapshot())
  flow.complete('register')
}

// 点击记录条：选中或收起
function toggle(id) {
  selectedId.value = selectedId.value === id ? '' : id
}

// 更换已保存记录的附件
function onReplaceFile(record, event) {
  const file = event.target.files?.[0]
  if (file && record) record.document = file.name
}

// 已保存记录的字段随编辑自动保存，无需另点保存按钮。
watch(notices, () => store.persist(snapshot()), { deep: true })
// 覆盖率测算的规则说明与各数值随编辑自动保存。
watch(coverageForm, () => store.persist(snapshot()), { deep: true })
// 预算启动的可编辑额度随编辑自动保存。
watch(controlForm, () => store.persist(snapshot()), { deep: true })

function checkFunds() {
  const mismatch = funds.find((row, index) => Number(row.arrivedInput) !== fiscalAtHalfHour[index].arrived)
  if (mismatch) return `${mismatch.id} 已到账金额与台账不一致`
  if (confirmed.value !== confirmedFundsAtHalfHour) return `已确认到账须为 ${money(confirmedFundsAtHalfHour, 0)} 元`
  if (fundBasis.value !== '仅计已确认到账资金') return '资金计算口径须为仅计已确认到账资金'
  return ''
}

function checkCoverage() {
  if (!flow.isDone('funds')) return '尚未核验财政资金到账，无法测算覆盖率'
  if (!coverageForm.currentFunds.trim() || !coverageForm.budgetDemand.trim()) {
    return '请录入当前已确认可用资金与 B 方案预算需求'
  }
  if (!parseAmount(coverageForm.currentFunds) || !parseAmount(coverageForm.budgetDemand)) {
    return '资金与预算需求须为有效金额'
  }
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
  const percentText = coverageCalc.percent ? coverageCalc.percent.toFixed(2) : ''
  if (!text.includes('B方案') || !percentText || !text.includes(percentText)) {
    return `审批意见须写明 III 级对应 B 方案及 ${percentText}% 覆盖率`
  }
  return ''
}

function checkSync() {
  if (!flow.isDone('approve')) return 'B 方案尚未审批通过，不能同步共享中心'
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  if (submitTimer) {
    clearTimeout(submitTimer)
    submitTimer = null
  }
  if (approveTimer) {
    clearTimeout(approveTimer)
    approveTimer = null
  }
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
  submitLoading.value = false
  approveLoading.value = false
  confirmLoading.value = false
  submitted.value = false
  approved.value = false
  notices.value = []
  Object.assign(noticeDraft, {
    eventName: '',
    level: '',
    source: '',
    effective: '',
    status: '',
    project: '',
    document: '',
  })
  adding.value = false
  selectedId.value = ''
  draftFileKey.value += 1
  funds.forEach((row, index) => {
    const source = fiscalAtHalfHour[index]
    Object.assign(row, {
      ...source,
      arrivedInput: source.status === '已到账' ? String(source.arrived) : '',
    })
  })
  fundBasis.value = ''
  selectedPlan.value = ''
  controlMode.value = ''
  Object.assign(controlForm, {
    total: String(plan.total),
    execution: String(plan.execution),
    reserve: String(plan.reserve),
    cap: String(plan.total),
  })
  opinion.value = ''
  decided.value = ''
  Object.assign(coverageForm, {
    note: '资金覆盖率 = 已确认可用资金 ÷ 预算需求 × 100%。≥100% 绿色，95%—100% 黄色，＜95% 红色。',
    currentFunds: '',
    budgetDemand: '',
  })
  error.value = ''
}

// 组件卸载时清理载入 B 方案与三步审批的定时器，避免切换页面后仍在计时。
onBeforeUnmount(() => {
  if (loadPlanTimer) {
    clearTimeout(loadPlanTimer)
    loadPlanTimer = null
  }
  if (submitTimer) {
    clearTimeout(submitTimer)
    submitTimer = null
  }
  if (approveTimer) {
    clearTimeout(approveTimer)
    approveTimer = null
  }
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
})
</script>

<template>
  <PanelShell title="B方案预算审批" source="应急财务平台">
    <SystemShell
      system="应急财务平台"
      operator="财务主管统筹岗"
      login-hint="登录后从响应管理进入通知登记，再完成资金核验与 B 方案审批。"
      :menu="menu"
      :steps="STEPS"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'register'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="startAdd">新增记录</button>
            <button type="button" class="secondary-button" @click="confirmSelected">确认接收</button>
          </div>
          <p class="form-desc">应急财务平台 → 响应管理 → 响应通知登记。收到御洪星通报后，先登记上级部门 III 级应急响应通知。</p>

          <div v-if="adding" class="notice-form">
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">事件名称</span>
                <input v-model="noticeDraft.eventName" class="form-control" />
              </label>
              <label class="form-item">
                <span class="form-label required">当前响应等级</span>
                <select v-model="noticeDraft.level" class="form-control">
                  <option value="">请选择</option><option>IV级</option><option>III级</option><option>II级</option>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">响应来源</span>
                <select v-model="noticeDraft.source" class="form-control">
                  <option value="">请选择</option><option>上级部门通知</option><option>本级自行研判</option>
                </select>
              </label>
              <label class="form-item">
                <span class="form-label required">生效时间</span>
                <input v-model="noticeDraft.effective" class="form-control" />
              </label>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">通知状态</span>
                <select v-model="noticeDraft.status" class="form-control">
                  <option value="">请选择</option><option>待确认</option><option>已确认</option>
                </select>
              </label>
              <label class="form-item">
                <span class="form-label required">关联项目</span>
                <select v-model="noticeDraft.project" class="form-control">
                  <option value="">请选择</option><option>洪涝应急救援专项</option><option>日常业务项目</option>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">上传附件</span>
                <input
                  :key="draftFileKey"
                  class="form-control"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                  @change="onDraftFile"
                />
              </label>
            </div>
            <p v-if="noticeDraft.document" class="form-desc">已选择附件：{{ noticeDraft.document }}</p>
            <div class="notice-form-actions">
              <button type="button" class="primary-button" @click="saveNotice">保存记录</button>
            </div>
          </div>

          <div v-if="!notices.length && !adding" class="notice-empty">
            暂无登记记录，请点击「新增记录」登记 III 级应急响应通知。
          </div>

          <div v-if="notices.length" class="notice-list">
            <div
              v-for="n in notices"
              :key="n.id"
              class="notice-item"
              :class="{ active: selectedId === n.id }"
              @click="toggle(n.id)"
            >
              <span class="notice-item-title">{{ n.eventName || '未命名记录' }}</span>
              <span class="notice-item-meta">{{ n.level }} · {{ n.source }} · {{ n.status }}</span>
              <span v-if="n.received" class="notice-item-badge">已接收</span>
              <span class="notice-item-caret">{{ selectedId === n.id ? '▾' : '▸' }}</span>
            </div>
          </div>

          <div v-if="selectedRecord" class="notice-detail">
            <p class="form-desc">点击字段可直接修改，修改后自动保存。</p>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">事件名称</span>
                <input v-model="selectedRecord.eventName" class="form-control" />
              </label>
              <label class="form-item">
                <span class="form-label required">当前响应等级</span>
                <select v-model="selectedRecord.level" class="form-control">
                  <option value="">请选择</option><option>IV级</option><option>III级</option><option>II级</option>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">响应来源</span>
                <select v-model="selectedRecord.source" class="form-control">
                  <option value="">请选择</option><option>上级部门通知</option><option>本级自行研判</option>
                </select>
              </label>
              <label class="form-item">
                <span class="form-label required">生效时间</span>
                <input v-model="selectedRecord.effective" class="form-control" />
              </label>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">通知状态</span>
                <select v-model="selectedRecord.status" class="form-control">
                  <option value="">请选择</option><option>待确认</option><option>已确认</option>
                </select>
              </label>
              <label class="form-item">
                <span class="form-label required">关联项目</span>
                <select v-model="selectedRecord.project" class="form-control">
                  <option value="">请选择</option><option>洪涝应急救援专项</option><option>日常业务项目</option>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">上传附件</span>
                <span v-if="selectedRecord.document" class="form-file-name">{{ selectedRecord.document }}</span>
                <input
                  :key="`file-${selectedRecord.id}`"
                  class="form-control"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                  @change="onReplaceFile(selectedRecord, $event)"
                />
              </label>
            </div>
            <template v-if="selectedRecord.received && flow.isDone('register')">
              <p class="sys-toast">III 级应急响应通知已确认接收，并与洪涝应急救援专项项目关联。</p>
            </template>
          </div>
        </template>

        <template v-else-if="leaf === 'load-plan'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': loadingPlan }"
              :disabled="loadingPlan"
              @click="loadPlan"
            >
              <span v-if="loadingPlan" class="spinner" />
              {{ loadingPlan ? '载入中…' : '载入B方案' }}
            </button>
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
                <td v-if="row.status === '已到账'">{{ money(Number(row.arrivedInput) || row.arrived, 0) }}</td>
                <td v-else><input v-model="row.arrivedInput" type="number" min="0" step="10000" /></td>
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
          <input
            v-model="coverageForm.note"
            class="form-desc editable"
            aria-label="覆盖率测算规则说明"
            title="点击可编辑，修改后自动保存"
          />
          <dl class="block-fields">
            <div class="field-row">
              <dt>当前已确认可用资金</dt>
              <dd><input v-model="coverageForm.currentFunds" class="field-input editable" placeholder="请输入" aria-label="当前已确认可用资金" title="点击可编辑，修改后自动保存" /></dd>
            </div>
            <div class="field-row">
              <dt>B方案预算需求</dt>
              <dd><input v-model="coverageForm.budgetDemand" class="field-input editable" placeholder="请输入" aria-label="B方案预算需求" title="点击可编辑，修改后自动保存" /></dd>
            </div>
            <div class="field-row">
              <dt>资金覆盖率</dt>
              <dd>{{ coverageCalc.percent ? coverageCalc.percent.toFixed(2) + '%' : '—' }}</dd>
            </div>
            <div class="field-row">
              <dt>状态</dt>
              <dd>{{ coverageCalc.status.mark ? coverageCalc.status.mark + ' ' + coverageCalc.status.label : '—' }}</dd>
            </div>
            <div class="field-row">
              <dt>当前资金缺口</dt>
              <dd>{{ coverageCalc.status.mark ? money(coverageCalc.gap, 0) + ' 元' : '—' }}</dd>
            </div>
          </dl>
          <template v-if="flow.isDone('coverage')">
            <p class="sys-toast">{{ coverageForm.currentFunds }} ÷ {{ coverageForm.budgetDemand }} × 100% = {{ coverageCalc.percent.toFixed(2) }}%，状态：{{ coverageCalc.status.mark }} {{ coverageCalc.status.label }}。</p>
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
          <template v-if="selectedPlan === 'B'">
            <dl class="block-fields">
              <div class="field-row">
                <dt>预算总额</dt>
                <dd><input v-model="controlForm.total" class="field-input editable" placeholder="请输入" aria-label="预算总额" title="点击可编辑，修改后自动保存" /></dd>
              </div>
              <div class="field-row">
                <dt>基础执行预算</dt>
                <dd><input v-model="controlForm.execution" class="field-input editable" placeholder="请输入" aria-label="基础执行预算" title="点击可编辑，修改后自动保存" /></dd>
              </div>
              <div class="field-row">
                <dt>预备费</dt>
                <dd><input v-model="controlForm.reserve" class="field-input editable" placeholder="请输入" aria-label="预备费" title="点击可编辑，修改后自动保存" /></dd>
              </div>
              <div class="field-row">
                <dt>总预算上限</dt>
                <dd><input v-model="controlForm.cap" class="field-input editable" placeholder="请输入" aria-label="总预算上限" title="点击可编辑，修改后自动保存" /></dd>
              </div>
            </dl>
            <p class="form-desc">系统规则：累计预算占用不得超过 {{ money(Number(controlForm.cap) || plan.total, 0) }} 元。</p>
            <template v-if="flow.isDone('control')">
              <p class="sys-toast">B 方案预算控制额度已建立，总额控制 + 分项控制生效。</p>
            </template>
          </template>
        </template>

        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': submitLoading }"
              :disabled="submitLoading"
              @click="submitApproval"
            >
              <span v-if="submitLoading" class="spinner" />
              {{ submitLoading ? '提交中…' : '提交预算审批' }}
            </button>
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': approveLoading }"
              :disabled="approveLoading || !submitted"
              @click="approvePlan"
            >
              <span v-if="approveLoading" class="spinner" />
              {{ approveLoading ? '审核中…' : '审核通过' }}
            </button>
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': confirmLoading }"
              :disabled="confirmLoading || !approved"
              @click="confirmApproval"
            >
              <span v-if="confirmLoading" class="spinner" />
              {{ confirmLoading ? '确认中…' : '确认审批' }}
            </button>
          </div>
          <p class="form-desc">第六步：提交并审批 B 方案。先提交预算审批，审核通过后填写审批意见，最后确认审批，系统自动生成可下载的审批文件。</p>

          <!-- 提交预算审批后展示审批信息 -->
          <template v-if="submitted">
            <dl class="block-fields">
              <div class="field-row"><dt>响应等级</dt><dd>III级</dd></div>
              <div class="field-row"><dt>对应预算</dt><dd>B方案</dd></div>
              <div class="field-row"><dt>总预算</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
              <div class="field-row"><dt>基础执行预算</dt><dd>{{ money(plan.execution, 1) }} 元</dd></div>
              <div class="field-row"><dt>预备费</dt><dd>{{ money(plan.reserve, 1) }} 元</dd></div>
              <div class="field-row"><dt>已确认可用资金</dt><dd>{{ money(coverageCalc.available, 0) }} 元</dd></div>
              <div class="field-row"><dt>资金覆盖率</dt><dd>{{ coverageCalc.percent ? coverageCalc.percent.toFixed(2) + '%' : '—' }}</dd></div>
              <div class="field-row"><dt>资金缺口</dt><dd>{{ money(coverageCalc.gap, 0) }} 元</dd></div>
              <div class="field-row"><dt>风险状态</dt><dd>{{ coverageCalc.status.mark ? coverageCalc.status.mark + ' ' + coverageCalc.status.label : '—' }}</dd></div>
            </dl>
          </template>

          <!-- 审核通过后出现审批意见填写框 -->
          <template v-if="approved">
            <label class="form-item">
              <span class="form-label required">审批意见</span>
              <textarea
                v-model="opinion"
                class="form-control"
                rows="4"
                placeholder="请按审批页面展示的 B 方案信息填写审批意见"
              />
            </label>
          </template>

          <!-- 确认审批后系统自动执行：B方案状态 + 生成可下载文件 -->
          <template v-if="flow.isDone('approve')">
            <dl class="block-fields">
              <div class="field-row"><dt>B方案状态</dt><dd>已批准</dd></div>
              <div class="field-row"><dt>预算额度</dt><dd>已生效</dd></div>
              <div class="field-row"><dt>总预算上限</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
              <div class="field-row"><dt>当前预算占用</dt><dd>0 元</dd></div>
              <div class="field-row"><dt>当前预算余额</dt><dd>{{ money(plan.total, 0) }} 元</dd></div>
              <div class="field-row"><dt>预备费余额</dt><dd>{{ money(plan.reserve, 2) }} 元</dd></div>
              <div class="field-row"><dt>审批人</dt><dd>财务主管统筹岗</dd></div>
              <div class="field-row"><dt>审批状态</dt><dd>通过</dd></div>
            </dl>
            <p class="form-desc">已自动生成以下文件，点击文件名即可下载：</p>
            <ul class="sys-lines">
              <li v-for="file in APPROVAL_FILES" :key="file.file">
                <a class="file-link" :href="downloadUrl(file.file)" :download="file.file" :title="`下载${file.name}`">{{ file.name }}</a>
              </li>
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

<style scoped>
/* 可编辑规则说明：保留说明文字外观，浅蓝底提示可编辑，聚焦时高亮 */
input.form-desc.editable {
  box-sizing: border-box;
  width: 100%;
  background: #eef5fd;
  border: 1px solid #a9c8ec;
  border-radius: 8px;
  color: var(--muted);
  font-size: 13px;
  font-family: inherit;
  padding: 4px 8px;
  transition: border-color 0.15s, background 0.15s;
}

input.form-desc.editable:focus {
  outline: 2px solid rgba(91, 155, 213, 0.35);
  border-color: #5b9bd5;
  background: #ffffff;
}

/* 可编辑字段值：填满 dd 单元格，浅蓝底提示可编辑，聚焦时高亮 */
input.field-input.editable {
  box-sizing: border-box;
  width: 100%;
  background: #eef5fd;
  border: 1px solid #a9c8ec;
  border-radius: 6px;
  color: var(--text);
  font-size: 13.5px;
  font-family: inherit;
  padding: 4px 8px;
  transition: border-color 0.15s, background 0.15s;
}

input.field-input.editable:focus {
  outline: 2px solid rgba(91, 155, 213, 0.35);
  border-color: #5b9bd5;
  background: #ffffff;
}
</style>
