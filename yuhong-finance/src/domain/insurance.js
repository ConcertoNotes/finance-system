import {
  RESCUER_COUNT,
  coverageTiers,
  insuranceCriteria,
  insuranceProducts,
} from '../data/insurance.js'

function tierScore(coverage) {
  return coverageTiers.find((tier) => tier.match === coverage)?.score ?? 0
}

/**
 * 复现计算表 B22:I24 的标准分公式。
 * 成本型 (max-v)/(max-min)*100，效益型 (v-min)/(max-min)*100，极差为 0 时统一计 100。
 */
export function standardizeScores(products = insuranceProducts) {
  return products.map((product) => {
    const scores = {}
    for (const criterion of insuranceCriteria) {
      if (criterion.type === 'tier') {
        scores[criterion.key] = tierScore(product.coverage)
        continue
      }
      const values = products.map((item) => item[criterion.key])
      const max = Math.max(...values)
      const min = Math.min(...values)
      if (max === min) {
        scores[criterion.key] = 100
        continue
      }
      const value = product[criterion.key]
      scores[criterion.key] =
        criterion.type === 'cost'
          ? ((max - value) / (max - min)) * 100
          : ((value - min) / (max - min)) * 100
    }
    return { id: product.id, name: product.name, scores }
  })
}

/** 复现计算表 B29:J31 的加权得分与 K 列排名。 */
export function scoreInsurance(products = insuranceProducts) {
  const standardized = standardizeScores(products)
  const rows = standardized.map((entry) => {
    const weighted = {}
    let total = 0
    for (const criterion of insuranceCriteria) {
      const value = entry.scores[criterion.key] * criterion.weight
      weighted[criterion.key] = value
      total += value
    }
    return { ...entry, weighted, total }
  })

  const best = Math.max(...rows.map((row) => row.total))
  return rows.map((row) => ({
    ...row,
    rank: row.total === best ? 1 : 2,
    recommended: row.total === best,
  }))
}

export function getInsuranceDecision(products = insuranceProducts, headcount = RESCUER_COUNT) {
  const rows = scoreInsurance(products)
  const winner = rows.find((row) => row.recommended)
  const product = products.find((item) => item.id === winner.id)
  const alternatives = products
    .filter((item) => item.id !== winner.id)
    .map((item) => ({
      ...item,
      totalPremium: item.premium * headcount,
      premiumGap: (item.premium - product.premium) * headcount,
    }))

  return {
    rows,
    winner,
    product,
    headcount,
    totalPremium: product.premium * headcount,
    alternatives,
    fundSource: '政府财政拨款保障资金',
    conclusion: `选择${product.name}：综合得分最高${winner.total.toFixed(2)}分，洪涝救援明确承保、免赔额最低、赔付时效最快，且保障额度与保费投入较为均衡。`,
  }
}

/** 逐指标拆解某一方案的得分来源，供演算面板逐步展开。 */
export function buildScoreBreakdown(productId, products = insuranceProducts) {
  const product = products.find((item) => item.id === productId)
  if (!product) return []
  const standardized = standardizeScores(products).find((entry) => entry.id === productId)

  return insuranceCriteria.map((criterion) => {
    const values = products.map((item) => item[criterion.key])
    const max = Math.max(...values)
    const min = Math.min(...values)
    const score = standardized.scores[criterion.key]

    let formula
    if (criterion.type === 'tier') {
      formula = `XLOOKUP("${product.coverage}") = ${score}`
    } else if (max === min) {
      formula = `三方案均为 ${max}${criterion.unit}，统一计 100`
    } else if (criterion.type === 'cost') {
      formula = `(${max} － ${product[criterion.key]}) / (${max} － ${min}) × 100 = ${round(score, 2)}`
    } else {
      formula = `(${product[criterion.key]} － ${min}) / (${max} － ${min}) × 100 = ${round(score, 2)}`
    }

    return {
      key: criterion.key,
      label: criterion.label,
      type: criterion.type,
      weight: criterion.weight,
      raw: product[criterion.key],
      unit: criterion.unit,
      score,
      weighted: score * criterion.weight,
      formula,
    }
  })
}

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
