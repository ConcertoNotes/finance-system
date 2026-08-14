// 数据源：ABC三受灾等级预算计算表.xlsx · ABC三方案预算

export const ABC_WORKBOOK = 'ABC三受灾等级预算计算表.xlsx'

export const abcPlans = [
  {
    id: 'A',
    name: 'A方案',
    level: 'IV级轻度',
    positioning: '最低生命保障方案',
    days: 3,
    people: 7000,
    execution: 2816906,
    reserve: 0,
    total: 2816906,
    reserveRatio: 0,
    scope: '主要保障饮用水、食品、急救物资、紧急转移、救援人员基本保险',
    applicable: 'IV级轻度',
    note: '基准方案',
    conclusion: '随灾情等级提升逐级增加',
  },
  {
    id: 'B',
    name: 'B方案',
    level: 'III级中度',
    positioning: '标准救援保障方案',
    days: 3,
    people: 7000,
    execution: 2618103.6,
    reserve: 290900.4,
    total: 2909004,
    reserveRatio: 0.1,
    scope: '在A基础上增加临时安置、帐篷棉被、设备租赁、多轮物资配送、备用运输能力',
    applicable: 'III级中度',
    note: '标准救援保障',
    conclusion: 'C方案延长至5天',
  },
  {
    id: 'C',
    name: 'C方案',
    level: 'II级及以上重度',
    positioning: '持续灾情保障方案',
    days: 5,
    people: 8100,
    execution: 3902517.5,
    reserve: 376000,
    total: 4278517.5,
    reserveRatio: 376000 / 4278517.5,
    scope: '净需求量×历史预算标准价',
    applicable: 'II级及以上重度',
    note: '持续灾情保障',
    conclusion: 'C方案覆盖8100人',
  },
]

export const abcPlanMap = Object.fromEntries(abcPlans.map((plan) => [plan.id, plan]))

export const coverageItems = [
  { name: '饮用水/食品', A: '✓', B: '✓', C: '✓' },
  { name: '急救物资', A: '✓', B: '✓', C: '✓' },
  { name: '紧急转移', A: '✓', B: '✓', C: '✓' },
  { name: '救援人员基本保险', A: '✓', B: '✓', C: '✓' },
  { name: '临时安置/帐篷棉被', A: '基础生命保障', B: '增加', C: '持续强化' },
  { name: '设备租赁/连续运行', A: '基础保障', B: '增加设备租赁', C: '增加连续运行' },
  { name: '运输能力', A: '紧急转移', B: '多轮配送+备用运输', C: '增加道路绕行成本' },
  { name: '特殊人群保障', A: '基础', B: '标准保障', C: '重点增加' },
]

export const incrementStages = [
  { name: 'A方案基准预算', increment: 2816906, cumulative: 2816906, note: '最低生命保障' },
  { name: 'A→B增量', increment: 92098, cumulative: 2909004, note: '标准保障能力提升' },
  { name: 'B→C增量', increment: 1369513.5, cumulative: 4278517.5, note: '安置期延长、道路绕行、设备连续运行、特殊人群等' },
]

export const reserveNotes = [
  { name: 'A方案', execution: 2816906, reserve: 0, note: '未单列预备费' },
  { name: 'B方案', execution: 2618103.6, reserve: 290900.4, note: '预备费已包含在预算上限内' },
  { name: 'C方案', execution: 3902517.5, reserve: 376000, note: '预备费37.6万元，包含在总预算内' },
]

export const reservePrinciple = '预备费是预算组成部分，不是总预算之外再加一遍'

export const compareConclusions = {
  total: '随灾情等级提升逐级增加',
  days: 'C方案延长至5天',
  people: 'C方案覆盖8100人',
  unitCost: '保障强度提升',
  applicable: '按内部预算响应规则选用',
}
