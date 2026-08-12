import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { getGridSnapshot } from '../src/data/disaster.js'
import { escalationPlayback, rehearsalTasks } from '../src/data/rehearsal.js'
import { insuranceProducts, insuranceWeights } from '../src/data/procurement.js'
import { calculateSigmaAnalysis, determineResponse, summarizeDisaster } from '../src/domain/emergency.js'
import { buildInsuranceCalcSteps } from '../src/domain/finance.js'

test('3σ 演算：均值、上下限与甲3甲6重点关注符合 Excel 结论', () => {
  const analysis = calculateSigmaAnalysis(getGridSnapshot('baseline'))
  assert.equal(analysis.mean, 115.4)
  assert.equal(analysis.upper, 197)
  assert.equal(analysis.lower, 33.9)
  assert.equal(analysis.outlierCount, 0)
  assert.deepEqual(analysis.focusRows.map((row) => row.id), ['甲3', '甲6'])
  assert.ok(analysis.rows.every((row) => row.verdict === '正常'))
})

test('资金缺口待定时暂按 III 级列示且不计入触发统计', () => {
  const baseline = determineResponse({
    ...summarizeDisaster(getGridSnapshot('baseline')),
    shelterDays: 3,
    fundingGap: 0,
    fundingGapPending: true,
  })
  const gapIndicator = baseline.indicators.find((item) => item.key === 'fundingGap')
  assert.equal(gapIndicator.pending, true)
  assert.equal(gapIndicator.level, 'III')
  assert.equal(baseline.level3OrAboveCount, 4)
  assert.equal(baseline.level2Count, 1)
  assert.equal(baseline.level, 'III')
  assert.equal(baseline.planId, 'B')
})

test('升级后资金缺口实测 255,091 元并触发 II 级综合判定', () => {
  const escalated = determineResponse({
    ...summarizeDisaster(getGridSnapshot('escalated')),
    shelterDays: 5,
    fundingGap: 255091,
    fundingGapPending: false,
  })
  const gapIndicator = escalated.indicators.find((item) => item.key === 'fundingGap')
  assert.equal(gapIndicator.pending, false)
  assert.equal(gapIndicator.level, 'III')
  assert.equal(escalated.level2Count, 4)
  assert.equal(escalated.level, 'II')
  assert.equal(escalated.planId, 'C')
})

test('保险八步演算与 Excel 每步标准分一致', () => {
  const calc = buildInsuranceCalcSteps(insuranceProducts, insuranceWeights)
  assert.equal(calc.steps.length, 8)

  const premium = calc.steps.find((step) => step.key === 'premium')
  assert.equal(premium.items.find((item) => item.id === 'I').score, 100)
  assert.equal(premium.items.find((item) => item.id === 'II').score, 75)
  assert.equal(premium.items.find((item) => item.id === 'III').score, 0)
  assert.match(premium.items.find((item) => item.id === 'II').expression, /\(280−220\)÷\(280−200\)×100/)

  const death = calc.steps.find((step) => step.key === 'deathBenefit')
  assert.equal(death.items.find((item) => item.id === 'II').score, 71.43)

  const waiting = calc.steps.find((step) => step.key === 'waitingDays')
  assert.equal(waiting.items.find((item) => item.id === 'III').score, 65.22)

  assert.deepEqual(calc.weighted.map((item) => item.id), ['II', 'III', 'I'])
  assert.equal(calc.weighted[0].score, 74.45)
  assert.equal(calc.weighted[1].score, 70.65)
  assert.equal(calc.weighted[2].score, 28)
  assert.match(calc.weighted[0].expression, /74\.45 分$/)
})

test('九步突发事件推演数据完整覆盖 Excel 过程', () => {
  assert.equal(escalationPlayback.length, 9)
  const content = JSON.stringify(escalationPlayback)
  for (const fragment of ['262,500', '150,000', '255,091', '94.03%', '8.8%', '1,366,087', '21,000 → 40,500', '新增甲4、甲7']) {
    assert.match(content, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('阶段一任务提供实操入口且视图接入过程组件', async () => {
  for (const taskId of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const task = rehearsalTasks.find((item) => item.id === taskId)
    assert.ok(task.targetView, `任务${taskId}缺少 targetView`)
  }

  const expectations = {
    'views/DataCenterView.vue': ['SigmaAnalysisPanel', 'cleaning-formula'],
    'views/BudgetView.vue': ['WaterfallChart', '预算构成透视', '直接动因合计', '暂按III级', 'calc-delta'],
    'views/ProcurementView.vue': ['InsuranceCalcSteps'],
    'views/RehearsalView.vue': ['EscalationPlayback', '前往实操页面', 'finishPlayback'],
    'views/DashboardView.vue': ['fundPending', '待定', '暂按III级'],
    'components/EscalationPlayback.vue': ['执行下一步', '自动推演', '完成处置'],
    'components/SigmaAnalysisPanel.vue': ['STDEV.S', 'IF(OR(I2>$M$3,I2<$M$4)'],
    'components/InsuranceCalcSteps.vue': ['八步标准分演算', '加权评分'],
  }
  for (const [file, labels] of Object.entries(expectations)) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')
    for (const label of labels) {
      assert.ok(source.includes(label), `${file} 缺少 ${label}`)
    }
  }

  const disasterSource = await readFile(new URL('../src/data/disaster.js', import.meta.url), 'utf8')
  assert.ok(disasterSource.includes('=COUNTBLANK(B2:K10)'))
  assert.ok(disasterSource.includes('=XLOOKUP(A2,网格基础信息!A:A,网格基础信息!B:G)'))
})
