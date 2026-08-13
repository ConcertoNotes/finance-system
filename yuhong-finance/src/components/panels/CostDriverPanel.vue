<script setup>
// 应急预算测算系统。学生登录后逐级点开菜单，在功能页载入灾情、配置参数并回写测算结果。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import {
  budgetParameters,
  coreFormulas,
  disasterGrids,
  equipmentItems,
  executionNote,
  params as baseParams,
} from '../../data/costDriver.js'
import { calculateBudgetSummary, calculateCostComposition, calculateGridBudgets } from '../../domain/costDriver.js'
import { money, num, percent } from '../../domain/format.js'

const PAGES = ['grids', 'params', 'convert', 'equipment', 'summary']
const flow = useTaskFlow('s1-t5', PAGES)
const store = useFormPersist('s1-t5')

const menu = [
  {
    id: 'm-budget',
    label: '预算管理',
    children: [
      {
        id: 'm-budget-prep',
        label: '应急预算编制',
        children: [{ id: 'grids', label: '灾情数据载入' }],
      },
    ],
  },
  {
    id: 'm-base',
    label: '基础设置',
    children: [
      {
        id: 'm-base-param',
        label: '预算参数',
        children: [{ id: 'params', label: '保障标准配置' }],
      },
    ],
  },
  {
    id: 'm-calc',
    label: '预算测算',
    children: [
      { id: 'convert', label: '成本动因转换' },
      { id: 'equipment', label: '保险及设备预算' },
      { id: 'summary', label: '预算汇总生成' },
    ],
  },
]

const leafLabels = {}
function collectLeaves(nodes) {
  nodes.forEach((node) => (node.children ? collectLeaves(node.children) : (leafLabels[node.id] = node.label)))
}
collectLeaves(menu)

const gridFields = [
  { key: 'relocated', label: '转移安置人数', unit: '人', step: '1' },
  { key: 'special', label: '特殊人群数', unit: '人', step: '1' },
  { key: 'distance', label: '距仓库距离', unit: 'km', step: 'any' },
  { key: 'quilts', label: '棉被需求量', unit: '床', step: '1' },
]

const paramKeys = ['shelterDays', 'foodRate', 'waterRate', 'tentPrice', 'tentCapacity', 'quiltPrice', 'specialCare', 'transportRate', 'vehiclesPerGrid']
const paramCells = budgetParameters.filter((p) => paramKeys.includes(p.key))

const activeId = ref('')
const workbookName = ref('')
const dataStatus = ref('')
const grids = reactive(disasterGrids.map((grid) => ({
  id: grid.id,
  relocated: '',
  special: '',
  distance: '',
  quilts: '',
})))
const paramState = reactive(Object.fromEntries(Object.keys(baseParams).map((key) => [key, ''])))
const error = ref('')

store.restore({ grids, paramState, workbookName, dataStatus })

const pendingPages = computed(() => PAGES.filter((p) => p !== 'summary' && !flow.isDone(p)))

/** 送入测算引擎的灾情与参数：清洗掉编辑过程中出现的空值。 */
const gridRows = computed(() =>
  grids.map((grid) => ({
    id: grid.id,
    relocated: Number(grid.relocated) || 0,
    special: Number(grid.special) || 0,
    distance: Number(grid.distance) || 0,
    quilts: Number(grid.quilts) || 0,
  })),
)

const activeParams = computed(() =>
  Object.fromEntries(Object.keys(paramState).map((key) => [key, Number(paramState[key]) || 0])),
)

const costDrivers = computed(() => calculateGridBudgets(gridRows.value, activeParams.value))
const summary = computed(() => calculateBudgetSummary(gridRows.value, activeParams.value))
const composition = computed(() => calculateCostComposition(gridRows.value, activeParams.value))

function amountOf(item) {
  return activeParams.value[item.countKey] * activeParams.value[item.priceKey]
}

