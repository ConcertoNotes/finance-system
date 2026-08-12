import test from 'node:test'
import assert from 'node:assert/strict'

import {
  auditChain, auditFindings, disclosureTiers, executionSummary, insuranceClaim,
  parameterWritebacks, performanceDimensions, varianceItems, WRITEBACK_THRESHOLD,
} from '../src/data/review.js'
import { calculateClaim, calculateExecutionStats, countPerformanceItems, decideWriteback, unitBenefitCost } from '../src/domain/reviewLogic.js'

test('保险理赔赔款 34,900 元（医疗费 35,000 − 免赔 100）', () => {
  const claim = calculateClaim({ medicalCost: insuranceClaim.medicalCost, deductible: insuranceClaim.deductible, payoutRatio: insuranceClaim.payoutRatio })
  assert.equal(claim, 34900)
  assert.equal(insuranceClaim.claimDiff, 45100)
})

test('预算执行率 98.12%、偏差率 1.88%、未执行 80,341 元', () => {
  const stats = calculateExecutionStats({ budget: executionSummary.budget, actual: executionSummary.actual })
  assert.equal(stats.executionRate, 98.12)
  assert.equal(stats.deviationRate, 1.88)
  assert.equal(stats.unexecuted, 80341)
  const sourceTotal = executionSummary.sources.reduce((sum, source) => sum + source.amount, 0)
  assert.equal(sourceTotal, executionSummary.actual)
})

test('绩效评价共 6 维度 20 项，单位受益成本 517.87 元/人', () => {
  assert.equal(performanceDimensions.length, 6)
  assert.equal(countPerformanceItems(performanceDimensions), 20)
  assert.equal(unitBenefitCost(executionSummary.actual, 8100), 517.87)
})

test('参数回写判定符合 5% 阈值规则', () => {
  const transport = decideWriteback({ original: 8.5, actual: 9.2, threshold: WRITEBACK_THRESHOLD })
  assert.equal(transport.action, 'update')
  assert.equal(transport.newValue, 9.2)
  assert.equal(transport.deviation, 8.24)

  const water = decideWriteback({ original: 24, actual: 23.5, threshold: WRITEBACK_THRESHOLD })
  assert.equal(water.action, 'keep')
  assert.equal(water.newValue, 24)
  assert.equal(water.deviation, -2.08)

  const quality = decideWriteback({ original: 3, actual: 2, threshold: WRITEBACK_THRESHOLD, weighted: true })
  assert.equal(quality.action, 'weighted')
  assert.equal(quality.newValue, 2.5)

  const special = decideWriteback({ original: 120, actual: 135, threshold: WRITEBACK_THRESHOLD })
  assert.equal(special.action, 'update')
  assert.equal(special.newValue, 135)
  assert.equal(special.deviation, 12.5)

  assert.equal(parameterWritebacks.length, 5)
})

test('审计证据链 11 环节、3 条异常、3 层信息公开', () => {
  assert.equal(auditChain.length, 11)
  assert.equal(auditChain[0], '灾情数据')
  assert.equal(auditChain.at(-1), '绩效结果')
  assert.equal(auditFindings.length, 3)
  assert.deepEqual(disclosureTiers.map((tier) => tier.tier), ['公众层', '监管层', '内部层'])
})

test('差异分析：帐篷差异 9,750 元由预备费覆盖，食品 +28,000，运输 -5,000', () => {
  const tentGoods = varianceItems.find((item) => item.item === '帐篷货物')
  const tentExtra = varianceItems.find((item) => item.item === '帐篷应急附加成本')
  assert.equal(tentGoods.variance + tentExtra.variance, 9750)
  assert.equal(varianceItems.find((item) => item.item === '食品').variance, 28000)
  assert.equal(varianceItems.find((item) => item.item === '运输').variance, -5000)
})
