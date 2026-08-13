// 数据源：灾情数据成本动因转换计算表.xlsx · 成本动因转换
// 预算参数 A5:D21、9网格灾情 F5:K13、设备预算 A40:E43。

export const COST_DRIVER_WORKBOOK = '灾情数据成本动因转换计算表.xlsx'

export const budgetParameters = [
  { key: 'shelterDays', name: '预计安置天数', value: 3, unit: '天', note: '灾情快速估算' },
  { key: 'foodRate', name: '食品标准', value: 25, unit: '元/人天', note: '灾情快速估算' },
  { key: 'waterRate', name: '饮水标准', value: 8, unit: '元/人天', note: '灾情快速估算' },
  { key: 'tentPrice', name: '帐篷预算单价', value: 850, unit: '元/顶', note: '历史预算标准' },
  { key: 'tentCapacity', name: '每顶帐篷容纳人数', value: 4, unit: '人/顶', note: '1顶帐篷使用人数' },
  { key: 'quiltPrice', name: '棉被预算单价', value: 65, unit: '元/床', note: '历史预算标准' },
  { key: 'specialCare', name: '特殊人群保障', value: 120, unit: '元/人', note: '老人/儿童/孕妇等' },
  { key: 'transportRate', name: '运输成本', value: 8.5, unit: '元/公里·辆', note: '运输距离×车辆数×单位公里成本' },
  { key: 'vehiclesPerGrid', name: '每网格配车', value: 2, unit: '辆', note: '统一配置' },
  { key: 'rescuers', name: '救援人员', value: 50, unit: '人', note: '保险计算' },
  { key: 'insuranceRate', name: '保险单价', value: 220, unit: '元/人', note: 'B保险公司' },
  { key: 'boatPrice', name: '冲锋舟单价', value: 3500, unit: '元/艘', note: '设备预算' },
  { key: 'boatCount', name: '冲锋舟数量', value: 5, unit: '艘', note: '设备预算' },
  { key: 'kitPrice', name: '急救包单价', value: 180, unit: '元/套', note: '设备预算' },
  { key: 'kitCount', name: '急救包数量', value: 200, unit: '套', note: '设备预算' },
  { key: 'vestPrice', name: '救生衣单价', value: 75, unit: '元/件', note: '设备预算' },
  { key: 'vestCount', name: '救生衣数量', value: 300, unit: '件', note: '设备预算' },
]

export const params = Object.fromEntries(budgetParameters.map((p) => [p.key, p.value]))

export const disasterGrids = [
  { id: '甲1', relocated: 600, special: 60, distance: 18, quilts: 600 },
  { id: '甲2', relocated: 400, special: 40, distance: 20, quilts: 400 },
  { id: '甲3', relocated: 1500, special: 180, distance: 42, quilts: 1504 },
  { id: '甲4', relocated: 700, special: 70, distance: 30, quilts: 700 },
  { id: '甲5', relocated: 900, special: 100, distance: 35, quilts: 900 },
  { id: '甲6', relocated: 1200, special: 150, distance: 45, quilts: 1200 },
  { id: '甲7', relocated: 600, special: 65, distance: 28, quilts: 600 },
  { id: '甲8', relocated: 500, special: 35, distance: 22, quilts: 500 },
  { id: '甲9', relocated: 600, special: 47, distance: 25.0588235294, quilts: 600 },
]

export const coreFormulas = [
  '转移安置人数 × 预计安置天数 = 安置人天',
  '安置人天 × 每人每日食品标准 = 食品预算',
  '安置人天 × 每人每日饮水标准 = 饮水预算',
  '帐篷需求量 × 帐篷预算单价 = 帐篷预算',
  '运输距离 × 车辆数量 × 单位公里成本 = 运输预算',
  '救援人员数量 × 保险单价 = 保险预算',
  '设备数量 × 预计使用台时 × 单位台时成本 = 设备预算',
]

export const equipmentItems = [
  { name: '冲锋舟', countKey: 'boatCount', priceKey: 'boatPrice' },
  { name: '急救包', countKey: 'kitCount', priceKey: 'kitPrice' },
  { name: '救生衣', countKey: 'vestCount', priceKey: 'vestPrice' },
]

// 计算表 A48:C55 的成本构成口径，用于占比呈现。
export const costComponentOrder = ['食品', '饮水', '帐篷', '棉被', '特殊人群保障', '运输', '保险', '设备']

export const executionNote =
  'C方案转为可执行物资预算时，饮用水按历史整箱预算标准24元/箱、食品按80元/箱测算；25元/人天和8元/人天用于灾情情景快速估算，后续采购执行再按净需求量和实际询价形成预算占用与差异。'
