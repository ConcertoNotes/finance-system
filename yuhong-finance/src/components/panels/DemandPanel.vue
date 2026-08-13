<script setup>
// 应急采购管理系统 · 9网格采购需求测算。
// 工作簿里的「采购管理 → 需求管理 / 需求测算 / 执行路径」是要逐级点开的菜单，不是标题。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import {
  demandExcelFormula,
  demandFormula,
  materialDemands,
  priorityOrder,
  shelterPlan,
} from '../../data/procurement.js'
import { calculateNetDemand } from '../../domain/procurement.js'
import { num } from '../../domain/format.js'

const PAGES = ['shelter', 'tent', 'others', 'worksheet', 'route']
const flow = useTaskFlow('s2-t1', PAGES)

const menu = [
  {
    id: 'm-procure',
    label: '采购管理',
    children: [
      {
        id: 'm-demand',
        label: '需求管理',
        children: [
          { id: 'shelter', label: '安置方式确认' },
          { id: 'tent', label: '帐篷可用量核验' },
        ],
      },
      {
        id: 'm-calc',
        label: '需求测算',
        children: [
          { id: 'others', label: '其他物资净需求' },
          { id: 'worksheet', label: '物资需求测算表' },
        ],
      },
      {
        id: 'm-exec',
        label: '执行路径',
        children: [
          { id: 'route', label: '采购路径与优先级' },
        ],
      },
    ],
  },
]

const activeId = ref('')
const error = ref('')

const CONTRACT_IDS = ['tent', 'quilt', 'vest', 'kit']
const otherMaterials = materialDemands.filter((item) => item.id !== 'tent')

const TENT_STOCK = { onHand: 120, inTransit: 50, usable: 0, transferable: 0, donation: 0 }

const shelter = reactive({
  relocated: shelterPlan.relocatedTotal,
  fixed: shelterPlan.fixedShelter,
  capacity: shelterPlan.tentCapacity,
})
const tentStock = reactive({ ...TENT_STOCK })
const overrides = reactive(Object.fromEntries(otherMaterials.map((item) => [item.id, { ...item }])))
const channels = reactive(Object.fromEntries(materialDemands.map((item) => [item.id, ''])))

const worksheetFunctions = [
  'SUMIFS · 按网格汇总《9网格物资需求清单》的物资总需求',
  'XLOOKUP · 匹配库存表、在途表、捐赠表的对应数量',
  'MAX · 计算净采购量，负值归零',
  '条件格式 · 标识超预算项目',
]

const tentShelter = computed(() => Math.max(0, shelter.relocated - shelter.fixed))
const tentDemand = computed(() =>
  shelter.capacity > 0 ? Math.ceil(tentShelter.value / shelter.capacity) : 0,
)
const tentNet = computed(() =>
  Math.max(0, tentDemand.value - tentStock.usable - tentStock.transferable - tentStock.donation),
)

const otherRows = computed(() => calculateNetDemand(Object.values(overrides)))
const allRows = computed(() => [
  {
    id: 'tent',
    name: '帐篷',
    unit: '顶',
    total: tentDemand.value,
    stock: tentStock.usable,
    inTransit: 0,
    donation: tentStock.donation,
    transferable: tentStock.transferable,
    computed: tentNet.value,
  },
  ...otherRows.value,
])
const contractRows = computed(() => allRows.value.filter((row) => CONTRACT_IDS.includes(row.id)))
const directRows = computed(() => allRows.value.filter((row) => !CONTRACT_IDS.includes(row.id)))
const pendingPages = computed(() => PAGES.filter((p) => p !== 'route' && !flow.isDone(p)))

function netExpression(row) {
  return `${row.name} = MAX(0, ${num(row.total, 0)} － ${num(row.stock, 0)} － ${num(row.inTransit, 0)} － ${num(row.donation, 0)} － ${num(row.transferable, 0)}) = ${num(row.computed, 0)} ${row.unit}`
}

function summarize(rows) {
  return rows.map((row) => `${row.name} ${num(row.computed, 0)} ${row.unit}`).join('、')
}

