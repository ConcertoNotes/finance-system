// 第二阶段领域逻辑：采购需求、价格基准、供应商评分、分单优化与合同变更

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100
const round1 = (value) => Math.round((value + Number.EPSILON) * 10) / 10

// 净采购量 = MAX(0, 网格总需求 − 现有库存 − 在途 − 已确认捐赠 − 可调拨)
export function calculateNetRequirements(items) {
  return items.map((item) => ({
    ...item,
    net: Math.max(0, item.demand - item.stock - item.transit - item.donated - item.transferable),
  }))
}

// 按执行路径分流：合同采购纳入供应商遴选，生活保障直采单独走应急零售/框架协议
export function splitRequirementsByChannel(items) {
  const rows = calculateNetRequirements(items)
  return {
    all: rows,
    contract: rows.filter((item) => item.channel === 'contract'),
    direct: rows.filter((item) => item.channel === 'direct'),
  }
}

// 综合基准价 = (历史价 + 市场价 + S1报价 + S2报价) / 4，避免异常高价拉高基准
export function buildPriceBenchmarks(quotes, thresholds = { yellow: 5, red: 10 }) {
  return quotes.map((quote) => {
    const base = round2((quote.history + quote.market + quote.s1 + quote.s2) / 4)
    const values = [quote.s1, quote.s2, quote.s3].sort((a, b) => a - b)
    const suppliers = ['s1', 's2', 's3'].map((key) => {
      const deviation = round2(((quote[key] - base) / base) * 100)
      const alert = deviation > thresholds.red ? 'red' : deviation > thresholds.yellow ? 'yellow' : 'normal'
      return { id: key.toUpperCase(), quote: quote[key], deviation, alert }
    })
    return {
      ...quote,
      base,
      average: round2((quote.s1 + quote.s2 + quote.s3) / 3),
      median: values[1],
      range: [values[0], values[2]],
      suppliers,
    }
  })
}

// 生活保障直采控制价核验：基准取历史价与市场参考价均值，偏差超阈值需重新询价
export function buildDirectPriceChecks(controls, thresholds = { yellow: 5, red: 10 }) {
  return controls.map((item) => {
    const base = round2((item.history + item.market) / 2)
    const deviation = round2(((item.control - base) / base) * 100)
    const alert = deviation > thresholds.red ? 'red' : deviation > thresholds.yellow ? 'yellow' : 'normal'
    return { ...item, base, deviation, alert, amount: round2(item.qty * item.control) }
  })
}

// 综合得分 = SUMPRODUCT(指标标准分, 权重)
export function scoreSuppliers(profiles, weights) {
  return profiles
    .map((profile) => {
      const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + profile[key] * weight, 0)
      return { ...profile, score: round1(score) }
    })
    .sort((a, b) => b.score - a.score)
}

export function contractTotal(items) {
  return round2(items.reduce((sum, item) => sum + item.qty * item.price, 0))
}

// 紧急询价：货物金额 + 订单级固定附加成本（车辆应急调度 + 装卸人工）
export function calculateEmergencyQuote(quote, qty) {
  const goods = round2(qty * quote.price)
  const vehicleExtra = quote.vehicles * quote.vehicleHours * quote.vehicleRate
  const laborExtra = quote.workers * quote.workerHours * quote.workerRate
  const fixedCost = vehicleExtra + laborExtra
  const landedCost = round2(goods + fixedCost)
  return {
    ...quote,
    qty,
    goods,
    vehicleExtra,
    laborExtra,
    fixedCost,
    landedCost,
    unitFixedCost: round2(fixedCost / qty),
    unitLandedCost: round2(landedCost / qty),
  }
}

// 组合成本 = Σ(单价 × 数量) + Σ(启用供应商的订单级固定成本)
// 固定成本只在该供应商被启用（数量 > 0）时计入，不按采购量线性分摊
export function evaluateSplitCombos(combos, s1Quote, s3Quote) {
  const evaluated = combos.map((combo) => {
    const goods = combo.s1 * s1Quote.price + combo.s3 * s3Quote.price
    const fixed = (combo.s1 > 0 ? s1Quote.fixedCost : 0) + (combo.s3 > 0 ? s3Quote.fixedCost : 0)
    return {
      ...combo,
      goods: round2(goods),
      fixed,
      y1: combo.s1 > 0 ? 1 : 0,
      y3: combo.s3 > 0 ? 1 : 0,
      cost: round2(goods + fixed),
    }
  })
  const bestCost = Math.min(...evaluated.map((combo) => combo.cost))
  const worstCost = Math.max(...evaluated.map((combo) => combo.cost))
  return evaluated.map((combo) => ({
    ...combo,
    optimal: combo.cost === bestCost,
    saving: combo.cost === bestCost ? round2(worstCost - bestCost) : 0,
    gapToBest: round2(combo.cost - bestCost),
  }))
}

