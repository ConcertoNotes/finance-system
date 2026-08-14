<script setup>
// 应急预算测算系统 · 编制 A/B/C 三受灾等级预算。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import {
  ABC_WORKBOOK,
  abcPlans,
  compareConclusions,
  coverageItems,
  incrementStages,
  reserveNotes,
  reservePrinciple,
} from '../../data/abcBudget.js'
import { summarizeAbcPlans } from '../../domain/abcBudget.js'
import { money, num, percent, signedPercent } from '../../domain/format.js'

const PAGES = ['open-book', 'import-result']
const flow = useTaskFlow('s1-t6', PAGES)
const store = useFormPersist('s1-t6')

const menu = [
  {
    id: 'm-budget',
    label: '预算管理',
    children: [
      {
        id: 'm-budget-prep',
        label: '应急预算编制',
        children: [{ id: 'open-book', label: '打开三受灾等级预算计算表' }],
      },
    ],
  },
  {
    id: 'm-calc',
    label: '预算测算',
    children: [{ id: 'import-result', label: '测算结果同步导入' }],
  },
]

const activeId = ref('')
const workbookName = ref('')
const opened = ref(false)
const totals = reactive({ A: '', B: '', C: '' })
const error = ref('')

store.restore({ workbookName, opened, totals })

const rows = computed(() => summarizeAbcPlans())
const entered = computed(() => ({
  A: Number(totals.A) || 0,
  B: Number(totals.B) || 0,
  C: Number(totals.C) || 0,
}))

function downloadUrl() {
  return `${import.meta.env.BASE_URL}workbooks/${encodeURIComponent(ABC_WORKBOOK)}`
}

