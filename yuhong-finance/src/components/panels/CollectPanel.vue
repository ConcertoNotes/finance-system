<script setup>
// 洪涝应急救援数据采集系统操作台。学生依次执行采集配置动作，每完成一项即显示平台回执并解锁下一项。
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { disasterGrids } from '../../data/costDriver.js'
import { num, percent } from '../../domain/format.js'

const OPS = ['task', 'sources', 'fields', 'script', 'extract', 'security', 'iqr', 'quality', 'runtime', 'export']
const flow = useTaskFlow('s1-t2', OPS)

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

const error = ref('')
const connected = reactive(Object.fromEntries(dataSources.map((s) => [s.code, flow.isDone('sources')])))
const dims = reactive(Object.fromEntries(extractDimensions.map((d) => [d.name, true])))
const guards = reactive(Object.fromEntries(guardItems.map((n) => [n, flow.isDone('security')])))
const rules = reactive(Object.fromEntries(qualityRules.map((r) => [r.id, flow.isDone('quality')])))
const exportKeeps = reactive(Object.fromEntries(exportItems.map((n) => [n, flow.isDone('export')])))

const dataLevel = ref('敏感数据')
const exportFormat = ref('Excel')
const syntaxChecked = ref(flow.isDone('script'))
const extracting = ref(false)
const extractProgress = ref(flow.isDone('extract') ? 100 : 0)
let extractTimer = null

const connectedList = computed(() => dataSources.filter((s) => connected[s.code]))
const chosenDims = computed(() => extractDimensions.filter((d) => dims[d.name]))
const enabledGuards = computed(() => guardItems.filter((n) => guards[n]))
const enabledRules = computed(() => qualityRules.filter((r) => rules[r.id]))
const chosenExports = computed(() => exportItems.filter((n) => exportKeeps[n]))
const collectedGrids = computed(() => (flow.isDone('runtime') ? disasterGrids.map((g) => g.id) : []))

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

function run(id, check) {
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
  if (extracting.value || flow.isDone('extract')) return
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
      flow.complete('extract')
    }
  }, 700)
}

function enableAllGuards() {
  guardItems.forEach((n) => { guards[n] = true })
}

function enableAllRules() {
  qualityRules.forEach((r) => { rules[r.id] = true })
}

function selectAllExports() {
  exportItems.forEach((n) => { exportKeeps[n] = true })
}

