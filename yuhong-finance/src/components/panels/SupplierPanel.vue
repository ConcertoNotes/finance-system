<script setup>
// 按当前《洪涝阶段二.xlsx》任务3：三张可复制评分表 + 三岗复核。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { SUPPLIER_NOTES, supplierCriteria, suppliers } from '../../data/procurement.js'
import { copyTsv } from '../../domain/clipboard.js'
import { calculatePriceBaseline, scoreSuppliers } from '../../domain/procurement.js'
import { money, num, percent } from '../../domain/format.js'

const PAGES = ['score', 'budget', 'risk', 'approve']
const flow = useTaskFlow('s2-t3', PAGES)
const store = useFormPersist('s2-t3')

const menu = [
  {
    id: 'm-eval',
    label: '供应商评价',
    children: [
      { id: 'score', label: '综合评分' },
      { id: 'budget', label: '预算和网格保障复核' },
      { id: 'risk', label: '核验S2相关资质' },
      { id: 'approve', label: '审批S2作为供应商' },
    ],
  },
]

const RISK_ITEMS = [
  { key: 'license', label: '营业资质', ok: '有效' },
  { key: 'party', label: '合同主体', ok: '一致' },
  { key: 'invoice', label: '发票主体', ok: '一致' },
  { key: 'account', label: '收款账户', ok: '一致' },
  { key: 'related', label: '关联交易', ok: '无预警' },
  { key: 'history', label: '历史付款', ok: '无异常' },
]

function emptyScores() {
  return suppliers.map((item) => ({
    id: item.id,
    name: item.name,
    ...Object.fromEntries(supplierCriteria.map((criterion) => [criterion.key, ''])),
  }))
}

const scores = reactive(emptyScores())
const verified = reactive(Object.fromEntries(RISK_ITEMS.map((item) => [item.key, false])))
const approval = reactive({ primary: '', backup1: '', backup2: '' })
const activeId = ref('')
const error = ref('')
const copied = ref('')

const scoredList = computed(() =>
  scores.map((item) => ({
    ...item,
    ...Object.fromEntries(supplierCriteria.map((criterion) => [criterion.key, Number(item[criterion.key]) || 0])),
  })),
)
const rows = computed(() => scoreSuppliers(scoredList.value, supplierCriteria))
const ranked = computed(() => [...rows.value].sort((a, b) => a.rank - b.rank))
const winner = computed(() => ranked.value[0])
const tent = computed(() => calculatePriceBaseline().find((row) => row.id === 'tent'))
const pendingPages = computed(() => PAGES.filter((id) => id !== 'approve' && !flow.isDone(id)))

store.restore({ scores, verified, approval })

