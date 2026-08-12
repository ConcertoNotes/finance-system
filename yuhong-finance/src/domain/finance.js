import { insuranceCriteria } from '../data/procurement.js'

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export function getBudgetScenario(id, scenarios) {
  const scenario = scenarios.find((item) => item.id === id)
  if (!scenario) throw new Error(`Unknown budget scenario: ${id}`)
  return scenario
}

export function calculateInsuranceScores(products, weights, people = 50) {
  const bounds = Object.fromEntries(
    insuranceCriteria
      .filter((criterion) => criterion.type !== 'fixed')
      .map((criterion) => {
        const values = products.map((product) => product[criterion.key])
        return [criterion.key, { min: Math.min(...values), max: Math.max(...values) }]
      }),
  )

  return products
    .map((product) => {
      const detail = {}
      let score = 0
      for (const criterion of insuranceCriteria) {
        let normalized
        if (criterion.type === 'fixed') {
          normalized = product[criterion.key]
        } else {
          const { min, max } = bounds[criterion.key]
          if (max === min) normalized = 100
          else if (criterion.type === 'cost') normalized = ((max - product[criterion.key]) / (max - min)) * 100
          else normalized = ((product[criterion.key] - min) / (max - min)) * 100
        }
        detail[criterion.key] = round2(normalized)
        score += normalized * weights[criterion.key]
      }
      return { ...product, score: round2(score), detail, totalPremium: product.premium * people }
    })
    .sort((a, b) => b.score - a.score)
}

export function buildInsuranceCalcSteps(products, weights) {
  const steps = insuranceCriteria.map((criterion, index) => {
    const values = products.map((product) => product[criterion.key])
    const min = Math.min(...values)
    const max = Math.max(...values)
    const items = products.map((product) => {
      const value = product[criterion.key]
      let score
      let expression
      if (criterion.type === 'fixed') {
        score = value
        expression = `${product.coverageText} → 分档赋值 ${value} 分`
      } else if (max === min) {
        score = 100
        expression = '三款产品同值，统一计 100 分'
      } else if (criterion.type === 'cost') {
        score = round2(((max - value) / (max - min)) * 100)
        expression = `(${max}−${value})÷(${max}−${min})×100 = ${score} 分`
      } else {
        score = round2(((value - min) / (max - min)) * 100)
        expression = `(${value}−${min})÷(${max}−${min})×100 = ${score} 分`
      }
      return { id: product.id, name: product.name, value, score, expression }
    })
    return {
      index: index + 1,
      key: criterion.key,
      label: criterion.label,
      type: criterion.type,
      unit: criterion.unit,
      weight: weights[criterion.key],
      min,
      max,
      items,
    }
  })

  const weighted = products.map((product) => {
    let total = 0
    const parts = []
    for (const step of steps) {
      const item = step.items.find((entry) => entry.id === product.id)
      total += item.score * step.weight
      parts.push(`${item.score}×${Math.round(step.weight * 100)}%`)
    }
    const score = round2(total)
    return { id: product.id, name: product.name, score, expression: `${parts.join(' + ')} = ${score} 分` }
  })

  return { steps, weighted: [...weighted].sort((a, b) => b.score - a.score) }
}

export function calculateGridFundingRows(grids, scenario, fund, minimumUnitCost = 402.42) {
  if (!grids.length) return []
  const demands = grids.map((grid) => Math.round(grid.relocated * scenario.unitCost))
  const totalDemand = demands.reduce((sum, value) => sum + value, 0)
  let allocatedGap = 0

  return grids
    .map((grid, index) => {
      const isLast = index === grids.length - 1
      const fundingGap = isLast
        ? Math.max(0, fund.gap - allocatedGap)
        : Math.round(fund.gap * (demands[index] / totalDemand))
      allocatedGap += fundingGap
      const minimumBudget = Math.round(grid.relocated * minimumUnitCost)
      const currentDemand = demands[index]
      return {
        ...grid,
        minimumBudget,
        currentDemand,
        fundingGap,
        unitCost: scenario.unitCost,
        suggestedIncrease: Math.max(0, currentDemand - minimumBudget),
      }
    })
    .sort((a, b) => a.priority - b.priority)
}

export function formatCurrency(value) {
  const hasFraction = !Number.isInteger(value)
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value)
}
