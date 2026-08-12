import test from 'node:test'
import assert from 'node:assert/strict'

import { budgetScenarios } from '../src/data/budget.js'
import { insuranceProducts, insuranceWeights } from '../src/data/procurement.js'
import { getGridSnapshot } from '../src/data/disaster.js'
import { calculateInsuranceScores, getBudgetScenario } from '../src/domain/finance.js'
import { determineResponse, summarizeDisaster } from '../src/domain/emergency.js'

test('初始与升级灾情汇总匹配文档数字', () => {
  const baseline = summarizeDisaster(getGridSnapshot('baseline'))
  const escalated = summarizeDisaster(getGridSnapshot('escalated'))

  assert.equal(baseline.relocated, 7000)
  assert.equal(baseline.trapped, 1080)
  assert.equal(baseline.blockedRoads, 3)
  assert.equal(escalated.relocated, 8100)
  assert.equal(escalated.trapped, 1300)
  assert.equal(escalated.blockedRoads, 5)
})

test('响应判级从 III 级升级为 II 级', () => {
  const baseline = determineResponse({ ...summarizeDisaster(getGridSnapshot('baseline')), shelterDays: 3, fundingGap: 0 })
  const escalated = determineResponse({ ...summarizeDisaster(getGridSnapshot('escalated')), shelterDays: 5, fundingGap: 255091 })

  assert.equal(baseline.level, 'III')
  assert.equal(baseline.planId, 'B')
  assert.equal(escalated.level, 'II')
  assert.equal(escalated.planId, 'C')
})

test('三情景预算金额和增量保持一致', () => {
  assert.equal(getBudgetScenario('A', budgetScenarios).total, 2816906)
  assert.equal(getBudgetScenario('B', budgetScenarios).unitCost, 415.57)
  assert.equal(getBudgetScenario('C', budgetScenarios).total, 4275091)
  assert.equal(getBudgetScenario('C', budgetScenarios).total - getBudgetScenario('B', budgetScenarios).total, 1366087)
})

test('保险加权评分推荐保险II', () => {
  const scores = calculateInsuranceScores(insuranceProducts, insuranceWeights)
  assert.deepEqual(scores.map((item) => item.id), ['II', 'III', 'I'])
  assert.equal(scores[0].score, 74.45)
  assert.equal(scores[1].score, 70.65)
  assert.equal(scores[2].score, 28)
  assert.equal(scores[0].totalPremium, 11000)
})
