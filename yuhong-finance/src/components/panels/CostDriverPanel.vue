<script setup>
// 灾情数据成本动因转换操作台。学生载入灾情、配置参数后，平台逐项回写测算结果。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import {
  COST_DRIVER_WORKBOOK,
  budgetParameters,
  coreFormulas,
  disasterGrids,
  equipmentItems,
  executionNote,
  params as baseParams,
} from '../../data/costDriver.js'
import { calculateBudgetSummary, calculateCostComposition, calculateGridBudgets } from '../../domain/costDriver.js'
import { money, num, percent } from '../../domain/format.js'

const OPS = ['grids', 'params', 'convert', 'equipment', 'summary']
const flow = useTaskFlow('s1-t5', OPS)

const DATA_STATUS = '前方灾情传递'

const gridFields = [
  { key: 'relocated', label: '转移安置人数', unit: '人', step: '1' },
  { key: 'special', label: '特殊人群数', unit: '人', step: '1' },
  { key: 'distance', label: '距仓库距离', unit: 'km', step: 'any' },
  { key: 'quilts', label: '棉被需求量', unit: '床', step: '1' },
]

const editableKeys = ['shelterDays', 'foodRate', 'waterRate', 'tentPrice', 'quiltPrice', 'specialCare', 'transportRate']
const lockedKeys = ['tentCapacity', 'vehiclesPerGrid']
const paramCells = budgetParameters
  .filter((p) => editableKeys.includes(p.key) || lockedKeys.includes(p.key))
  .map((p) => ({ ...p, locked: lockedKeys.includes(p.key) }))

const grids = reactive(disasterGrids.map((grid) => ({ ...grid })))
const paramState = reactive({ ...baseParams })
const error = ref('')

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
const maxShare = computed(() => Math.max(...composition.value.map((item) => item.share)))

function amountOf(item) {
  return activeParams.value[item.countKey] * activeParams.value[item.priceKey]
}

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
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
  const invalid = editableKeys.find((key) => !(Number(paramState[key]) > 0))
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

function restoreHistoric() {
  Object.assign(paramState, baseParams)
}

function resetAll() {
  flow.reset()
  grids.forEach((grid, index) => Object.assign(grid, disasterGrids[index]))
  Object.assign(paramState, baseParams)
  error.value = ''
}
</script>

