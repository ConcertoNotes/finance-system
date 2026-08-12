export const budgetParameters = [
  { id: 'food', name: '食品标准', value: 25, unit: '元/人天' },
  { id: 'water', name: '饮水标准', value: 8, unit: '元/人天' },
  { id: 'tent', name: '帐篷单价', value: 850, unit: '元/顶', note: '4 人一顶' },
  { id: 'quilt', name: '棉被单价', value: 65, unit: '元/床' },
  { id: 'special', name: '特殊人群保障', value: 120, unit: '元/人' },
  { id: 'transport', name: '运输成本', value: 8.5, unit: '元/公里·辆' },
  { id: 'vehicles', name: '每网格配车', value: 2, unit: '辆' },
  { id: 'rescuers', name: '救援人员', value: 50, unit: '人' },
  { id: 'insurance', name: '保险单价', value: 220, unit: '元/人' },
  { id: 'boats', name: '冲锋舟', value: 3500, unit: '元/艘', note: '5 艘' },
  { id: 'kits', name: '急救包', value: 180, unit: '元/套', note: '200 套' },
  { id: 'vests', name: '救生衣', value: 75, unit: '元/件', note: '300 件' },
]

export const budgetScenarios = [
  {
    id: 'A',
    name: '最低生命保障方案',
    response: 'IV级',
    total: 2816906,
    beneficiaries: 7000,
    unitCost: 402.42,
    days: 3,
    reserve: 0,
    coverage: ['饮用水', '食品', '急救物资', '紧急转移', '基础保险'],
    description: '优先保障生命安全和紧急转移，压缩非必要的持续安置投入。',
  },
  {
    id: 'B',
    name: '标准救援保障方案',
    response: 'III级',
    total: 2909004,
    beneficiaries: 7000,
    unitCost: 415.57,
    days: 3,
    reserve: 290000,
    coverage: ['A方案全部', '临时安置', '帐篷棉被', '设备租赁', '多轮配送', '备用运输'],
    description: '在生命保障基础上补齐标准安置、设备与多轮配送能力。',
  },
  {
    id: 'C',
    name: '持续灾情保障方案',
    response: 'II级及以上',
    total: 4275091,
    beneficiaries: 8100,
    unitCost: 527.79,
    days: 5,
    reserve: 376000,
    coverage: ['B方案全部', '安置期延长', '道路绕行', '连续运行', '特殊人群', '应急缓冲'],
    description: '应对持续性灾情和道路受阻，增强时间韧性与资金缓冲。',
  },
]

export const baseBudgetBreakdown = [
  { label: '食品保障', amount: 525000, color: '#d6a84b' },
  { label: '饮水保障', amount: 168000, color: '#55b7df' },
  { label: '帐篷安置', amount: 1487500, color: '#7bc4a4' },
  { label: '特殊人群', amount: 288000, color: '#d78cc3' },
  { label: '运输保障', amount: 185406, color: '#8ca4d6' },
  { label: '救援物资', amount: 76000, color: '#ef856d' },
  { label: '设备运行', amount: 76000, color: '#8f91a8' },
  { label: '救援保险', amount: 11000, color: '#5fd4c4' },
]

export const budgetIncreaseDrivers = [
  { label: '安置期延长 3→5 天', amount: 915279, share: 67 },
  { label: '受灾人数增加', amount: 382504, share: 28 },
  { label: '道路绕行成本', amount: 68304, share: 5 },
]

export const costDriverFormulas = [
  { id: 'person-days', name: '安置人天', formula: '转移安置人数 × 预计安置天数', basis: '7,000 人 × 3 天' },
  { id: 'food', name: '食品预算', formula: '安置人天 × 每人每日食品标准', basis: '21,000 人天 × 25 元' },
  { id: 'water', name: '饮水预算', formula: '安置人天 × 每人每日饮水标准', basis: '21,000 人天 × 8 元' },
  { id: 'tent', name: '帐篷预算', formula: 'ROUNDUP(转移安置人数 ÷ 4) × 帐篷单价', basis: '1,750 顶 × 850 元' },
  { id: 'transport', name: '运输预算', formula: '运输距离 × 车辆数量 × 单位公里成本', basis: '9 网格 × 2 辆 × 8.5 元/公里' },
  { id: 'insurance', name: '保险预算', formula: '救援人员数量 × 保险单价', basis: '50 人 × 220 元' },
  { id: 'equipment', name: '设备预算', formula: '设备数量 × 预计使用台时 × 单位台时成本', basis: '冲锋舟、急救包与救生衣' },
]

export const responseThresholds = [
  { key: 'relocated', label: '转移安置人数', level3: 5000, level2: 8000, unit: '人' },
  { key: 'trapped', label: '被困和伤员人数', level3: 500, level2: 1000, unit: '人' },
  { key: 'blockedRoads', label: '道路中断网格', level3: 2, level2: 4, unit: '个' },
  { key: 'shelterDays', label: '预计安置时间', level3: 2, level2: 4, unit: '天' },
  { key: 'fundingGap', label: '救灾资金缺口', level3: 1, level2: 500000, unit: '元' },
]
