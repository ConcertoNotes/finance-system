<script setup>
// 数据质量与合规检测中心 · 灾情数据质量与合规检测。
// 菜单路径与工作簿一致，学生需逐级点开菜单进入对应功能页办理业务。
import { computed, reactive, ref } from 'vue'
import { percent } from '../../domain/format.js'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'

const PAGES = ['load-data', 'quality-rule', 'disposal-rule', 'veto-rule', 'evidence-rule', 'detect-run', 'report-manage', 'share-publish']
const flow = useTaskFlow('s1-t3', PAGES)

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
  dataset: '《9网格灾情清洗数据表》',
  scene: '预算模型准入检测',
})

const autoRead = [
  { label: '数据采集来源', value: '应急管理部门报送、气象监测、无人机巡航' },
  { label: '数据采集时间', value: '灾后 0 小时初始数据' },
  { label: '清洗记录', value: '字段标准化、重复数据处理、缺失值检查已完成' },
  { label: '异常值复核记录', value: '甲3 156mm、甲6 148mm 多源验证通过' },
  { label: '基础信息匹配结果', value: '9 / 9 网格基础信息匹配一致' },
]

const rule = reactive({ name: '灾情数据预算模型准入规则', threshold: 95, method: '多源交叉验证' })

const fieldNames = ['网格编号', '受灾人数', '被困人数', '转移安置人数', '特殊人群数', '道路情况', '降雨量', '水位', '距仓库距离']
const sourceNames = ['应急管理部门报送数据', '气象监测数据', '无人机巡航数据']
const fields = reactive(Object.fromEntries(fieldNames.map((n) => [n, true])))
const crossSources = reactive(Object.fromEntries(sourceNames.map((n) => [n, true])))

const anomalies = [
  { grid: '甲3', metric: '累计降雨量 156mm', review: '多源验证通过', state: '保留，重点关注' },
  { grid: '甲6', metric: '累计降雨量 148mm', review: '多源验证通过', state: '保留，重点关注' },
]

const disposalIds = ['Q01', 'Q02', 'Q03', 'Q04']
const disposalEnabled = reactive(Object.fromEntries(disposalIds.map((id) => [id, flow.isDone('disposal-rule')])))

const disposalRules = computed(() => [
  { id: 'Q01', when: `完整率 ＜ ${rule.threshold}%`, state: '不准入', action: '自动退回采购成本保障岗补采' },
  { id: 'Q02', when: `及时率 ＜ ${rule.threshold}%`, state: '不准入', action: '退回核验采集时间' },
  { id: 'Q03', when: '存在未完成业务复核的统计异常', state: '暂缓准入', action: '进入人工复核' },
  { id: 'Q04', when: '质量指标达到内部门槛', state: '准予继续', action: '进入第二层合规检测' },
])

const judgeMode = ref('一票否决')

const vetoItems = reactive([
  { code: 'C01', name: '数据采集授权', detail: '数据来源是否经过授权：应急管理数据访问授权、气象数据访问授权、无人机数据使用权限。全部通过 = PASS，任一未授权 = VETO', pass: true },
  { code: 'C02', name: '字段完整与清洗规范', detail: '系统自动读取字段标准化结果、重复数据处理结果、缺失值检查结果、异常值复核结果。存在未经处理的数据质量问题即禁止进入预算模型', pass: true },
  { code: 'C03', name: '模型逻辑', detail: '模型输入字段是否来自已清洗数据、计算字段是否与数据维度一致、是否存在未经授权人工修改数据、模型参数是否可追溯。模型逻辑可追溯 → 通过', pass: true },
  { code: 'C04', name: '资金用途限制', detail: '政府财政拨款保障资金、限定性社会捐赠、非限定性社会捐赠、保险赔款、其他合规项目资金是否均已建立用途标签；限定性资金必须匹配限定用途，用途不匹配 → 一票否决', pass: true },
  { code: 'C05', name: '预算审批权限', detail: '预算编制、调整、审批角色是否符合内部授权：应急预算绩效岗预算测算、财务主管统筹岗审核确认。未经授权审批 → 不得进入正式预算执行', pass: true },
  { code: 'C06', name: '付款审批权限', detail: '付款申请、付款核验和最终审批权限是否分离。申请人与最终审批人权限冲突 → 一票否决', pass: true },
])

