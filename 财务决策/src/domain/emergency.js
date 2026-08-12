import { responseThresholds } from '../data/budget.js'

export function summarizeDisaster(grids) {
  return grids.reduce((summary, grid) => ({
    affected: summary.affected + grid.affected,
    trapped: summary.trapped + grid.trapped,
    relocated: summary.relocated + grid.relocated,
    special: summary.special + grid.special,
    blockedRoads: summary.blockedRoads + Number(grid.roadBlocked),
    averageRainfall: summary.averageRainfall + grid.rainfall / grids.length,
    averageWaterLevel: summary.averageWaterLevel + grid.waterLevel / grids.length,
  }), { affected: 0, trapped: 0, relocated: 0, special: 0, blockedRoads: 0, averageRainfall: 0, averageWaterLevel: 0 })
}

export function determineResponse(metrics) {
  const indicators = responseThresholds.map((threshold) => {
    // Excel 台词:任务6 时救灾资金缺口"待定(需先算预算)",暂按 III 级列示但不计入触发统计
    const pending = threshold.key === 'fundingGap' && Boolean(metrics.fundingGapPending)
    const value = metrics[threshold.key] ?? 0
    const level = pending ? 'III' : value >= threshold.level2 ? 'II' : value >= threshold.level3 ? 'III' : 'IV'
    return { ...threshold, value, level, pending }
  })
  const counted = indicators.filter((item) => !item.pending)
  const level2Count = counted.filter((item) => item.level === 'II').length
  const level3OrAboveCount = counted.filter((item) => item.level === 'II' || item.level === 'III').length
  const level = level2Count >= 3 ? 'II' : level3OrAboveCount >= 2 ? 'III' : 'IV'
  return {
    level,
    planId: level === 'II' ? 'C' : level === 'III' ? 'B' : 'A',
    indicators,
    level2Count,
    level3OrAboveCount,
  }
}

const round1 = (value) => Math.round((value + Number.EPSILON) * 10) / 10

export function calculateSigmaAnalysis(grids) {
  const values = grids.map((grid) => grid.rainfall)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
  const stdev = Math.sqrt(variance)
  const upper = mean + 3 * stdev
  const lower = mean - 3 * stdev
  const rows = grids.map((grid) => {
    const outlier = grid.rainfall > upper || grid.rainfall < lower
    const focus = !outlier && grid.rainfall > mean + stdev
    return { id: grid.id, rainfall: grid.rainfall, outlier, focus, verdict: outlier ? '异常' : '正常' }
  })
  return {
    mean: round1(mean),
    stdev: round1(stdev),
    upper: round1(upper),
    lower: round1(lower),
    outlierCount: rows.filter((row) => row.outlier).length,
    focusRows: rows.filter((row) => row.focus),
    rows,
  }
}

export function getGridRiskScore(grid) {
  return Math.round(
    grid.affected * 0.25 + grid.trapped * 1.5 + grid.relocated * 0.2 +
    grid.special * 0.8 + grid.rainfall * 3 + grid.waterLevel * 80 +
    (grid.roadBlocked ? 500 : 0),
  )
}
