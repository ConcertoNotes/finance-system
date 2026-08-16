<script setup>
// 数据质量与合规检测中心 · 灾情数据质量与合规检测。
// 菜单路径与工作簿一致，学生需逐级点开菜单进入对应功能页办理业务。
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { percent } from '../../domain/format.js'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'

const PAGES = ['load-data', 'quality-rule', 'disposal-rule', 'veto-rule', 'evidence-rule', 'detect-run', 'report-manage', 'share-publish']
const STEPS = [
  { id: 'load-data', label: '载入数据' },
  { id: 'quality-rule', label: '准入规则' },
  { id: 'disposal-rule', label: '异常处置' },
  { id: 'veto-rule', label: '否决规则' },
  { id: 'evidence-rule', label: '规则依据' },
  { id: 'detect-run', label: '执行判定' },
  { id: 'report-manage', label: '校验单' },
  { id: 'share-publish', label: '共享发布' },
]
const flow = useTaskFlow('s1-t3', PAGES)
const store = useFormPersist('s1-t3')

const menu = [
  {
    id: 'm-hub',
    label: '数据共享中心',
    children: [
      {
        id: 'm-hub-flood',
        label: '洪涝应急救援项目',
        children: [
          { id: 'load-data', label: '数据质量与合规检测' },
          { id: 'detect-run', label: '检测执行与判定' },
          { id: 'report-manage', label: '校验单管理' },
          { id: 'share-publish', label: '共享发布' },
        ],
      },
    ],
  },
  {
    id: 'm-rule',
    label: '检测规则',
    children: [
      { id: 'm-rule-quality', label: '数据质量规则', children: [{ id: 'quality-rule', label: '新建准入规则' }] },
      { id: 'm-rule-compliance', label: '合规检测', children: [{ id: 'veto-rule', label: '新建否决规则' }] },
    ],
  },
  { id: 'm-config', label: '规则配置', children: [{ id: 'disposal-rule', label: '质量异常处置' }] },
  { id: 'm-kb', label: '合规知识库', children: [{ id: 'evidence-rule', label: '规则依据管理' }] },
]

const leafLabels = {}
function collectLeaves(nodes) {
  nodes.forEach((node) => (node.children ? collectLeaves(node.children) : (leafLabels[node.id] = node.label)))
}
collectLeaves(menu)

// 两层检测规则必须先配置齐全，检测执行与判定页才允许开始检测。
const RULE_PAGES = ['load-data', 'quality-rule', 'disposal-rule', 'veto-rule', 'evidence-rule']

const activeId = ref('')
const error = ref('')

const gridNames = '123456789'.split('').map((n) => `甲${n}`)

const intake = reactive({
  dataset: '',
  scene: '',
})

const autoRead = [
  { label: '数据采集来源', value: '应急管理部门报送、气象监测、无人机巡航' },
  { label: '数据采集时间', value: '灾后 0 小时初始数据' },
  { label: '清洗记录', value: '字段标准化、重复数据处理、缺失值检查已完成' },
  { label: '异常值复核记录', value: '甲3 156mm、甲6 148mm 多源验证通过' },
  { label: '基础信息匹配结果', value: '9 / 9 网格基础信息匹配一致' },
]

const RULE_NAME_OPTIONS = ['灾情数据预算模型准入规则', '支付合规准入规则']
const THRESHOLD_OPTIONS = [90, 95, 100]
const NOTE_OPTIONS = ['项目内部数据可用性门槛，不作为法律合规标准。', '作为法律合规强制标准。']
const COLLECT_TIME_OPTIONS = ['灾后 0 小时初始数据', '灾后 24 小时复核数据', '灾后 72 小时汇总数据']

const rule = reactive({ name: '', threshold: '', method: '', note: '', collectTime: '' })

// 质量准入计算公式，可直接编辑，修改后随输入自动保存。
const formulas = reactive({
  completeness: '完整率 = 已完整记录数 ÷ 应采集记录数 × 100%',
  timeliness: '及时率 = 规定时间内完成采集记录数 ÷ 应采集记录数 × 100%',
})

const fieldNames = ['网格编号', '受灾人数', '被困人数', '转移安置人数', '特殊人群数', '道路情况', '降雨量', '水位', '距仓库距离']
const sourceNames = ['应急管理部门报送数据', '气象监测数据', '无人机巡航数据']
const fields = reactive(Object.fromEntries(fieldNames.map((n) => [n, false])))
const crossSources = reactive(Object.fromEntries(sourceNames.map((n) => [n, false])))

const anomalies = [
  { grid: '甲3', metric: '累计降雨量 156mm', review: '多源验证通过', state: '保留，重点关注' },
  { grid: '甲6', metric: '累计降雨量 148mm', review: '多源验证通过', state: '保留，重点关注' },
]

// 异常数据处理方式：异常值保留 → 多源业务复核 → 确认真实后进入模型，学生按流程选择所处环节。
const anomalyFlowSteps = ['异常值保留', '多源业务复核', '确认真实后进入模型']
const anomalyFlow = ref('异常值保留')

// 质量异常处置规则由学生在本页内自行新建，初次进入不预置任何规则。
// 底部「标准答案」区固定展示 Q01—Q04 四组预期处置逻辑，与实际新建的内容无关。
const disposalRules = reactive([])
const DISPOSAL_ANSWER = [
  { id: 'Q01', when: '完整率 ＜ 95%', state: '不准入', action: '自动退回采购成本保障岗补采' },
  { id: 'Q02', when: '及时率 ＜ 95%', state: '不准入', action: '退回核验采集时间' },
  { id: 'Q03', when: '存在未完成业务复核的统计异常', state: '暂缓准入', action: '进入人工复核' },
  { id: 'Q04', when: '质量指标达到内部门槛', state: '准予继续', action: '进入第二层合规检测' },
]
const disposalRuleDraft = reactive({ condition: '', state: '', action: '' })
const showRuleForm = ref(false)

