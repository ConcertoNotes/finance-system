// 数据源：洪涝阶段二.xlsx（2026-08-15）· 采购成本保障岗任务1—5 与其余三岗配套页面。
// 计算表：分层采购价格基准计算表.xlsx

export const PRICE_WORKBOOK = '分层采购价格基准计算表.xlsx'

// channel: contract 合同采购（纳入供应商综合遴选）、direct 生活保障应急零售/框架协议直采
export const materialDemands = [
  {
    id: 'tent',
    name: '帐篷',
    unit: '顶',
    channel: 'contract',
    total: 500,
    stock: 0,
    inTransit: 0,
    donation: 0,
    transferable: 0,
    net: 500,
    budgetPrice: 850,
    method: '合同签订',
    scored: '是',
    priorityNeed: '优先锁量锁价',
    note: '现有 120 顶与在途 50 顶已锁定用于甲1、甲2、甲8 基础保障及安全库存，不直接冲减甲3、甲6 新增需求。',
  },
  { id: 'quilt', name: '棉被', unit: '床', channel: 'contract', total: 7004, stock: 300, inTransit: 0, donation: 100, transferable: 0, net: 6604, budgetPrice: 65, method: '合同签订', scored: '是', priorityNeed: '按保障顺序配送' },
  { id: 'vest', name: '救生衣', unit: '件', channel: 'contract', total: 548, stock: 80, inTransit: 0, donation: 0, transferable: 0, net: 468, budgetPrice: 75, method: '合同签订', scored: '是', priorityNeed: '按保障顺序配送' },
  { id: 'kit', name: '急救包', unit: '套', channel: 'contract', total: 384, stock: 60, inTransit: 0, donation: 0, transferable: 0, net: 324, budgetPrice: 180, method: '合同签订', scored: '是', priorityNeed: '按保障顺序配送' },
  { id: 'water', name: '饮用水', unit: '箱', channel: 'direct', total: 1329, stock: 400, inTransit: 100, donation: 200, transferable: 0, net: 629, budgetPrice: 24, method: '大型商超应急零售/框架协议', scored: '否', priorityNeed: '快速到货', remark: '已有框架协议则直接下单' },
  { id: 'food', name: '食品', unit: '箱', channel: 'direct', total: 2104, stock: 200, inTransit: 50, donation: 150, transferable: 0, net: 1704, budgetPrice: 80, method: '大型商超应急零售/框架协议', scored: '否', priorityNeed: '快速到货', remark: '已有框架协议则直接下单' },
]

export const shelterPlan = {
  relocatedTotal: 8100,
  fixedShelter: 6100,
  tentShelter: 2000,
  tentCapacity: 4,
  tentDemand: 500,
}

export const demandFormula =
  '采购需求量 = MAX(0, 网格总需求 － 现有可用库存 － 在途数量 － 已确认捐赠数量 － 可调拨数量)'

export const demandExcelFormula =
  '=MAX(0,C2-XLOOKUP(A2,库存表!A:A,库存表!B:B)-XLOOKUP(A2,在途表!A:A,在途表!B:B)-XLOOKUP(A2,捐赠表!A:A,捐赠表!B:B))'

export const priorityOrder = [
  { grid: '甲3', level: '最高' },
  { grid: '甲6', level: '高' },
  { grid: '甲5', level: '高' },
  { grid: '甲4', level: '较高' },
  { grid: '甲7', level: '较高' },
  { grid: '甲1', level: '一般' },
  { grid: '甲9', level: '一般' },
  { grid: '甲2', level: '较低' },
  { grid: '甲8', level: '较低' },
]

export const CHANNEL_OPTIONS = ['合同采购', '生活保障直采']
export const METHOD_OPTIONS = ['合同签订', '大型商超应急零售/框架协议']
export const SCORED_OPTIONS = ['是', '否']
export const PRIORITY_NEED_OPTIONS = ['优先锁量锁价', '按保障顺序配送', '快速到货']