function securityError() {
  if (dataLevel.value !== '敏感数据') return '灾情数据包含人员与救援信息，数据级别须设置为敏感数据'
  if (enabledGuards.value.length < guardItems.length) {
    return `还有 ${guardItems.length - enabledGuards.value.length} 项安全控制未勾选`
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
  <PanelShell title="洪涝应急救援数据采集系统" source="数据采集中心">
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
        title="新建采集任务"
        hint="数据中心 → 数据采集管理 → 新建采集任务"
        :status="flow.status('task')"
        done-label="任务已创建"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label required">任务名称</span>
            <input v-model="taskForm.name" class="form-control" :disabled="flow.isDone('task')" />
          </label>
          <label class="form-item">
            <span class="form-label required">任务编号</span>
            <input v-model="taskForm.code" class="form-control" :disabled="flow.isDone('task')" />
          </label>
        </div>
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">数据场景</span>
            <select v-model="taskForm.scene" class="form-control" :disabled="flow.isDone('task')">
              <option>洪涝应急救援</option><option>日常业务采集</option>
            </select>
          </label>
          <label class="form-item">
            <span class="form-label required">采集范围</span>
            <select v-model="taskForm.scope" class="form-control" :disabled="flow.isDone('task')">
              <option>甲1—甲9网格</option><option>单网格试点</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">采集方式</span>
            <select v-model="taskForm.method" class="form-control" :disabled="flow.isDone('task')">
              <option>API接口 + 平台数据 + 无人机数据</option><option>人工填报</option>
            </select>
          </label>
          <label class="form-item">
            <span class="form-label">更新方式</span>
            <select v-model="taskForm.refresh" class="form-control" :disabled="flow.isDone('task')">
              <option>实时更新</option><option>定时更新</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">任务状态</span>
            <select v-model="taskForm.state" class="form-control" :disabled="flow.isDone('task')">
              <option>启用</option><option>停用</option>
            </select>
          </label>
        </div>
        <div class="action-row">
          <button
            type="button"
            class="primary-button"
            :disabled="flow.isDone('task')"
            @click="run('task', () => (taskForm.name.trim() && taskForm.code.trim() ? '' : '任务名称与任务编号为必填项'))"
          >创建任务</button>
        </div>

        <template #result>
          <p class="sys-toast">采集任务「{{ taskForm.name }}」创建成功，任务编号 {{ taskForm.code }}。</p>
          <dl class="block-fields">
            <div class="field-row"><dt>数据场景</dt><dd>{{ taskForm.scene }}</dd></div>
            <div class="field-row"><dt>采集范围</dt><dd>{{ taskForm.scope }}</dd></div>
            <div class="field-row"><dt>采集方式</dt><dd>{{ taskForm.method }}</dd></div>
            <div class="field-row"><dt>更新方式</dt><dd>{{ taskForm.refresh }}</dd></div>
            <div class="field-row"><dt>任务状态</dt><dd>{{ taskForm.state }}</dd></div>
          </dl>
        </template>
      </OperationBlock>

      <OperationBlock
        title="配置多源数据接口"
        hint="数据源管理 → 添加数据源"
        :status="flow.status('sources')"
        done-label="4/4 连接成功"
      >
        <ul class="source-list">
          <li v-for="src in dataSources" :key="src.code">
            <div class="source-head">
              <span class="source-code">{{ src.code }}</span>
              <strong>{{ src.name }}</strong>
              <span v-if="connected[src.code]" class="verdict pass">连接成功</span>
              <button
                v-else
                type="button"
                class="secondary-button test-button"
                :disabled="flow.isDone('sources')"
                @click="testSource(src.code)"
              >连接测试</button>
            </div>
            <p class="source-type">{{ src.platform }} ｜ {{ src.meta }}</p>
            <p class="source-content">数据内容：{{ src.content }}</p>
          </li>
        </ul>
        <div class="action-row">
          <button
            type="button"
            class="primary-button"
            :disabled="flow.isDone('sources')"
            @click="run('sources', () => (connectedList.length === dataSources.length ? '' : `还有 ${dataSources.length - connectedList.length} 个数据源未完成连接测试`))"
          >保存数据源配置</button>
        </div>

        <template #result>
          <p class="sys-toast">4 类数据源均通过授权验证，已接入本次采集任务。</p>
          <ul class="sys-lines">
            <li v-for="src in dataSources" :key="src.code">{{ src.code }} {{ src.name }} · {{ src.meta }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="配置数据字段"
        hint="数据采集任务 → 字段映射 → 新增字段"
        :status="flow.status('fields')"
        done-label="字段映射已保存"
      >
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('fields')" @click="run('fields')">保存字段映射</button>
        </div>

        <template #result>
          <p class="sys-toast">统一字段模型保存成功，{{ fields.length }} 个字段完成映射。</p>
          <dl class="block-fields">
            <div class="field-row"><dt>主键</dt><dd>网格编号 GRID_ID</dd></div>
            <div class="field-row"><dt>唯一性约束</dt><dd>网格编号 + 采集时间</dd></div>
          </dl>
          <p class="calc-caption">各平台原始数据已映射为统一的九网格灾情数据结构。</p>
        </template>
      </OperationBlock>

      <OperationBlock
        title="配置 Python 数据采集节点"
        hint="任务流程 → 添加节点 → Python脚本"
        :status="flow.status('script')"
        done-label="采集执行完成"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">节点名称</span>
            <input class="form-control locked" value="多源洪涝数据自动采集" disabled />
          </label>
        </div>
        <pre class="block-code">{{ pythonCode }}</pre>
        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="syntaxChecked" @click="checkSyntax">语法检测</button>
          <button
            type="button"
            class="primary-button"
            :disabled="flow.isDone('script')"
            @click="run('script', () => (syntaxChecked ? '' : '请先完成 Python 代码语法检测'))"
          >执行</button>
        </div>
        <p v-if="syntaxChecked" class="sys-toast">Python代码检测通过</p>

        <template #result>
          <ul class="sys-lines">
            <li v-for="src in dataSources" :key="src.code">{{ src.collect }}</li>
            <li>甲1—甲9：{{ disasterGrids.length }}/{{ disasterGrids.length }} 完成</li>
          </ul>
          <p class="sys-toast">数据采集任务执行完成</p>
        </template>
      </OperationBlock>

      <OperationBlock
        title="多维度数据提取"
        hint="数据处理 → 数据提取 → 新建提取规则"
        :status="flow.status('extract')"
        done-label="提取完成 100%"
      >
        <table class="calc-table compact">
          <thead><tr><th style="width: 56px">提取</th><th style="width: 110px">维度</th><th>提取字段</th></tr></thead>
          <tbody>
            <tr v-for="dim in extractDimensions" :key="dim.name">
              <td><input v-model="dims[dim.name]" type="checkbox" :disabled="flow.isDone('extract')" /></td>
              <th scope="row">{{ dim.name }}</th>
              <td>{{ dim.fields }}</td>
            </tr>
          </tbody>
        </table>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="extracting || flow.isDone('extract')" @click="startExtract">
            {{ extracting ? '提取中…' : '开始提取' }}
          </button>
        </div>
        <div v-if="extractProgress > 0" class="gauge-track">
          <span class="gauge-fill" :style="{ width: `${extractProgress}%` }" />
        </div>
        <p v-if="extractProgress > 0" class="gauge-caption">数据提取进度：{{ extractProgress }}%</p>

        <template #result>
          <p class="sys-toast">100% —— 数据提取完成</p>
          <ul class="sys-lines">
            <li v-for="dim in chosenDims" :key="dim.name">{{ dim.name }}：{{ dim.fields }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="设置数据访问权限"
        hint="数据安全中心 → 数据分级分类"
        :status="flow.status('security')"
        done-label="访问控制已启用"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">数据集</span>
            <input class="form-control locked" value="洪涝应急救援九网格数据" disabled />
          </label>
          <label class="form-item">
            <span class="form-label required">数据级别</span>
            <select v-model="dataLevel" class="form-control" :disabled="flow.isDone('security')">
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
            <input v-model="guards[n]" type="checkbox" :disabled="flow.isDone('security')" />{{ n }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="flow.isDone('security')" @click="enableAllGuards">全部勾选</button>
          <button
            type="button"
            class="primary-button"
            :disabled="flow.isDone('security')"
            @click="run('security', securityError)"
          >启用权限控制</button>
        </div>

        <template #result>
          <p class="sys-toast">敏感数据访问控制已启用</p>
          <ul class="sys-lines">
            <li v-for="row in accessRules" :key="row.role" :class="{ warn: row.denied }">{{ row.role }}：{{ row.access }}</li>
            <li class="info">{{ enabledGuards.join(' ｜ ') }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="累计降雨量异常波动监测"
        hint="数据质量 → 异常监测 → 新建监测规则"
        :status="flow.status('iqr')"
        done-label="监测运行中"
      >
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('iqr')" @click="run('iqr')">启动监测</button>
        </div>

        <template #result>
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
          <p class="calc-note">
            统计异常不等于错误数据：系统只标记不删除，须结合{{ reviewSources.join('、') }}进一步复核；
            经多源核验确认为真实极端灾情后转为红色重点关注，保留原始数据。
          </p>
        </template>
      </OperationBlock>

      <OperationBlock
        title="设置数据质量规则"
        hint="数据质量 → 质量规则配置"
        :status="flow.status('quality')"
        done-label="4 项规则运行中"
      >
        <div class="score-table-wrap">
          <table class="calc-table compact">
            <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>校验内容</th><th>系统动作</th></tr></thead>
            <tbody>
              <tr v-for="rule in qualityRules" :key="rule.id">
                <td><input v-model="rules[rule.id]" type="checkbox" :disabled="flow.isDone('quality')" /></td>
                <th scope="row">{{ rule.id }}<em class="row-unit">{{ rule.name }}</em></th>
                <td>{{ rule.detail }}</td>
                <td>{{ rule.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="flow.isDone('quality')" @click="enableAllRules">全部启用</button>
          <button
            type="button"
            class="primary-button"
            :disabled="flow.isDone('quality')"
            @click="run('quality', () => (enabledRules.length === qualityRules.length ? '' : `还有 ${qualityRules.length - enabledRules.length} 项质量规则未启用`))"
          >启用质量监测</button>
        </div>

        <template #result>
          <p class="sys-toast">4 项数据质量规则已启用并进入运行状态。</p>
          <ul class="sys-lines">
            <li v-for="rule in enabledRules" :key="rule.id">{{ rule.name }} · {{ rule.action === '—' ? rule.detail : rule.action }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="运行采集系统"
        hint="洪涝应急救援数据采集任务 → 运行"
        :status="flow.status('runtime')"
        done-label="采集系统运行正常"
      >
        <p class="calc-caption">
          任务「{{ taskForm.name }}」配置已就绪：{{ dataSources.length }} 个数据源、{{ fields.length }} 个映射字段、
          {{ enabledRules.length }} 项质量规则、异常波动监测。
        </p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('runtime')" @click="run('runtime')">运行</button>
        </div>

        <template #result>
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
      </OperationBlock>

      <OperationBlock
        title="导出数据源"
        hint="数据管理 → 数据导出"
        :status="flow.status('export')"
        done-label="数据已导出"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">导出对象</span>
            <input class="form-control locked" value="《洪涝应急救援九网格原始数据表》" disabled />
          </label>
          <label class="form-item">
            <span class="form-label">导出格式</span>
            <select v-model="exportFormat" class="form-control" :disabled="flow.isDone('export')">
              <option>Excel</option><option>CSV</option>
            </select>
          </label>
        </div>
        <div class="checkbox-group">
          <label v-for="n in exportItems" :key="n" class="checkbox-item">
            <input v-model="exportKeeps[n]" type="checkbox" :disabled="flow.isDone('export')" />{{ n }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="flow.isDone('export')" @click="selectAllExports">全部勾选</button>
          <button
            type="button"
            class="primary-button"
            :disabled="flow.isDone('export')"
            @click="run('export', () => (chosenExports.length === exportItems.length ? '' : `还有 ${exportItems.length - chosenExports.length} 项导出留痕未勾选`))"
          >导出</button>
        </div>

        <template #result>
          <p class="sys-toast">数据导出成功</p>
          <dl class="block-fields">
            <div class="field-row"><dt>导出对象</dt><dd>《洪涝应急救援九网格原始数据表》</dd></div>
            <div class="field-row"><dt>导出格式</dt><dd>{{ exportFormat }}</dd></div>
            <div class="field-row"><dt>留痕内容</dt><dd>{{ chosenExports.join('、') }}</dd></div>
            <div class="field-row"><dt>同步去向</dt><dd>数据共享中心</dd></div>
          </dl>
          <div class="calc-result">
            <p class="result-line">
              应急管理、气象监测、无人机巡航与御洪星四类数据源已接入，甲1—甲9 九网格灾情数据完成采集与多维提取；
              敏感数据授权访问、操作留痕与 IQR 异常波动监测同步运行，标准化数据源已导出至数据共享中心，可进入灾情数据清洗。
            </p>
          </div>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>

<style scoped>
.source-head .test-button {
  margin-left: auto;
}
</style>