function snapshot() {
  return { scores, verified, approval }
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

function checkScores() {
  const invalid = scores.filter((item) =>
    supplierCriteria.some((criterion) => {
      const value = Number(item[criterion.key])
      return !(value >= 0) || value > 100
    }),
  )
  if (invalid.length) return `${invalid.map((item) => item.id).join('、')} 存在超出 0—100 区间的标准分`
  return ''
}

function checkRisk() {
  const rest = RISK_ITEMS.filter((item) => !verified[item.key])
  return rest.length ? `还有 ${rest.length} 项资质未核验` : ''
}

function checkApproval() {
  if (pendingPages.value.length) return `还有 ${pendingPages.value.length} 个功能页未办理，无法审批`
  const picks = [approval.primary, approval.backup1, approval.backup2]
  if (picks.some((item) => !item)) return '主供应商、第一备选和第二备选均须指定'
  if (new Set(picks).size !== 3) return '同一供应商不得同时占据两个定位'
  if (approval.primary !== winner.value.id) return `综合得分最高的是 ${winner.value.id}，主供应商应定位为 ${winner.value.id}`
  return ''
}

async function copyTables() {
  const weightRows = [['评分维度', '权重'], ...supplierCriteria.map((item) => [item.label, percent(item.weight, 0)]), ['权重合计', '100%']]
  const scoreRows = [
    ['供应商', ...supplierCriteria.map((item) => item.label)],
    ...rows.value.map((row) => [row.id, ...row.parts.map((part) => part.score)]),
  ]
  const weightedRows = [
    ['供应商', ...supplierCriteria.map((item) => `${item.label}贡献`), '综合得分', '排名', '说明'],
    ...ranked.value.map((row) => [
      row.id,
      ...row.parts.map((part) => num(part.weighted, 1)),
      money(row.total, 1),
      row.rank,
      SUPPLIER_NOTES[row.id],
    ]),
  ]
  await copyTsv([...weightRows, [], ...scoreRows, [], ...weightedRows])
  copied.value = '三张评分表已复制，可粘贴到 Excel'
}

function resetAll() {
  flow.reset()
  store.clear()
  scores.splice(0, scores.length, ...emptyScores())
  RISK_ITEMS.forEach((item) => { verified[item.key] = false })
  Object.assign(approval, { primary: '', backup1: '', backup2: '' })
  error.value = ''
  copied.value = ''
}
</script>

<template>
  <PanelShell title="合同物资供应商综合评分与初始遴选" source="供应商管理">
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
        <template v-if="leaf === 'score'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('score', checkScores)">计算综合得分</button>
            <button type="button" class="ghost-button" @click="copyTables">复制三张表到 Excel</button>
          </div>
          <p class="form-desc">现进行供应商综合评分。食品、饮用水通过大型商超应急零售/框架协议直采。评分维度为报价40%、交付时间20%、物资质量15%、供应商资质10%、历史履约率10%、运输距离5%。这三张表要能复制到 Excel。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>评分维度</caption>
              <thead><tr><th>评分维度</th><th>权重</th></tr></thead>
              <tbody>
                <tr v-for="item in supplierCriteria" :key="item.key">
                  <th scope="row">{{ item.label }}</th>
                  <td>{{ percent(item.weight, 0) }}</td>
                </tr>
                <tr><th scope="row">权重合计</th><td class="col-total">100%</td></tr>
              </tbody>
            </table>
          </div>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <caption>供应商报价得分</caption>
              <thead>
                <tr>
                  <th>供应商</th>
                  <th v-for="item in supplierCriteria" :key="item.key">{{ item.label.replace('时间', '').replace('物资', '').replace('供应商', '').replace('率', '') }}得分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in rows" :key="row.id">
                  <th scope="row">{{ row.id }}</th>
                  <td v-for="item in supplierCriteria" :key="item.key">
                    <input v-model.number="scores[index][item.key]" type="number" min="0" max="100" class="student-input" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-if="flow.isDone('score')">
            <div class="score-table-wrap">
              <table class="calc-table compact center-text">
                <caption>加权综合得分明细</caption>
                <thead>
                  <tr>
                    <th>供应商</th>
                    <th v-for="item in supplierCriteria" :key="item.key">{{ item.label }}贡献</th>
                    <th>综合得分</th><th>排名</th><th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in ranked" :key="row.id" :class="{ winner: row.selected }">
                    <th scope="row">{{ row.id }}</th>
                    <td v-for="part in row.parts" :key="part.key">{{ num(part.weighted, 1) }}</td>
                    <td class="col-total">{{ money(row.total, 1) }}</td>
                    <td>{{ row.rank }}</td>
                    <td>{{ SUPPLIER_NOTES[row.id] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="sys-toast">形成初始排序：{{ ranked.map((row) => `${row.id} ${money(row.total, 1)}分`).join(' > ') }}。</p>
            <p v-if="copied" class="calc-note">{{ copied }}</p>
          </template>
        </template>

        <template v-else-if="leaf === 'budget'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('budget')">点击预算校验</button>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>供应商</dt><dd>{{ winner.id }}</dd></div>
            <div class="field-row"><dt>帐篷报价</dt><dd>{{ num(tent.s2, 0) }}元/顶</dd></div>
            <div class="field-row"><dt>综合价格基准</dt><dd>{{ num(tent.baseline, 2) }}元/顶</dd></div>
            <div class="field-row"><dt>价格偏差率</dt><dd>-1.33%｜正常</dd></div>
            <div class="field-row"><dt>交付承诺</dt><dd>12小时｜满足重点保障时限</dd></div>
            <div class="field-row"><dt>重点保障网格</dt><dd>甲3、甲6</dd></div>
          </dl>
          <template v-if="flow.isDone('budget')">
            <p class="sys-toast">C方案预算校验：未超预算</p>
            <p class="conclusion">综合结论：初始方案复核通过，可进入合同拟定环节。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'risk'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('risk', checkRisk)">提交核验结果</button>
          </div>
          <p class="form-desc">供应商：S2</p>
          <div class="checkbox-group">
            <label v-for="item in RISK_ITEMS" :key="item.key" class="checkbox-item">
              <input v-model="verified[item.key]" type="checkbox" />{{ item.label }}：✅ {{ item.ok }}
            </label>
          </div>
          <p v-if="flow.isDone('risk')" class="conclusion">综合结论：供应商主体及收款账户核验通过，可进入合同及后续付款控制流程。</p>
        </template>

        <template v-else-if="leaf === 'approve'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="save('approve', checkApproval)">审批通过</button>
          </div>
          <p class="form-desc">HT-2025-001 四类合同物资</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">主供应商</span>
              <select v-model="approval.primary" class="form-control">
                <option value="">请选择</option>
                <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">第一备选</span>
              <select v-model="approval.backup1" class="form-control">
                <option value="">请选择</option>
                <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label required">第二备选</span>
              <select v-model="approval.backup2" class="form-control">
                <option value="">请选择</option>
                <option v-for="row in ranked" :key="row.id" :value="row.id">{{ row.id }} · {{ money(row.total, 1) }} 分</option>
              </select>
            </label>
          </div>
          <template v-if="flow.isDone('approve')">
            <ul class="sys-lines">
              <li>主供应商：S2｜状态：🟢 已启用 · 综合得分 88.3分 · 执行范围：帐篷、棉被、救生衣、急救包</li>
              <li>第一备选：S1｜状态：🟡 待命 · 启动条件：S2出现库存不足、交付延迟等履约异常</li>
              <li>第二备选：S3｜状态：⚪ 兜底待命 · 启动条件：S2、S1均无法满足极端应急保障需求</li>
              <li>食品、饮用水：大型商超应急零售/框架协议直采｜不纳入HT-2025-001主合同</li>
            </ul>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
