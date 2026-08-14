<script setup>
// 数据中台 · 洪涝应急救援数据采集系统。
// 工作簿里的「数据中心 → 数据采集管理 → 新建采集任务」是要逐级点开的菜单，不是标题。
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import CodeEditor from '../system/CodeEditor.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { disasterGrids } from '../../data/costDriver.js'
import { num, percent } from '../../domain/format.js'

const PAGES = [
  'new-task',
  'add-source',
  'add-field',
  'python-node',
  'extract-rule',
  'data-grade',
  'iqr-rule',
  'quality-rule',
  'run-task',
  'data-export',
]
const STEPS = [
  { id: 'new-task', label: '新建任务' },
  { id: 'add-source', label: '添加数据源' },
  { id: 'add-field', label: '字段映射' },
  { id: 'python-node', label: '采集脚本' },
  { id: 'extract-rule', label: '提取规则' },
  { id: 'data-grade', label: '分级分类' },
  { id: 'iqr-rule', label: '异常监测' },
  { id: 'quality-rule', label: '质量规则' },
  { id: 'run-task', label: '运行采集' },
  { id: 'data-export', label: '数据导出' },
]
const flow = useTaskFlow('s1-t2', PAGES)
const store = useFormPersist('s1-t2')

const DEFAULT_PYTHON = `# 多源洪涝数据自动采集
import json
from datetime import datetime

SOURCES = [
    {"code": "DS01", "name": "应急管理局", "api": "/emergency/grids"},
    {"code": "DS02", "name": "气象局", "api": "/weather/realtime"},
    {"code": "DS03", "name": "无人机巡航", "api": "/uav/review"},
    {"code": "DS04", "name": "御洪星", "api": "/yuhongxing/demand"},
]

def collect(source):
    print(f"[{datetime.now():%H:%M:%S}] 连接 {source['name']} {source['api']}")
    return {"status": "ok", "grids": [f"甲{i}" for i in range(1, 10)]}

def main():
    for src in SOURCES:
        result = collect(src)
        print(f"{src['name']}：采集成功 {len(result['grids'])}/9")

if __name__ == "__main__":
    main()
`

const menu = [
  {
    id: 'm-center',
    label: '数据中心',
    children: [
      { id: 'm-center-collect', label: '数据采集管理', children: [{ id: 'new-task', label: '新建采集任务' }] },
    ],
  },
  {
    id: 'm-source',
    label: '数据源管理',
    children: [{ id: 'add-source', label: '添加数据源' }],
  },
  {
    id: 'm-task',
    label: '数据采集任务',
    children: [
      { id: 'm-task-field', label: '字段映射', children: [{ id: 'add-field', label: '新增字段' }] },
      { id: 'run-task', label: '运行采集任务' },
    ],
  },
  {
    id: 'm-flow',
    label: '任务流程',
    children: [
      { id: 'm-flow-node', label: '添加节点', children: [{ id: 'python-node', label: 'Python脚本' }] },
    ],
  },
  {
    id: 'm-process',
    label: '数据处理',
    children: [
      { id: 'm-process-extract', label: '数据提取', children: [{ id: 'extract-rule', label: '新建提取规则' }] },
    ],
  },
  {
    id: 'm-security',
    label: '数据安全中心',
    children: [{ id: 'data-grade', label: '数据分级分类' }],
  },
  {
    id: 'm-quality',
    label: '数据质量',
    children: [
      { id: 'm-quality-monitor', label: '异常监测', children: [{ id: 'iqr-rule', label: '新建监测规则' }] },
      { id: 'quality-rule', label: '质量规则配置' },
    ],
  },
  {
    id: 'm-manage',
    label: '数据管理',
    children: [{ id: 'data-export', label: '数据导出' }],
  },
]

const activeId = ref('')
const error = ref('')

const taskForm = reactive({
  name: '',
  code: '',
  scene: '',
  scope: '',
  method: '',
  refresh: '',
  state: '',
})

const dataSources = [
  {
    code: '数据源01',
    platform: '应急管理局平台',
    short: '应急管理局',
    name: '应急管理局灾情数据',
    meta: '数据源类型：API接口 ｜ 数据更新：实时 ｜ 接口状态：已授权',
    items: ['受灾人数', '被困人数', '转移安置人数', '特殊人群', '道路中断情况'],
    collect: '应急管理局数据：采集成功',
  },
  {
    code: '数据源02',
    platform: '气象局平台',
    short: '气象局',
    name: '气象监测数据',
    meta: '数据源类型：API接口 ｜ 更新频率：实时 ｜ 数据权限：授权访问',
    items: ['累计降雨量', '实时水位'],
    collect: '气象局数据：采集成功',
  },
  {
    code: '数据源03',
    platform: '无人机巡航平台',
    short: '无人机平台',
    name: '无人机巡航数据',
    meta: '更新方式：巡航后自动上传 ｜ 数据用途：灾情数据交叉验证',
    items: ['网格编号', '巡航时间', '灾情影像', '道路状态', '现场灾情复核结果'],
    collect: '无人机数据：采集成功',
  },
  {
    code: '数据源04',
    platform: '「御洪星」智能接警数据',
    short: '御洪星',
    name: '御洪星灾区需求数据',
    meta: '数据类型：语音转译/结构化数据 ｜ 数据状态：实时同步',
    items: ['网格编号', '需求物资', '紧急程度', '上报时间'],
    collect: '御洪星数据：同步成功',
  },
]

