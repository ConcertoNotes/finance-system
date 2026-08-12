import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

import { assistantRole, defaultRoles } from '../src/data/roles.js'
import { rehearsalStages, rehearsalTasks } from '../src/data/rehearsal.js'

test('包含文档定义的四个岗位、副岗与数字人御洪星', () => {
  assert.deepEqual(
    defaultRoles.map((role) => role.name),
    ['财务主管统筹岗', '采购成本保障岗', '应急预算绩效岗', '资金核算风控岗'],
  )
  assert.deepEqual(
    defaultRoles.map((role) => role.subRole.name),
    ['网格财经架构师', '网格资金调度专员', '网格数据分析师', '网格财务专员'],
  )
  assert.equal(assistantRole.name, '数字人御洪星')
})

test('阶段演练覆盖四阶段任务 1 至任务 27', () => {
  assert.equal(rehearsalTasks.length, 27)
  assert.deepEqual(rehearsalTasks.map((task) => task.id), Array.from({ length: 27 }, (_, index) => index + 1))
  for (const task of rehearsalTasks) {
    assert.ok(task.role)
    assert.ok(task.summary)
    assert.ok(task.steps.length >= 2)
    assert.ok(task.metrics.length >= 1)
  }
  assert.equal(rehearsalStages.length, 4)
  assert.deepEqual(rehearsalStages.flatMap((stage) => stage.taskIds), rehearsalTasks.map((task) => task.id))
  assert.deepEqual(rehearsalStages.map((stage) => stage.window), ['灾后0—1小时', '灾后1—6小时', '灾后6—24小时', '灾后复盘'])
})

test('应用壳层包含九个导航和公共组件', async () => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  for (const label of [
    '综合驾驶舱', '灾情数据中心', '预算决策中心', '采购与成本',
    '资金核算风控', '复盘与绩效', '应急协同', '阶段演练', '系统配置',
  ]) assert.match(source, new RegExp(label))

  for (const file of [
    'AppSidebar.vue', 'AppHeader.vue', 'MetricCard.vue', 'StatusBadge.vue',
    'BaseModal.vue', 'ToastStack.vue', 'AssistantPanel.vue', 'MiniLineChart.vue', 'GridHeatmap.vue',
  ]) await access(new URL(`../src/components/${file}`, import.meta.url))
})

test('侧栏与演练页共享同一份任务进度', async () => {
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const sidebarSource = await readFile(new URL('../src/components/AppSidebar.vue', import.meta.url), 'utf8')
  const rehearsalSource = await readFile(new URL('../src/views/RehearsalView.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(sidebarSource, /3 \/ 8/)
  assert.match(sidebarSource, /rehearsalProgress\.completed/)
  assert.match(sidebarSource, /rehearsalProgress\.currentTitle/)
  assert.match(appSource, /completedRehearsalTasks/)
  assert.match(appSource, /@task-completed=/)
  assert.match(rehearsalSource, /completedTaskIds/)
  assert.match(rehearsalSource, /task-completed/)
})

test('保留演练进度设置已接入浏览器存储', async () => {
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const settingsSource = await readFile(new URL('../src/views/SettingsView.vue', import.meta.url), 'utf8')

  assert.match(appSource, /loadRehearsalProgress/)
  assert.match(appSource, /saveRehearsalProgress/)
  assert.match(appSource, /clearRehearsalProgress/)
  assert.match(appSource, /@change-preserve-progress=/)
  assert.match(settingsSource, /change-preserve-progress/)
})

test('业务页面与配置数据联合覆盖全部业务中心', async () => {
  const expectations = {
    'DashboardView.vue': { data: [], labels: ['灾情概况', '数据质量', '响应判级', '资金状态', '网格保障优先级'] },
    'DataCenterView.vue': { data: ['../src/data/disaster.js'], labels: ['应急管理局平台', '气象局平台', '蓝天救援队', '无人机巡航', '3σ'] },
    'BudgetView.vue': { data: ['../src/data/budget.js'], labels: ['最低生命保障方案', '标准救援保障方案', '持续灾情保障方案', '成本动因', '响应判级'] },
    'ProcurementView.vue': { data: ['../src/data/procurement.js', '../src/data/procurementStage2.js'], labels: ['基础意外险', '高风险救援险', '综合保障险', '八项指标', '立即锁价', '采购需求', '价格基准', '供应商', '合同变更', '规划求解'] },
    'FundsView.vue': { data: ['../src/data/funds.js', '../src/data/fundsStage3.js'], labels: ['捐赠收入', '应急采购支出', '运输支出', '保险支出', '需求', '物资', '资金', '凭证', '资金分类台账', '四流匹配', '付款申请', '银行对账'] },
    'ReviewView.vue': { data: ['../src/data/review.js'], labels: ['保险理赔', '差异分析', '绩效评价', '审计', '参数回写', '信息公开'] },
    'CollaborationView.vue': { data: ['../src/data/roles.js'], labels: ['财务主管统筹岗', '采购成本保障岗', '应急预算绩效岗', '资金核算风控岗', '数字人御洪星', '预算粗放', '资金错配', '风控缺位'] },
    'RehearsalView.vue': { data: ['../src/data/rehearsal.js'], labels: ['任务 1', '任务 27', '演练总进度', '第一阶段', '第四阶段'] },
    'SettingsView.vue': { data: [], labels: ['岗位注册表', '新增岗位', '预算参数', '演练设置'] },
  }
  for (const [file, expectation] of Object.entries(expectations)) {
    let source = await readFile(new URL(`../src/views/${file}`, import.meta.url), 'utf8')
    for (const dataFile of expectation.data) source += await readFile(new URL(dataFile, import.meta.url), 'utf8')
    for (const label of expectation.labels) assert.match(source, new RegExp(label))
  }
})
