import test from 'node:test'
import assert from 'node:assert/strict'

import {
  directPriceControls, directPurchaseOrder, emergencyQuotes, initialContracts, materialRequirements,
  priceAlertThresholds, priceQuotes, splitModel, stage2BudgetCeiling, supplierProfiles, supplierWeights,
} from '../src/data/procurementStage2.js'
import {
  buildDirectPriceChecks, buildPriceBenchmarks, calculateChangeImpact, calculateEmergencyQuote,
  calculateNetRequirements, contractTotal, evaluateSplitCombos, getContractPortfolio, scoreSuppliers,
  solveSplitModel, splitRequirementsByChannel,
} from '../src/domain/procurementLogic.js'

test('净采购量匹配文档：帐篷500、棉被6604、救生衣468、急救包324、饮用水629、食品1704', () => {
  const rows = calculateNetRequirements(materialRequirements)
  const byId = Object.fromEntries(rows.map((row) => [row.id, row.net]))
  assert.equal(byId.tent, 500)
  assert.equal(byId.quilt, 6604)
  assert.equal(byId.vest, 468)
  assert.equal(byId.kit, 324)
  assert.equal(byId.water, 629)
  assert.equal(byId.food, 1704)
})

test('执行路径分流：4类合同采购物资 + 2类生活保障直采物资', () => {
  const { contract, direct } = splitRequirementsByChannel(materialRequirements)
  assert.deepEqual(contract.map((row) => row.name), ['帐篷', '棉被', '救生衣', '急救包'])
  assert.deepEqual(direct.map((row) => row.name), ['饮用水', '食品'])
})

test('帐篷综合基准价 846.25 元，偏差率与预警等级符合文档', () => {
  const benchmarks = buildPriceBenchmarks(priceQuotes, priceAlertThresholds)
  const tent = benchmarks.find((row) => row.id === 'tent')
  assert.equal(tent.base, 846.25)
  assert.equal(tent.average, 894.33)
  assert.equal(tent.median, 880)
  assert.deepEqual(tent.range, [835, 968])
  const [s1, s2, s3] = tent.suppliers
  assert.equal(s1.deviation, 3.99)
  assert.equal(s2.deviation, -1.33)
  assert.equal(s3.deviation, 14.39)
  assert.equal(s3.alert, 'red')
  assert.equal(s2.alert, 'normal')
})

test('价格基准仅覆盖4类合同物资，饮用水与食品不参与供应商比价', () => {
  assert.deepEqual(priceQuotes.map((row) => row.id), ['tent', 'quilt', 'vest', 'kit'])
})

test('生活保障直采控制价核验：饮用水23.5元/箱、食品79元/箱且无偏差预警', () => {
  const checks = buildDirectPriceChecks(directPriceControls, priceAlertThresholds)
  const water = checks.find((row) => row.id === 'water')
  const food = checks.find((row) => row.id === 'food')
  assert.equal(water.base, 23.5)
  assert.equal(water.deviation, 0)
  assert.equal(water.alert, 'normal')
  assert.equal(water.amount, 14781.5)
  assert.equal(food.base, 79)
  assert.equal(food.deviation, 0)
  assert.equal(food.amount, 134616)
})

test('供应商加权评分 S2 88.3 > S1 84.0 > S3 67.1', () => {
  const scores = scoreSuppliers(supplierProfiles, supplierWeights)
  assert.deepEqual(scores.map((supplier) => supplier.id), ['S2', 'S1', 'S3'])
  assert.equal(scores[0].score, 88.3)
  assert.equal(scores[1].score, 84)
  assert.equal(scores[2].score, 67.1)
})

test('HT-2025-001 合同金额 932,460 元、生活保障直采 149,397.50 元', () => {
  assert.equal(initialContracts.length, 1)
  assert.equal(contractTotal(initialContracts[0].items), 932460)
  assert.equal(contractTotal(directPurchaseOrder.items), 149397.5)
})

