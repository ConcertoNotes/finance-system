<script setup>
// 按当前《洪涝阶段二.xlsx》采购岗任务1 + 财务主管采购需求审核改写。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import {
  CHANNEL_OPTIONS,
  METHOD_OPTIONS,
  PRIORITY_NEED_OPTIONS,
  SCORED_OPTIONS,
  demandReviewChecks,
  materialDemands,
  priorityOrder,
} from '../../data/procurement.js'
import { money, num } from '../../domain/format.js'

const PAGES = ['shelter', 'tent', 'others', 'route', 'review']
const flow = useTaskFlow('s2-t1', PAGES)
const store = useFormPersist('s2-t1')

const menu = [
  {
    id: 'm-procure',
    label: '采购管理',
    children: [
      {
        id: 'm-demand',
        label: '需求管理',
        children: [
          { id: 'shelter', label: '确认安置方式' },
          { id: 'tent', label: '核验帐篷可用量' },
          { id: 'others', label: '其他物资净需求' },
          { id: 'route', label: '采购执行路径' },
        ],
      },
    ],
  },
  {
    id: 'm-lead',
    label: '财务审核',
    children: [{ id: 'review', label: '采购需求审核' }],
  },
]

const activeId = ref('')
const error = ref('')

const EMPTY_SHELTER = { relocated: '', fixed: '', capacity: '' }
const EMPTY_TENT = { onHand: '', inTransit: '', usable: '', transferable: '', donation: '' }

function toNum(value) {
  return Number(value) || 0
}

function blankMaterial(item) {
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    channel: item.channel,
    budgetPrice: item.budgetPrice,
    total: '',
    stock: '',
    inTransit: '',
    donation: '',
    transferable: '',
  }
}

function blankRoute(item) {
  return { channel: '', method: '', scored: '', priorityNeed: '' }
}

const shelter = reactive({ ...EMPTY_SHELTER })
const tentStock = reactive({ ...EMPTY_TENT })
const overrides = reactive(Object.fromEntries(materialDemands.map((item) => [item.id, blankMaterial(item)])))
const routes = reactive(Object.fromEntries(materialDemands.map((item) => [item.id, blankRoute(item)])))
const review = reactive({
  checks: Object.fromEntries(demandReviewChecks.map((item) => [item, false])),
  result: '',
})

const tentNeedPeople = computed(() => Math.max(0, toNum(shelter.relocated) - toNum(shelter.fixed)))
const tentDemand = computed(() =>
  toNum(shelter.capacity) > 0 ? Math.ceil(tentNeedPeople.value / toNum(shelter.capacity)) : 0,
)
const tentLocked = computed(() => toNum(tentStock.onHand) + toNum(tentStock.inTransit))
const tentNet = computed(() =>
  Math.max(0, tentDemand.value - toNum(tentStock.usable) - toNum(tentStock.transferable) - toNum(tentStock.donation)),
)

const demandRows = computed(() =>
  materialDemands.map((item) => {
    const src = item.id === 'tent'
      ? {
          total: tentDemand.value,
          stock: toNum(tentStock.usable),
          inTransit: 0,
          donation: toNum(tentStock.donation),
          transferable: toNum(tentStock.transferable),
        }
      : {
          total: toNum(overrides[item.id].total),
          stock: toNum(overrides[item.id].stock),
          inTransit: toNum(overrides[item.id].inTransit),
          donation: toNum(overrides[item.id].donation),
          transferable: toNum(overrides[item.id].transferable),
        }
    const net = Math.max(0, src.total - src.stock - src.inTransit - src.donation - src.transferable)
    return {
      ...item,
      ...src,
      net,
      amount: net * item.budgetPrice,
    }
  }),
)

const demandTotals = computed(() =>
  demandRows.value.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      stock: sum.stock + row.stock,
      inTransit: sum.inTransit + row.inTransit,
      donation: sum.donation + row.donation,
      transferable: sum.transferable + row.transferable,
      net: sum.net + row.net,
      amount: sum.amount + row.amount,
    }),
    { total: 0, stock: 0, inTransit: 0, donation: 0, transferable: 0, net: 0, amount: 0 },
  ),
)