function nextDisposalId() {
  const used = new Set(disposalRules.map((row) => row.id))
  let n = 1
  while (used.has(`Q${String(n).padStart(2, '0')}`)) n += 1
  return `Q${String(n).padStart(2, '0')}`
}

function addDisposalRule() {
  if (!disposalRuleDraft.condition.trim() || !disposalRuleDraft.state.trim() || !disposalRuleDraft.action.trim()) {
    error.value = '条件、状态、动作均为必填项'
    return
  }
  error.value = ''
  disposalRules.push({
    id: nextDisposalId(),
    condition: disposalRuleDraft.condition.trim(),
    state: disposalRuleDraft.state.trim(),
    action: disposalRuleDraft.action.trim(),
    enabled: true,
  })
  disposalRuleDraft.condition = ''
  disposalRuleDraft.state = ''
  disposalRuleDraft.action = ''
  showRuleForm.value = false
}

function removeDisposalRule(index) {
  disposalRules.splice(index, 1)
}

// 判定模式：源表既定为一票否决，可下拉切换综合评分；选一票否决时下方提示拦截口径。
const judgeMode = ref('一票否决')

// 强制性合规否决项：预置 C01—C06 六项，学生可自建新规则；自建项带 custom 标记，便于单独提供删除。
const BASE_VETO_ITEMS = [
  { code: 'C01', name: '数据采集授权', detail: '数据来源是否经过授权：应急管理数据访问授权、气象数据访问授权、无人机数据使用权限。全部通过 = PASS，任一未授权 = VETO', pass: true },
  { code: 'C02', name: '字段完整与清洗规范', detail: '系统自动读取字段标准化结果、重复数据处理结果、缺失值检查结果、异常值复核结果。存在未经处理的数据质量问题即禁止进入预算模型', pass: true },
  { code: 'C03', name: '模型逻辑', detail: '模型输入字段是否来自已清洗数据、计算字段是否与数据维度一致、是否存在未经授权人工修改数据、模型参数是否可追溯。模型逻辑可追溯 → 通过', pass: true },
  { code: 'C04', name: '资金用途限制', detail: '政府财政拨款保障资金、限定性社会捐赠、非限定性社会捐赠、保险赔款、其他合规项目资金是否均已建立用途标签；限定性资金必须匹配限定用途，用途不匹配 → 一票否决', pass: true },
  { code: 'C05', name: '预算审批权限', detail: '预算编制、调整、审批角色是否符合内部授权：应急预算绩效岗预算测算、财务主管统筹岗审核确认。未经授权审批 → 不得进入正式预算执行', pass: true },
  { code: 'C06', name: '付款审批权限', detail: '付款申请、付款核验和最终审批权限是否分离。申请人与最终审批人权限冲突 → 一票否决', pass: true },
]
const vetoItems = reactive(BASE_VETO_ITEMS.map((item) => ({ ...item })))

// 新建否决规则：规则名称与检测内容为必填项，规则编号自动续接 C01—C06。
const vetoRuleDraft = reactive({ name: '', detail: '' })
const showVetoForm = ref(false)

function nextVetoCode() {
  const used = new Set(vetoItems.map((item) => item.code))
  let n = 1
  while (used.has(`C${String(n).padStart(2, '0')}`)) n += 1
  return `C${String(n).padStart(2, '0')}`
}

function addVetoRule() {
  if (!vetoRuleDraft.name.trim() || !vetoRuleDraft.detail.trim()) {
    error.value = '规则名称与检测内容均为必填项'
    return
  }
  error.value = ''
  vetoItems.push({
    code: nextVetoCode(),
    name: vetoRuleDraft.name.trim(),
    detail: vetoRuleDraft.detail.trim(),
    pass: false,
    custom: true,
  })
  vetoRuleDraft.name = ''
  vetoRuleDraft.detail = ''
  showVetoForm.value = false
}

function removeVetoRule(index) {
  vetoItems.splice(index, 1)
}

const evidenceLevels = [
  { level: '一级', name: '法律法规', docs: ['《中华人民共和国突发事件应对法》等本项目已明确适用的相关规定'] },
  { level: '二级', name: '当地管理要求', docs: ['当地洪涝灾害应急预案', '当地救灾资金管理要求'] },
  { level: '三级', name: '内部控制制度', docs: ['单位内部授权审批制度', '项目预算审批权限', '付款审批权限'] },
]
const docNames = evidenceLevels.flatMap((item) => item.docs)
const docs = reactive(Object.fromEntries(docNames.map((n) => [n, false])))
const referenceMode = ref('')
// 规则依据：初次进入不展开挂接内容，点击「新建规则」后才显示；展开状态随内容一起持久化。
const evidenceStarted = ref(false)

// 实测指标默认取自源表口径：完整率 100%、及时率 100%、未完成业务复核 0 项。
const quality = reactive({ completeness: 1, timeliness: 1, pendingReview: 0 })

const reviewer = ref('')
const reportGenerated = ref(false)
// 生成检测报告：点击后按钮转圈 3 秒，模拟系统生成，随后弹出"生成完成，请审核确认"提示。
const generatingReport = ref(false)
let reportTimer = null

const shareTargetNames = ['应急预算绩效岗', '采购成本保障岗', '资金核算风控岗', '数字人御洪星']
const shareContentNames = ['《9网格清洗数据》', '《灾情数据质量与合规校验单》', '模型准入状态']
const shareTargets = reactive(Object.fromEntries(shareTargetNames.map((n) => [n, false])))
const shareContents = reactive(Object.fromEntries(shareContentNames.map((n) => [n, false])))

// 共享发布：先点击「同步共享中心」完成共享中心接入，才能选择下方共享对象与共享内容。
// 接入与发布均为模拟系统处理：按钮转圈 3 秒后吐出结果。
const hubSynced = ref(false)
const syncingHub = ref(false)
let hubTimer = null