<template>
  <PanelShell title="灾情数据成本动因转换" source="应急预算测算">
    <div class="op-progress">
      <div class="op-progress-track">
        <span class="op-progress-fill" :style="{ width: `${(flow.progress.value.done / flow.progress.value.total) * 100}%` }" />
      </div>
      <span class="op-progress-text">{{ flow.progress.value.done }} / {{ flow.progress.value.total }} 项操作完成</span>
      <button type="button" class="text-button" @click="resetAll">重置</button>
    </div>

    <p v-if="error" class="sys-toast danger">{{ error }}</p>

    <div class="op-flow">
      <OperationBlock title="载入 9 网格灾情数据" :status="flow.status('grids')" done-label="灾情数据已载入">
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">灾情数据文件</span>
            <input class="form-control locked" :value="COST_DRIVER_WORKBOOK" readonly />
          </label>
          <label class="form-item">
            <span class="form-label">数据状态</span>
            <input class="form-control locked" :value="DATA_STATUS" readonly />
          </label>
        </div>
        <div class="score-table-wrap">
          <table class="calc-table compact">
            <thead>
              <tr>
                <th style="width: 78px">网格编号</th>
                <th v-for="field in gridFields" :key="field.key">
                  {{ field.label }}<em>{{ field.unit }}</em>
                </th>
                <th style="width: 110px">数据状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="grid in grids" :key="grid.id">
                <th scope="row">{{ grid.id }}</th>
                <td v-for="field in gridFields" :key="field.key">
                  <input v-model.number="grid[field.key]" type="number" min="0" :step="field.step" />
                </td>
                <td>{{ DATA_STATUS }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('grids')"
            @click="run('grids', checkGrids)">载入灾情数据</button>
        </div>

        <template #result>
          <p class="sys-toast">{{ grids.length }} / {{ grids.length }} 个网格灾情数据载入完成，数据来源：{{ DATA_STATUS }}。</p>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">转移安置人数</span>
              <strong class="stat-value">{{ num(summary.totals.relocated, 0) }} 人</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">特殊人群数</span>
              <strong class="stat-value">{{ num(summary.totals.special, 0) }} 人</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">棉被需求量</span>
              <strong class="stat-value">{{ num(summary.totals.quilts, 0) }} 床</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">运输距离合计</span>
              <strong class="stat-value">{{ num(summary.totals.distance, 2) }} km</strong>
            </div>
          </div>
        </template>
      </OperationBlock>

      <OperationBlock title="配置预算参数" :status="flow.status('params')" done-label="参数已保存">
        <div class="param-grid">
          <label v-for="p in paramCells" :key="p.key" class="param-cell">
            <span class="param-name">{{ p.name }}</span>
            <span class="param-input">
              <input v-model.number="paramState[p.key]" type="number" min="0" step="0.5" :readonly="p.locked" />
              <em>{{ p.unit }}</em>
            </span>
          </label>
        </div>
        <p class="form-desc">每顶帐篷容纳人数与每网格配车为平台统一配置，不可修改。</p>
        <div class="action-row">
          <button type="button" class="secondary-button" @click="restoreHistoric">恢复历史采购价</button>
          <button type="button" class="primary-button" :disabled="flow.isDone('params')"
            @click="run('params', checkParams)">保存参数</button>
        </div>

        <template #result>
          <p class="sys-toast">预算参数保存成功，测算口径采用历史采购价标准。</p>
          <table class="calc-table compact">
            <thead>
              <tr><th>参数名称</th><th style="width: 96px">数值</th><th style="width: 96px">单位</th><th>说明</th></tr>
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
      </OperationBlock>

      <OperationBlock title="执行成本动因转换" :status="flow.status('convert')" done-label="转换已完成">
        <ul class="formula-list">
          <li v-for="(item, index) in coreFormulas" :key="index">{{ item }}</li>
        </ul>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('convert')"
            @click="run('convert')">执行转换</button>
        </div>

        <template #result>
          <p class="sys-toast">{{ costDrivers.length }} 个网格成本动因转换完成，网格预算需求合计 {{ money(summary.gridBudget, 0) }} 元。</p>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr>
                  <th>网格</th><th>安置人数</th><th>安置人天</th><th>食品</th><th>饮水</th>
                  <th>帐篷</th><th>棉被</th><th>特殊人群</th><th>运输</th><th class="col-total">合计</th>
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
                  <td class="col-total">{{ money(row.total, 0) }}</td>
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
                  <td class="col-total">{{ money(summary.gridBudget, 0) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </OperationBlock>

      <OperationBlock title="测算保险及设备预算" :status="flow.status('equipment')" done-label="保险与设备预算已测算">
        <table class="calc-table compact">
          <thead>
            <tr>
              <th>项目</th>
              <th style="width: 110px">数量</th>
              <th style="width: 120px">单价（元）</th>
              <th style="width: 130px">预算金额（元）</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">救援人员保险<em class="row-unit">人 × 元/人</em></th>
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
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('equipment')"
            @click="run('equipment', checkEquipment)">测算</button>
        </div>

        <template #result>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">保险预算</span>
              <strong class="stat-value">{{ money(summary.insuranceBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">设备预算合计</span>
              <strong class="stat-value">{{ money(summary.equipmentBudget, 0) }} 元</strong>
            </div>
          </div>
          <table class="calc-table compact">
            <thead>
              <tr><th>项目</th><th>数量</th><th>单价（元）</th><th>计算口径</th><th class="col-total">预算金额（元）</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">救援人员保险</th>
                <td>{{ num(activeParams.rescuers, 0) }} 人</td>
                <td>{{ money(activeParams.insuranceRate, 0) }}</td>
                <td>救援人员数量 × 保险单价</td>
                <td class="col-total">{{ money(summary.insuranceBudget, 0) }}</td>
              </tr>
              <tr v-for="item in summary.equipment.items" :key="item.name">
                <th scope="row">{{ item.name }}</th>
                <td>{{ num(item.count, 0) }}</td>
                <td>{{ money(item.price, 0) }}</td>
                <td>数量 × 单价</td>
                <td class="col-total">{{ money(item.amount, 0) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">设备预算合计</th>
                <td colspan="3">冲锋舟 + 急救包 + 救生衣</td>
                <td class="col-total">{{ money(summary.equipmentBudget, 0) }}</td>
              </tr>
            </tfoot>
          </table>
        </template>
      </OperationBlock>

      <OperationBlock title="生成预算汇总" :status="flow.status('summary')" done-label="预算汇总已生成">
        <p class="block-formula">总预算需求 = 9 网格预算需求 + 保险预算 + 设备预算</p>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('summary')"
            @click="run('summary')">生成汇总</button>
        </div>

        <template #result>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">9 网格预算需求</span>
              <strong class="stat-value">{{ money(summary.gridBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">保险预算</span>
              <strong class="stat-value">{{ money(summary.insuranceBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">设备预算</span>
              <strong class="stat-value">{{ money(summary.equipmentBudget, 0) }} 元</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">总预算需求</span>
              <strong class="stat-value accent">{{ money(summary.totalBudget, 0) }} 元</strong>
            </div>
          </div>

          <div class="calc-subhead"><h3>成本构成汇总</h3></div>
          <ul class="share-list">
            <li v-for="item in composition" :key="item.name">
              <span class="share-name">{{ item.name }}</span>
              <span class="share-bar">
                <span class="share-fill" :style="{ width: `${(item.share / maxShare) * 100}%` }"></span>
              </span>
              <span class="share-value">{{ money(item.amount, 0) }} 元</span>
              <span class="share-pct">{{ percent(item.share, 2) }}</span>
            </li>
          </ul>

          <p class="calc-note">{{ executionNote }}</p>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>
