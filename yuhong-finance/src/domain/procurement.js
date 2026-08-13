import {
  CONTINGENCY_TOTAL,
  PLAN_C_BUDGET_CAP,
  changeOrder,
  directPurchase,
  emergencyQuotes,
  initialContract,
  materialDemands,
  priceAlertThresholds,
  priceQuotes,
  splitModel,
  supplierCriteria,
  suppliers,
} from '../data/procurement.js'

export function calculateNetDemand(items = materialDemands) {
  return items.map((item) => ({
    ...item,
    computed: Math.max(0, item.total - item.stock - item.inTransit - item.donation - item.transferable),
  }))
}

/**
 * 综合基准价刻意只取历史价、市场参考价与 S1/S2 报价的均值，
 * 避免 S3 的异常高价把基准拉高。
 */
export function calculatePriceBaseline(items = priceQuotes) {
  return items
    .filter((item) => item.channel === 'contract')
    .map((item) => {
      const sample = [item.history, item.market, item.s1, item.s2]
      const baseline = sample.reduce((sum, value) => sum + value, 0) / sample.length
      const quotes = [item.s1, item.s2, item.s3]
      const deviations = suppliers.map((supplier, index) => {
        const quote = quotes[index]
        const rate = (quote - baseline) / baseline
        return {
          supplierId: supplier.id,
          quote,
          rate,
          level: Math.abs(rate) >= priceAlertThresholds.red
            ? 'red'
            : Math.abs(rate) >= priceAlertThresholds.yellow
              ? 'yellow'
              : 'normal',
        }
      })
      return {
        ...item,
        baseline,
        average: quotes.reduce((sum, value) => sum + value, 0) / quotes.length,
        median: [...quotes].sort((a, b) => a - b)[1],
        low: Math.min(...quotes),
        high: Math.max(...quotes),
        deviations,
      }
    })
}

export function getDirectControlPrices(items = priceQuotes) {
  return items.filter((item) => item.channel === 'direct')
}

/** 复现 SUMPRODUCT(指标标准分区域, 权重区域) 的六维加权评分。 */
export function scoreSuppliers(list = suppliers, criteria = supplierCriteria) {
  const rows = list.map((supplier) => {
    const parts = criteria.map((criterion) => ({
      key: criterion.key,
      label: criterion.label,
      weight: criterion.weight,
      score: supplier[criterion.key],
      weighted: supplier[criterion.key] * criterion.weight,
    }))
    return {
      id: supplier.id,
      name: supplier.name,
      parts,
      total: parts.reduce((sum, part) => sum + part.weighted, 0),
    }
  })

  const sorted = [...rows].sort((a, b) => b.total - a.total)
  return rows.map((row) => ({
    ...row,
    rank: sorted.findIndex((item) => item.id === row.id) + 1,
    selected: sorted[0].id === row.id,
  }))
}

export function calculateContractAmount(contract = initialContract) {
  const lines = contract.lines.map((line) => ({ ...line, amount: line.quantity * line.price }))
  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) }
}

export function calculateDirectAmount(plan = directPurchase) {
  const lines = plan.lines.map((line) => ({ ...line, amount: line.quantity * line.price }))
  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) }
}

export function calculateBudgetOccupation() {
  const contract = calculateContractAmount()
  const direct = calculateDirectAmount()
  const total = contract.total + direct.total
  return {
    contract,
    direct,
    total,
    cap: PLAN_C_BUDGET_CAP,
    rate: total / PLAN_C_BUDGET_CAP,
  }
}

export function buildEmergencyQuotes(required = splitModel.required, quotes = emergencyQuotes) {
  return quotes.map((quote) => {
    const quantity = Math.min(required, quote.capacity)
    const goods = quantity * quote.unitPrice
    const landed = goods + quote.fixedCost
    return {
      ...quote,
      quantity,
      goods,
      landed,
      unitLanded: landed / quantity,
    }
  })
}

/**
 * 分单组合优化：Min Z = Σ 单价·xi + Σ 固定附加成本·yi。
 * 车辆调度与装卸人工是「启用即发生」的订单级固定成本，不随数量线性分摊，
 * 因此单价最低的供应商未必是最优解，需要逐组合比较。
 */