function syncHub() {
  if (syncingHub.value) return
  const message = flow.isDone('report-manage') ? '' : '请先在「校验单管理」功能页完成《灾情数据质量与合规校验单》审核确认'
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  syncingHub.value = true
  hubTimer = setTimeout(() => {
    syncingHub.value = false
    hubTimer = null
    hubSynced.value = true
    store.persist(snapshot())
  }, 3000)
}

const publishing = ref(false)
let publishTimer = null

function confirmPublish() {
  if (publishing.value) return
  const message = (() => {
    if (!flow.isDone('report-manage')) return '请先在「校验单管理」功能页完成《灾情数据质量与合规校验单》审核确认'
    if (!hubSynced.value) return '请先点击「同步共享中心」完成共享中心接入'
    return ''
  })()
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  publishing.value = true
  publishTimer = setTimeout(() => {
    publishing.value = false
    publishTimer = null
    store.persist(snapshot())
    flow.complete('share-publish')
  }, 3000)
}

const thresholdRate = computed(() => rule.threshold / 100)
const completenessPass = computed(() => quality.completeness >= thresholdRate.value)
const timelinessPass = computed(() => quality.timeliness >= thresholdRate.value)
const anomalyPass = computed(() => quality.pendingReview === 0)
const qualityPass = computed(() => completenessPass.value && timelinessPass.value && anomalyPass.value)

const vetoFailed = computed(() => vetoItems.filter((item) => !item.pass))
const vetoCount = computed(() => vetoFailed.value.length)
const compliancePassRate = computed(() => (vetoItems.length - vetoCount.value) / vetoItems.length)
const admitted = computed(() => qualityPass.value && vetoCount.value === 0)

const admissionState = computed(() => {
  if (admitted.value) return '通过'
  if (!completenessPass.value || !timelinessPass.value || vetoCount.value > 0) return '不准入'
  return '暂缓准入'
})

const verdictText = computed(() => {
  if (admitted.value) return '【准予进入预算模型】绿色——准入'
  if (admissionState.value === '暂缓准入') return '【暂缓进入预算模型】暂缓准入'
  return '【禁止进入预算模型】不准入'
})

// 准入判定按「系统判定 + 状态」两行展示，与源表第七步口径一致。
const admissionVerdict = computed(() => {
  if (admitted.value) return '【准予进入预算模型】'
  if (admissionState.value === '暂缓准入') return '【暂缓进入预算模型】'
  return '【禁止进入预算模型】'
})
const admissionStatus = computed(() => {
  if (admitted.value) return '绿色——准入'
  if (admissionState.value === '暂缓准入') return '暂缓准入'
  return '红色——不准入'
})

const anomalyText = computed(() => {
  const base = '2项（甲3：通过；甲6：通过）'
  return anomalyPass.value ? base : `${base}，另有 ${quality.pendingReview} 项未完成业务复核`
})

const qualityChecks = computed(() => [
  { name: '数据完整率', value: percent(quality.completeness, 0), ok: completenessPass.value, action: '退回补采' },
  { name: '数据及时率', value: percent(quality.timeliness, 0), ok: timelinessPass.value, action: '退回复核' },
  { name: '统计异常复核', value: anomalyText.value, ok: anomalyPass.value, action: '暂缓准入' },
  { name: '数据维度一致性', value: '通过', ok: true, action: '' },
])

const admissionStats = computed(() => [
  { label: '数据完整率', value: percent(quality.completeness, 0), warn: !completenessPass.value },
  { label: '数据及时率', value: percent(quality.timeliness, 0), warn: !timelinessPass.value },
  { label: '合规否决项通过率', value: percent(compliancePassRate.value, 0), warn: vetoCount.value > 0 },
  { label: '未处理异常', value: `${quality.pendingReview}`, warn: !anomalyPass.value },
  { label: '数据网格', value: '9 / 9', warn: false },
  { label: '数据来源', value: '已验证', warn: false },
  { label: '模型准入状态', value: admissionState.value, warn: !admitted.value },
])

const reportRows = computed(() => [
  { label: '数据集名称', value: intake.dataset },
  { label: '检测时间', value: '本次检测批次 · 灾后 0 小时初始数据' },
  { label: '数据完整率', value: `${percent(quality.completeness, 0)}（${completenessPass.value ? '通过' : '退回补采'}）` },
  { label: '数据及时率', value: `${percent(quality.timeliness, 0)}（${timelinessPass.value ? '通过' : '退回复核'}）` },
  { label: '异常复核情况', value: `甲3 156mm、甲6 148mm 多源验证通过，保留并重点关注；未完成复核 ${quality.pendingReview} 项` },
  { label: '数据来源', value: sourceNames.join('、') },
  { label: '授权状态', value: vetoItems[0].pass ? '应急管理、气象、无人机数据访问授权齐备' : '存在未授权数据来源' },
  { label: '合规检测项目', value: `${vetoItems.map((i) => i.code).join('、')}，共 ${vetoItems.length} 项强制性合规检测` },
  { label: '合规依据', value: '一级法律法规、二级当地管理要求、三级内部控制制度' },
  { label: '否决项结果', value: `否决项 ${vetoCount.value} 项，合规通过率 ${percent(compliancePassRate.value, 0)}` },
  { label: '模型准入结果', value: verdictText.value },
  { label: '审核人员', value: reviewer.value },
])

const chosenFields = computed(() => fieldNames.filter((n) => fields[n]))
const chosenSources = computed(() => sourceNames.filter((n) => crossSources[n]))
const chosenTargets = computed(() => shareTargetNames.filter((n) => shareTargets[n]))
const pendingRulePages = computed(() => RULE_PAGES.filter((id) => !flow.isDone(id)).map((id) => leafLabels[id]))