// 混合整数规划求解：Min Z = Σ price_i·x_i + Σ fixedCost_i·y_i
// 约束 Σx_i = demand、0 ≤ x_i ≤ capacity_i·y_i、x_i 非负整数、y_i ∈ {0,1}、到货时间 ≤ 时限
// 供应商仅两家，直接枚举 y 的全部取值；给定启用集合后按单价升序贪心装载即为该子问题最优解
export function solveSplitModel(quotes, demand, deadlineHours = 12) {
  const eligible = quotes.filter((quote) => quote.arrivalHours <= deadlineHours)
  const subsets = []
  for (let mask = 1; mask < 2 ** eligible.length; mask += 1) {
    subsets.push(eligible.filter((_, index) => (mask >> index) & 1))
  }

  const feasible = subsets
    .map((subset) => {
      const capacity = subset.reduce((sum, quote) => sum + quote.capacity, 0)
      if (capacity < demand) return null

      let remaining = demand
      const allocation = {}
      ;[...subset]
        .sort((a, b) => a.price - b.price)
        .forEach((quote) => {
          const take = Math.min(remaining, quote.capacity)
          allocation[quote.id] = take
          remaining -= take
        })

      const goods = subset.reduce((sum, quote) => sum + allocation[quote.id] * quote.price, 0)
      // 分配为0的供应商无需启用，其固定成本不发生
      const activated = subset.filter((quote) => allocation[quote.id] > 0)
      const fixed = activated.reduce((sum, quote) => sum + quote.fixedCost, 0)
      return {
        suppliers: activated.map((quote) => quote.id),
        allocation,
        goods: round2(goods),
        fixed,
        cost: round2(goods + fixed),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.cost - b.cost)

  const best = feasible[0]
  const worst = feasible[feasible.length - 1]
  return {
    best,
    feasible,
    excluded: quotes.filter((quote) => quote.arrivalHours > deadlineHours).map((quote) => quote.id),
    saving: best && worst ? round2(worst.cost - best.cost) : 0,
  }
}

// HT-001合同变更影响测算
export function calculateChangeImpact({
  originalQty = 500, keepQty = 350, splitQty = 150,
  contractPrice = 835, splitPrice = 880, extraCost = 3000,
  reserve = 376000, benchmark = 846.25,
} = {}) {
  const originalCost = originalQty * contractPrice
  const goodsCost = keepQty * contractPrice + splitQty * splitPrice
  const changedCost = goodsCost + extraCost
  const reduction = (originalQty - keepQty) * contractPrice
  const increase = round2(changedCost - originalCost)
  const priceDiff = splitQty * (splitPrice - contractPrice)
  const reserveUseRate = round2((increase / reserve) * 100)
  const goodsAvgPrice = round2(goodsCost / originalQty)
  return {
    originalCost,
    changedCost,
    reduction,
    increase,
    priceDiff,
    extraCost,
    reserveUseRate,
    reserveRemaining: reserve - increase,
    avgUnitCost: round2(changedCost / originalQty),
    goodsAvgPrice,
    benchmarkDeviation: round2(((goodsAvgPrice - benchmark) / benchmark) * 100),
  }
}

// 采购执行台账：合同采购（HT-001 / HT-003）与生活保障直采分列，不得混同
export function getContractPortfolio(contracts, directOrder, changeResolved, budgetTotal) {
  const ht001Items = contracts.find((contract) => contract.id === 'HT-2025-001').items
  const ht001Original = contractTotal(ht001Items)
  const ht001Changed = contractTotal(ht001Items.map((item) => (item.name === '帐篷' ? { ...item, qty: 350 } : item)))

  const portfolio = [
    {
      id: 'HT-2025-001', supplier: 'S2', name: '主采购合同', kind: 'contract',
      amount: changeResolved ? ht001Changed : ht001Original,
      status: changeResolved ? '已变更（帐篷500→350顶）' : '履约中',
    },
  ]
  if (changeResolved) {
    portfolio.push({ id: 'HT-2025-003', supplier: 'S1', name: '紧急分单合同', kind: 'contract', amount: 135000, status: '紧急分单（150顶，8小时交付）' })
  }

  const directAmount = contractTotal(directOrder.items)
  const contractSubtotal = round2(portfolio.reduce((sum, contract) => sum + contract.amount, 0))
  const total = round2(contractSubtotal + directAmount)

  return {
    contracts: portfolio,
    direct: { id: directOrder.id, supplier: directOrder.channel, name: directOrder.name, kind: 'direct', amount: directAmount, status: '应急零售/框架协议直采，按订单与凭证核验' },
    contractSubtotal,
    directAmount,
    total,
    occupancyRate: round2((total / budgetTotal) * 100),
  }
}
