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
} from '../../data/abcBudget.js'
import { summarizeAbcPlans } from '../../domain/abcBudget.js'
import { money, num } from '../../domain/format.js'

const PAGES = ['open-book', 'import-result']
const STEPS = [
  { id: 'open-book', label: '编制ABC预算' },
  { id: 'import-result', label: '导入测算结果' },
]
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
        children: [{ id: 'open-book', label: '编制A、B、C三受灾等级预算' }],
      },
    ],
  },
  {
    id: 'm-calc',
    label: '预算测算',
        children: [{ id: 'import-result', label: '导入测算结果' }],
  },
]

const activeId = ref('')
const workbookName = ref('')
const opened = ref(false)
const totals = reactive({ A: '', B: '', C: '' })
const error = ref('')

store.restore({ workbookName, opened, totals })

const rows = computed(() => summarizeAbcPlans())

function downloadUrl() {
  return `${import.meta.env.BASE_URL}workbooks/${encodeURIComponent(ABC_WORKBOOK)}`
}

function snapshot() {
  return { workbookName, opened, totals }
}

function markOpened() {
  opened.value = true
  store.persist(snapshot())
}

function importAll() {
  workbookName.value = ABC_WORKBOOK
  opened.value = true
  totals.A = String(abcPlans[0].total)
  totals.B = String(abcPlans[1].total)
  totals.C = String(abcPlans[2].total)
  error.value = ''
  store.persist(snapshot())
  flow.complete('open-book')
  flow.complete('import-result')
  activeId.value = 'import-result'
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
  <PanelShell title="编制ABC等级预算" source="应急预算测算">
    <SystemShell
      system="应急预算测算系统"
      operator="应急预算绩效岗"
      login-hint="登录后下载三受灾等级预算计算表，点击导入即可呈现全部对照内容。"
      :menu="menu"
      :steps="STEPS"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'open-book'">
          <div class="sys-toolbar">
            <a class="secondary-button" :href="downloadUrl()" :download="ABC_WORKBOOK" @click="markOpened">下载计算表</a>
            <button type="button" class="primary-button" @click="importAll">导入</button>
          </div>
          <p class="form-desc">现根据受灾等级编制轻度、中度、重度灾害所需要的预算金额。下载计算表后点击「导入」，平台即呈现 ABC 三方案全部对照内容。</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">计算表名称</span>
              <input v-model="workbookName" class="form-control" />
            </label>
          </div>
          <template v-if="flow.isDone('open-book')">
            <p class="sys-toast">{{ ABC_WORKBOOK }} 已打开，三方案总预算已按计算表回填。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'import-result'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="importAll">导入</button>
          </div>
          <p class="form-desc">点击导入后，平台呈现 ABC 三方案预算对照表。</p>
          <template v-if="flow.isDone('import-result')">
            <p class="sys-toast">ABC 三方案预算已同步导入。</p>
            <div class="calc-subhead"><h3>ABC三方案预算</h3></div>
            <table class="calc-table center-text">
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
                  <td>{{ num(rows[1].unitCost, 2) }}</td>
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
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
