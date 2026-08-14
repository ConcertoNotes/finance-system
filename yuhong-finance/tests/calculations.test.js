import assert from 'node:assert/strict'
import test from 'node:test'

import { insuranceProducts } from '../src/data/insurance.js'
import { disasterGrids } from '../src/data/costDriver.js'
import { abcPlans } from '../src/data/abcBudget.js'
import { PLAN_C_BUDGET_CAP, splitModel } from '../src/data/procurement.js'
import { getInsuranceDecision, scoreInsurance, standardizeScores } from '../src/domain/insurance.js'
import { calculateBudgetSummary, calculateGridBudgets } from '../src/domain/costDriver.js'
import { coverageRate, summarizeAbcPlans, unitBenefitCost } from '../src/domain/abcBudget.js'
import { bCoverage, cResilience, gridFoodShifts } from '../src/domain/emergencyUpdate.js'
import {
  calculateBudgetOccupation,
  calculateChangeImpact,
  calculateNetDemand,
  calculatePriceBaseline,
  evaluateSplit,
  scoreSuppliers,
  solveSplitModel,
} from '../src/domain/procurement.js'

const near = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `期望 ${expected}，实际 ${actual}`)

// ---------------------------------------------- 保险方案综合评分计算表.xlsx

test('保险标准分复现计算表 B22:I24', () => {
  const [a, b, c] = standardizeScores()
  near(a.scores.premium, 100)
  near(a.scores.death, 0)
  near(a.scores.coverage, 80)
  near(b.scores.premium, 75)
  near(b.scores.death, 71.4285714285714)
  near(b.scores.coverage, 100)
  near(c.scores.medical, 100)
  near(c.scores.settlementDays, 62.5)
  // 三家等待期均为 0 天，极差为 0，统一计 100
  for (const row of [a, b, c]) near(row.scores.waiting, 100)
})

test('保险综合得分复现计算表 J29:J31', () => {
  const rows = scoreInsurance()
  near(rows.find((r) => r.id === 'A').total, 38)
  near(rows.find((r) => r.id === 'B').total, 77.7857142857143)
  near(rows.find((r) => r.id === 'C').total, 69.125)
})

test('保险方案选择与总保费复现计算表 B35:D37', () => {
  const decision = getInsuranceDecision(insuranceProducts, 50)
  assert.equal(decision.product.id, 'B')
  assert.equal(decision.totalPremium, 11000)
  const c = decision.alternatives.find((item) => item.id === 'C')
  assert.equal(c.totalPremium, 14000)
  assert.equal(c.premiumGap, 3000)
  assert.ok(decision.conclusion.includes('77.79'))
})

// ------------------------------------ 灾情数据成本动因转换计算表.xlsx

test('9网格成本动因逐格测算复现计算表 U27:U35', () => {
  const rows = calculateGridBudgets()
  const expected = [233406, 155740, 587324, 272460, 351445, 470565, 234176, 192824, 231966]
  rows.forEach((row, index) => near(row.total, expected[index], 1))
})

test('预算汇总复现计算表 H40:H43', () => {
  const summary = calculateBudgetSummary()
  near(summary.gridBudget, 2729906, 1)
  assert.equal(summary.insuranceBudget, 11000)
  assert.equal(summary.equipmentBudget, 76000)
  near(summary.totalBudget, 2816906, 1)
})

test('分项合计复现计算表 F36:T36', () => {
  const { totals } = calculateBudgetSummary()
  assert.equal(totals.relocated, 7000)
  assert.equal(totals.personDays, 21000)
  near(totals.food, 525000)
  near(totals.water, 168000)
  near(totals.tentBudget, 1487500)
  near(totals.quiltBudget, 455260)
  near(totals.specialBudget, 89640)
  near(totals.transport, 4506, 1)
  assert.equal(totals.tents, 1750)
  assert.equal(totals.quilts, 7004)
})

test('调整安置天数会按比例带动食品与饮水预算', () => {
  const base = calculateBudgetSummary()
  const doubled = calculateBudgetSummary(disasterGrids, {
    ...Object.fromEntries(Object.entries(base.rows[0]).filter(() => false)),
    shelterDays: 6,
    foodRate: 25,
    waterRate: 8,
    tentPrice: 850,
    tentCapacity: 4,
    quiltPrice: 65,
    specialCare: 120,
    transportRate: 8.5,
    vehiclesPerGrid: 2,
    rescuers: 50,
    insuranceRate: 220,
    boatPrice: 3500,
    boatCount: 5,
    kitPrice: 180,
    kitCount: 200,
    vestPrice: 75,
    vestCount: 300,
  })
  near(doubled.totals.food, base.totals.food * 2)
  near(doubled.totals.water, base.totals.water * 2)
  near(doubled.totals.tentBudget, base.totals.tentBudget)
})

// ------------------------------------------------------- 洪涝阶段二.xlsx

test('净采购量复现任务1的六类物资测算', () => {
  const rows = calculateNetDemand()
  const get = (id) => rows.find((row) => row.id === id).computed
  assert.equal(get('tent'), 500)
  assert.equal(get('quilt'), 6604)
  assert.equal(get('vest'), 468)
  assert.equal(get('kit'), 324)
  assert.equal(get('water'), 629)
  assert.equal(get('food'), 1704)
})