export function solveSplitModel(required = splitModel.required, quotes = emergencyQuotes) {
  const [s1, s3] = quotes
  const evaluate = (x1, x3) => {
    const goods = x1 * s1.unitPrice + x3 * s3.unitPrice
    const fixed = (x1 > 0 ? s1.fixedCost : 0) + (x3 > 0 ? s3.fixedCost : 0)
    return {
      x1,
      x3,
      y1: x1 > 0 ? 1 : 0,
      y3: x3 > 0 ? 1 : 0,
      goods,
      fixed,
      total: goods + fixed,
      feasible:
        x1 + x3 === required &&
        x1 <= s1.capacity &&
        x3 <= s3.capacity &&
        (x1 === 0 || s1.arrivalHours <= splitModel.deadlineHours) &&
        (x3 === 0 || s3.arrivalHours <= splitModel.deadlineHours),
    }
  }

  const candidates = splitModel.candidates.map((candidate) => ({
    label: candidate.label,
    ...evaluate(candidate.x1, candidate.x3),
  }))

  let best = null
  for (let x1 = 0; x1 <= Math.min(required, s1.capacity); x1 += 1) {
    const result = evaluate(x1, required - x1)
    if (result.feasible && (!best || result.total < best.total)) best = result
  }

  const worst = candidates.filter((item) => item.feasible).reduce((a, b) => (a.total > b.total ? a : b))
  return { candidates, optimal: best, saving: worst.total - best.total, worst }
}

export function evaluateSplit(x1, x3, quotes = emergencyQuotes) {
  const [s1, s3] = quotes
  const goods = x1 * s1.unitPrice + x3 * s3.unitPrice
  const fixed = (x1 > 0 ? s1.fixedCost : 0) + (x3 > 0 ? s3.fixedCost : 0)
  const violations = []
  if (x1 + x3 !== splitModel.required) violations.push(`x1 + x3 必须等于 ${splitModel.required}`)
  if (x1 > s1.capacity) violations.push(`S1 可供应量上限 ${s1.capacity} 顶`)
  if (x3 > s3.capacity) violations.push(`S3 可供应量上限 ${s3.capacity} 顶`)
  if (x1 < 0 || x3 < 0) violations.push('采购数量不得为负')
  return { x1, x3, y1: x1 > 0 ? 1 : 0, y3: x3 > 0 ? 1 : 0, goods, fixed, total: goods + fixed, violations }
}

/** 合同变更后的采购执行总额与预备费列支。 */
export function calculateChangeImpact() {
  const contract = calculateContractAmount()
  const direct = calculateDirectAmount()
  const reduction = changeOrder.reducedQuantity * changeOrder.unitPrice
  const contractAfter = contract.total - reduction
  const emergency = changeOrder.emergencyContract.total
  const contractsTotal = contractAfter + emergency
  const executionTotal = contractsTotal + direct.total
  const initialTotal = contract.total + direct.total

  const tentBefore = changeOrder.tentBefore * changeOrder.unitPrice
  const tentAfter =
    changeOrder.tentAfter * changeOrder.unitPrice +
    changeOrder.emergencyContract.quantity * emergencyQuotes[0].unitPrice +
    emergencyQuotes[0].fixedCost

  const increment = tentAfter - tentBefore
  return {
    reduction,
    contractAfter,
    emergency,
    contractsTotal,
    directTotal: direct.total,
    executionTotal,
    initialTotal,
    increment,
    priceGap: changeOrder.emergencyContract.quantity * (emergencyQuotes[0].unitPrice - changeOrder.unitPrice),
    logisticsGap: emergencyQuotes[0].fixedCost,
    contingencyUsed: increment,
    contingencyTotal: CONTINGENCY_TOTAL,
    contingencyRate: increment / CONTINGENCY_TOTAL,
    contingencyLeft: CONTINGENCY_TOTAL - increment,
    averageUnitCost: tentAfter / changeOrder.tentBefore,
    goodsUnitCost: (tentAfter - emergencyQuotes[0].fixedCost) / changeOrder.tentBefore,
  }
}

export function formatCurrency(value, digits = 2) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function formatPercent(value, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`
}
