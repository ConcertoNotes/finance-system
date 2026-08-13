<script setup>
// 数据中台 · 洪涝应急救援数据采集系统。
// 工作簿里的「数据中心 → 数据采集管理 → 新建采集任务」是要逐级点开的菜单，不是标题。
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
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
const flow = useTaskFlow('s1-t2', PAGES)

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
  name: '洪涝应急救援数据采集',
  code: 'CJ-2026-001',
  scene: '洪涝应急救援',
  scope: '甲1—甲9网格',
  method: 'API接口 + 平台数据 + 无人机数据',
  refresh: '实时更新',
  state: '启用',
})

const dataSources = [
  {
    code: '数据源01',
    platform: '应急管理局平台',
    short: '应急管理局',
    name: '应急管理局灾情数据',
    meta: '数据源类型：API接口 ｜ 数据更新：实时 ｜ 接口状态：已授权',
    content: '受灾人数、被困人数、转移安置人数、特殊人群、道路中断情况',
    collect: '应急管理局数据：采集成功',
  },
  {
    code: '数据源02',
    platform: '气象局平台',
    short: '气象局',
    name: '气象监测数据',
    meta: '数据源类型：API接口 ｜ 更新频率：实时 ｜ 数据权限：授权访问',
    content: '累计降雨量、实时水位',
    collect: '气象局数据：采集成功',
  },
  {
    code: '数据源03',
    platform: '无人机巡航平台',
    short: '无人机平台',
    name: '无人机巡航数据',
    meta: '更新方式：巡航后自动上传 ｜ 数据用途：灾情数据交叉验证',
    content: '网格编号、巡航时间、灾情影像、道路状态、现场灾情复核结果',
    collect: '无人机数据：采集成功',
  },
  {
    code: '数据源04',
    platform: '「御洪星」智能接警数据',
    short: '御洪星',
    name: '御洪星灾区需求数据',
    meta: '数据类型：语音转译/结构化数据 ｜ 数据状态：实时同步',
    content: '网格编号、需求物资、紧急程度、上报时间',
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

const pythonCode = `import pandas as pd
from datetime import datetime

# 模拟读取各平台接口数据
emergency = pd.read_excel("应急管理局灾情数据.xlsx")
weather = pd.read_excel("气象监测数据.xlsx")
uav = pd.read_excel("无人机巡航数据.xlsx")

# 按网格编号合并多源数据
data = emergency.merge(
    weather,
    on="网格编号",
    how="left"
).merge(
    uav,
    on="网格编号",
    how="left"
)

# 写入采集时间
data["采集时间"] = datetime.now()

# 标记数据来源
data["数据来源"] = "应急管理局+气象局+无人机巡航"

print("数据采集完成")
print("采集网格数：", data["网格编号"].nunique())
print("采集记录数：", len(data))`

const extractDimensions = [
  { name: '人员维度', fields: '受灾人数、被困人数、转移安置人数、特殊人群人数' },
  { name: '灾情维度', fields: '累计降雨量、实时水位、道路中断状态' },
  { name: '空间维度', fields: '网格编号、网格名称、距仓库距离' },
  { name: '时间维度', fields: '数据采集时间、数据更新时间' },
]

const extractCheckpoints = [25, 52, 78, 100]

const accessRules = [
  { role: '财务主管统筹岗', access: '查看全部', denied: false },
  { role: '应急预算绩效岗', access: '授权读取、分析', denied: false },
  { role: '采购成本保障岗', access: '授权读取、维护采集任务', denied: false },
  { role: '资金核算风控岗', access: '按业务需要读取', denied: false },
  { role: '数字人御洪星', access: '采集、识别、风险提示', denied: false },
  { role: '非授权用户', access: '禁止访问', denied: true },
]

const guardItems = ['用户身份认证', '数据访问日志', '操作留痕', '下载权限控制', '异常访问预警']

const reviewSources = ['气象局监测数据', '无人机巡航影像', '应急管理部门报送数据']

// 累计降雨量原始值，IQR 四分位距法识别统计异常。
const rainfall = [
  { grid: '甲1', value: 92 }, { grid: '甲2', value: 88 }, { grid: '甲3', value: 156 },
  { grid: '甲4', value: 101 }, { grid: '甲5', value: 110 }, { grid: '甲6', value: 148 },
  { grid: '甲7', value: 96 }, { grid: '甲8', value: 85 }, { grid: '甲9', value: 99 },
]

const qualityRules = [
  { id: '规则1', name: '完整性检查', detail: '网格编号、受灾人数、转移安置人数、降雨量、水位、数据来源、采集时间', action: '出现空值 → 黄色预警' },
  { id: '规则2', name: '唯一性检查', detail: '主键：网格编号 + 采集时间', action: '发现重复 → 进入待清洗区' },
  { id: '规则3', name: '及时性检查', detail: '数据更新时间超过设定时间', action: '触发数据迟报预警' },
  { id: '规则4', name: '来源一致性检查', detail: '关键灾情数据至少进行应急管理数据 + 气象/无人机数据交叉验证', action: '—' },
]

const exportItems = ['保留数据来源', '保留采集时间', '保留异常标记', '保留数据版本号']

// 运行采集任务前必须就位的配置页，运行报告里的每一项状态都来自这些功能页。
const runtimeRequired = [
  { id: 'add-source', label: '数据源接入' },
  { id: 'python-node', label: '采集脚本' },
  { id: 'data-grade', label: '数据分级分类' },
  { id: 'iqr-rule', label: '异常监测' },
]

const connected = reactive(Object.fromEntries(dataSources.map((s) => [s.code, flow.isDone('add-source')])))
const dims = reactive(Object.fromEntries(extractDimensions.map((d) => [d.name, true])))
const guards = reactive(Object.fromEntries(guardItems.map((n) => [n, flow.isDone('data-grade')])))
const rules = reactive(Object.fromEntries(qualityRules.map((r) => [r.id, flow.isDone('quality-rule')])))
const exportKeeps = reactive(Object.fromEntries(exportItems.map((n) => [n, flow.isDone('data-export')])))

const dataLevel = ref('敏感数据')
const exportFormat = ref('Excel')
const syntaxChecked = ref(flow.isDone('python-node'))
const extracting = ref(false)
const extractProgress = ref(flow.isDone('extract-rule') ? 100 : 0)
let extractTimer = null

const connectedList = computed(() => dataSources.filter((s) => connected[s.code]))
const chosenDims = computed(() => extractDimensions.filter((d) => dims[d.name]))
const enabledGuards = computed(() => guardItems.filter((n) => guards[n]))
const enabledRules = computed(() => qualityRules.filter((r) => rules[r.id]))
const chosenExports = computed(() => exportItems.filter((n) => exportKeeps[n]))
const collectedGrids = computed(() => (flow.isDone('run-task') ? disasterGrids.map((g) => g.id) : []))
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

const iqr = computed(() => {
  const sorted = rainfall.map((item) => item.value).sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const range = q3 - q1
  return { q1, q3, range, lower: q1 - 1.5 * range, upper: q3 + 1.5 * range }
})

const flagged = computed(() =>
  rainfall.map((item) => ({
    ...item,
    outlier: item.value > iqr.value.upper || item.value < iqr.value.lower,
  })),
)

const outliers = computed(() => flagged.value.filter((item) => item.outlier))

function save(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function testSource(code) {
  connected[code] = true
  error.value = ''
}

function checkSyntax() {
  syntaxChecked.value = true
  error.value = ''
}

function startExtract() {
  if (extracting.value || flow.isDone('extract-rule')) return
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
      flow.complete('extract-rule')
    }
  }, 700)
}

