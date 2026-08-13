import { disasterGrids, equipmentItems, params } from '../data/costDriver.js'

/** 复现计算表 A27:U36 的逐网格成本动因测算。 */
export function calculateGridBudgets(grids = disasterGrids, p = params) {
  return grids.map((grid) => {
    const personDays = grid.relocated * p.shelterDays
    const food = personDays * p.foodRate
    const water = personDays * p.waterRate
    const tents = grid.relocated / p.tentCapacity
    const tentBudget = tents * p.tentPrice
    const quiltBudget = grid.quilts * p.quiltPrice
    const specialBudget = grid.special * p.specialCare
    const transport = grid.distance * p.vehiclesPerGrid * p.transportRate

    return {
      id: grid.id,
      relocated: grid.relocated,
      days: p.shelterDays,
      personDays,
      food,
      water,
      tents,
      tentBudget,
      quilts: grid.quilts,
      quiltBudget,
      special: grid.special,
      specialBudget,
      distance: grid.distance,
      vehicles: p.vehiclesPerGrid,
      transport,
      total: food + water + tentBudget + quiltBudget + specialBudget + transport,
    }
  })
}

export function sumGridBudgets(rows) {
  const keys = ['relocated', 'personDays', 'food', 'water', 'tents', 'tentBudget', 'quilts', 'quiltBudget', 'special', 'specialBudget', 'distance', 'transport', 'total']
  return keys.reduce((acc, key) => {
    acc[key] = rows.reduce((sum, row) => sum + row[key], 0)
    return acc
  }, {})
}

export function calculateEquipmentBudget(p = params) {
  const items = equipmentItems.map((item) => ({
    name: item.name,
    count: p[item.countKey],
    price: p[item.priceKey],
    amount: p[item.countKey] * p[item.priceKey],
  }))
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0) }
}

/** 计算表 F40:H43 的预算汇总：9网格预算 + 保险预算 + 设备预算。 */
export function calculateBudgetSummary(grids = disasterGrids, p = params) {
  const rows = calculateGridBudgets(grids, p)
  const totals = sumGridBudgets(rows)
  const equipment = calculateEquipmentBudget(p)
  const insurance = p.rescuers * p.insuranceRate

  return {
    rows,
    totals,
    equipment,
    gridBudget: totals.total,
    insuranceBudget: insurance,
    equipmentBudget: equipment.total,
    totalBudget: totals.total + insurance + equipment.total,
  }
}

/** 计算表 A48:C55 的成本构成与占比。 */
export function calculateCostComposition(grids = disasterGrids, p = params) {
  const summary = calculateBudgetSummary(grids, p)
  const { totals, totalBudget } = summary
  const components = [
    { name: '食品', amount: totals.food },
    { name: '饮水', amount: totals.water },
    { name: '帐篷', amount: totals.tentBudget },
    { name: '棉被', amount: totals.quiltBudget },
    { name: '特殊人群保障', amount: totals.specialBudget },
    { name: '运输', amount: totals.transport },
    { name: '保险', amount: summary.insuranceBudget },
    { name: '设备', amount: summary.equipmentBudget },
  ]
  return components.map((item) => ({ ...item, share: item.amount / totalBudget }))
}