function snapshot() {
  return {
    intake,
    rule,
    formulas,
    fields,
    crossSources,
    disposalRules,
    judgeMode,
    vetoItems,
    docs,
    referenceMode,
    evidenceStarted,
    quality,
    reviewer,
    reportGenerated,
    shareTargets,
    shareContents,
    hubSynced,
  }
}

store.restore(snapshot())
// 历史记录里可能存过空的质量指标（早期版本为必填输入），回填源表默认值，避免「开始检测」被必填校验卡死。
if (!filled(quality.completeness)) quality.completeness = 1
if (!filled(quality.timeliness)) quality.timeliness = 1
if (!filled(quality.pendingReview)) quality.pendingReview = 0
// 公式文本、规则依据挂接与引用方式随编辑自动保存，无需另点保存按钮。
watch([formulas, docs, referenceMode, evidenceStarted], () => store.persist(snapshot()), { deep: true })

function filled(value) {
  return value !== '' && value != null && !(typeof value === 'number' && Number.isNaN(value))
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

// 载入检测数据：模拟系统读取 9 网格数据，转圈 3 秒后再展示结果。
const loadingData = ref(false)
let loadTimer = null

function loadData() {
  if (loadingData.value) return
  const message = intake.dataset && intake.scene ? '' : '数据集与检测场景为必填项'
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  loadingData.value = true
  loadTimer = setTimeout(() => {
    loadingData.value = false
    loadTimer = null
    store.persist(snapshot())
    flow.complete('load-data')
  }, 3000)
}

// 检测执行与判定：点击「开始检测」后按层依次"吐出"检测结果，模拟智能体逐步输出的节奏。
const runningDetect = ref(false)
const revealStage = reactive({ quality: false, veto: false, verdict: false })
// 第二层显示完毕后进入准入判定阶段：转圈 3 秒后再吐出判定结果。
const judging = ref(false)
let detectTimers = []

// 检测完成（已持久化）后全部展示；执行过程中按进度逐层展示。
function stageVisible(stage) {
  return runningDetect.value ? revealStage[stage] : flow.isDone('detect-run')
}

function runDetect() {
  if (runningDetect.value) return
  const check = () => {
    if (pendingRulePages.value.length) return `还有 ${pendingRulePages.value.length} 个功能页未办理：${pendingRulePages.value.join('、')}`
    if (!filled(quality.completeness)) return '数据完整率为必填项'
    if (!filled(quality.timeliness)) return '数据及时率为必填项'
    if (!filled(quality.pendingReview)) return '未完成业务复核的统计异常为必填项'
    return ''
  }
  const message = check()
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  runningDetect.value = true
  revealStage.quality = false
  revealStage.veto = false
  revealStage.verdict = false
  judging.value = false
  // 依次展示：数据质量检测 → 合规否决项检测 →（转圈判定 3 秒）→ 准入判定结果。
  detectTimers = [
    setTimeout(() => { revealStage.quality = true }, 800),
    setTimeout(() => {
      revealStage.veto = true
      // 第二层显示完毕，进入准入判定阶段，转圈 3 秒后吐出判定结果。
      judging.value = true
    }, 2400),
    setTimeout(() => {
      judging.value = false
      revealStage.verdict = true
      runningDetect.value = false
      detectTimers = []
      store.persist(snapshot())
      flow.complete('detect-run')
    }, 5400),
  ]
}

// 组件卸载时清理未完成的检测动画与报告生成定时器。
onUnmounted(() => {
  if (reportTimer) {
    clearTimeout(reportTimer)
    reportTimer = null
  }
  if (hubTimer) {
    clearTimeout(hubTimer)
    hubTimer = null
  }
  if (publishTimer) {
    clearTimeout(publishTimer)
    publishTimer = null
  }
  detectTimers.forEach((t) => clearTimeout(t))
})

function generateReport() {
  if (generatingReport.value) return
  if (!flow.isDone('detect-run')) {
    error.value = '请先在「检测执行与判定」功能页执行自动检测并生成准入判定结果'
    return
  }
  error.value = ''
  // 模拟系统生成报告：按钮转圈 3 秒后弹出"生成完成，请审核确认"。
  generatingReport.value = true
  reportTimer = setTimeout(() => {
    generatingReport.value = false
    reportTimer = null
    reportGenerated.value = true
  }, 3000)
}

function resetAll() {
  if (loadTimer) {
    clearTimeout(loadTimer)
    loadTimer = null
  }
  loadingData.value = false
  detectTimers.forEach((t) => clearTimeout(t))
  detectTimers = []
  runningDetect.value = false
  revealStage.quality = false
  revealStage.veto = false
  revealStage.verdict = false
  judging.value = false
  flow.reset()
  store.clear()
  Object.assign(intake, { dataset: '', scene: '' })
  Object.assign(rule, { name: '', threshold: '', method: '', note: '', collectTime: '' })
  fieldNames.forEach((n) => { fields[n] = false })
  sourceNames.forEach((n) => { crossSources[n] = false })
  disposalRules.splice(0, disposalRules.length)
  disposalRuleDraft.condition = ''
  disposalRuleDraft.state = ''
  disposalRuleDraft.action = ''
  showRuleForm.value = false
  vetoItems.splice(0, vetoItems.length, ...BASE_VETO_ITEMS.map((item) => ({ ...item })))
  vetoRuleDraft.name = ''
  vetoRuleDraft.detail = ''
  showVetoForm.value = false
  docNames.forEach((n) => { docs[n] = false })
  shareTargetNames.forEach((n) => { shareTargets[n] = false })
  shareContentNames.forEach((n) => { shareContents[n] = false })
  if (hubTimer) {
    clearTimeout(hubTimer)
    hubTimer = null
  }
  syncingHub.value = false
  hubSynced.value = false
  if (publishTimer) {
    clearTimeout(publishTimer)
    publishTimer = null
  }
  publishing.value = false
  Object.assign(quality, { completeness: 1, timeliness: 1, pendingReview: 0 })
  Object.assign(formulas, {
    completeness: '完整率 = 已完整记录数 ÷ 应采集记录数 × 100%',
    timeliness: '及时率 = 规定时间内完成采集记录数 ÷ 应采集记录数 × 100%',
  })
  judgeMode.value = '一票否决'
  anomalyFlow.value = '异常值保留'
  referenceMode.value = ''
  evidenceStarted.value = false
  reviewer.value = ''
  if (reportTimer) {
    clearTimeout(reportTimer)
    reportTimer = null
  }
  generatingReport.value = false
  reportGenerated.value = false
  error.value = ''
}
</script>

<template>
  <PanelShell title="灾情数据质量与合规检测" source="数据质量与合规检测中心">
    <SystemShell
      system="数据质量与合规检测中心"
      operator="财务主管统筹岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :steps="STEPS"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 数据共享中心 → 洪涝应急救援项目 → 数据质量与合规检测 -->
        <template v-if="leaf === 'load-data'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': loadingData }"
              :disabled="loadingData"
              @click="loadData"
            >
              <span v-if="loadingData" class="spinner" />
              {{ loadingData ? '载入中…' : '载入检测数据' }}
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">选择数据集</span>
              <select v-model="intake.dataset" class="form-control">
                <option value="">请选择</option>
                <option>《9网格灾情清洗数据表》</option>
                <option>《9网格灾情原始采集表》</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">选择检测场景</span>
              <select v-model="intake.scene" class="form-control">
                <option value="">请选择</option>
                <option>预算模型准入检测</option>
                <option>支付合规检测</option>
              </select>
            </label>
          </div>
          <p class="form-desc">系统自动读取：甲1—甲9 网格数据、数据采集来源、数据采集时间、清洗记录、异常值复核记录、基础信息匹配结果。</p>

          <template v-if="flow.isDone('load-data')">
            <p class="sys-toast">数据载入完成：9 / 9 网格。</p>
            <div class="grid-chips">
              <span v-for="n in gridNames" :key="n" class="grid-chip done">{{ n }}</span>
            </div>
            <dl class="block-fields">
              <div v-for="item in autoRead" :key="item.label" class="field-row">
                <dt>{{ item.label }}</dt><dd>{{ item.value }}</dd>
              </div>
            </dl>
          </template>
        </template>

        <!-- 检测规则 → 数据质量规则 → 新建准入规则 -->
        <template v-else-if="leaf === 'quality-rule'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="primary-button"
              @click="save('quality-rule', () => {
                if (!rule.name.trim()) return '请选择规则名称'
                if (!filled(rule.threshold)) return '请选择数据质量准入值'
                if (!rule.note) return '请选择门槛说明'
                if (!rule.collectTime) return '请设置采集时间要求'
                return ''
              })"
            >
              保存质量规则
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">规则名称</span>
              <select v-model="rule.name" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in RULE_NAME_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">数据质量准入值（%）</span>
              <select v-model.number="rule.threshold" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in THRESHOLD_OPTIONS" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">选项设置</span>
              <select v-model="rule.note" class="form-control">
                <option value="">请选择门槛说明</option>
                <option v-for="n in NOTE_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p v-if="rule.note" class="calc-note">{{ rule.note }}</p>

          <div class="calc-subhead"><h3>指标一 · 数据完整率</h3></div>
          <input
            v-model="formulas.completeness"
            class="block-formula editable"
            aria-label="数据完整率计算公式"
            title="点击可编辑，修改后自动保存"
          />
          <p class="form-desc">检测内容</p>
          <div class="checkbox-group tight">
            <label v-for="n in fieldNames" :key="n" class="checkbox-item">
              <input v-model="fields[n]" type="checkbox" />{{ n }}
            </label>
          </div>
          <p class="calc-caption">完整率 ≥ {{ rule.threshold }}% → 通过；完整率 ＜ {{ rule.threshold }}% → 退回补采。</p>

          <div class="calc-subhead"><h3>指标二 · 数据及时率</h3></div>
          <input
            v-model="formulas.timeliness"
            class="block-formula editable"
            aria-label="数据及时率计算公式"
            title="点击可编辑，修改后自动保存"
          />
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">采集时间要求</span>
              <select v-model="rule.collectTime" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in COLLECT_TIME_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p class="calc-caption">采集时间要求：{{ rule.collectTime || '请先设置' }}。及时率 ≥ {{ rule.threshold || '—' }}% → 通过；＜ {{ rule.threshold || '—' }}% → 退回复核。</p>

          <div class="calc-subhead"><h3>指标三 · 数据准确性校验</h3></div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">检测方式</span>
              <select v-model="rule.method" class="form-control">
                <option value="">请选择</option>
                <option>多源交叉验证</option>
                <option>单源比对</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p class="form-desc">核验来源</p>
          <div class="checkbox-group">
            <label v-for="n in sourceNames" :key="n" class="checkbox-item">
              <input v-model="crossSources[n]" type="checkbox" />{{ n }}
            </label>
          </div>
          <div class="calc-subhead"><h3>异常数据处理</h3></div>
          <p class="calc-note">统计异常 ≠ 错误数据</p>
          <p class="form-desc">异常处理方式</p>
          <div class="pill-group flow">
            <template v-for="(step, i) in anomalyFlowSteps" :key="step">
              <span v-if="i" class="flow-sep">→</span>
              <button
                type="button"
                :class="{ active: anomalyFlow === step }"
                @click="anomalyFlow = step"
              >
                {{ step }}
              </button>
            </template>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th>网格</th><th>统计高值</th><th>前序复核结果</th><th>处理状态</th></tr></thead>
              <tbody>
                <tr v-for="row in anomalies" :key="row.grid">
                  <th scope="row">{{ row.grid }}</th><td>{{ row.metric }}</td><td>{{ row.review }}</td><td>{{ row.state }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="flow.isDone('quality-rule')">
            <p class="sys-toast">「{{ rule.name }}」已保存，内部数据可用性门槛 {{ rule.threshold }}%。</p>
            <ul class="sys-lines">
              <li>数据完整率 · 覆盖 {{ chosenFields.length }} 个检测字段 · ≥ {{ rule.threshold }}% 通过，＜ {{ rule.threshold }}% 退回补采</li>
              <li>数据及时率 · 灾后 0 小时初始数据 · ≥ {{ rule.threshold }}% 通过，＜ {{ rule.threshold }}% 退回复核</li>
              <li>数据准确性 · {{ rule.method }} · 核验来源：{{ chosenSources.join('、') }}</li>
              <li class="info">甲3 156mm、甲6 148mm 多源验证通过，处理状态：保留，重点关注</li>
            </ul>
          </template>
        </template>

        <!-- 规则配置 → 质量异常处置 -->
        <template v-else-if="leaf === 'disposal-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="showRuleForm = !showRuleForm">
              {{ showRuleForm ? '收起表单' : '新建规则' }}
            </button>
            <button type="button" class="secondary-button"
              @click="disposalRules.forEach((row) => (row.enabled = true))">全部启用</button>
            <button
              type="button"
              class="primary-button"
              @click="save('disposal-rule', () => {
                if (!disposalRules.length) return '请先点击「新建规则」建立处置规则'
                if (!disposalRules.some((row) => row.enabled)) return '请至少启用一条处置规则'
                return ''
              })"
            >
              启用规则
            </button>
          </div>
          <p class="form-desc">质量检测结果的处置逻辑，由学生在此新建并启用，随第一层数据质量检测同步生效。</p>

          <div v-if="showRuleForm" class="rule-form">
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">规则条件</span>
                <input v-model="disposalRuleDraft.condition" class="form-control" placeholder="例如：完整率 ＜ 95%" />
              </label>
              <label class="form-item">
                <span class="form-label required">处置状态</span>
                <input v-model="disposalRuleDraft.state" class="form-control" placeholder="例如：不准入" />
              </label>
              <label class="form-item">
                <span class="form-label required">处置动作</span>
                <input v-model="disposalRuleDraft.action" class="form-control" placeholder="例如：自动退回采购成本保障岗补采" />
              </label>
            </div>
            <div class="rule-form-actions">
              <button type="button" class="primary-button" @click="addDisposalRule">添加规则</button>
              <button type="button" class="ghost-button" @click="showRuleForm = false">取消</button>
            </div>
          </div>

          <div v-if="disposalRules.length" class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>条件</th><th>状态</th><th>动作</th><th style="width: 56px">操作</th></tr></thead>
              <tbody>
                <tr v-for="(row, index) in disposalRules" :key="row.id">
                  <td><input v-model="row.enabled" type="checkbox" /></td>
                  <th scope="row">{{ row.id }}</th>
                  <td>{{ row.condition }}</td>
                  <td>{{ row.state }}</td>
                  <td>{{ row.action }}</td>
                  <td><button type="button" class="text-button" @click="removeDisposalRule(index)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-hint">暂无处置规则，请点击「新建规则」建立第一条处置规则。</div>

          <template v-if="flow.isDone('disposal-rule')">
            <p class="sys-toast">4 项质量异常处置规则已启用并进入运行状态。</p>
            <ul class="sys-lines">
              <li v-for="row in DISPOSAL_ANSWER" :key="row.id" :class="{ warn: row.state !== '准予继续' }">
                {{ row.id }}：{{ row.when }} → {{ row.state }}，{{ row.action }}
              </li>
            </ul>
          </template>
        </template>

        <!-- 检测规则 → 合规检测 → 新建否决规则 -->
        <template v-else-if="leaf === 'veto-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="showVetoForm = !showVetoForm">
              {{ showVetoForm ? '收起表单' : '新建否决规则' }}
            </button>
            <button
              type="button"
              class="primary-button"
              @click="save('veto-rule', () => (judgeMode ? '' : '判定模式为必填项'))"
            >
              保存否决规则
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">判定模式</span>
              <select v-model="judgeMode" class="form-control">
                <option value="">请选择</option>
                <option>一票否决</option>
                <option>综合评分</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p v-if="judgeMode === '一票否决'" class="calc-note">任一强制性合规项目不通过，则禁止进入预算模型或后续支付流程。</p>

          <div v-if="showVetoForm" class="rule-form">
            <div class="form-row">
              <label class="form-item">
                <span class="form-label required">规则名称</span>
                <input v-model="vetoRuleDraft.name" class="form-control" placeholder="请输入规则名称" />
              </label>
              <label class="form-item">
                <span class="form-label required">检测内容</span>
                <input v-model="vetoRuleDraft.detail" class="form-control" placeholder="请输入检测逻辑说明" />
              </label>
            </div>
            <div class="rule-form-actions">
              <button type="button" class="primary-button" @click="addVetoRule">添加规则</button>
              <button type="button" class="ghost-button" @click="showVetoForm = false">取消</button>
            </div>
          </div>

          <ul class="veto-list">
            <li v-for="(item, index) in vetoItems" :key="item.code" :class="{ failed: !item.pass }">
              <div class="veto-row">
                <label class="veto-head">
                  <input v-model="item.pass" type="checkbox" />
                  <span class="veto-code">{{ item.code }}</span>
                  <strong>{{ item.name }}</strong>
                  <span class="verdict" :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? 'PASS' : 'VETO' }}</span>
                </label>
                <button v-if="item.custom" type="button" class="text-button" @click="removeVetoRule(index)">删除</button>
              </div>
              <p class="veto-detail">{{ item.detail }}</p>
            </li>
          </ul>
          <p class="calc-caption">任一项切换为 VETO，检测执行与判定页的结果即时重算。</p>

          <template v-if="flow.isDone('veto-rule')">
            <p class="sys-toast">{{ vetoItems.length }} 项强制性合规检测规则已保存，判定模式：{{ judgeMode }}。</p>
            <ul class="sys-lines">
              <li v-for="item in vetoItems" :key="item.code" :class="{ warn: !item.pass }">
                {{ item.code }} {{ item.name }} · {{ item.pass ? 'PASS' : 'VETO' }}
              </li>
            </ul>
          </template>
        </template>

        <!-- 合规知识库 → 规则依据管理 -->
        <template v-else-if="leaf === 'evidence-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="evidenceStarted = !evidenceStarted">
              {{ evidenceStarted ? '收起规则' : '新建规则' }}
            </button>
            <template v-if="evidenceStarted">
              <button type="button" class="secondary-button"
                @click="docNames.forEach((n) => (docs[n] = true))">全部挂接</button>
              <button
                type="button"
                class="primary-button"
                @click="save('evidence-rule', () => (referenceMode ? '' : '规则引用方式为必填项'))"
              >
                完成规则挂接
              </button>
            </template>
          </div>

          <template v-if="evidenceStarted">
            <p class="block-path">一级 法律法规 → 二级 当地管理要求 → 三级 内部控制制度</p>
            <div v-for="level in evidenceLevels" :key="level.level" class="form-item">
              <span class="form-label">{{ level.level }} · {{ level.name }}</span>
              <div class="checkbox-group">
                <label v-for="doc in level.docs" :key="doc" class="checkbox-item">
                  <input v-model="docs[doc]" type="checkbox" />{{ doc }}
                </label>
              </div>
            </div>
            <p class="form-desc">规则引用方式</p>
            <div class="pill-group">
              <button
                v-for="mode in ['每项检测规则必须绑定对应制度依据', '仅在检测报告中统一引用']"
                :key="mode"
                type="button"
                :class="{ active: referenceMode === mode }"
                @click="referenceMode = mode"
              >
                {{ mode }}
              </button>
            </div>
          </template>
          <div v-else-if="!flow.isDone('evidence-rule')" class="empty-hint">暂无规则依据，请先点击「新建规则」建立并挂接制度依据。</div>

          <template v-if="flow.isDone('evidence-rule')">
            <p class="sys-toast">三级合规依据挂接完成，C01—C06 已按「{{ referenceMode }}」生效。</p>
            <ul class="evidence-list">
              <li v-for="level in evidenceLevels" :key="level.level">
                <span class="evidence-level">{{ level.level }}</span>
                <div>
                  <strong>{{ level.name }}</strong>
                  <p>{{ level.docs.join('、') }}</p>
                </div>
              </li>
            </ul>
          </template>
        </template>

        <!-- 数据共享中心 → 洪涝应急救援项目 → 检测执行与判定 -->
        <template v-else-if="leaf === 'detect-run'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': runningDetect }"
              :disabled="runningDetect"
              @click="runDetect"
            >
              <span v-if="runningDetect" class="spinner" />
              {{ runningDetect ? '检测中…' : '开始检测' }}
            </button>
          </div>

          <!-- 首次进入未点击时整页只显示「开始检测」；执行期间按层吐出，执行完成后全部持久保留 -->
          <template v-if="runningDetect || flow.isDone('detect-run')">
            <transition name="reveal">
              <div v-if="stageVisible('quality')" class="reveal-block">
                <div class="calc-subhead"><h3>第一层 · 数据质量检测</h3></div>
                <div class="score-table-wrap">
                  <table class="calc-table compact">
                    <thead><tr><th>检测项</th><th>检测结果</th><th style="width: 150px">状态</th></tr></thead>
                    <tbody>
                      <tr v-for="row in qualityChecks" :key="row.name">
                        <th scope="row">{{ row.name }}</th>
                        <td>{{ row.value }}</td>
                        <td>
                          <span class="verdict" :class="row.ok ? 'pass' : 'fail'">{{ row.ok ? '✅ 通过' : `❌ ${row.action}` }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </transition>

            <transition name="reveal">
              <div v-if="stageVisible('veto')" class="reveal-block">
                <div class="calc-subhead"><h3>第二层 · 合规否决项检测</h3></div>
                <ul class="veto-list">
                  <li v-for="item in vetoItems" :key="item.code" :class="{ failed: !item.pass }">
                    <div class="veto-head">
                      <span class="veto-code">{{ item.code }}</span>
                      <strong>{{ item.name }}</strong>
                      <span class="verdict" :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? '✅ PASS' : '⛔ VETO' }}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </transition>

            <!-- 第二层显示完毕，系统执行准入判定：转圈 3 秒后吐出判定结果 -->
            <div v-if="judging" class="judging-row">
              <span class="spinner" />
              <span>系统执行准入判定…</span>
            </div>

            <transition name="reveal">
              <div v-if="stageVisible('verdict')" class="reveal-block">
                <div class="calc-subhead"><h3>准入判定结果</h3></div>
                <div class="verdict-box" :class="admitted ? 'pass' : 'fail'">
                  <p class="verdict-formula">系统自动执行判断逻辑</p>
                  <p class="verdict-formula">数据质量 ≥ {{ rule.threshold }}% <strong>{{ qualityPass ? '✓' : '✗' }}</strong></p>
                  <p class="verdict-formula">AND</p>
                  <p class="verdict-formula">合规否决项 = 0 <strong>{{ vetoCount === 0 ? '✓' : `✗（${vetoCount} 项）` }}</strong></p>
                  <p class="verdict-formula">系统判定</p>
                  <p class="verdict-result">{{ admissionVerdict }}</p>
                  <p class="verdict-formula">状态：{{ admissionStatus }}</p>
                </div>
                <p class="calc-caption">系统同时显示：</p>
                <div class="stat-grid">
                  <div v-for="item in admissionStats" :key="item.label" class="stat-cell">
                    <span class="stat-label">{{ item.label }}</span>
                    <strong class="stat-value small" :class="item.warn ? 'warn' : 'accent'">{{ item.value }}</strong>
                  </div>
                </div>
              </div>
            </transition>
          </template>
        </template>

        <!-- 数据共享中心 → 洪涝应急救援项目 → 校验单管理 -->
        <template v-else-if="leaf === 'report-manage'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="secondary-button"
              :class="{ 'is-loading': generatingReport }"
              :disabled="generatingReport"
              @click="generateReport"
            >
              <span v-if="generatingReport" class="spinner" />
              {{ generatingReport ? '正在生成…' : '生成检测报告' }}
            </button>
            <button
              type="button"
              class="primary-button"
              @click="save('report-manage', () => {
                if (!flow.isDone('detect-run')) return '请先在「检测执行与判定」功能页执行自动检测并生成准入判定结果'
                if (!reportGenerated) return '请先生成《灾情数据质量与合规校验单》'
                if (!reviewer) return '审核人为必填项'
                return ''
              })"
            >
              审核确认
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">审核人</span>
              <select v-model="reviewer" class="form-control">
                <option value="">请选择</option>
                <option>财务主管统筹岗</option>
                <option>应急预算绩效岗</option>
                <option>资金核算风控岗</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p v-if="reportGenerated && !flow.isDone('report-manage')" class="sys-toast">《灾情数据质量与合规校验单》生成完成，请审核确认。</p>

          <template v-if="flow.isDone('report-manage')">
            <p class="sys-toast">《灾情数据质量与合规校验单》已由{{ reviewer }}审核确认。</p>
            <dl class="block-fields">
              <div v-for="row in reportRows" :key="row.label" class="field-row">
                <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
              </div>
            </dl>
          </template>
        </template>

        <!-- 数据共享中心 → 洪涝应急救援项目 → 共享发布 -->
        <template v-else-if="leaf === 'share-publish'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="secondary-button"
              :class="{ 'is-loading': syncingHub }"
              :disabled="syncingHub"
              @click="syncHub"
            >
              <span v-if="syncingHub" class="spinner" />
              {{ syncingHub ? '同步中…' : '同步共享中心' }}
            </button>
            <button
              type="button"
              class="primary-button"
              :class="{ 'is-loading': publishing }"
              :disabled="publishing"
              @click="confirmPublish"
            >
              <span v-if="publishing" class="spinner" />
              {{ publishing ? '发布中…' : '确认同步' }}
            </button>
          </div>
          <p v-if="hubSynced && !flow.isDone('share-publish')" class="sys-toast">共享中心同步成功，请选择共享对象与共享内容。</p>
          <p class="form-desc">共享对象</p>
          <div class="checkbox-group">
            <label v-for="n in shareTargetNames" :key="n" class="checkbox-item" :class="{ 'is-disabled': !hubSynced }">
              <input v-model="shareTargets[n]" type="checkbox" :disabled="!hubSynced" />{{ n }}
            </label>
          </div>
          <p class="form-desc">共享内容</p>
          <div class="checkbox-group">
            <label v-for="n in shareContentNames" :key="n" class="checkbox-item" :class="{ 'is-disabled': !hubSynced }">
              <input v-model="shareContents[n]" type="checkbox" :disabled="!hubSynced" />
              {{ n === '模型准入状态' ? `模型准入状态：${admissionState}` : n }}
            </label>
          </div>

          <template v-if="flow.isDone('share-publish')">
            <p class="sys-toast">数据共享成功，已开放预算模型调用权限。</p>
            <ul class="sys-lines">
              <li>共享对象：{{ chosenTargets.join('、') }}</li>
              <li>共享内容：《9网格清洗数据》、《灾情数据质量与合规校验单》</li>
              <li :class="{ warn: !admitted }">模型准入状态：{{ admissionState }}</li>
            </ul>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>

