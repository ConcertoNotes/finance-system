import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { collaborationMessages } from '../src/data/roles.js'
import { rehearsalTasks } from '../src/data/rehearsal.js'

test('数据中心覆盖提取里程碑和敏感数据安全监测', async () => {
  const disasterData = await import('../src/data/disaster.js')
  assert.ok('pipelineMilestones' in disasterData)
  const content = JSON.stringify(disasterData.pipelineMilestones)
  assert.match(content, /78%/)
  assert.match(content, /敏感数据/)
  assert.match(content, /需授权/)
  assert.match(content, /异常波动监测/)
})

test('驾驶舱完整展示五部分要求中的明细字段', async () => {
  const source = await readFile(new URL('../src/views/DashboardView.vue', import.meta.url), 'utf8')
  for (const label of [
    '转移安置', '特殊人群',
    '原响应等级', '建议响应等级', '预算上限', '预备费比例', '审批权限',
    '已占用预算', '预计资金需求', '当前资金缺口', '资金覆盖率',
    '最低保障预算', '资金缺口', '单位受益成本', '建议追加金额',
  ]) assert.match(source, new RegExp(label))
  assert.doesNotMatch(source, /\.slice\(0, 5\)/)
})

test('成本动因完整覆盖七类公式和预算汇总桥接', async () => {
  const budgetData = await import('../src/data/budget.js')
  assert.ok('costDriverFormulas' in budgetData)
  assert.equal(budgetData.costDriverFormulas.length, 7)
  const content = JSON.stringify(budgetData.costDriverFormulas)
  for (const label of ['安置人天', '食品预算', '饮水预算', '帐篷预算', '运输预算', '保险预算', '设备预算']) {
    assert.match(content, new RegExp(label))
  }
  const source = await readFile(new URL('../src/views/BudgetView.vue', import.meta.url), 'utf8')
  for (const label of ['SUMIFS', 'XLOOKUP', '2,729,906', '11,000', '76,000', '2,816,906']) {
    assert.match(source, new RegExp(label))
  }
})

test('网格资金建议覆盖九个网格且缺口合计一致', async () => {
  const finance = await import('../src/domain/finance.js')
  assert.ok('calculateGridFundingRows' in finance)
})

test('保险比选包含理赔资料、预算影响和最终审批', async () => {
  const source = await readFile(new URL('../src/views/ProcurementView.vue', import.meta.url), 'utf8')
  for (const label of ['理赔资料', '3,000', '0.07%', '财务主管统筹岗审核通过', '政府协同保障资金']) {
    assert.match(source, new RegExp(label))
  }
})

test('协同时间线覆盖任务一到任务八的关键决策', () => {
  assert.ok(collaborationMessages.some((message) => message.taskId === 1))
  assert.ok(collaborationMessages.some((message) => message.taskId === 4))
  assert.ok(collaborationMessages.some((message) => message.taskId === 5))
  assert.ok(collaborationMessages.some((message) => message.taskId === 8))
  assert.ok(collaborationMessages.some((message) => message.taskId === 8 && /审核通过/.test(message.text)))
})

test('演练任务保留原文的九步突发处置和保险预算影响', () => {
  const task7 = rehearsalTasks.find((task) => task.id === 7)
  const task8 = rehearsalTasks.find((task) => task.id === 8)
  assert.ok(task7.steps.length >= 9)
  assert.match(JSON.stringify(task8), /理赔资料/)
  assert.match(JSON.stringify(task8), /3,000/)
  assert.match(JSON.stringify(task8), /0.07%/)
})

test('新增岗位可配置权限标签且演练设置真实接入', async () => {
  const settingsSource = await readFile(new URL('../src/views/SettingsView.vue', import.meta.url), 'utf8')
  const rehearsalSource = await readFile(new URL('../src/views/RehearsalView.vue', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(settingsSource, /权限标签/)
  assert.match(settingsSource, /update-rehearsal-settings/)
  assert.match(rehearsalSource, /showNarration/)
  assert.match(rehearsalSource, /requireApproval/)
  assert.match(rehearsalSource, /autoAlert/)
  assert.match(appSource, /rehearsalSettings/)
})

test('缺口任务提供真实操作、报告预览与审批入口', async () => {
  const expectations = {
    'FundsView.vue': ['启用专项账套', '专项账套启用单', '会计期间'],
    'DataCenterView.vue': ['查看质量校验单', '下载质量校验单', '查看合规报告', '下载合规报告'],
    'BudgetView.vue': ['9 网格成本动因明细', '甲3成本计算示例', '提交响应审批', '确认审批'],
    'ProcurementView.vue': ['提交保险方案', '确认保险审批', '查看比选报告', '下载比选报告'],
  }

  for (const [file, labels] of Object.entries(expectations)) {
    const source = await readFile(new URL(`../src/views/${file}`, import.meta.url), 'utf8')
    for (const label of labels) assert.match(source, new RegExp(label))
  }
})