const evidenceLevels = [
  { level: '一级', name: '法律法规', docs: ['《中华人民共和国突发事件应对法》等本项目已明确适用的相关规定'] },
  { level: '二级', name: '当地管理要求', docs: ['当地洪涝灾害应急预案', '当地救灾资金管理要求'] },
  { level: '三级', name: '内部控制制度', docs: ['单位内部授权审批制度', '项目预算审批权限', '付款审批权限'] },
]
const docNames = evidenceLevels.flatMap((item) => item.docs)
const docs = reactive(Object.fromEntries(docNames.map((n) => [n, flow.isDone('evidence-rule')])))
const referenceMode = ref('每项检测规则必须绑定对应制度依据')

const quality = reactive({ completeness: 1, timeliness: 1, pendingReview: 0 })
const detectScope = ['数据完整率', '数据及时率', '统计异常复核', '数据维度一致性', 'C01—C06 合规否决项']

const reviewer = ref('财务主管统筹岗')
const reportGenerated = ref(flow.isDone('report-manage'))

const shareTargetNames = ['应急预算绩效岗', '采购成本保障岗', '资金核算风控岗', '数字人御洪星']
const shareContentNames = ['《9网格清洗数据》', '《灾情数据质量与合规校验单》', '模型准入状态']
const shareTargets = reactive(Object.fromEntries(shareTargetNames.map((n) => [n, flow.isDone('share-publish')])))
const shareContents = reactive(Object.fromEntries(shareContentNames.map((n) => [n, flow.isDone('share-publish')])))

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

const blockActions = computed(() => {
  const list = []
  if (!completenessPass.value) list.push(`Q01 完整率 ${percent(quality.completeness, 0)} ＜ ${rule.threshold}% → 不准入，自动退回采购成本保障岗补采`)
  if (!timelinessPass.value) list.push(`Q02 及时率 ${percent(quality.timeliness, 0)} ＜ ${rule.threshold}% → 不准入，退回核验采集时间`)
  if (!anomalyPass.value) list.push(`Q03 存在 ${quality.pendingReview} 项未完成业务复核的统计异常 → 暂缓准入，进入人工复核`)
  vetoFailed.value.forEach((item) => list.push(`${item.code} ${item.name} → VETO，禁止进入预算模型或后续支付流程`))
  return list
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
  { label: '合规检测项目', value: 'C01—C06 共 6 项强制性合规检测' },
  { label: '合规依据', value: '一级法律法规、二级当地管理要求、三级内部控制制度' },
  { label: '否决项结果', value: `否决项 ${vetoCount.value} 项，合规通过率 ${percent(compliancePassRate.value, 0)}` },
  { label: '模型准入结果', value: verdictText.value },
  { label: '审核人员', value: reviewer.value },
])

const chosenFields = computed(() => fieldNames.filter((n) => fields[n]))
const chosenSources = computed(() => sourceNames.filter((n) => crossSources[n]))
const enabledDisposal = computed(() => disposalRules.value.filter((r) => disposalEnabled[r.id]))
const attachedDocs = computed(() => docNames.filter((n) => docs[n]))
const chosenTargets = computed(() => shareTargetNames.filter((n) => shareTargets[n]))
const chosenContents = computed(() => shareContentNames.filter((n) => shareContents[n]))
const pendingRulePages = computed(() => RULE_PAGES.filter((id) => !flow.isDone(id)).map((id) => leafLabels[id]))