test('帐篷价格基准与偏差率复现任务2', () => {
  const tent = calculatePriceBaseline().find((row) => row.id === 'tent')
  near(tent.baseline, 846.25)
  near(tent.average, 894.33, 0.01)
  assert.equal(tent.median, 880)
  const rate = (id) => tent.deviations.find((d) => d.supplierId === id).rate * 100
  near(rate('S1'), 3.99, 0.01)
  near(rate('S2'), -1.33, 0.01)
  near(rate('S3'), 14.39, 0.01)
  assert.equal(tent.deviations.find((d) => d.supplierId === 'S3').level, 'red')
})

test('供应商 SUMPRODUCT 综合得分复现任务3', () => {
  const rows = scoreSuppliers()
  near(rows.find((r) => r.id === 'S1').total, 84.0)
  near(rows.find((r) => r.id === 'S2').total, 88.3)
  near(rows.find((r) => r.id === 'S3').total, 67.1)
  assert.ok(rows.find((r) => r.id === 'S2').selected)
})

test('初始合同金额与预算占用率复现任务4', () => {
  const occupation = calculateBudgetOccupation()
  near(occupation.contract.total, 932460)
  near(occupation.direct.total, 149397.5)
  near(occupation.total, 1081857.5)
  assert.equal(occupation.cap, PLAN_C_BUDGET_CAP)
  near(occupation.rate * 100, 25.29, 0.01)
})

test('分单求解四种组合成本复现任务5第九步', () => {
  const { candidates } = solveSplitModel()
  const cost = (label) => candidates.find((c) => c.label === label).total
  assert.equal(cost('方案A'), 135000)
  assert.equal(cost('方案B'), 141160)
  assert.equal(cost('方案C'), 145560)
  assert.equal(cost('方案D'), 146960)
})

test('规划求解最优解为 x1=150、x3=0，节约 11960 元', () => {
  const { optimal, saving } = solveSplitModel()
  assert.equal(optimal.x1, 150)
  assert.equal(optimal.x3, 0)
  assert.equal(optimal.y1, 1)
  assert.equal(optimal.y3, 0)
  assert.equal(optimal.total, 135000)
  assert.equal(saving, 11960)
})

test('分单数量不满足约束时给出违约提示', () => {
  const invalid = evaluateSplit(80, 20)
  assert.ok(invalid.violations.some((item) => item.includes(String(splitModel.required))))
  assert.equal(evaluateSplit(150, 0).violations.length, 0)
})

test('合同变更后的执行总额与预备费复现任务5第十三步、任务6', () => {
  const impact = calculateChangeImpact()
  near(impact.reduction, 125250)
  near(impact.contractAfter, 807210)
  near(impact.contractsTotal, 942210)
  near(impact.executionTotal, 1091607.5)
  near(impact.increment, 9750)
  near(impact.priceGap, 6750)
  near(impact.logisticsGap, 3000)
  near(impact.contingencyRate * 100, 2.59, 0.01)
  near(impact.contingencyLeft, 366250)
  near(impact.averageUnitCost, 854.5)
  near(impact.goodsUnitCost, 848.5)
})

// ------------------------------------ ABC三受灾等级预算计算表.xlsx

test('ABC 三方案总预算与单位受益成本复现计算表', () => {
  const [a, b, c] = summarizeAbcPlans()
  assert.equal(a.total, 2816906)
  assert.equal(b.total, 2909004)
  assert.equal(c.total, 4278517.5)
  near(unitBenefitCost(a.total, a.people), 402.415142857143)
  near(b.unitCost, 415.572)
  near(c.unitCost, 528.212037037037)
  assert.equal(b.vsA, 92098)
  near(c.vsPrev, 1369513.5)
  near(c.vsA, 1461611.5)
  near(b.growth, 0.0326947367075792)
  near(c.growth, 0.470784330306868)
})

test('B 方案资金覆盖率复现阶段一补充表 3,660,000 ÷ 2,909,004', () => {
  const result = bCoverage()
  near(result.percent, 125.82, 0.01)
  assert.equal(result.gap, 0)
  assert.equal(result.status.level, 'green')
})

test('C 方案资金韧性复现 93.96% 覆盖率与 258,517.50 缺口', () => {
  const result = cResilience()
  near(result.percent, 93.96, 0.01)
  near(result.bufferPercent, 8.79, 0.01)
  near(result.gap, 258517.5)
  assert.equal(result.status.level, 'red')
  near(coverageRate(4020000, abcPlans[2].total) * 100, 93.96, 0.01)
})

test('甲3、甲6 食品预算增量复现 150000 与 122500', () => {
  const { jia3, jia6 } = gridFoodShifts()
  assert.equal(jia3.personDays, 10500)
  assert.equal(jia3.food, 262500)
  assert.equal(jia3.oldFood, 112500)
  assert.equal(jia3.increment, 150000)
  assert.equal(jia6.personDays, 8500)
  assert.equal(jia6.food, 212500)
  assert.equal(jia6.oldFood, 90000)
  assert.equal(jia6.increment, 122500)
})