const pendingPages = computed(() => PAGES.filter((id) => id !== 'review' && !flow.isDone(id)))
const chosenChecks = computed(() => demandReviewChecks.filter((item) => review.checks[item]))

store.restore({ shelter, tentStock, overrides, routes, review })

function snapshot() {
  return { shelter, tentStock, overrides, routes, review }
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

function checkShelter() {
  if (!(toNum(shelter.relocated) > 0) || !(toNum(shelter.capacity) > 0)) return '转移安置人数与每顶容纳人数须大于 0'
  if (toNum(shelter.fixed) < 0 || toNum(shelter.fixed) > toNum(shelter.relocated)) return '固定场所安置人数不得超过转移安置总人数'
  return ''
}

function checkRoute() {
  const unset = materialDemands.filter((item) => {
    const row = routes[item.id]
    return !row.channel || !row.method || !row.scored || !row.priorityNeed
  })
  if (unset.length) return `${unset.map((item) => item.name).join('、')} 的执行路径尚未选完`
  const wrong = materialDemands.filter((item) => {
    const row = routes[item.id]
    const channel = item.channel === 'contract' ? '合同采购' : '生活保障直采'
    return row.channel !== channel || row.method !== item.method || row.scored !== item.scored || row.priorityNeed !== item.priorityNeed
  })
  if (wrong.length) return `${wrong.map((item) => item.name).join('、')} 执行路径与当前表口径不一致`
  return ''
}

function checkReview() {
  if (pendingPages.value.length) return `采购岗还有 ${pendingPages.value.length} 个功能页未办理，无法审核`
  if (chosenChecks.value.length !== demandReviewChecks.length) return '三项复核意见均须勾选'
  if (review.result !== '通过') return '审核结果须选择通过'
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  Object.assign(shelter, EMPTY_SHELTER)
  Object.assign(tentStock, EMPTY_TENT)
  materialDemands.forEach((item) => {
    Object.assign(overrides[item.id], blankMaterial(item))
    Object.assign(routes[item.id], blankRoute(item))
  })
  demandReviewChecks.forEach((item) => { review.checks[item] = false })
  review.result = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="生成9网格采购需求" source="应急采购管理系统">
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
        <template v-if="leaf === 'shelter'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('shelter', checkShelter)">确认安置方式</button>
          </div>
          <p class="form-desc">现生成9网格采购需求。数据来源：9网格物资需求清单、固定安置场所容量、现有库存、在途物资、已锁定分配量、可调拨物资、捐赠物资、安全库存和C方案预算限额。</p>
          <p class="form-desc">9网格转移安置人数共8100人，学校、社区服务中心和临时安置点等固定场所可安置6100人。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>确认安置方式与帐篷需求量</caption>
              <thead>
                <tr><th>项目</th><th>数值</th><th>单位</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">9网格转移安置人数</th>
                  <td><input v-model.number="shelter.relocated" type="number" min="0" class="student-input" /></td>
                  <td>人</td>
                  <td>本次灾情更新后总人数</td>
                </tr>
                <tr>
                  <th scope="row">固定场所可安置人数</th>
                  <td><input v-model.number="shelter.fixed" type="number" min="0" class="student-input" /></td>
                  <td>人</td>
                  <td>学校、社区服务中心、临时安置点等</td>
                </tr>
                <tr>
                  <th scope="row">需帐篷安置人数</th>
                  <td>{{ tentNeedPeople || '—' }}</td>
                  <td>人</td>
                  <td>转移安置人数-固定场所容量</td>
                </tr>
                <tr>
                  <th scope="row">每顶帐篷容纳人数</th>
                  <td><input v-model.number="shelter.capacity" type="number" min="1" class="student-input" /></td>
                  <td>人/顶</td>
                  <td>预算保障标准</td>
                </tr>
                <tr>
                  <th scope="row">帐篷需要数量</th>
                  <td class="col-total">{{ tentDemand || '—' }}</td>
                  <td>顶</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="flow.isDone('shelter')" class="sys-toast">
            安置方式已确认：固定场所 {{ num(shelter.fixed, 0) }} 人，需帐篷安置 {{ num(tentNeedPeople, 0) }} 人，帐篷需要数量 {{ num(tentDemand, 0) }} 顶。
          </p>
        </template>

        <template v-else-if="leaf === 'tent'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('tent')">核验可用量</button>
          </div>
          <p class="form-desc">现有帐篷120顶和在途帐篷50顶已锁定用于甲1、甲2、甲8等网格基础保障及安全库存，当前无法直接冲减甲3、甲6新增需求；已确认帐篷捐赠为0顶。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>甲3/甲6帐篷重点保障需求测算</caption>
              <thead>
                <tr>
                  <th>测算项目</th><th>重点保障人数</th><th>每顶容纳人数</th><th>重点保障需求量</th>
                  <th>现有帐篷</th><th>在途帐篷</th><th>已锁定数量</th><th>重点网格可用库存</th>
                  <th>可调拨量</th><th>已确认捐赠</th><th>最终采购需求</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">甲3/甲6帐篷</th>
                  <td>{{ tentNeedPeople || '—' }}</td>
                  <td>{{ shelter.capacity || '—' }}</td>
                  <td>{{ tentDemand || '—' }}</td>
                  <td><input v-model.number="tentStock.onHand" type="number" min="0" class="student-input" /></td>
                  <td><input v-model.number="tentStock.inTransit" type="number" min="0" class="student-input" /></td>
                  <td>{{ tentLocked || '—' }}</td>
                  <td><input v-model.number="tentStock.usable" type="number" min="0" class="student-input" /></td>
                  <td><input v-model.number="tentStock.transferable" type="number" min="0" class="student-input" /></td>
                  <td><input v-model.number="tentStock.donation" type="number" min="0" class="student-input" /></td>
                  <td class="col-total">{{ tentNet }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="calc-note">现有和在途数量已锁定用于其他地方，不直接冲减新增需求。填写后最终采购需求实时跳动。</p>
          <p v-if="flow.isDone('tent')" class="sys-toast">甲3/甲6帐篷最终采购需求 {{ num(tentNet, 0) }} 顶。</p>
        </template>

        <template v-else-if="leaf === 'others'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('others')">确认净需求</button>
          </div>
          <p class="form-desc">净采购量、预算金额随填写情况实时跳动。帐篷行按上一步可用量核验结果带入，现有和在途已锁定库存按 0 冲减。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>其他物资净采购需求测算</caption>
              <thead>
                <tr>
                  <th>物资</th><th>总需求</th><th>现有可用库存</th><th>在途数量</th>
                  <th>已确认捐赠</th><th>可调拨数量</th><th>净采购量</th>
                  <th>预算标准单价（元）</th><th>预算金额（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in demandRows" :key="row.id">
                  <th scope="row">{{ row.name }}</th>
                  <td v-if="row.id === 'tent'">{{ num(row.total, 0) }}</td>
                  <td v-else><input v-model.number="overrides[row.id].total" type="number" min="0" class="student-input" /></td>
                  <td v-if="row.id === 'tent'">{{ num(row.stock, 0) }}</td>
                  <td v-else><input v-model.number="overrides[row.id].stock" type="number" min="0" class="student-input" /></td>
                  <td v-if="row.id === 'tent'">{{ num(row.inTransit, 0) }}</td>
                  <td v-else><input v-model.number="overrides[row.id].inTransit" type="number" min="0" class="student-input" /></td>
                  <td v-if="row.id === 'tent'">{{ num(row.donation, 0) }}</td>
                  <td v-else><input v-model.number="overrides[row.id].donation" type="number" min="0" class="student-input" /></td>
                  <td v-if="row.id === 'tent'">{{ num(row.transferable, 0) }}</td>
                  <td v-else><input v-model.number="overrides[row.id].transferable" type="number" min="0" class="student-input" /></td>
                  <td class="col-total">{{ num(row.net, 0) }}</td>
                  <td>{{ num(row.budgetPrice, 0) }}</td>
                  <td>{{ money(row.amount, 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">合计</th>
                  <td>{{ num(demandTotals.total, 0) }}</td>
                  <td>{{ num(demandTotals.stock, 0) }}</td>
                  <td>{{ num(demandTotals.inTransit, 0) }}</td>
                  <td>{{ num(demandTotals.donation, 0) }}</td>
                  <td>{{ num(demandTotals.transferable, 0) }}</td>
                  <td class="col-total">{{ num(demandTotals.net, 0) }}</td>
                  <td>—</td>
                  <td>{{ money(demandTotals.amount, 0) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p v-if="flow.isDone('others')" class="sys-toast">6 类物资净采购量已确认，预算金额合计 {{ money(demandTotals.amount, 0) }} 元。</p>
        </template>

        <template v-else-if="leaf === 'route'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('route', checkRoute)">点击匹配</button>
          </div>
          <p class="form-desc">合同采购由供应商遴选统一采购；饮用水、食品采用大型商超应急零售，如已有框架协议则直接下单，不纳入供应商综合遴选和主合同打包。下列均为下拉选项。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>采购执行路径</caption>
              <thead>
                <tr>
                  <th>物资</th><th>执行类别</th><th>合同/方式</th><th>采购数量</th>
                  <th>单位</th><th>是否纳入供应商综合遴选</th><th>优先要求</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in demandRows" :key="row.id">
                  <th scope="row">{{ row.name }}</th>
                  <td>
                    <select v-model="routes[row.id].channel" class="form-control">
                      <option value="">请选择</option>
                      <option v-for="item in CHANNEL_OPTIONS" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="routes[row.id].method" class="form-control">
                      <option value="">请选择</option>
                      <option v-for="item in METHOD_OPTIONS" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </td>
                  <td>{{ num(row.net, 0) }}</td>
                  <td>{{ row.unit }}</td>
                  <td>
                    <select v-model="routes[row.id].scored" class="form-control">
                      <option value="">请选择</option>
                      <option v-for="item in SCORED_OPTIONS" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="routes[row.id].priorityNeed" class="form-control">
                      <option value="">请选择</option>
                      <option v-for="item in PRIORITY_NEED_OPTIONS" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="form-desc">按保障优先级安排采购与配送顺序：甲3&gt;甲6&gt;甲5&gt;甲4&gt;甲7&gt;甲1&gt;甲9&gt;甲2&gt;甲8。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>采购与配送保障优先级</caption>
              <thead>
                <tr><th>排序</th><th>网格</th><th>保障优先级</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in priorityOrder" :key="item.grid">
                  <td>{{ index + 1 }}</td>
                  <td>{{ item.grid }}</td>
                  <td>{{ item.level }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="flow.isDone('route')" class="sys-toast">两类执行路径已匹配完成，可提交财务主管审核。</p>
        </template>

        <template v-else-if="leaf === 'review'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('review', checkReview)">提交执行</button>
          </div>
          <p class="form-desc">打开《9网格采购需求测算表》，执行需求复核后生成采购任务，执行岗位选择采购成本保障岗。</p>
          <div class="checkbox-group">
            <label v-for="item in demandReviewChecks" :key="item" class="checkbox-item">
              <input v-model="review.checks[item]" type="checkbox" />{{ item }}
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">审核结果</span>
              <select v-model="review.result" class="form-control">
                <option value="">请选择</option>
                <option value="通过">通过</option>
                <option value="退回">退回</option>
              </select>
            </label>
          </div>
          <dl class="block-fields">
            <div class="field-row">
              <dt>物资采购方式</dt>
              <dd>帐篷、棉被、救生衣、急救包 → 供应商遴选/合同采购；食品、饮用水 → 应急零售/框架协议直采</dd>
            </div>
          </dl>
          <template v-if="flow.isDone('review')">
            <p class="sys-toast">采购需求复核通过，已进入分类采购流程。</p>
            <div class="dual-pane">
              <article class="scheme-card">
                <h3>任务A</h3>
                <p>价格基准与供应商遴选——帐篷、棉被、救生衣、急救物资</p>
              </article>
              <article class="scheme-card">
                <h3>任务B</h3>
                <p>直采价格核验——食品、饮用水</p>
              </article>
            </div>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
