import { abcPlanMap, abcPlans } from '../data/abcBudget.js'

export function unitBenefitCost(total, people) {
  const headcount = Number(people) || 0
  if (!headcount) return 0
  return Number(total) / headcount
}

export function planDelta(fromId, toId, plans = abcPlanMap) {
  return (Number(plans[toId].total) || 0) - (Number(plans[fromId].total) || 0)
}

export function planGrowth(fromId, toId, plans = abcPlanMap) {
  const base = Number(plans[fromId].total) || 0
  if (!base) return 0
  return planDelta(fromId, toId, plans) / base
}

export function coverageRate(available, demand) {
  const need = Number(demand) || 0
  if (!need) return 0
  return Number(available) / need
}

export function coverageStatus(rate) {
  if (rate >= 1) return { level: 'green', label: '资金充足', mark: '🟢' }
  if (rate >= 0.95) return { level: 'yellow', label: '关注', mark: '🟡' }
  return { level: 'red', label: '存在资金缺口', mark: '🔴' }
}

export function fundingGap(available, demand) {
  return Math.max(0, (Number(demand) || 0) - (Number(available) || 0))
}

export function reserveRatio(reserve, total) {
  const cap = Number(total) || 0
  if (!cap) return 0
  return Number(reserve) / cap
}

export function summarizeAbcPlans(plans = abcPlans) {
  return plans.map((plan, index) => {
    const prev = index > 0 ? plans[index - 1] : null
    const vsA = plan.total - plans[0].total
    const vsPrev = prev ? plan.total - prev.total : 0
    return {
      ...plan,
      unitCost: unitBenefitCost(plan.total, plan.people),
      vsA,
      vsPrev,
      growth: prev ? vsPrev / prev.total : 0,
    }
  })
}