// 综合基准价 = 历史价、市场参考价、S1 与 S2 有效报价的均值，刻意排除异常高价 S3。
export const priceQuotes = [
  { id: 'tent', name: '帐篷', unit: '元/顶', channel: 'contract', history: 850, market: 820, s1: 880, s2: 835, s3: 968, tax: '统一按含税货物单价', freight: '正常运输费用、应急交付附加成本单独列示' },
  { id: 'quilt', name: '棉被', unit: '元/床', channel: 'contract', history: 65, market: 63, s1: 67, s2: 64, s3: 72, tax: '统一按含税货物单价', freight: '正常运输费用、应急交付附加成本单独列示' },
  { id: 'vest', name: '救生衣', unit: '元/件', channel: 'contract', history: 75, market: 73, s1: 78, s2: 74, s3: 85, tax: '统一按含税货物单价', freight: '正常运输费用、应急交付附加成本单独列示' },
  { id: 'kit', name: '急救包', unit: '元/套', channel: 'contract', history: 180, market: 175, s1: 185, s2: 178, s3: 210, tax: '统一按含税货物单价', freight: '正常运输费用、应急交付附加成本单独列示' },
  { id: 'water', name: '饮用水', unit: '元/箱', channel: 'direct', history: 24, market: 23, control: 23.5, method: '大型商超应急零售/框架协议直采', scored: '不纳入S1、S2、S3评分', evidence: '询价截图、订单或销售凭证' },
  { id: 'food', name: '食品', unit: '元/箱', channel: 'direct', history: 80, market: 78, control: 79, method: '大型商超应急零售/框架协议直采', scored: '不纳入S1、S2、S3评分', evidence: '询价截图、订单或销售凭证' },
]

export const priceAlertThresholds = { yellow: 0.05, red: 0.1 }

export const supplierCriteria = [
  { key: 'quote', label: '报价', weight: 0.4 },
  { key: 'delivery', label: '交付时间', weight: 0.2 },
  { key: 'quality', label: '物资质量', weight: 0.15 },
  { key: 'credential', label: '供应商资质', weight: 0.1 },
  { key: 'history', label: '历史履约率', weight: 0.1 },
  { key: 'distance', label: '运输距离', weight: 0.05 },
]

export const suppliers = [
  { id: 'S1', name: 'S1供应商', quote: 85, delivery: 80, quality: 90, credential: 95, history: 95, distance: 30 },
  { id: 'S2', name: 'S2供应商', quote: 92, delivery: 88, quality: 88, credential: 90, history: 92, distance: 50 },
  { id: 'S3', name: 'S3供应商', quote: 60, delivery: 65, quality: 82, credential: 55, history: 88, distance: 70 },
]

export const initialContract = {
  code: 'HT-2025-001',
  supplierId: 'S2',
  buyer: 'A单位',
  seller: 'S2供应商',
  project: '洪涝应急救援专项',
  nature: '四类合同采购物资合同',
  amountUpper: '玖拾叁万贰仟肆佰陆拾元整',
  lines: [
    { id: 'tent', name: '帐篷', unit: '顶', quantity: 500, price: 835, accept: '数量、规格、外观、防水性能', handle: '不合格数量单独隔离，暂停对应付款并要求补换货' },
    { id: 'quilt', name: '棉被', unit: '床', quantity: 6604, price: 64, accept: '数量、规格、外观', handle: '不合格数量单独隔离，暂停对应付款并要求补换货' },
    { id: 'vest', name: '救生衣', unit: '件', quantity: 468, price: 74, accept: '数量、规格、外观', handle: '不合格数量单独隔离，暂停对应付款并要求补换货' },
    { id: 'kit', name: '急救包', unit: '套', quantity: 324, price: 178, accept: '数量、规格、外观、有效期', handle: '不合格或有效期不符合要求的数量暂停付款并要求补换货' },
  ],
  terms: [
    '12小时内送达重点网格',
    '验收标准包括数量、规格、外观、防水性能和有效期',
    '验收合格后7日内付款，未验收部分暂停付款',
    '库存或交付能力发生重大变化须在1小时内报告',
    '如有不可抗因素，经审批协商一致后可变更合同内容',
  ],
}

export const directPurchase = {
  seller: 'B商超',
  amountUpper: '壹拾肆万玖仟叁佰玖拾柒元伍角整',
  lines: [
    { id: 'water', name: '饮用水', unit: '箱', quantity: 629, history: 24, market: 23, price: 23.5 },
    { id: 'food', name: '食品', unit: '箱', quantity: 1704, history: 80, market: 78, price: 79 },
  ],
  note: '以框架协议或采购审批单+订单作为合同流依据，重点核验采购审批、即时/协议价格、订单或销售凭证、批次保质期、收货验收和支付凭证。',
}

export const PRICE_OUTPUTS = [
  '《4类合同物资价格基准表》',
  '《2类生活保障物资应急零售/框架直采价格核验表》',
  '《价格偏差分析表》',
  '《报价口径校验单》',
]

export const SUPPLIER_NOTES = {
  S1: '按排序进入备选',
  S2: '综合表现最优',
  S3: '按排序进入备选',
}

