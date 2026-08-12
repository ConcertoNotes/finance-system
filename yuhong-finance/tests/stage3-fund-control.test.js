import test from 'node:test'
import assert from 'node:assert/strict'

import {
  fourFlowItems, fundCategories, fundEntries, fundTotalAvailable, gridReadinessBoard, gridSubAccounts,
  paymentApplications, paymentConditions,
} from '../src/data/fundsStage3.js'
import {
  acceptanceRate, checkRestrictedUsage, getFourFlowStatus, getFundAccountBalances, splitPayment, summarizeFundEntries,
} from '../src/domain/fundControl.js'

test('资金分类台账：4 类 8 笔，金额匹配文档', () => {
  assert.equal(fundEntries.length, 8)
  const summary = summarizeFundEntries(fundEntries, fundCategories)
  const byId = Object.fromEntries(summary.map((category) => [category.id, category.total]))
  assert.equal(byId.gov, 2800000)
  assert.equal(byId.restricted, 700000)
  assert.equal(byId.unrestricted, 880000)
  assert.equal(byId.insurance, 80000)
  assert.equal(fundTotalAvailable, 4493330.5)
})

test('限定性用途匹配：车辆维修不得使用 D01 食品捐赠，可使用 U01', () => {
  const d01 = fundEntries.find((entry) => entry.id === 'D01')
  const u01 = fundEntries.find((entry) => entry.id === 'U01')
  assert.equal(checkRestrictedUsage('车辆维修', d01).pass, false)
  assert.equal(checkRestrictedUsage('食品采购', d01).pass, true)
  assert.equal(checkRestrictedUsage('车辆维修', u01).pass, true)
})

test('资金替换后 U01 余额 65 万、D01 余额保持 30 万', () => {
  const balances = getFundAccountBalances(fundEntries, true)
  assert.equal(balances.find((entry) => entry.id === 'U01').balance, 650000)
  assert.equal(balances.find((entry) => entry.id === 'D01').balance, 300000)
})

test('四流匹配首次通过率 87.5%，放行后 100%', () => {
  const before = getFourFlowStatus(fourFlowItems, false)
  assert.equal(before.total, 8)
  assert.equal(before.passed, 7)
  assert.equal(before.passRate, 87.5)
  const anomaly = before.rows.find((row) => !row.pass)
  assert.equal(anomaly.frozen, 8800)
  const after = getFourFlowStatus(fourFlowItems, true)
  assert.equal(after.passRate, 100)
})

test('付款拆分：可支付 126,200 元、冻结 8,800 元、合计 135,000 元', () => {
  const split = splitPayment({ contractQty: 150, qualifiedQty: 140, unitPrice: 880, extras: 3000 })
  assert.equal(split.payable, 126200)
  assert.equal(split.frozen, 8800)
  assert.equal(split.total, 135000)
})

test('验收合格率：HT-003 首次 93.33%，总体首次 98.0%', () => {
  assert.equal(acceptanceRate(140, 150), 93.33)
  assert.equal(acceptanceRate(490, 500), 98)
})

test('付款申请与匹配条件符合文档：8 项条件、4 笔申请', () => {
  assert.equal(paymentConditions.length, 8)
  assert.equal(paymentApplications.length, 4)
  const amounts = paymentApplications.map((application) => application.amount)
  assert.deepEqual(amounts, [807210, 149397.5, 135000, 30000])
})

test('采购类付款申请合计等于第二阶段采购执行总额 1,091,607.50 元', () => {
  const procurement = paymentApplications
    .filter((application) => application.id !== 'PAY-04')
    .reduce((sum, application) => sum + application.amount, 0)
  assert.equal(procurement, 1091607.5)
})

test('9 网格子账户各 50 万合计 450 万，甲5 到位率 52% 标红', () => {
  assert.equal(gridSubAccounts.initialQuota, 500000)
  assert.equal(gridSubAccounts.total, 4500000)
  assert.deepEqual(gridSubAccounts.priority, ['甲3', '甲6', '甲5', '甲4', '甲7', '甲1', '甲9', '甲2', '甲8'])
  const grid5 = gridReadinessBoard.find((row) => row.grid === '甲5')
  assert.equal(grid5.readiness, 52)
  assert.equal(grid5.alert, true)
})