const fields = [
  ['网格编号', 'GRID_ID', '文本', '应急管理'],
  ['网格名称', 'GRID_NAME', '文本', '应急管理'],
  ['受灾人数', 'AFFECTED_NUM', '数值', '应急管理'],
  ['被困人数', 'TRAPPED_NUM', '数值', '应急管理'],
  ['转移安置人数', 'TRANSFER_NUM', '数值', '应急管理'],
  ['特殊人群数', 'SPECIAL_NUM', '数值', '应急管理'],
  ['道路中断情况', 'ROAD_STATUS', '文本', '应急管理/无人机'],
  ['累计降雨量', 'RAINFALL', '数值', '气象局'],
  ['实时水位', 'WATER_LEVEL', '数值', '气象局'],
  ['距仓库距离', 'DISTANCE', '数值', 'GIS/基础档案'],
  ['数据来源', 'DATA_SOURCE', '文本', '系统生成'],
  ['采集时间', 'COLLECT_TIME', '日期时间', '系统生成'],
]

const extractDimensions = [
  { name: '人员维度', fields: '受灾人数、被困人数、转移安置人数、特殊人群人数' },
  { name: '灾情维度', fields: '累计降雨量、实时水位、道路中断状态' },
  { name: '空间维度', fields: '网格编号、网格名称、距仓库距离' },
  { name: '时间维度', fields: '数据采集时间、数据更新时间' },
]

const extractCheckpoints = [25, 52, 78, 100]

const ACCESS_OPTIONS = [
  '查看全部',
  '授权读取、分析',
  '授权读取、维护采集任务',
  '按业务需要读取',
  '采集、识别、风险提示',
  '禁止访问',
]
const accessRules = [
  { role: '财务主管统筹岗', preset: '查看全部' },
  { role: '应急预算绩效岗', preset: '授权读取、分析' },
  { role: '采购成本保障岗', preset: '授权读取、维护采集任务' },
  { role: '资金核算风控岗', preset: '按业务需要读取' },
  { role: '数字人御洪星', preset: '采集、识别、风险提示' },
  { role: '非授权用户', preset: '禁止访问' },
]

const guardItems = ['用户身份认证', '数据访问日志', '操作留痕', '下载权限控制', '异常访问预警']

const reviewSources = ['气象局监测数据', '无人机巡航影像', '应急管理部门报送数据']

const rainfallGrids = ['甲1', '甲2', '甲3', '甲4', '甲5', '甲6', '甲7', '甲8', '甲9']

const qualityRules = [
  { id: '规则1', name: '完整性检查', detail: '网格编号、受灾人数、转移安置人数、降雨量、水位、数据来源、采集时间', action: '出现空值 → 黄色预警' },
  { id: '规则2', name: '唯一性检查', detail: '主键：网格编号 + 采集时间', action: '发现重复 → 进入待清洗区' },
  { id: '规则3', name: '及时性检查', detail: '数据更新时间超过设定时间', action: '触发数据迟报预警' },
  { id: '规则4', name: '来源一致性检查', detail: '关键灾情数据至少进行应急管理数据 + 气象/无人机数据交叉验证', action: '—' },
]

const exportItems = ['保留数据来源', '保留采集时间', '保留异常标记', '保留数据版本号']

const runtimeRequired = [
  { id: 'add-source', label: '数据源接入' },
  { id: 'python-node', label: '采集脚本' },
  { id: 'data-grade', label: '数据分级分类' },
  { id: 'iqr-rule', label: '异常监测' },
]

const DATASET_OPTIONS = ['洪涝应急救援9网格数据集', '灾情原始采集表', '灾情清洗数据表']
const IQR_NAME_OPTIONS = ['降雨量异常波动监测', '水位异常波动监测']
const IQR_FIELD_OPTIONS = ['累计降雨量', '实时水位']
const IQR_METHOD_OPTIONS = ['IQR 四分位距', '3σ 标准差']
const RAINFALL_OPTIONS = [76, 80, 86, 88, 92, 94, 98, 105, 148, 156]
const KNOWN_RAINFALL = { 甲1: 86, 甲2: 92, 甲3: 156, 甲4: 98, 甲5: 105, 甲6: 148, 甲7: 88, 甲8: 80, 甲9: 94 }