export const demandReviewChecks = [
  '需求计算依据完整',
  '采购数量与重点安置对象一致',
  '未突破C方案预算控制范围',
]

export const schemeReviewChecks = [
  '采购方式符合要求',
  '未突破C方案预算',
  '主供应商已完成风控审核',
  '生活保障物资已独立设置直采路径',
]

export const fundMatchRules = [
  '政府财政资金 → 符合规定的救灾支出',
  '限定性捐赠 → 必须与捐赠协议用途一致',
  '用途不匹配 → 禁止付款',
]

export const fourFlowRules = {
  contract: '合同 → 发票 → 履约/验收 → 付款',
  direct: '框架协议或采购审批单+订单 → 发票/销售凭证 → 收货验收 → 付款',
}

export const alertRules = [
  { title: '交付时限预警', text: '超过12小时未完成重点物资交付 → 🔴预警' },
  { title: '库存能力预警', text: '可供数量低于合同数量 → 🔴预警' },
  { title: '质量异常预警', text: '验收出现规格、外观、防水性能等异常 → 🟡/🔴预警' },
  { title: '重大变化报告预警', text: '供应商发生库存或交付重大变化后1小时内未报告 → 🔴预警' },
]

export const verifyMaterials = [
  '实时库存台账',
  '仓库出入库记录',
  '车辆调度记录',
  '仓库视频/现场影像',
  '物流预计到达时间',
]

export const PLAN_C_BUDGET_CAP = 4278517.5
export const CONTINGENCY_TOTAL = 376000

// 任务5：S2 仓库局部进水后的交付能力与备选供应商紧急询价。
export const incident = {
  title: '第二次突发事件——供应商库存突变，重点物资无法按时足量交付',
  originalQuantity: 500,
  deliverable12h: 300,
  deliverable24h: 50,
  undeliverable: 150,
  gap12h: 200,
  contractGap: 150,
  verification: '调取S2实时库存台账、仓库出入库记录、车辆调度记录、仓库视频和物流预计到达时间，交叉核验后确认仓库局部进水属实，不属于虚假库存或恶意拒绝履约。',
}

export const gridTransfers = [
  { from: '甲1', to: '甲3', quantity: 20 },
  { from: '甲2', to: '甲6', quantity: 15 },
  { from: '甲8', to: '甲6', quantity: 15 },
]

export const emergencyQuotes = [
  {
    id: 'S1',
    name: 'S1供应商',
    capacity: 150,
    unitPrice: 880,
    arrivalHours: 8,
    vehicleCost: { vehicles: 2, hours: 6, rate: 180, total: 2160 },
    laborCost: { workers: 6, hours: 4, rate: 35, total: 840 },
    fixedCost: 3000,
  },
  {
    id: 'S3',
    name: 'S3供应商',
    capacity: 200,
    unitPrice: 968,
    arrivalHours: 6,
    vehicleCost: { vehicles: 2, hours: 4, rate: 150, total: 1200 },
    laborCost: { workers: 4, hours: 4, rate: 35, total: 560 },
    fixedCost: 1760,
  },
]

export const splitModel = {
  required: 150,
  deadlineHours: 12,
  objective: 'Min Z = 880·x1 + 968·x3 + 3000·y1 + 1760·y3',
  constraints: [
    'x1 + x3 = 150',
    '0 ≤ x1 ≤ 150·y1',
    '0 ≤ x3 ≤ 200·y3',
    'x1、x3 为非负整数',
    'y1、y3 为 0-1 变量',
    '所选供应商到货时间均不超过 12 小时',
  ],
  candidates: [
    { label: '方案A', x1: 150, x3: 0 },
    { label: '方案B', x1: 100, x3: 50 },
    { label: '方案C', x1: 50, x3: 100 },
    { label: '方案D', x1: 0, x3: 150 },
  ],
}

export const changeOrder = {
  contractCode: 'HT-2025-001',
  tentBefore: 500,
  tentAfter: 350,
  reducedQuantity: 150,
  unitPrice: 835,
  emergencyContract: {
    code: 'HT-2025-003',
    supplierId: 'S1',
    quantity: 150,
    goodsAmount: 132000,
    vehicleCost: 2160,
    laborCost: 840,
    total: 135000,
    arrivalHours: 8,
  },
}

export const handoverSummary = {
  contractExecutor: { 'HT-2025-001': 'S2', 'HT-2025-003': 'S1' },
  backupSupplier: 'S3',
  note: 'S3未中选，但保留为极端情况下的备用供应商。',
}
