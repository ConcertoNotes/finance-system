// 第四阶段领域逻辑：保险理赔、预算执行分析与参数回写

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

// 赔款 = 医疗费用 × 赔付比例 − 免赔额
export function calculateClaim({ medicalCost, deductible, payoutRatio = 1 }) {
  return round2(medicalCost * payoutRatio - deductible)
}

// 预算执行率与偏差率
export function calculateExecutionStats({ budget, actual }) {
  return {
    unexecuted: round2(budget - actual),
    executionRate: round2((actual / budget) * 100),
    deviationRate: round2(((budget - actual) / budget) * 100),
  }
}

// 参数回写判定：|偏差率| ≤ 阈值不更新；weighted 采用 50%历史 + 50%实际；否则直接更新
export function decideWriteback({ original, actual, threshold = 5, weighted = false }) {
  const deviation = round2(((actual - original) / original) * 100)
  if (Math.abs(deviation) <= threshold) {
    return { deviation, action: 'keep', newValue: original }
  }
  if (weighted) {
    return { deviation, action: 'weighted', newValue: round2(original * 0.5 + actual * 0.5) }
  }
  return { deviation, action: 'update', newValue: actual }
}

// 绩效指标总数（6 维度 20 项）
export function countPerformanceItems(dimensions) {
  return dimensions.reduce((sum, dimension) => sum + dimension.items.length, 0)
}

// 单位受益成本
export function unitBenefitCost(actual, beneficiaries) {
  return round2(actual / beneficiaries)
}