test('初始采购预算占用合计 1,081,857.50 元，占用率 25.29%', () => {
  const before = getContractPortfolio(initialContracts, directPurchaseOrder, false, stage2BudgetCeiling)
  assert.equal(before.contractSubtotal, 932460)
  assert.equal(before.directAmount, 149397.5)
  assert.equal(before.total, 1081857.5)
  assert.equal(before.occupancyRate, 25.29)
})

test('S1/S3 紧急询价：订单级固定成本 3,000 与 1,760 元，满量综合成本 135,000 与 146,960 元', () => {
  const s1 = calculateEmergencyQuote(emergencyQuotes[0], 150)
  const s3 = calculateEmergencyQuote(emergencyQuotes[1], 150)
  assert.equal(s1.goods, 132000)
  assert.equal(s1.vehicleExtra, 2160)
  assert.equal(s1.laborExtra, 840)
  assert.equal(s1.fixedCost, 3000)
  assert.equal(s1.landedCost, 135000)
  assert.equal(s1.unitLandedCost, 900)
  assert.equal(s3.vehicleExtra, 1200)
  assert.equal(s3.laborExtra, 560)
  assert.equal(s3.fixedCost, 1760)
  assert.equal(s3.landedCost, 146960)
  assert.equal(s3.unitLandedCost, 979.73)
})

test('分单组合按 MinZ=880x1+968x3+3000y1+1760y3 计算：A 135,000 < B 141,160 < C 145,560 < D 146,960', () => {
  const s1 = calculateEmergencyQuote(emergencyQuotes[0], 150)
  const s3 = calculateEmergencyQuote(emergencyQuotes[1], 150)
  const combos = evaluateSplitCombos(splitModel.combos, s1, s3)
  const byId = Object.fromEntries(combos.map((combo) => [combo.id, combo]))
  assert.equal(byId.A.cost, 135000)
  assert.equal(byId.B.cost, 141160)
  assert.equal(byId.C.cost, 145560)
  assert.equal(byId.D.cost, 146960)
  assert.equal(byId.A.optimal, true)
  assert.equal(byId.A.saving, 11960)
  assert.deepEqual([byId.A.y1, byId.A.y3], [1, 0])
  assert.deepEqual([byId.B.y1, byId.B.y3], [1, 1])
})

test('规划求解结果 x1=150、x3=0、y1=1、y3=0，相较全部选择S3节约 11,960 元', () => {
  const quotes = emergencyQuotes.map((quote) => calculateEmergencyQuote(quote, splitModel.demand))
  const result = solveSplitModel(quotes, splitModel.demand, 12)
  assert.deepEqual(result.best.suppliers, ['S1'])
  assert.equal(result.best.allocation.S1, 150)
  assert.equal(result.best.cost, 135000)
  assert.equal(result.saving, 11960)
  assert.deepEqual(result.excluded, [])
})

test('合同变更影响：新增 9,750 元、预备费使用率 2.59%、货物均价偏差 0.27%', () => {
  const impact = calculateChangeImpact()
  assert.equal(impact.originalCost, 417500)
  assert.equal(impact.changedCost, 427250)
  assert.equal(impact.reduction, 125250)
  assert.equal(impact.increase, 9750)
  assert.equal(impact.priceDiff, 6750)
  assert.equal(impact.reserveUseRate, 2.59)
  assert.equal(impact.reserveRemaining, 366250)
  assert.equal(impact.avgUnitCost, 854.5)
  assert.equal(impact.goodsAvgPrice, 848.5)
  assert.equal(impact.benchmarkDeviation, 0.27)
})

test('变更后 HT-001 807,210 + HT-003 135,000 = 942,210 元，采购执行合计 1,091,607.50 元', () => {
  const after = getContractPortfolio(initialContracts, directPurchaseOrder, true, stage2BudgetCeiling)
  assert.equal(after.contracts.find((contract) => contract.id === 'HT-2025-001').amount, 807210)
  assert.equal(after.contracts.find((contract) => contract.id === 'HT-2025-003').amount, 135000)
  assert.equal(after.contractSubtotal, 942210)
  assert.equal(after.directAmount, 149397.5)
  assert.equal(after.total, 1091607.5)
  assert.equal(after.total - 1081857.5, 9750)
})