function snapshot() {
  return { grids, paramState, workbookName, dataStatus }
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

function checkGrids() {
  const blank = grids.some((grid) =>
    gridFields.some((field) => grid[field.key] === '' || grid[field.key] === null || Number.isNaN(Number(grid[field.key]))),
  )
  if (blank) return '灾情数据存在未填写项，无法载入'
  if (gridRows.value.some((grid) => grid.relocated <= 0)) return '转移安置人数须大于 0 人'
  return ''
}

function checkParams() {
  const invalid = paramKeys.find((key) => !(Number(paramState[key]) > 0))
  if (!invalid) return ''
  const cell = paramCells.find((p) => p.key === invalid)
  return `${cell.name}须为大于 0 的数值`
}

function checkEquipment() {
  if (!(activeParams.value.rescuers > 0)) return '救援人员数量须大于 0 人'
  if (!(activeParams.value.insuranceRate > 0)) return '保险单价须大于 0 元/人'
  if (equipmentItems.some((item) => activeParams.value[item.countKey] < 0 || activeParams.value[item.priceKey] < 0)) {
    return '设备数量与单价不得为负数'
  }
  return ''
}

function checkSummary() {
  if (!pendingPages.value.length) return ''
  const names = pendingPages.value.map((id) => leafLabels[id] || id)
  return `还有 ${pendingPages.value.length} 个功能页未办理（${names.join('、')}），无法生成汇总`
}

function restoreHistoric() {
  Object.assign(paramState, baseParams)
}

function resetAll() {
  flow.reset()
  store.clear()
  workbookName.value = ''
  dataStatus.value = ''
  grids.forEach((grid) => {
    grid.relocated = ''
    grid.special = ''
    grid.distance = ''
    grid.quilts = ''
  })
  Object.assign(paramState, Object.fromEntries(Object.keys(baseParams).map((key) => [key, ''])))
  error.value = ''
}
</script>

<template>
  <PanelShell title="灾情数据成本动因转换" source="应急预算测算">
    <SystemShell
      system="应急预算测算系统"
      operator="应急预算绩效岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 预算管理 → 应急预算编制 → 灾情数据载入 -->
        <template v-if="leaf === 'grids'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="run('grids', checkGrids)">载入灾情数据</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">灾情数据文件</span>
              <input v-model="workbookName" class="form-control" />
            </label>
            <label class="form-item">
              <span class="form-label">数据状态</span>
              <input v-model="dataStatus" class="form-control" />
            </label>
          </div>
          <table class="calc-table">
            <thead>
              <tr>
                <th>网格编号</th>
                <th v-for="field in gridFields" :key="field.key">{{ field.label }}（{{ field.unit }}）</th>
                <th>数据状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="grid in grids" :key="grid.id">
                <th scope="row">{{ grid.id }}</th>
                <td v-for="field in gridFields" :key="field.key">
                  <input v-model.number="grid[field.key]" type="number" min="0" :step="field.step" />
                </td>
                <td>{{ dataStatus }}</td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('grids')">
            <p class="sys-toast">{{ grids.length }} / {{ grids.length }} 个网格灾情数据载入完成，数据来源：{{ dataStatus }}。</p>
            <dl class="block-fields">
              <div class="field-row"><dt>转移安置人数</dt><dd>{{ num(summary.totals.relocated, 0) }} 人</dd></div>
              <div class="field-row"><dt>特殊人群数</dt><dd>{{ num(summary.totals.special, 0) }} 人</dd></div>
              <div class="field-row"><dt>棉被需求量</dt><dd>{{ num(summary.totals.quilts, 0) }} 床</dd></div>
              <div class="field-row"><dt>运输距离合计</dt><dd>{{ num(summary.totals.distance, 2) }} km</dd></div>
            </dl>
          </template>
        </template>

        <!-- 基础设置 → 预算参数 → 保障标准配置 -->
        <template v-else-if="leaf === 'params'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="restoreHistoric">恢复历史采购价</button>
            <button type="button" class="primary-button"
              @click="run('params', checkParams)">保存参数</button>
          </div>
          <div class="param-grid">
            <label v-for="p in paramCells" :key="p.key" class="form-item">
              <span class="form-label">{{ p.name }}（{{ p.unit }}）</span>
              <input v-model.number="paramState[p.key]" class="form-control" type="number" min="0" step="0.5" />
            </label>
          </div>
          <template v-if="flow.isDone('params')">
            <p class="sys-toast">预算参数保存成功，测算口径采用历史采购价标准。</p>
            <table class="calc-table">
              <thead>
                <tr><th>参数名称</th><th>数值</th><th>单位</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in paramCells" :key="p.key">
                  <th scope="row">{{ p.name }}</th>
                  <td>{{ num(activeParams[p.key], 2) }}</td>
                  <td>{{ p.unit }}</td>
                  <td>{{ p.note }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </template>

        <!-- 预算测算 → 成本动因转换 -->
        <template v-else-if="leaf === 'convert'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="run('convert')">执行转换</button>
          </div>
          <ul class="formula-list">
            <li v-for="(item, index) in coreFormulas" :key="index">{{ item }}</li>
          </ul>
          <template v-if="flow.isDone('convert')">
            <p class="sys-toast">{{ costDrivers.length }} 个网格成本动因转换完成，网格预算需求合计 {{ money(summary.gridBudget, 0) }} 元。</p>
            <table class="calc-table">
              <thead>
                <tr>
                  <th>网格</th><th>安置人数</th><th>安置人天</th><th>食品</th><th>饮水</th>
                  <th>帐篷</th><th>棉被</th><th>特殊人群</th><th>运输</th><th>合计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in costDrivers" :key="row.id">
                  <th scope="row">{{ row.id }}</th>
                  <td>{{ num(row.relocated, 0) }}</td>
                  <td>{{ num(row.personDays, 0) }}</td>
                  <td>{{ money(row.food, 0) }}</td>
                  <td>{{ money(row.water, 0) }}</td>
                  <td>{{ money(row.tentBudget, 0) }}</td>
                  <td>{{ money(row.quiltBudget, 0) }}</td>
                  <td>{{ money(row.specialBudget, 0) }}</td>
                  <td>{{ money(row.transport, 0) }}</td>
                  <td>{{ money(row.total, 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">9 网格合计</th>
                  <td>{{ num(summary.totals.relocated, 0) }}</td>
                  <td>{{ num(summary.totals.personDays, 0) }}</td>
                  <td>{{ money(summary.totals.food, 0) }}</td>
                  <td>{{ money(summary.totals.water, 0) }}</td>
                  <td>{{ money(summary.totals.tentBudget, 0) }}</td>
                  <td>{{ money(summary.totals.quiltBudget, 0) }}</td>
                  <td>{{ money(summary.totals.specialBudget, 0) }}</td>
                  <td>{{ money(summary.totals.transport, 0) }}</td>
                  <td>{{ money(summary.gridBudget, 0) }}</td>
                </tr>
              </tfoot>
            </table>
          </template>
        </template>

        <!-- 预算测算 → 保险及设备预算 -->
        <template v-else-if="leaf === 'equipment'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="run('equipment', checkEquipment)">测算</button>
          </div>
          <table class="calc-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>数量</th>
                <th>单价（元）</th>
                <th>预算金额（元）</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">救援人员保险（人 × 元/人）</th>
                <td><input v-model.number="paramState.rescuers" type="number" min="0" step="1" /></td>
                <td><input v-model.number="paramState.insuranceRate" type="number" min="0" step="10" /></td>
                <td>{{ money(summary.insuranceBudget, 0) }}</td>
              </tr>
              <tr v-for="item in equipmentItems" :key="item.name">
                <th scope="row">{{ item.name }}</th>
                <td><input v-model.number="paramState[item.countKey]" type="number" min="0" step="1" /></td>
                <td><input v-model.number="paramState[item.priceKey]" type="number" min="0" step="10" /></td>
                <td>{{ money(amountOf(item), 0) }}</td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('equipment')">
            <dl class="block-fields">
              <div class="field-row"><dt>保险预算</dt><dd>{{ money(summary.insuranceBudget, 0) }} 元</dd></div>
              <div class="field-row"><dt>设备预算合计</dt><dd>{{ money(summary.equipmentBudget, 0) }} 元</dd></div>
            </dl>
            <table class="calc-table">
              <thead>
                <tr><th>项目</th><th>数量</th><th>单价（元）</th><th>计算口径</th><th>预算金额（元）</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">救援人员保险</th>
                  <td>{{ num(activeParams.rescuers, 0) }} 人</td>
                  <td>{{ money(activeParams.insuranceRate, 0) }}</td>
                  <td>救援人员数量 × 保险单价</td>
                  <td>{{ money(summary.insuranceBudget, 0) }}</td>
                </tr>
                <tr v-for="item in summary.equipment.items" :key="item.name">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ num(item.count, 0) }}</td>
                  <td>{{ money(item.price, 0) }}</td>
                  <td>数量 × 单价</td>
                  <td>{{ money(item.amount, 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">设备预算合计</th>
                  <td colspan="3">冲锋舟 + 急救包 + 救生衣</td>
                  <td>{{ money(summary.equipmentBudget, 0) }}</td>
                </tr>
              </tfoot>
            </table>
          </template>
        </template>

        <!-- 预算测算 → 预算汇总生成 -->
        <template v-else-if="leaf === 'summary'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button"
              @click="run('summary', checkSummary)">生成汇总</button>
          </div>
          <ul class="formula-list">
            <li>总预算需求 = 9 网格预算需求 + 保险预算 + 设备预算</li>
          </ul>
          <p v-if="pendingPages.length && !flow.isDone('summary')" class="sys-toast warn">
            尚未办理：{{ pendingPages.map((id) => leafLabels[id]).join('、') }}
          </p>
          <template v-if="flow.isDone('summary')">
            <dl class="block-fields">
              <div class="field-row"><dt>9 网格预算需求</dt><dd>{{ money(summary.gridBudget, 0) }} 元</dd></div>
              <div class="field-row"><dt>保险预算</dt><dd>{{ money(summary.insuranceBudget, 0) }} 元</dd></div>
              <div class="field-row"><dt>设备预算</dt><dd>{{ money(summary.equipmentBudget, 0) }} 元</dd></div>
              <div class="field-row"><dt>总预算需求</dt><dd>{{ money(summary.totalBudget, 0) }} 元</dd></div>
            </dl>
            <table class="calc-table">
              <thead>
                <tr><th>成本项目</th><th>金额（元）</th><th>占比</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in composition" :key="item.name">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ money(item.amount, 0) }}</td>
                  <td>{{ percent(item.share, 2) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="sys-toast">{{ executionNote }}</p>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
