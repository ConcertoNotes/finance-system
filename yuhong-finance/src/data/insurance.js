// 数据源：保险方案综合评分计算表.xlsx · 保险方案评分计算
// 基础数据 A5:J7、指标权重 A11:B18、承保范围分档 L5:M7、救援人数 B36。

export const INSURANCE_WORKBOOK = '保险方案综合评分计算表.xlsx'

export const insuranceProducts = [
  {
    id: 'A',
    name: 'A保险公司',
    premium: 200,
    death: 50,
    disability: 30,
    medical: 2,
    deductible: 200,
    waiting: 0,
    coverage: '一般条款包含洪涝救援',
    documents: '常规资料',
    settlementDays: 15,
  },
  {
    id: 'B',
    name: 'B保险公司',
    premium: 220,
    death: 100,
    disability: 60,
    medical: 5,
    deductible: 100,
    waiting: 0,
    coverage: '明确承保且无附加条件',
    documents: '含出勤记录',
    settlementDays: 7,
  },
  {
    id: 'C',
    name: 'C保险公司',
    premium: 280,
    death: 120,
    disability: 80,
    medical: 8,
    deductible: 150,
    waiting: 0,
    coverage: '需附补充协议',
    documents: '资料要求较全',
    settlementDays: 10,
  },
]

// type: cost 成本型（越低越优）、benefit 效益型（越高越优）、tier 分档赋值
export const insuranceCriteria = [
  { key: 'premium', label: '保费', unit: '元/人', weight: 0.2, type: 'cost' },
  { key: 'death', label: '身故保额', unit: '万元', weight: 0.2, type: 'benefit' },
  { key: 'disability', label: '伤残保额', unit: '万元', weight: 0.1, type: 'benefit' },
  { key: 'medical', label: '医疗保额', unit: '万元', weight: 0.15, type: 'benefit' },
  { key: 'deductible', label: '免赔额', unit: '元', weight: 0.1, type: 'cost' },
  { key: 'waiting', label: '等待期', unit: '天', weight: 0.1, type: 'cost' },
  { key: 'coverage', label: '承保范围', unit: '', weight: 0.1, type: 'tier' },
  { key: 'settlementDays', label: '赔付时效', unit: '天', weight: 0.05, type: 'cost' },
]

// 阶段一任务4给出五档，计算表只用到其中三档。
export const coverageTiers = [
  { label: '明确承保，无附加条件', match: '明确承保且无附加条件', score: 100 },
  { label: '一般条款包含洪涝救援', match: '一般条款包含洪涝救援', score: 80 },
  { label: '需要补充协议或附加条件', match: '需附补充协议', score: 60 },
  { label: '条款表述不明确，需保险公司确认', match: null, score: 40 },
  { label: '明确不承保', match: null, score: 0 },
]

export const RESCUER_COUNT = 50

export const standardizationRules = [
  { type: 'cost', label: '成本型指标', formula: '标准分 =（最大值－本方案值）/（最大值－最小值）× 100' },
  { type: 'benefit', label: '效益型指标', formula: '标准分 =（本方案值－最小值）/（最大值－最小值）× 100' },
  { type: 'tier', label: '分档赋值指标', formula: '标准分 = XLOOKUP(承保表述, 分档表, 标准分)' },
  { type: 'equal', label: '三方案取值相同', formula: '统一计 100 分' },
]