<style scoped>
/* 计算公式编辑态：保留等宽公式外观，浅蓝底提示可编辑，聚焦时高亮 */
input.block-formula.editable {
  box-sizing: border-box;
  width: 100%;
  background: #eef5fd;
  border-color: #a9c8ec;
  color: var(--text);
  transition: border-color 0.15s, background 0.15s;
}
input.block-formula.editable:focus {
  outline: 2px solid rgba(91, 155, 213, 0.35);
  border-color: #5b9bd5;
  background: #ffffff;
}

/* 异常数据处理流程：pill 步骤 + 箭头连接，沿用分段选择控件语言 */
.pill-group.flow {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
}

.pill-group.flow .flow-sep {
  padding: 0 4px;
  color: var(--muted);
  font-size: 13px;
  user-select: none;
}

/* 新建处置规则表单：按钮行与上方字段保持间距 */
.rule-form-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

/* 否决规则行：头部占满剩余宽度，「删除」按钮紧随其后，仅自建规则显示 */
.veto-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.veto-row .veto-head {
  flex: 1;
  min-width: 0;
}

/* 检测结果按层吐出：淡入并轻微上移，配合延时依次出现，形成「智能体吐字」的节奏感 */
.reveal-enter-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.reveal-leave-active {
  transition: opacity 0.3s ease;
}
.reveal-leave-to {
  opacity: 0;
}

/* 共享发布：共享中心未同步前，共享对象/共享内容复选框置灰不可选 */
.checkbox-item.is-disabled {
  color: var(--muted);
  cursor: not-allowed;
}
.checkbox-item.is-disabled input {
  cursor: not-allowed;
}

/* 准入判定阶段的转圈等待行：第二层显示完毕后出现，3 秒后吐出判定结果 */
.judging-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 2px;
  color: var(--muted);
  font-size: 13.5px;
}
.judging-row .spinner {
  width: 18px;
  height: 18px;
  margin-right: 0;
}
</style>