function securityError() {
  if (dataLevel.value !== '敏感数据') return '灾情数据包含人员与救援信息，数据级别须设置为敏感数据'
  if (enabledGuards.value.length < guardItems.length) {
    return `还有 ${guardItems.length - enabledGuards.value.length} 项安全控制未勾选`
  }
  return ''
}

function runtimeError() {
  if (!runtimeMissing.value.length) return ''
  return `采集任务尚未就绪：${runtimeMissing.value.map((item) => item.label).join('、')} 未配置完成`
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
  dataSources.forEach((s) => { connected[s.code] = false })
  extractDimensions.forEach((d) => { dims[d.name] = true })
  guardItems.forEach((n) => { guards[n] = false })
  qualityRules.forEach((r) => { rules[r.id] = false })
  exportItems.forEach((n) => { exportKeeps[n] = false })
  dataLevel.value = '敏感数据'
  exportFormat.value = 'Excel'
  syntaxChecked.value = false
  stopExtract()
  extractProgress.value = 0
  error.value = ''
}

onBeforeUnmount(stopExtract)
</script>

<template>
  <PanelShell title="洪涝应急救援数据采集系统" source="数据中台">
    <SystemShell
      system="数据中台"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级点开，进入数据采集中心对应功能页办理业务。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 数据中心 → 数据采集管理 → 新建采集任务 -->
        <template v-if="leaf === 'new-task'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('new-task')"
              @click="save('new-task', () => (taskForm.name.trim() && taskForm.code.trim() ? '' : '任务名称与任务编号为必填项'))">创建任务</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">任务名称</span>
              <input v-model="taskForm.name" class="form-control" :disabled="flow.isDone('new-task')" />
            </label>
            <label class="form-item">
              <span class="form-label required">任务编号</span>
              <input v-model="taskForm.code" class="form-control" :disabled="flow.isDone('new-task')" />
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">数据场景</span>
              <select v-model="taskForm.scene" class="form-control" :disabled="flow.isDone('new-task')">
                <option>洪涝应急救援</option><option>日常业务采集</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">采集范围</span>
              <select v-model="taskForm.scope" class="form-control" :disabled="flow.isDone('new-task')">
                <option>甲1—甲9网格</option><option>单网格试点</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">采集方式</span>
              <select v-model="taskForm.method" class="form-control" :disabled="flow.isDone('new-task')">
                <option>API接口 + 平台数据 + 无人机数据</option><option>人工填报</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">更新方式</span>
              <select v-model="taskForm.refresh" class="form-control" :disabled="flow.isDone('new-task')">
                <option>实时更新</option><option>定时更新</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">任务状态</span>
              <select v-model="taskForm.state" class="form-control" :disabled="flow.isDone('new-task')">
                <option>启用</option><option>停用</option>
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
            <button type="button" class="primary-button" :disabled="flow.isDone('add-source')"
              @click="save('add-source', () => (connectedList.length === dataSources.length ? '' : `还有 ${dataSources.length - connectedList.length} 个数据源未完成连接测试`))">保存</button>
          </div>
          <ul class="source-list">
            <li v-for="src in dataSources" :key="src.code">
              <div class="source-head">
                <span class="source-code">{{ src.code }}</span>
                <strong>{{ src.name }}</strong>
                <span v-if="connected[src.code]" class="verdict pass">连接成功</span>
                <button v-else type="button" class="secondary-button test-button" :disabled="flow.isDone('add-source')"
                  @click="testSource(src.code)">连接测试</button>
              </div>
              <p class="source-type">{{ src.platform }} ｜ {{ src.meta }}</p>
              <p class="source-content">数据内容：{{ src.content }}</p>
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
            <button type="button" class="primary-button" :disabled="flow.isDone('add-field')"
              @click="save('add-field')">保存字段映射</button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th>字段名称</th><th>字段编码</th><th>数据类型</th><th>来源</th></tr></thead>
              <tbody>
                <tr v-for="row in fields" :key="row[1]">
                  <th scope="row">{{ row[0] }}</th><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td>{{ row[3] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">主键</span>
              <input class="form-control locked" value="网格编号 GRID_ID" disabled />
            </label>
            <label class="form-item">
              <span class="form-label">唯一性约束</span>
              <input class="form-control locked" value="网格编号 + 采集时间" disabled />
            </label>
          </div>
          <template v-if="flow.isDone('add-field')">
            <p class="sys-toast">统一字段模型保存成功，{{ fields.length }} 个字段完成映射。</p>
            <dl class="block-fields">
              <div class="field-row"><dt>主键</dt><dd>网格编号 GRID_ID</dd></div>
              <div class="field-row"><dt>唯一性约束</dt><dd>网格编号 + 采集时间</dd></div>
            </dl>
          </template>
        </template>

        <!-- 任务流程 → 添加节点 → Python脚本 -->
        <template v-else-if="leaf === 'python-node'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="syntaxChecked" @click="checkSyntax">语法检测</button>
            <button type="button" class="primary-button" :disabled="flow.isDone('python-node')"
              @click="save('python-node', () => (syntaxChecked ? '' : '请先完成 Python 代码语法检测'))">执行</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">节点名称</span>
              <input class="form-control locked" value="多源洪涝数据自动采集" disabled />
            </label>
          </div>
          <pre class="block-code">{{ pythonCode }}</pre>
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
            <button type="button" class="primary-button" :disabled="extracting || flow.isDone('extract-rule')" @click="startExtract">
              {{ extracting ? '提取中…' : '开始提取' }}
            </button>
          </div>
          <table class="calc-table compact">
            <thead><tr><th style="width: 56px">提取</th><th style="width: 110px">维度</th><th>提取字段</th></tr></thead>
            <tbody>
              <tr v-for="dim in extractDimensions" :key="dim.name">
                <td><input v-model="dims[dim.name]" type="checkbox" :disabled="flow.isDone('extract-rule')" /></td>
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
              <li v-for="dim in chosenDims" :key="dim.name">{{ dim.name }}：{{ dim.fields }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据安全中心 → 数据分级分类 -->
        <template v-else-if="leaf === 'data-grade'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="flow.isDone('data-grade')"
              @click="guardItems.forEach((n) => (guards[n] = true))">全部勾选</button>
            <button type="button" class="primary-button" :disabled="flow.isDone('data-grade')"
              @click="save('data-grade', securityError)">启用权限控制</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">数据集</span>
              <input class="form-control locked" value="洪涝应急救援九网格数据" disabled />
            </label>
            <label class="form-item">
              <span class="form-label required">数据级别</span>
              <select v-model="dataLevel" class="form-control" :disabled="flow.isDone('data-grade')">
                <option>敏感数据</option><option>内部数据</option><option>公开数据</option>
              </select>
            </label>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th>角色</th><th>访问规则</th></tr></thead>
              <tbody>
                <tr v-for="row in accessRules" :key="row.role">
                  <th scope="row">{{ row.role }}</th>
                  <td>
                    <span v-if="row.denied" class="verdict fail">{{ row.access }}</span>
                    <template v-else>{{ row.access }}</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="form-desc">安全控制项</p>
          <div class="checkbox-group">
            <label v-for="n in guardItems" :key="n" class="checkbox-item">
              <input v-model="guards[n]" type="checkbox" :disabled="flow.isDone('data-grade')" />{{ n }}
            </label>
          </div>
          <template v-if="flow.isDone('data-grade')">
            <p class="sys-toast">敏感数据访问控制已启用</p>
            <ul class="sys-lines">
              <li v-for="row in accessRules" :key="row.role" :class="{ warn: row.denied }">{{ row.role }}：{{ row.access }}</li>
              <li class="info">{{ enabledGuards.join(' ｜ ') }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据质量 → 异常监测 → 新建监测规则 -->
        <template v-else-if="leaf === 'iqr-rule'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('iqr-rule')"
              @click="save('iqr-rule')">启动监测</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">规则名称</span>
              <input class="form-control locked" value="累计降雨量异常波动监测" disabled />
            </label>
            <label class="form-item">
              <span class="form-label">监测字段</span>
              <input class="form-control locked" value="累计降雨量" disabled />
            </label>
            <label class="form-item">
              <span class="form-label">监测方法</span>
              <input class="form-control locked" value="IQR四分位距法" disabled />
            </label>
          </div>
          <p class="block-formula">IQR = Q3 － Q1　｜　异常下限 = Q1 － 1.5 × IQR　｜　异常上限 = Q3 ＋ 1.5 × IQR</p>
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
                  <span class="share-fill" :class="{ warn: item.outlier }" :style="{ width: `${(item.value / 160) * 100}%` }" />
                </span>
                <span class="share-value">{{ item.value }} mm</span>
                <span class="share-pct">
                  <span class="verdict" :class="item.outlier ? 'warn' : 'pass'">{{ item.outlier ? '统计异常' : '正常' }}</span>
                </span>
              </li>
            </ul>
            <ul class="sys-lines">
              <li v-for="item in outliers" :key="item.grid" class="warn">
                {{ item.grid }} 累计降雨量 {{ item.value }}mm 超出异常上限 {{ num(iqr.upper, 2) }}，黄色统计异常，转多源复核
              </li>
            </ul>
          </template>
        </template>

        <!-- 数据质量 → 质量规则配置 -->
        <template v-else-if="leaf === 'quality-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="flow.isDone('quality-rule')"
              @click="qualityRules.forEach((r) => (rules[r.id] = true))">全部启用</button>
            <button type="button" class="primary-button" :disabled="flow.isDone('quality-rule')"
              @click="save('quality-rule', () => (enabledRules.length === qualityRules.length ? '' : `还有 ${qualityRules.length - enabledRules.length} 项质量规则未启用`))">启用质量监测</button>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>校验内容</th><th>系统动作</th></tr></thead>
              <tbody>
                <tr v-for="rule in qualityRules" :key="rule.id">
                  <td><input v-model="rules[rule.id]" type="checkbox" :disabled="flow.isDone('quality-rule')" /></td>
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
              <li v-for="rule in enabledRules" :key="rule.id">{{ rule.name }} · {{ rule.action === '—' ? rule.detail : rule.action }}</li>
            </ul>
          </template>
        </template>

        <!-- 数据采集任务 → 运行采集任务 -->
        <template v-else-if="leaf === 'run-task'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('run-task')"
              @click="save('run-task', runtimeError)">运行</button>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>采集任务</dt><dd>{{ taskForm.name }}（{{ taskForm.code }}）</dd></div>
            <div class="field-row"><dt>采集范围</dt><dd>{{ taskForm.scope }}</dd></div>
            <div class="field-row"><dt>任务配置</dt><dd>{{ dataSources.length }} 个数据源 ｜ {{ fields.length }} 个映射字段 ｜ {{ enabledRules.length }} 项质量规则</dd></div>
          </dl>
          <ul v-if="runtimeMissing.length" class="sys-lines">
            <li v-for="item in runtimeMissing" :key="item.id" class="warn">{{ item.label }} 尚未配置完成</li>
          </ul>
          <template v-if="flow.isDone('run-task')">
            <div class="calc-subhead"><h3>数据源连接状态</h3></div>
            <ul class="sys-lines">
              <li v-for="src in dataSources" :key="src.code">{{ src.short }}　✅ 正常</li>
            </ul>
            <div class="calc-subhead"><h3>数据采集状态</h3></div>
            <div class="grid-chips">
              <span v-for="grid in disasterGrids" :key="grid.id" class="grid-chip done">{{ grid.id }}<em>✅</em></span>
            </div>
            <div class="calc-subhead"><h3>系统状态</h3></div>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">采集完成率</span>
                <strong class="stat-value accent">{{ percent(collectedGrids.length / disasterGrids.length, 0) }}</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">数据源连接</span>
                <strong class="stat-value">{{ connectedList.length }}/{{ dataSources.length }}</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">网格覆盖</span>
                <strong class="stat-value">{{ collectedGrids.length }}/{{ disasterGrids.length }}</strong>
              </div>
              <div class="stat-cell"><span class="stat-label">安全监测</span><strong class="stat-value small">运行中</strong></div>
              <div class="stat-cell"><span class="stat-label">异常监测</span><strong class="stat-value small">运行中</strong></div>
            </div>
          </template>
        </template>

        <!-- 数据管理 → 数据导出 -->
        <template v-else-if="leaf === 'data-export'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="flow.isDone('data-export')"
              @click="exportItems.forEach((n) => (exportKeeps[n] = true))">全部勾选</button>
            <button type="button" class="primary-button" :disabled="flow.isDone('data-export')"
              @click="save('data-export', exportError)">导出</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">导出对象</span>
              <input class="form-control locked" value="《洪涝应急救援九网格原始数据表》" disabled />
            </label>
            <label class="form-item">
              <span class="form-label">导出格式</span>
              <select v-model="exportFormat" class="form-control" :disabled="flow.isDone('data-export')">
                <option>Excel</option><option>CSV</option>
              </select>
            </label>
          </div>
          <div class="checkbox-group">
            <label v-for="n in exportItems" :key="n" class="checkbox-item">
              <input v-model="exportKeeps[n]" type="checkbox" :disabled="flow.isDone('data-export')" />{{ n }}
            </label>
          </div>
          <template v-if="flow.isDone('data-export')">
            <p class="sys-toast">数据导出成功</p>
            <dl class="block-fields">
              <div class="field-row"><dt>导出对象</dt><dd>《洪涝应急救援九网格原始数据表》</dd></div>
              <div class="field-row"><dt>导出格式</dt><dd>{{ exportFormat }}</dd></div>
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