const connected = reactive(Object.fromEntries(dataSources.map((s) => [s.code, false])))
const sourceItems = reactive(Object.fromEntries(
  dataSources.flatMap((s) => s.items.map((item) => [`${s.code}:${item}`, false])),
))
const fieldRows = reactive(fields.map(() => ({ name: '', code: '', type: '', source: '' })))
const pkOn = reactive(Object.fromEntries(fields.map((f) => [f[1], false])))
const uniqueOn = reactive(Object.fromEntries(fields.map((f) => [f[1], false])))
const pythonNode = reactive({ name: '多源洪涝数据自动采集', code: DEFAULT_PYTHON })
const dims = reactive(Object.fromEntries(extractDimensions.map((d) => [d.name, false])))
const dimFields = reactive(Object.fromEntries(extractDimensions.map((d) => [d.name, d.fields])))
const guards = reactive(Object.fromEntries(guardItems.map((n) => [n, false])))
const dataGradeForm = reactive({ dataset: '', level: '' })
const accessChoice = reactive(Object.fromEntries(accessRules.map((r) => [r.role, ''])))
const iqrForm = reactive({ name: '', field: '', method: '' })
const rainfall = reactive(rainfallGrids.map((grid) => ({ grid, value: '' })))
const rules = reactive(Object.fromEntries(qualityRules.map((r) => [r.id, false])))
const qualityDetails = reactive(Object.fromEntries(qualityRules.map((r) => [r.id, { detail: '', action: '' }])))
const exportForm = reactive({ target: '', format: '' })
const exportKeeps = reactive(Object.fromEntries(exportItems.map((n) => [n, false])))

const syntaxChecked = ref(false)
const extracting = ref(false)
const extractProgress = ref(0)
let extractTimer = null

const running = ref(false)
const runStep = ref(0)
const RUN_SOURCE = dataSources.length
const RUN_GRID = disasterGrids.length
const RUN_STATUS = RUN_SOURCE + RUN_GRID + 1
const RUN_EXPORT = RUN_STATUS + 1
let runTimer = null

const shownSources = computed(() => {
  if (running.value) return dataSources.slice(0, Math.min(runStep.value, RUN_SOURCE))
  return flow.isDone('run-task') ? dataSources : []
})
const shownGrids = computed(() => {
  if (running.value) return disasterGrids.slice(0, Math.max(0, Math.min(runStep.value - RUN_SOURCE, RUN_GRID)))
  return flow.isDone('run-task') ? disasterGrids : []
})
const showRunStatus = computed(() => running.value ? runStep.value >= RUN_STATUS : flow.isDone('run-task'))
const showRunExport = computed(() => running.value ? runStep.value >= RUN_EXPORT : flow.isDone('run-task'))

store.restore({
  taskForm,
  connected,
  sourceItems,
  fieldRows,
  pkOn,
  uniqueOn,
  pythonNode,
  dims,
  dimFields,
  guards,
  dataGradeForm,
  accessChoice,
  iqrForm,
  rainfall,
  rules,
  qualityDetails,
  exportForm,
  exportKeeps,
  syntaxChecked,
  extractProgress,
})

const connectedList = computed(() => dataSources.filter((s) => connected[s.code]))
const chosenDims = computed(() => extractDimensions.filter((d) => dims[d.name]))
const enabledGuards = computed(() => guardItems.filter((n) => guards[n]))
const enabledRules = computed(() => qualityRules.filter((r) => rules[r.id]))
const chosenExports = computed(() => exportItems.filter((n) => exportKeeps[n]))
const collectedGrids = computed(() => shownGrids.value.map((g) => g.id))
const runtimeMissing = computed(() => runtimeRequired.filter((item) => !flow.isDone(item.id)))
const pendingPages = computed(() => PAGES.filter((p) => p !== 'data-export' && !flow.isDone(p)))

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