function save(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function checkShelter() {
  if (!(shelter.relocated > 0) || !(shelter.capacity > 0)) return '转移安置总人数与每顶容纳人数须大于 0'
  if (shelter.fixed < 0 || shelter.fixed > shelter.relocated) return '固定场所安置人数不得超过转移安置总人数'
  return ''
}

function checkRoute() {
  if (pendingPages.value.length) return `还有 ${pendingPages.value.length} 个功能页未办理，无法确认执行路径`
  const unset = materialDemands.filter((item) => !channels[item.id])
  if (unset.length) return `${unset.map((item) => item.name).join('、')} 尚未划分执行路径`
  const wrong = materialDemands.filter(
    (item) => channels[item.id] !== (CONTRACT_IDS.includes(item.id) ? 'contract' : 'direct'),
  )
  if (!wrong.length) return ''
  return `${wrong.map((item) => item.name).join('、')} 执行路径有误：帐篷、棉被、救生衣、急救包由 HT-2025-001 主合同统一采购，饮用水、食品按大型商超应急零售/框架协议直采`
}

function resetAll() {
  flow.reset()
  Object.assign(shelter, {
    relocated: shelterPlan.relocatedTotal,
    fixed: shelterPlan.fixedShelter,
    capacity: shelterPlan.tentCapacity,
  })
  Object.assign(tentStock, TENT_STOCK)
  otherMaterials.forEach((item) => Object.assign(overrides[item.id], item))
  materialDemands.forEach((item) => { channels[item.id] = '' })
  error.value = ''
}
</script>

<template>
  <PanelShell title="9网格采购需求测算" source="应急采购管理系统">
    <SystemShell
      system="应急采购管理系统"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 采购管理 → 需求管理 → 安置方式确认 -->
        <template v-if="leaf === 'shelter'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('shelter')" @click="save('shelter', checkShelter)">
              确认安置方式
            </button>
          </div>
          <p class="form-desc">数据来源：9网格物资需求清单、固定安置场所容量。学校、社区服务中心和临时安置点等固定场所可消化部分安置人数，甲3、甲6 剩余人数按帐篷安置测算。</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">转移安置总人数</span>
              <input v-model.number="shelter.relocated" type="number" min="0" class="form-control" :disabled="flow.isDone('shelter')" />
            </label>
            <label class="form-item">
              <span class="form-label required">固定场所安置人数</span>
              <input v-model.number="shelter.fixed" type="number" min="0" class="form-control" :disabled="flow.isDone('shelter')" />
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">每顶帐篷容纳人数</span>
              <input v-model.number="shelter.capacity" type="number" min="1" class="form-control" :disabled="flow.isDone('shelter')" />
            </label>
            <label class="form-item">
              <span class="form-label">需帐篷安置人数</span>
              <input :value="tentShelter" class="form-control locked" readonly />
            </label>
          </div>
          <template v-if="flow.isDone('shelter')">
            <p class="sys-toast">
              安置方式已确认：{{ num(shelter.fixed, 0) }} 人可安置在固定场所，甲3、甲6 仍有 {{ num(tentShelter, 0) }} 人需要帐篷安置。
            </p>
            <p class="block-formula">
              帐篷重点保障需求量 = ROUNDUP(需要帐篷安置人数 / 每顶容纳人数, 0)
              = ROUNDUP({{ tentShelter }} / {{ shelter.capacity }}, 0) = {{ tentDemand }} 顶
            </p>
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">转移安置总人数</span>
                <strong class="stat-value">{{ num(shelter.relocated, 0) }} 人</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">固定场所安置</span>
                <strong class="stat-value">{{ num(shelter.fixed, 0) }} 人</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">需帐篷安置</span>
                <strong class="stat-value warn">{{ num(tentShelter, 0) }} 人</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">帐篷重点保障需求量</span>
                <strong class="stat-value accent">{{ num(tentDemand, 0) }} 顶</strong>
              </div>
            </div>
          </template>
        </template>

        <!-- 采购管理 → 需求管理 → 帐篷可用量核验 -->
        <template v-else-if="leaf === 'tent'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('tent')" @click="save('tent')">核验可用量</button>
          </div>
          <p class="form-desc">数据来源：现有库存、在途物资、已锁定分配量、可调拨物资、捐赠物资、安全库存。可用于甲3、甲6 重点网格的帐篷库存为 {{ num(tentStock.usable, 0) }} 顶。</p>
          <table class="calc-table compact">
            <thead>
              <tr><th>核验项</th><th style="width: 118px">数量（顶）</th><th>可否冲减甲3、甲6 新增需求</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">现有帐篷<em class="row-unit">仓库实存</em></th>
                <td>{{ num(tentStock.onHand, 0) }}</td>
                <td>否 · 已锁定用于甲1、甲2、甲8 等网格基础保障及安全库存</td>
              </tr>
              <tr>
                <th scope="row">在途帐篷<em class="row-unit">运输中</em></th>
                <td>{{ num(tentStock.inTransit, 0) }}</td>
                <td>否 · 同样锁定于基础保障及安全库存</td>
              </tr>
              <tr>
                <th scope="row">已确认捐赠<em class="row-unit">可直接冲减</em></th>
                <td><input v-model.number="tentStock.donation" type="number" min="0" :disabled="flow.isDone('tent')" /></td>
                <td>是</td>
              </tr>
              <tr>
                <th scope="row">可调拨量<em class="row-unit">可直接冲减</em></th>
                <td><input v-model.number="tentStock.transferable" type="number" min="0" :disabled="flow.isDone('tent')" /></td>
                <td>是</td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('tent')">
            <p class="sys-toast">帐篷可用量核验完成，甲3、甲6 帐篷采购需求量 {{ num(tentNet, 0) }} 顶。</p>
            <p class="block-formula">
              甲3、甲6帐篷采购需求量 = MAX(0, 重点保障需求量 － 可用于重点网格库存 － 可调拨量 － 已确认捐赠量)
              = MAX(0, {{ tentDemand }} － {{ tentStock.usable }} － {{ tentStock.transferable }} － {{ tentStock.donation }})
              = {{ tentNet }} 顶
            </p>
            <ul class="sys-lines">
              <li class="warn">现有帐篷 {{ num(tentStock.onHand, 0) }} 顶已锁定用于甲1、甲2、甲8 等网格基础保障及安全库存，当前无法直接冲减</li>
              <li class="warn">在途帐篷 {{ num(tentStock.inTransit, 0) }} 顶同样锁定于基础保障及安全库存</li>
              <li>已确认帐篷捐赠 {{ num(tentStock.donation, 0) }} 顶、可调拨 {{ num(tentStock.transferable, 0) }} 顶</li>
            </ul>
          </template>
        </template>

        <!-- 采购管理 → 需求测算 → 其他物资净需求 -->
        <template v-else-if="leaf === 'others'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('others')" @click="save('others')">计算净需求</button>
          </div>
          <p class="form-desc">总需求由前序灾情数据和保障标准形成，不根据供应商报价反推。先用 SUMIFS 汇总《9网格物资需求清单》的物资总需求，再逐项扣减可冲减数量。</p>
          <div class="score-table-wrap">
            <table class="calc-table">
              <thead>
                <tr><th>物资</th><th>网格总需求</th><th>现有可用库存</th><th>在途数量</th><th>已确认捐赠</th><th>可调拨数量</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in otherRows" :key="row.id">
                  <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                  <td><input v-model.number="overrides[row.id].total" type="number" min="0" :disabled="flow.isDone('others')" /></td>
                  <td><input v-model.number="overrides[row.id].stock" type="number" min="0" :disabled="flow.isDone('others')" /></td>
                  <td><input v-model.number="overrides[row.id].inTransit" type="number" min="0" :disabled="flow.isDone('others')" /></td>
                  <td><input v-model.number="overrides[row.id].donation" type="number" min="0" :disabled="flow.isDone('others')" /></td>
                  <td><input v-model.number="overrides[row.id].transferable" type="number" min="0" :disabled="flow.isDone('others')" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-if="flow.isDone('others')">
            <p class="block-formula">{{ demandFormula }}</p>
            <div class="score-table-wrap">
              <table class="calc-table">
                <thead>
                  <tr>
                    <th>物资</th><th>网格总需求</th><th>现有可用库存</th><th>在途数量</th><th>已确认捐赠</th>
                    <th>可调拨数量</th><th class="col-total">净采购量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in otherRows" :key="row.id">
                    <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                    <td>{{ num(row.total, 0) }}</td>
                    <td>{{ num(row.stock, 0) }}</td>
                    <td>{{ num(row.inTransit, 0) }}</td>
                    <td>{{ num(row.donation, 0) }}</td>
                    <td>{{ num(row.transferable, 0) }}</td>
                    <td class="col-total">{{ num(row.computed, 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul class="formula-list">
              <li v-for="row in otherRows" :key="row.id">{{ netExpression(row) }}</li>
            </ul>
            <p class="calc-caption">后续如受灾人数或保障天数变化，按同一公式滚动更新。</p>
          </template>
        </template>

        <!-- 采购管理 → 需求测算 → 物资需求测算表 -->
        <template v-else-if="leaf === 'worksheet'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('worksheet')" @click="save('worksheet')">生成测算表</button>
          </div>
          <p class="form-desc">在 WPS 表格中落表，形成可复算、可追溯的测算底稿。主字段：物资名称、网格总需求、现有可用库存、在途数量、已确认捐赠数量、可调拨数量、净采购量。</p>
          <pre class="block-code"><code>{{ demandExcelFormula }}</code></pre>
          <ul class="check-list">
            <li v-for="item in worksheetFunctions" :key="item">{{ item }}</li>
          </ul>
          <template v-if="flow.isDone('worksheet')">
            <p class="sys-toast">《物资需求测算表》已生成，6 类物资净采购量入表并接受条件格式超预算标识。</p>
            <div class="score-table-wrap">
              <table class="calc-table">
                <thead>
                  <tr>
                    <th>物资</th><th>网格总需求</th><th>现有可用库存</th><th>在途数量</th><th>已确认捐赠</th>
                    <th>可调拨数量</th><th class="col-total">净采购量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in allRows" :key="row.id">
                    <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                    <td>{{ num(row.total, 0) }}</td>
                    <td>{{ num(row.stock, 0) }}</td>
                    <td>{{ num(row.inTransit, 0) }}</td>
                    <td>{{ num(row.donation, 0) }}</td>
                    <td>{{ num(row.transferable, 0) }}</td>
                    <td class="col-total">{{ num(row.computed, 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="calc-note">帐篷行的现有 {{ num(tentStock.onHand, 0) }} 顶与在途 {{ num(tentStock.inTransit, 0) }} 顶为锁定库存，测算表内按可冲减数 0 处理。</p>
          </template>
        </template>

        <!-- 采购管理 → 执行路径 → 采购路径与优先级 -->
        <template v-else-if="leaf === 'route'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('route')" @click="save('route', checkRoute)">
              确认执行路径
            </button>
          </div>
          <p class="form-desc">为每类物资指定采购通道，系统据此生成合同清单与直采清单。须先办理其余功能页。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact">
              <thead>
                <tr><th>物资</th><th style="width: 110px">净采购量</th><th style="width: 300px">执行路径</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in allRows" :key="row.id">
                  <th scope="row">{{ row.name }}<em class="row-unit">{{ row.unit }}</em></th>
                  <td>{{ num(row.computed, 0) }}</td>
                  <td>
                    <select v-model="channels[row.id]" class="form-control" :disabled="flow.isDone('route')">
                      <option value="">请选择执行路径</option>
                      <option value="contract">合同采购 · HT-2025-001 主合同</option>
                      <option value="direct">生活保障直采 · 应急零售/框架协议</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-if="flow.isDone('route')">
            <p class="sys-toast">执行路径划分完成，形成合同采购与生活保障直采两类通道。</p>
            <dl class="block-fields">
              <div class="field-row">
                <dt>HT-2025-001 主合同</dt>
                <dd>由初始中选供应商 S2 统一采购：{{ summarize(contractRows) }}</dd>
              </div>
              <div class="field-row">
                <dt>生活保障直采</dt>
                <dd>{{ summarize(directRows) }}，采用大型商超应急零售；如已有框架协议，则按框架协议直接下单</dd>
              </div>
              <div class="field-row">
                <dt>遴选范围</dt>
                <dd>生活保障直采物资不纳入供应商综合遴选和主合同打包</dd>
              </div>
            </dl>
            <div class="calc-subhead"><h3>保障优先级配送顺序</h3></div>
            <ol class="priority-row">
              <li v-for="(grid, index) in priorityOrder" :key="grid">
                <span class="priority-rank">{{ index + 1 }}</span>{{ grid }}
              </li>
            </ol>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
