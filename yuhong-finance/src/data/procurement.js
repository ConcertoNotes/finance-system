export const insuranceWeights = {
  premium: 0.2,
  deathBenefit: 0.2,
  disabilityBenefit: 0.1,
  medicalBenefit: 0.15,
  deductible: 0.1,
  waitingDays: 0.1,
  coverage: 0.1,
  payoutDays: 0.05,
}

export const insuranceCriteria = [
  { key: 'premium', label: '保费', type: 'cost', unit: '元/人' },
  { key: 'deathBenefit', label: '身故保额', type: 'benefit', unit: '万元' },
  { key: 'disabilityBenefit', label: '伤残保额', type: 'benefit', unit: '万元' },
  { key: 'medicalBenefit', label: '医疗保额', type: 'benefit', unit: '万元' },
  { key: 'deductible', label: '免赔额', type: 'cost', unit: '元' },
  { key: 'waitingDays', label: '等待期', type: 'cost', unit: '天' },
  { key: 'coverage', label: '承保范围', type: 'fixed', unit: '分' },
  { key: 'payoutDays', label: '赔付时效', type: 'cost', unit: '天' },
]

export const insuranceProducts = [
  { id: 'I', name: '基础意外险', premium: 200, deathBenefit: 50, disabilityBenefit: 30, medicalBenefit: 2, deductible: 200, waitingDays: 30, coverage: 80, coverageText: '一般条款包含洪涝救援', payoutDays: 15, claims: '常规资料' },
  { id: 'II', name: '高风险救援险', premium: 220, deathBenefit: 100, disabilityBenefit: 60, medicalBenefit: 5, deductible: 100, waitingDays: 7, coverage: 100, coverageText: '明确承保，无附加条件', payoutDays: 7, claims: '需出勤记录' },
  { id: 'III', name: '综合保障险', premium: 280, deathBenefit: 120, disabilityBenefit: 80, medicalBenefit: 8, deductible: 50, waitingDays: 15, coverage: 60, coverageText: '需附补充协议', payoutDays: 10, claims: '资料要求较全' },
]

export const coverageScoreRules = [
  { text: '明确承保，无附加条件', score: 100 },
  { text: '一般条款包含洪涝救援', score: 80 },
  { text: '需要补充协议或附加条件', score: 60 },
  { text: '条款表述不明确，需保险公司确认', score: 40 },
  { text: '明确不承保', score: 0 },
]

export const suppliers = [
  { id: 's1', name: '华北应急物资中心', stock: 420, quote: 892.5, leadTime: '2.5 小时', rating: 4.9, risk: 'low' },
  { id: 's2', name: '众安救援装备仓', stock: 360, quote: 901, leadTime: '3 小时', rating: 4.8, risk: 'low' },
  { id: 's3', name: '区域联合储备库', stock: 600, quote: 918, leadTime: '4.5 小时', rating: 4.6, risk: 'medium' },
]

export const procurementRisks = [
  { label: '帐篷追加需求', value: 275, unit: '顶', level: 'high' },
  { label: '价格上涨区间', value: '5%—8%', unit: '', level: 'medium' },
  { label: '市场可供数量', value: 1380, unit: '顶', level: 'low' },
  { label: '建议锁价窗口', value: 2, unit: '小时', level: 'high' },
]