function toRainValue(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const iqr = computed(() => {
  const sorted = rainfall.map((item) => toRainValue(item.value)).filter((v) => v != null).sort((a, b) => a - b)
  if (!sorted.length) {
    return { q1: 0, q3: 0, range: 0, lower: 0, upper: 0 }
  }
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const range = q3 - q1
  return { q1, q3, range, lower: q1 - 1.5 * range, upper: q3 + 1.5 * range }
})

const flagged = computed(() =>
  rainfall.map((item) => {
    const n = toRainValue(item.value)
    return {
      grid: item.grid,
      value: n,
      display: item.value,
      outlier: n != null && (n > iqr.value.upper || n < iqr.value.lower),
    }
  }),
)

const outliers = computed(() => flagged.value.filter((item) => item.outlier))

function snapshot() {
  return {
    taskForm,
    connected,
    sourceItems,
    fieldRows,
    pkOn,
    uniqueOn,
    pythonNode,
    dims,
    dimFields,
    guards,
    dataGradeForm,
  accessChoice,
    iqrForm,
    rainfall,
    rules,
    qualityDetails,
    exportForm,
    exportKeeps,
    syntaxChecked,
    extractProgress,
  }
}

function sourceChecked(src) {
  return src.items.filter((item) => sourceItems[`${src.code}:${item}`])
}

function oneClickMatch() {
  fields.forEach((field, index) => {
    fieldRows[index].name = field[0]
    fieldRows[index].code = field[1]
    fieldRows[index].type = field[2]
    fieldRows[index].source = field[3]
  })
  Object.keys(pkOn).forEach((code) => { pkOn[code] = code === 'GRID_ID' })
  Object.keys(uniqueOn).forEach((code) => { uniqueOn[code] = code === 'GRID_ID' || code === 'COLLECT_TIME' })
  error.value = ''
}

function fillKnownRainfall() {
  rainfall.forEach((item) => { item.value = KNOWN_RAINFALL[item.grid] ?? '' })
}

function stopRun() {
  if (runTimer) {
    clearInterval(runTimer)
    runTimer = null
  }
  running.value = false
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

function testSource(code) {
  const src = dataSources.find((item) => item.code === code)
  if (src && sourceChecked(src).length !== src.items.length) {
    error.value = `${src.name} 请先勾选全部数据内容`
    return
  }
  connected[code] = true
  error.value = ''
}

function checkSyntax() {
  syntaxChecked.value = true
  error.value = ''
}

function startExtract() {
  if (extracting.value) return
  if (chosenDims.value.length < extractDimensions.length) {
    error.value = `还有 ${extractDimensions.length - chosenDims.value.length} 个提取维度未勾选`
    return
  }
  error.value = ''
  extracting.value = true
  extractProgress.value = 0
  let index = 0
  extractTimer = setInterval(() => {
    extractProgress.value = extractCheckpoints[index]
    index += 1
    if (index >= extractCheckpoints.length) {
      clearInterval(extractTimer)
      extractTimer = null
      extracting.value = false
      store.persist(snapshot())
      flow.complete('extract-rule')
    }
  }, 700)
}

function securityError() {
  if (!dataGradeForm.dataset.trim()) return '请选择数据集'
  if (!dataGradeForm.level.trim()) return '数据级别为必填项'
  const unset = accessRules.find((row) => !accessChoice[row.role])
  if (unset) return `请为${unset.role}选择访问规则`
  const mismatch = accessRules.find((row) => accessChoice[row.role] !== row.preset)
  if (mismatch) return `${mismatch.role} 的访问规则应为「${mismatch.preset}」`
  if (enabledGuards.value.length < guardItems.length) {
    return `还有 ${guardItems.length - enabledGuards.value.length} 项安全控制未勾选`
  }
  return ''
}

function fieldMapError() {
  if (fieldRows.some((row) => !row.name || !row.code)) return '请先一键匹配或填写全部字段'
  if (!pkOn.GRID_ID) return '请勾选主键：网格编号 GRID_ID'
  if (!uniqueOn.GRID_ID || !uniqueOn.COLLECT_TIME) return '请勾选唯一性约束：网格编号 + 采集时间'
  return ''
}

function runtimeError() {
  if (!runtimeMissing.value.length) return ''
  return `采集任务尚未就绪：${runtimeMissing.value.map((item) => item.label).join('、')} 未配置完成`
}

function startRun() {
  if (running.value) return
  const message = runtimeError()
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  stopRun()
  running.value = true
  runStep.value = 0
  runTimer = setInterval(() => {
    runStep.value += 1
    if (runStep.value >= RUN_EXPORT) {
      stopRun()
      store.persist(snapshot())
      flow.complete('run-task')
    }
  }, 520)
}

function exportError() {
  if (pendingPages.value.length) {
    return `还有 ${pendingPages.value.length} 个功能页未办理，采集系统尚未搭建完成，无法导出标准化数据源`
  }
  if (chosenExports.value.length < exportItems.length) {
    return `还有 ${exportItems.length - chosenExports.value.length} 项导出留痕未勾选`
  }
  return ''
}

function stopExtract() {
  if (extractTimer) {
    clearInterval(extractTimer)
    extractTimer = null
  }
  extracting.value = false
}

function resetAll() {
  flow.reset()
  store.clear()
  Object.assign(taskForm, {
    name: '',
    code: '',
    scene: '',
    scope: '',
    method: '',
    refresh: '',
    state: '',
  })
  dataSources.forEach((s) => { connected[s.code] = false })
  Object.keys(sourceItems).forEach((k) => { sourceItems[k] = false })
  fieldRows.forEach((row) => {
    row.name = ''
    row.code = ''
    row.type = ''
    row.source = ''
  })
  Object.keys(pkOn).forEach((code) => { pkOn[code] = false })
  Object.keys(uniqueOn).forEach((code) => { uniqueOn[code] = false })
  Object.assign(pythonNode, { name: '多源洪涝数据自动采集', code: DEFAULT_PYTHON })
  extractDimensions.forEach((d) => {
    dims[d.name] = false
    dimFields[d.name] = d.fields
  })
  guardItems.forEach((n) => { guards[n] = false })
  Object.assign(dataGradeForm, { dataset: '', level: '' })
  accessRules.forEach((row) => { accessChoice[row.role] = '' })
  Object.assign(iqrForm, { name: '', field: '', method: '' })
  rainfall.forEach((item) => { item.value = '' })
  qualityRules.forEach((r) => {
    rules[r.id] = false
    qualityDetails[r.id].detail = ''
    qualityDetails[r.id].action = ''
  })
  Object.assign(exportForm, { target: '', format: '' })
  exportItems.forEach((n) => { exportKeeps[n] = false })
  syntaxChecked.value = false
  stopExtract()
  stopRun()
  extractProgress.value = 0
  runStep.value = 0
  running.value = false
  error.value = ''
}

onBeforeUnmount(() => {
  stopExtract()
  stopRun()
})
</script>

<template>
  <PanelShell title="洪涝应急救援数据采集系统" source="数据中台">
    <SystemShell
      system="数据中台"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级点开，进入数据采集中心对应功能页办理业务。"
      :menu="menu"
      :steps="STEPS"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 数据中心 → 数据采集管理 → 新建采集任务 -->
        <template v-if="leaf === 'new-task'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('new-task', () => (taskForm.name.trim() && taskForm.code.trim() ? '' : '任务名称与任务编号为必填项'))">创建任务</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">任务名称</span>
              <input v-model="taskForm.name" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label required">任务编号</span>
              <input v-model="taskForm.code" class="form-control" />
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">数据场景</span>
              <select v-model="taskForm.scene" class="form-control">
                <option value="">请选择</option><option>洪涝应急救援</option><option>日常业务采集</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">采集范围</span>
              <select v-model="taskForm.scope" class="form-control">
                <option value="">请选择</option><option>甲1—甲9网格</option><option>单网格试点</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">采集方式</span>
              <select v-model="taskForm.method" class="form-control">
                <option value="">请选择</option><option>API接口 + 平台数据 + 无人机数据</option><option>人工填报</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">更新方式</span>
              <select v-model="taskForm.refresh" class="form-control">
                <option value="">请选择</option><option>实时更新</option><option>定时更新</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">任务状态</span>
              <select v-model="taskForm.state" class="form-control">
                <option value="">请选择</option><option>启用</option><option>停用</option>
              </select>
            </label>
            <div class="form-item" />
          </div>
          <template v-if="flow.isDone('new-task')">
            <p class="sys-toast">采集任务「{{ taskForm.name }}」创建成功，任务编号 {{ taskForm.code }}。</p>
            <dl class="block-fields">
              <div class="field-row"><dt>数据场景</dt><dd>{{ taskForm.scene }}</dd></div>
              <div class="field-row"><dt>采集范围</dt><dd>{{ taskForm.scope }}</dd></div>
              <div class="field-row"><dt>采集方式</dt><dd>{{ taskForm.method }}</dd></div>
              <div class="field-row"><dt>更新方式</dt><dd>{{ taskForm.refresh }}</dd></div>
              <div class="field-row"><dt>任务状态</dt><dd>{{ taskForm.state }}</dd></div>
            </dl>
          </template>
        </template>

        <!-- 数据源管理 → 添加数据源 -->
        <template v-else-if="leaf === 'add-source'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="save('add-source', () => {
                const unchecked = dataSources.find((src) => sourceChecked(src).length !== src.items.length)
                if (unchecked) return `${unchecked.name} 请勾选全部数据内容`
                if (connectedList.length !== dataSources.length) return `还有 ${dataSources.length - connectedList.length} 个数据源未完成连接测试`
                return ''
              })">保存</button>
          </div>
          <ul class="source-list">
            <li v-for="src in dataSources" :key="src.code">
              <div class="source-head">
                <span class="source-code">{{ src.code }}</span>
                <strong>{{ src.name }}</strong>
                <span v-if="connected[src.code]" class="verdict pass">连接成功</span>
                <button v-else type="button" class="secondary-button test-button"
                  @click="testSource(src.code)">连接测试</button>
              </div>
              <p class="source-type">{{ src.platform }} ｜ {{ src.meta }}</p>
              <p class="form-desc">数据内容</p>
              <div class="checkbox-group tight">
                <label v-for="item in src.items" :key="item" class="checkbox-item">
                  <input v-model="sourceItems[`${src.code}:${item}`]" type="checkbox" />{{ item }}
                </label>
              </div>
            </li>
          </ul>
          <template v-if="flow.isDone('add-source')">
            <p class="sys-toast">4 类数据源均通过授权验证，已接入本次采集任务。</p>
            <ul class="sys-lines">
              <li v-for="src in dataSources" :key="src.code">{{ src.code }} {{ src.name }} · {{ src.meta }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据采集任务 → 字段映射 → 新增字段 -->
        <template v-else-if="leaf === 'add-field'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="oneClickMatch">一键匹配</button>
            <button type="button" class="primary-button"
              @click="save('add-field', fieldMapError)">保存字段映射</button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <thead><tr><th>字段名称</th><th>字段编码</th><th>数据类型</th><th>来源</th><th>主键</th><th>唯一</th></tr></thead>
              <tbody>
                <tr v-for="(row, index) in fieldRows" :key="index">
                  <td><input v-model="row.name" class="form-control" /></td>
                  <td><input v-model="row.code" class="form-control" /></td>
                  <td><input v-model="row.type" class="form-control" /></td>
                  <td><input v-model="row.source" class="form-control" /></td>
                  <td><input v-model="pkOn[fields[index][1]]" type="checkbox" /></td>
                  <td><input v-model="uniqueOn[fields[index][1]]" type="checkbox" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="form-desc">步骤设置：主键勾选网格编号 GRID_ID；唯一性约束勾选网格编号 + 采集时间。</p>
          <template v-if="flow.isDone('add-field')">
            <p class="sys-toast">统一字段模型保存成功，{{ fieldRows.length }} 个字段完成映射。</p>
            <dl class="block-fields">
              <div class="field-row"><dt>主键</dt><dd>GRID_ID</dd></div>
              <div class="field-row"><dt>唯一性约束</dt><dd>GRID_ID + COLLECT_TIME</dd></div>
            </dl>
          </template>
        </template>

        <!-- 任务流程 → 添加节点 → Python脚本 -->
        <template v-else-if="leaf === 'python-node'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="checkSyntax">语法检测</button>
            <button type="button" class="primary-button"
              @click="save('python-node', () => (syntaxChecked ? '' : '请先完成 Python 代码语法检测'))">执行</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">节点名称</span>
              <input v-model="pythonNode.name" class="form-control" />
            </label>
          </div>
          <CodeEditor v-model="pythonNode.code" />
          <p v-if="syntaxChecked" class="sys-toast">Python代码检测通过</p>
          <template v-if="flow.isDone('python-node')">
            <ul class="sys-lines">
              <li v-for="src in dataSources" :key="src.code">{{ src.collect }}</li>
              <li>甲1—甲9：{{ disasterGrids.length }}/{{ disasterGrids.length }} 完成</li>
            </ul>
            <p class="sys-toast">数据采集任务执行完成</p>
          </template>
        </template>

        <!-- 数据处理 → 数据提取 → 新建提取规则 -->
        <template v-else-if="leaf === 'extract-rule'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="extracting" @click="startExtract">
              {{ extracting ? '提取中…' : '开始提取' }}
            </button>
          </div>
          <table class="calc-table compact">
            <thead><tr><th style="width: 56px">提取</th><th style="width: 110px">维度</th><th>提取字段</th></tr></thead>
            <tbody>
              <tr v-for="dim in extractDimensions" :key="dim.name">
                <td><input v-model="dims[dim.name]" type="checkbox" /></td>
                <th scope="row">{{ dim.name }}</th>
                <td>{{ dim.fields }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="extractProgress > 0" class="gauge-track">
            <span class="gauge-fill" :style="{ width: `${extractProgress}%` }" />
          </div>
          <p v-if="extractProgress > 0" class="gauge-caption">数据提取进度：{{ extractProgress }}%</p>
          <template v-if="flow.isDone('extract-rule')">
            <p class="sys-toast">100% —— 数据提取完成</p>
            <ul class="sys-lines">
              <li v-for="dim in chosenDims" :key="dim.name">{{ dim.name }}：{{ dimFields[dim.name] }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据安全中心 → 数据分级分类 -->
        <template v-else-if="leaf === 'data-grade'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button"
              @click="guardItems.forEach((n) => (guards[n] = true))">全部勾选</button>
            <button type="button" class="primary-button"
              @click="save('data-grade', securityError)">启用权限控制</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">数据集</span>
              <select v-model="dataGradeForm.dataset" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in DATASET_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">数据级别</span>
              <select v-model="dataGradeForm.level" class="form-control">
                <option value="">请选择</option><option>敏感数据</option><option>内部数据</option><option>公开数据</option>
              </select>
            </label>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <thead><tr><th>角色</th><th>访问规则</th></tr></thead>
              <tbody>
                <tr v-for="row in accessRules" :key="row.role">
                  <th scope="row">{{ row.role }}</th>
                  <td>
                    <select v-model="accessChoice[row.role]" class="form-control">
                      <option value="">请选择</option>
                      <option v-for="n in ACCESS_OPTIONS" :key="n" :value="n">{{ n }}</option>
                    </select>
                    <span v-if="accessChoice[row.role] === '禁止访问'" class="verdict fail">禁止访问</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="form-desc">安全控制项</p>
          <div class="checkbox-group">
            <label v-for="n in guardItems" :key="n" class="checkbox-item">
              <input v-model="guards[n]" type="checkbox" />{{ n }}
            </label>
          </div>
          <template v-if="flow.isDone('data-grade')">
            <p class="sys-toast">{{ dataGradeForm.level || '数据' }}访问控制已启用</p>
            <ul class="sys-lines">
              <li v-for="row in accessRules" :key="row.role" :class="{ warn: accessChoice[row.role] === '禁止访问' }">{{ row.role }}：{{ accessChoice[row.role] }}</li>
              <li class="info">{{ enabledGuards.join(' ｜ ') }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据质量 → 异常监测 → 新建监测规则 -->
        <template v-else-if="leaf === 'iqr-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" @click="fillKnownRainfall">载入已知降雨量</button>
            <button type="button" class="primary-button"
              @click="save('iqr-rule', () => (iqrForm.name && iqrForm.field && iqrForm.method ? '' : '请用下拉选项完成规则名称、监测字段与监测方法'))">启动监测</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">规则名称</span>
              <select v-model="iqrForm.name" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in IQR_NAME_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">监测字段</span>
              <select v-model="iqrForm.field" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in IQR_FIELD_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">监测方法</span>
              <select v-model="iqrForm.method" class="form-control">
                <option value="">请选择</option>
                <option v-for="n in IQR_METHOD_OPTIONS" :key="n">{{ n }}</option>
              </select>
            </label>
          </div>
          <p class="block-formula">IQR = Q3 － Q1　｜　异常下限 = Q1 － 1.5 × IQR　｜　异常上限 = Q3 ＋ 1.5 × IQR</p>
          <table class="calc-table compact">
            <thead><tr><th>网格</th><th>累计降雨量</th></tr></thead>
            <tbody>
              <tr v-for="item in rainfall" :key="item.grid">
                <th scope="row">{{ item.grid }}</th>
                <td>
                  <select v-model="item.value" class="form-control">
                    <option value="">请选择</option>
                    <option v-for="n in RAINFALL_OPTIONS" :key="n" :value="n">{{ n }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
          <dl class="block-fields">
            <div class="field-row"><dt>异常处置方式</dt><dd>标记异常 → 不自动删除 → 多源复核</dd></div>
            <div class="field-row"><dt>复核数据源</dt><dd>{{ reviewSources.join('、') }}</dd></div>
            <div class="field-row"><dt>异常等级</dt><dd>黄色：统计异常；经多源核验确认为真实极端灾情后转为红色重点关注，不删除原始数据</dd></div>
          </dl>
          <template v-if="flow.isDone('iqr-rule')">
            <p class="sys-toast">异常波动监测——运行中</p>
            <div class="stat-grid">
              <div class="stat-cell"><span class="stat-label">Q1</span><strong class="stat-value">{{ num(iqr.q1, 2) }}</strong></div>
              <div class="stat-cell"><span class="stat-label">Q3</span><strong class="stat-value">{{ num(iqr.q3, 2) }}</strong></div>
              <div class="stat-cell"><span class="stat-label">IQR</span><strong class="stat-value">{{ num(iqr.range, 2) }}</strong></div>
              <div class="stat-cell">
                <span class="stat-label">异常下限 Q1－1.5×IQR</span>
                <strong class="stat-value">{{ num(iqr.lower, 2) }}</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">异常上限 Q3＋1.5×IQR</span>
                <strong class="stat-value accent">{{ num(iqr.upper, 2) }}</strong>
              </div>
            </div>
            <ul class="share-list">
              <li v-for="item in flagged" :key="item.grid">
                <span class="share-name">{{ item.grid }}</span>
                <span class="share-bar">
                  <span class="share-fill" :class="{ warn: item.outlier }" :style="{ width: `${((item.value || 0) / 160) * 100}%` }" />
                </span>
                <span class="share-value">{{ item.display }} mm</span>
                <span class="share-pct">
                  <span class="verdict" :class="item.outlier ? 'warn' : 'pass'">{{ item.outlier ? '统计异常' : '正常' }}</span>
                </span>
              </li>
            </ul>
            <ul class="sys-lines">
              <li v-for="item in outliers" :key="item.grid" class="warn">
                {{ item.grid }} 累计降雨量 {{ item.display }}mm 超出异常上限 {{ num(iqr.upper, 2) }}，黄色统计异常，转多源复核
              </li>
            </ul>
          </template>
        </template>

        <!-- 数据质量 → 质量规则配置 -->
        <template v-else-if="leaf === 'quality-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button"
              @click="qualityRules.forEach((r) => (rules[r.id] = true))">全部启用</button>
            <button type="button" class="primary-button"
              @click="save('quality-rule', () => (enabledRules.length === qualityRules.length ? '' : `还有 ${qualityRules.length - enabledRules.length} 项质量规则未启用`))">启用质量监测</button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>校验内容</th><th>系统动作</th></tr></thead>
              <tbody>
                <tr v-for="rule in qualityRules" :key="rule.id">
                  <td><input v-model="rules[rule.id]" type="checkbox" /></td>
                  <th scope="row">{{ rule.id }}<em class="row-unit">{{ rule.name }}</em></th>
                  <td>{{ rule.detail }}</td>
                  <td>{{ rule.action }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-if="flow.isDone('quality-rule')">
            <p class="sys-toast">4 项数据质量规则已启用并进入运行状态。</p>
            <ul class="sys-lines">
              <li v-for="rule in enabledRules" :key="rule.id">{{ rule.name }} · {{ rule.action }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据采集任务 → 运行采集任务 -->
        <template v-else-if="leaf === 'run-task'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="running" @click="startRun">
              {{ running ? '运行中…' : '运行' }}
            </button>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>采集任务</dt><dd>{{ taskForm.name }}（{{ taskForm.code }}）</dd></div>
            <div class="field-row"><dt>采集范围</dt><dd>{{ taskForm.scope }}</dd></div>
            <div class="field-row"><dt>任务配置</dt><dd>{{ dataSources.length }} 个数据源 ｜ {{ fieldRows.length }} 个映射字段 ｜ {{ enabledRules.length }} 项质量规则</dd></div>
          </dl>
          <ul v-if="runtimeMissing.length" class="sys-lines">
            <li v-for="item in runtimeMissing" :key="item.id" class="warn">{{ item.label }} 尚未配置完成</li>
          </ul>
          <p v-if="running" class="sys-toast">正在逐项执行采集过程，请稍候…</p>

          <template v-if="shownSources.length">
            <div class="calc-subhead"><h3>数据源连接状态</h3></div>
            <ul class="sys-lines">
              <li v-for="src in shownSources" :key="src.code">{{ src.short }}　✅ 正常</li>
            </ul>
          </template>

          <template v-if="shownGrids.length">
            <div class="calc-subhead"><h3>数据采集状态</h3></div>
            <div class="grid-chips">
              <span v-for="grid in shownGrids" :key="grid.id" class="grid-chip done">{{ grid.id }}<em>✅</em></span>
            </div>
          </template>

          <template v-if="showRunStatus">
            <div class="calc-subhead"><h3>系统状态</h3></div>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">采集完成率</span>
                <strong class="stat-value accent">{{ percent(collectedGrids.length / disasterGrids.length, 0) }}</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">数据源连接</span>
                <strong class="stat-value">{{ shownSources.length }}/{{ dataSources.length }}</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">网格覆盖</span>
                <strong class="stat-value">{{ collectedGrids.length }}/{{ disasterGrids.length }}</strong>
              </div>
              <div class="stat-cell"><span class="stat-label">安全监测</span><strong class="stat-value small">运行中</strong></div>
              <div class="stat-cell"><span class="stat-label">异常监测</span><strong class="stat-value small">运行中</strong></div>
            </div>
          </template>

          <template v-if="showRunExport">
            <div class="calc-subhead"><h3>数据导出与同步</h3></div>
            <div class="sys-toolbar">
              <button type="button" class="secondary-button"
                @click="exportItems.forEach((n) => (exportKeeps[n] = true))">全部勾选留痕</button>
              <button type="button" class="primary-button"
                @click="save('data-export', exportError)">导出并同步</button>
            </div>
            <div class="form-row">
              <label class="form-item">
                <span class="form-label">导出对象</span>
                <select v-model="exportForm.target" class="form-control">
                  <option value="">请选择</option>
                  <option>数据共享中心</option>
                  <option>应急预算测算系统</option>
                </select>
              </label>
              <label class="form-item">
                <span class="form-label">导出格式</span>
                <select v-model="exportForm.format" class="form-control">
                  <option value="">请选择</option><option>Excel</option><option>CSV</option>
                </select>
              </label>
            </div>
            <div class="checkbox-group">
              <label v-for="n in exportItems" :key="n" class="checkbox-item">
                <input v-model="exportKeeps[n]" type="checkbox" />{{ n }}
              </label>
            </div>
            <p v-if="flow.isDone('data-export')" class="sys-toast">数据导出成功，已同步至{{ exportForm.target || '数据共享中心' }}。</p>
          </template>
        </template>

        <!-- 数据管理 → 数据导出 -->
        <template v-else-if="leaf === 'data-export'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button"
              @click="exportItems.forEach((n) => (exportKeeps[n] = true))">全部勾选</button>
            <button type="button" class="primary-button"
              @click="save('data-export', exportError)">导出</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">导出对象</span>
              <input v-model="exportForm.target" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">导出格式</span>
              <select v-model="exportForm.format" class="form-control">
                <option value="">请选择</option><option>Excel</option><option>CSV</option>
              </select>
            </label>
          </div>
          <div class="checkbox-group">
            <label v-for="n in exportItems" :key="n" class="checkbox-item">
              <input v-model="exportKeeps[n]" type="checkbox" />{{ n }}
            </label>
          </div>
          <template v-if="flow.isDone('data-export')">
            <p class="sys-toast">数据导出成功</p>
            <dl class="block-fields">
              <div class="field-row"><dt>导出对象</dt><dd>{{ exportForm.target }}</dd></div>
              <div class="field-row"><dt>导出格式</dt><dd>{{ exportForm.format }}</dd></div>
              <div class="field-row"><dt>留痕内容</dt><dd>{{ chosenExports.join('、') }}</dd></div>
              <div class="field-row"><dt>同步去向</dt><dd>数据共享中心</dd></div>
            </dl>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>

<style scoped>
.source-head .test-button {
  margin-left: auto;
}
</style>