function save(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function generateReport() {
  if (!flow.isDone('detect-run')) {
    error.value = '请先在「检测执行与判定」功能页执行自动检测并生成准入判定结果'
    return
  }
  error.value = ''
  reportGenerated.value = true
}

function resetAll() {
  flow.reset()
  disposalIds.forEach((id) => { disposalEnabled[id] = false })
  docNames.forEach((n) => { docs[n] = false })
  shareTargetNames.forEach((n) => { shareTargets[n] = false })
  shareContentNames.forEach((n) => { shareContents[n] = false })
  vetoItems.forEach((item) => { item.pass = true })
  fieldNames.forEach((n) => { fields[n] = true })
  sourceNames.forEach((n) => { crossSources[n] = true })
  quality.completeness = 1
  quality.timeliness = 1
  quality.pendingReview = 0
  intake.dataset = '《9网格灾情清洗数据表》'
  intake.scene = '预算模型准入检测'
  rule.name = '灾情数据预算模型准入规则'
  rule.method = '多源交叉验证'
  rule.threshold = 95
  judgeMode.value = '一票否决'
  referenceMode.value = '每项检测规则必须绑定对应制度依据'
  reviewer.value = '财务主管统筹岗'
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
              :disabled="flow.isDone('load-data')"
              @click="save('load-data', () => (intake.scene === '预算模型准入检测' && intake.dataset !== '《9网格灾情清洗数据表》' ? '预算模型准入检测仅接受已清洗数据集，请选择《9网格灾情清洗数据表》' : ''))"
            >
              载入检测数据
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">选择数据集</span>
              <select v-model="intake.dataset" class="form-control" :disabled="flow.isDone('load-data')">
                <option>《9网格灾情清洗数据表》</option>
                <option>《9网格灾情原始采集表》</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">选择检测场景</span>
              <select v-model="intake.scene" class="form-control" :disabled="flow.isDone('load-data')">
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
              :disabled="flow.isDone('quality-rule')"
              @click="save('quality-rule', () => {
                if (!rule.name.trim()) return '规则名称为必填项'
                if (!(rule.threshold > 0 && rule.threshold <= 100)) return '数据质量准入值需在 0—100% 之间'
                if (chosenFields.length !== 9) return `完整率检测内容需覆盖 9 个字段，还差 ${9 - chosenFields.length} 项`
                if (rule.method === '多源交叉验证' && chosenSources.length !== 3) return '多源交叉验证需同时启用应急管理、气象、无人机三个核验来源'
                return ''
              })"
            >
              保存质量规则
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">规则名称</span>
              <input v-model="rule.name" class="form-control" :disabled="flow.isDone('quality-rule')" />
            </label>
            <label class="form-item">
              <span class="form-label required">数据质量准入值（%）</span>
              <input v-model.number="rule.threshold" type="number" min="0" max="100" class="form-control" :disabled="flow.isDone('quality-rule')" />
            </label>
          </div>
          <p class="calc-note">项目内部数据可用性门槛，不作为法律合规标准。</p>

          <div class="calc-subhead"><h3>指标一 · 数据完整率</h3></div>
          <p class="block-formula">完整率 = 已完整记录数 ÷ 应采集记录数 × 100%</p>
          <p class="form-desc">检测内容</p>
          <div class="checkbox-group tight">
            <label v-for="n in fieldNames" :key="n" class="checkbox-item">
              <input v-model="fields[n]" type="checkbox" :disabled="flow.isDone('quality-rule')" />{{ n }}
            </label>
          </div>
          <p class="calc-caption">完整率 ≥ {{ rule.threshold }}% → 通过；完整率 ＜ {{ rule.threshold }}% → 退回补采。</p>

          <div class="calc-subhead"><h3>指标二 · 数据及时率</h3></div>
          <p class="block-formula">及时率 = 规定时间内完成采集记录数 ÷ 应采集记录数 × 100%</p>
          <p class="calc-caption">采集时间要求：灾后 0 小时初始数据。及时率 ≥ {{ rule.threshold }}% → 通过；＜ {{ rule.threshold }}% → 退回复核。</p>

          <div class="calc-subhead"><h3>指标三 · 数据准确性校验</h3></div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">检测方式</span>
              <select v-model="rule.method" class="form-control" :disabled="flow.isDone('quality-rule')">
                <option>多源交叉验证</option>
                <option>单源比对</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p class="form-desc">核验来源</p>
          <div class="checkbox-group">
            <label v-for="n in sourceNames" :key="n" class="checkbox-item">
              <input v-model="crossSources[n]" type="checkbox" :disabled="flow.isDone('quality-rule')" />{{ n }}
            </label>
          </div>
          <p class="calc-note">统计异常 ≠ 错误数据：异常值保留 → 多源业务复核 → 确认真实后进入模型。</p>
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
            <button type="button" class="secondary-button" :disabled="flow.isDone('disposal-rule')"
              @click="disposalIds.forEach((id) => (disposalEnabled[id] = true))">全部启用</button>
            <button
              type="button"
              class="primary-button"
              :disabled="flow.isDone('disposal-rule')"
              @click="save('disposal-rule', () => (enabledDisposal.length === 4 ? '' : `还有 ${4 - enabledDisposal.length} 项处置规则未启用`))"
            >
              启用规则
            </button>
          </div>
          <p class="form-desc">质量检测结果的处置逻辑，勾选后随第一层数据质量检测同步生效。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>条件</th><th>状态</th><th>动作</th></tr></thead>
              <tbody>
                <tr v-for="row in disposalRules" :key="row.id">
                  <td><input v-model="disposalEnabled[row.id]" type="checkbox" :disabled="flow.isDone('disposal-rule')" /></td>
                  <th scope="row">{{ row.id }}</th>
                  <td>{{ row.when }}</td>
                  <td>{{ row.state }}</td>
                  <td>{{ row.action }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="flow.isDone('disposal-rule')">
            <p class="sys-toast">4 项质量异常处置规则已启用并进入运行状态。</p>
            <ul class="sys-lines">
              <li v-for="row in enabledDisposal" :key="row.id" :class="{ warn: row.state !== '准予继续' }">
                {{ row.id }}：{{ row.when }} → {{ row.state }}，{{ row.action }}
              </li>
            </ul>
          </template>
        </template>

        <!-- 检测规则 → 合规检测 → 新建否决规则 -->
        <template v-else-if="leaf === 'veto-rule'">
          <div class="sys-toolbar">
            <button
              type="button"
              class="primary-button"
              :disabled="flow.isDone('veto-rule')"
              @click="save('veto-rule', () => (judgeMode === '一票否决' ? '' : '强制性合规项不采用综合得分，请将判定模式设置为一票否决'))"
            >
              保存否决规则
            </button>
          </div>
          <p class="form-desc">判定模式</p>
          <div class="pill-group">
            <button
              v-for="mode in ['一票否决', '综合评分']"
              :key="mode"
              type="button"
              :class="{ active: judgeMode === mode }"
              :disabled="flow.isDone('veto-rule')"
              @click="judgeMode = mode"
            >
              {{ mode }}
            </button>
          </div>
          <p class="calc-note">任一强制性合规项目不通过，则禁止进入预算模型或后续支付流程。</p>
          <ul class="veto-list">
            <li v-for="item in vetoItems" :key="item.code" :class="{ failed: !item.pass }">
              <label class="veto-head">
                <input v-model="item.pass" type="checkbox" />
                <span class="veto-code">{{ item.code }}</span>
                <strong>{{ item.name }}</strong>
                <span class="verdict" :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? 'PASS' : 'VETO' }}</span>
              </label>
              <p class="veto-detail">{{ item.detail }}</p>
            </li>
          </ul>
          <p class="calc-caption">任一项切换为 VETO，检测执行与判定页的结果即时重算。</p>

          <template v-if="flow.isDone('veto-rule')">
            <p class="sys-toast">6 项强制性合规检测规则已保存，判定模式：{{ judgeMode }}。</p>
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
            <button type="button" class="secondary-button" :disabled="flow.isDone('evidence-rule')"
              @click="docNames.forEach((n) => (docs[n] = true))">全部挂接</button>
            <button
              type="button"
              class="primary-button"
              :disabled="flow.isDone('evidence-rule')"
              @click="save('evidence-rule', () => {
                if (attachedDocs.length !== docNames.length) return `还有 ${docNames.length - attachedDocs.length} 份制度依据未挂接`
                if (referenceMode !== '每项检测规则必须绑定对应制度依据') return '每项检测规则必须绑定对应制度依据'
                return ''
              })"
            >
              完成规则挂接
            </button>
          </div>
          <p class="block-path">一级 法律法规 → 二级 当地管理要求 → 三级 内部控制制度</p>
          <div v-for="level in evidenceLevels" :key="level.level" class="form-item">
            <span class="form-label">{{ level.level }} · {{ level.name }}</span>
            <div class="checkbox-group">
              <label v-for="doc in level.docs" :key="doc" class="checkbox-item">
                <input v-model="docs[doc]" type="checkbox" :disabled="flow.isDone('evidence-rule')" />{{ doc }}
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
              :disabled="flow.isDone('evidence-rule')"
              @click="referenceMode = mode"
            >
              {{ mode }}
            </button>
          </div>

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
              :disabled="flow.isDone('detect-run')"
              @click="save('detect-run', () => (pendingRulePages.length ? `还有 ${pendingRulePages.length} 个功能页未办理：${pendingRulePages.join('、')}` : ''))"
            >
              开始检测
            </button>
          </div>
          <p class="form-desc">本批数据实测指标（甲1—甲9）</p>
          <div class="input-row">
            <label>数据完整率</label>
            <input v-model.number="quality.completeness" type="range" min="0.8" max="1" step="0.01" />
            <span class="input-unit">{{ percent(quality.completeness, 0) }}</span>
          </div>
          <div class="input-row">
            <label>数据及时率</label>
            <input v-model.number="quality.timeliness" type="range" min="0.8" max="1" step="0.01" />
            <span class="input-unit">{{ percent(quality.timeliness, 0) }}</span>
          </div>
          <div class="input-row">
            <label>未完成业务复核的统计异常</label>
            <input v-model.number="quality.pendingReview" type="number" min="0" max="9" />
            <span class="input-unit">项</span>
          </div>
          <p class="calc-caption">实测值取自本批载入数据，调整后检测结果与准入判定即时重算。</p>
          <div class="check-grid">
            <div v-for="item in detectScope" :key="item" class="check-cell" :class="{ done: flow.isDone('detect-run') }">
              <span class="check-mark">{{ flow.isDone('detect-run') ? '✓' : '·' }}</span>{{ item }}
            </div>
          </div>

          <template v-if="flow.isDone('detect-run')">
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
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">否决项</span>
                <strong class="stat-value" :class="vetoCount ? 'warn' : 'accent'">{{ vetoCount }} 项</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">合规通过率</span>
                <strong class="stat-value" :class="vetoCount ? 'warn' : 'accent'">{{ percent(compliancePassRate, 0) }}</strong>
              </div>
            </div>
            <p v-if="!qualityPass || vetoCount" class="sys-toast warn">检测发现未达标项，已按处置逻辑与一票否决规则拦截。</p>

            <div class="calc-subhead"><h3>准入判定结果</h3></div>
            <div class="verdict-box" :class="admitted ? 'pass' : 'fail'">
              <p class="verdict-formula">
                数据质量 ≥ {{ rule.threshold }}% <strong>{{ qualityPass ? '✓' : '✗' }}</strong>
                AND 合规否决项 = 0 <strong>{{ vetoCount === 0 ? '✓' : `✗（${vetoCount} 项）` }}</strong>
              </p>
              <p class="verdict-result">{{ verdictText }}</p>
            </div>
            <ul v-if="blockActions.length" class="sys-lines">
              <li v-for="item in blockActions" :key="item" class="warn">{{ item }}</li>
            </ul>
            <div class="stat-grid">
              <div v-for="item in admissionStats" :key="item.label" class="stat-cell">
                <span class="stat-label">{{ item.label }}</span>
                <strong class="stat-value small" :class="item.warn ? 'warn' : 'accent'">{{ item.value }}</strong>
              </div>
            </div>
          </template>
        </template>

        <!-- 数据共享中心 → 洪涝应急救援项目 → 校验单管理 -->
        <template v-else-if="leaf === 'report-manage'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="flow.isDone('report-manage') || reportGenerated" @click="generateReport">生成检测报告</button>
            <button
              type="button"
              class="primary-button"
              :disabled="flow.isDone('report-manage')"
              @click="save('report-manage', () => {
                if (!flow.isDone('detect-run')) return '请先在「检测执行与判定」功能页执行自动检测并生成准入判定结果'
                if (!reportGenerated) return '请先生成《灾情数据质量与合规校验单》'
                if (reviewer !== '财务主管统筹岗') return '《灾情数据质量与合规校验单》须由财务主管统筹岗审核确认'
                return ''
              })"
            >
              审核确认
            </button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">审核人</span>
              <select v-model="reviewer" class="form-control" :disabled="flow.isDone('report-manage')">
                <option>财务主管统筹岗</option>
                <option>应急预算绩效岗</option>
                <option>资金核算风控岗</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <p v-if="reportGenerated && !flow.isDone('report-manage')" class="sys-toast">《灾情数据质量与合规校验单》已生成，等待审核确认。</p>

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
              class="primary-button"
              :disabled="flow.isDone('share-publish')"
              @click="save('share-publish', () => {
                if (!flow.isDone('report-manage')) return '请先在「校验单管理」功能页完成《灾情数据质量与合规校验单》审核确认'
                if (chosenTargets.length !== 4) return `共享对象还有 ${4 - chosenTargets.length} 个岗位未选择`
                if (chosenContents.length !== 3) return `共享内容还有 ${3 - chosenContents.length} 项未选择`
                return ''
              })"
            >
              确认同步
            </button>
          </div>
          <p class="form-desc">共享对象</p>
          <div class="checkbox-group">
            <label v-for="n in shareTargetNames" :key="n" class="checkbox-item">
              <input v-model="shareTargets[n]" type="checkbox" :disabled="flow.isDone('share-publish')" />{{ n }}
            </label>
          </div>
          <p class="form-desc">共享内容</p>
          <div class="checkbox-group">
            <label v-for="n in shareContentNames" :key="n" class="checkbox-item">
              <input v-model="shareContents[n]" type="checkbox" :disabled="flow.isDone('share-publish')" />
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