function snapshot() {
  return { workbookName, opened, totals }
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

function markOpened() {
  opened.value = true
  store.persist(snapshot())
}

function checkOpen() {
  const name = workbookName.value.trim()
  if (!name) return '请填写已打开的计算表名称'
  if (!name.includes('ABC') && name !== ABC_WORKBOOK) return '打开的不是《ABC三受灾等级预算计算表》'
  if (!opened.value) return '请先下载并打开计算表'
  return ''
}

function checkImport() {
  if (!flow.isDone('open-book')) return '尚未打开三受灾等级预算计算表，无法同步导入'
  const miss = abcPlans.find((plan) => Math.abs(entered.value[plan.id] - plan.total) > 1)
  if (miss) return `${miss.name}总预算与计算表不一致，须按测算结果回填后再导入`
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  workbookName.value = ''
  opened.value = false
  totals.A = ''
  totals.B = ''
  totals.C = ''
  error.value = ''
}
</script>

<template>
  <PanelShell title="编制A、B、C三受灾等级预算" source="应急预算测算">
    <SystemShell
      system="应急预算测算系统"
      operator="应急预算绩效岗"
      login-hint="登录后打开三受灾等级预算计算表，再将测算结果同步导入。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'open-book'">
          <div class="sys-toolbar">
            <a class="secondary-button" :href="downloadUrl()" :download="ABC_WORKBOOK" @click="markOpened">下载计算表</a>
            <button type="button" class="primary-button" @click="run('open-book', checkOpen)">确认已打开</button>
          </div>
          <p class="form-desc">现根据受灾等级编制轻度、中度、重度灾害所需要的预算金额。打开《ABC三受灾等级预算计算表》后回填三方案总预算。</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">计算表名称</span>
              <input v-model="workbookName" class="form-control" />
            </label>
          </div>
          <table class="calc-table">
            <thead>
              <tr><th>方案</th><th>适用灾情</th><th>安置期</th><th>覆盖人数</th><th>总预算（元）</th></tr>
            </thead>
            <tbody>
              <tr v-for="plan in abcPlans" :key="plan.id">
                <th scope="row">{{ plan.name }}</th>
                <td>{{ plan.applicable }}</td>
                <td>{{ plan.days }} 天</td>
                <td>{{ num(plan.people, 0) }} 人</td>
                <td><input v-model="totals[plan.id]" type="number" min="0" step="0.5" /></td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('open-book')">
            <p class="sys-toast">{{ ABC_WORKBOOK }} 已打开，三方案总预算已按计算表回填。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'import-result'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('import-result', checkImport)">测算结果同步导入</button>
          </div>
          <p class="form-desc">点完后平台呈现 A/B/C 三方案对照、保障内容与预算增量来源。</p>
          <template v-if="flow.isDone('import-result')">
            <p class="sys-toast">ABC 三方案预算已同步导入。</p>
            <div class="stat-grid">
              <div v-for="row in rows" :key="row.id" class="stat-cell">
                <span class="stat-label">{{ row.name }} · {{ row.level }}</span>
                <strong class="stat-value">{{ money(row.total, row.id === 'C' ? 1 : 0) }} 元</strong>
              </div>
            </div>
            <div class="calc-subhead"><h3>ABC三方案预算</h3></div>
            <table class="calc-table">
              <thead>
                <tr><th>指标</th><th>A方案</th><th>B方案</th><th>C方案</th><th>结论</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">总预算（元）</th>
                  <td>{{ money(abcPlans[0].total, 0) }}</td>
                  <td>{{ money(abcPlans[1].total, 0) }}</td>
                  <td>{{ money(abcPlans[2].total, 1) }}</td>
                  <td>{{ compareConclusions.total }}</td>
                </tr>
                <tr>
                  <th scope="row">安置期（天）</th>
                  <td>{{ abcPlans[0].days }}</td>
                  <td>{{ abcPlans[1].days }}</td>
                  <td>{{ abcPlans[2].days }}</td>
                  <td>{{ compareConclusions.days }}</td>
                </tr>
                <tr>
                  <th scope="row">覆盖人数（人）</th>
                  <td>{{ num(abcPlans[0].people, 0) }}</td>
                  <td>{{ num(abcPlans[1].people, 0) }}</td>
                  <td>{{ num(abcPlans[2].people, 0) }}</td>
                  <td>{{ compareConclusions.people }}</td>
                </tr>
                <tr>
                  <th scope="row">单位受益成本（元/人）</th>
                  <td>{{ num(rows[0].unitCost, 2) }}</td>
                  <td>{{ num(rows[1].unitCost, 3) }}</td>
                  <td>{{ num(rows[2].unitCost, 2) }}</td>
                  <td>{{ compareConclusions.unitCost }}</td>
                </tr>
                <tr>
                  <th scope="row">适用灾情</th>
                  <td>{{ abcPlans[0].applicable }}</td>
                  <td>{{ abcPlans[1].applicable }}</td>
                  <td>{{ abcPlans[2].applicable }}</td>
                  <td>{{ compareConclusions.applicable }}</td>
                </tr>
              </tbody>
            </table>

            <div class="calc-subhead"><h3>三方案保障内容对比</h3></div>
            <table class="calc-table">
              <thead>
                <tr><th>保障项目</th><th>A方案</th><th>B方案</th><th>C方案</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in coverageItems" :key="item.name">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ item.A }}</td>
                  <td>{{ item.B }}</td>
                  <td>{{ item.C }}</td>
                </tr>
              </tbody>
            </table>

            <div class="calc-subhead"><h3>预算增量来源</h3></div>
            <table class="calc-table">
              <thead>
                <tr><th>预算阶段</th><th>增量金额（元）</th><th>累计预算（元）</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in incrementStages" :key="item.name">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ money(item.increment, item.increment % 1 ? 1 : 0) }}</td>
                  <td>{{ money(item.cumulative, item.cumulative % 1 ? 1 : 0) }}</td>
                  <td>{{ item.note }}</td>
                </tr>
              </tbody>
            </table>

            <table class="calc-table">
              <thead>
                <tr><th>方案</th><th>基础执行预算（元）</th><th>预备费（元）</th><th>预备费占比</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in reserveNotes" :key="item.name">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ money(item.execution, item.execution % 1 ? 1 : 0) }}</td>
                  <td>{{ money(item.reserve, item.reserve % 1 ? 1 : 0) }}</td>
                  <td>{{ item.reserve ? percent(item.reserve / (item.execution + item.reserve), 2) : percent(0, 0) }}</td>
                  <td>{{ item.note }}</td>
                </tr>
              </tbody>
            </table>
            <p class="sys-toast">{{ reservePrinciple }}</p>
            <dl class="block-fields">
              <div class="field-row"><dt>B 较 A 增加</dt><dd>{{ money(rows[1].vsA, 0) }} 元（{{ signedPercent(rows[1].growth, 2) }}）</dd></div>
              <div class="field-row"><dt>C 较 B 增加</dt><dd>{{ money(rows[2].vsPrev, 1) }} 元（{{ signedPercent(rows[2].growth, 2) }}）</dd></div>
            </dl>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
