// 第二阶段（灾后1—6小时）：应急采购、价格控制与合同决策
// 核心口径：4类合同采购物资走供应商遴选与主合同；2类生活保障物资走应急零售/框架协议直采，不纳入供应商评分

// 阶段二复核后的 C 方案预算上限（含全部物资明细重算，与阶段一编制稿 4,275,091 元存在 3,426.50 元复核差异）
export const stage2BudgetCeiling = 4278517.5
export const stage2Reserve = 376000

// 任务1：安置方式确认——8100人中6100人固定场所安置，甲3、甲6剩余2000人帐篷安置
export const shelterPlan = {
  relocated: 8100,
  fixedSheltered: 6100,
  tentSheltered: 2000,
  tentCapacity: 4,
  tentDemand: 500,
  formula: '帐篷重点保障需求量 = ROUNDUP(需要帐篷安置人数 ÷ 每顶容纳人数, 0) = ROUNDUP(2000 ÷ 4, 0) = 500顶',
  fixedShelterTypes: ['学校', '社区服务中心', '临时安置点'],
}

// 帐篷可用量核验：现有与在途均已锁定，捐赠为0，因此重点网格需求不可冲减
export const tentAvailability = {
  onHand: 120,
  inTransit: 50,
  donated: 0,
  transferable: 0,
  lockedFor: '甲1、甲2、甲8等网格基础保障及安全库存',
  formula: '甲3、甲6帐篷采购需求量 = MAX(0, 重点保障需求量 − 可用于重点网格库存 − 可调拨量 − 已确认捐赠量) = MAX(0, 500 − 0 − 0 − 0) = 500顶',
}

// 任务1：物资需求测算表（净采购量 = MAX(0, 网格总需求 − 现有可用库存 − 在途 − 已确认捐赠 − 可调拨)）
// channel: 'contract' = 纳入供应商遴选与主合同；'direct' = 大型商超应急零售/框架协议直采
export const materialRequirements = [
  { id: 'tent', name: '帐篷', unit: '顶', channel: 'contract', demand: 500, stock: 0, transit: 0, donated: 0, transferable: 0, note: '现有120顶与在途50顶已锁定甲1、甲2、甲8基础保障及安全库存，捐赠0顶，不可冲减重点需求' },
  { id: 'quilt', name: '棉被', unit: '床', channel: 'contract', demand: 7004, stock: 300, transit: 0, donated: 100, transferable: 0, note: '7004 − 300 − 100 = 6604床，全部纳入HT-2025-001主合同' },
  { id: 'vest', name: '救生衣', unit: '件', channel: 'contract', demand: 548, stock: 80, transit: 0, donated: 0, transferable: 0, note: '548 − 80 = 468件' },
  { id: 'kit', name: '急救包', unit: '套', channel: 'contract', demand: 384, stock: 60, transit: 0, donated: 0, transferable: 0, note: '384 − 60 = 324套' },
  { id: 'water', name: '饮用水', unit: '箱', channel: 'direct', demand: 1329, stock: 400, transit: 100, donated: 200, transferable: 0, note: '捐赠200箱已确认到货，净需求走应急零售/框架协议直采' },
  { id: 'food', name: '食品', unit: '箱', channel: 'direct', demand: 2104, stock: 200, transit: 50, donated: 150, transferable: 0, note: '捐赠150箱已确认到货，净需求走应急零售/框架协议直采' },
]

export const requirementFormula = '=MAX(0,C2-XLOOKUP(A2,库存表!A:A,库存表!B:B)-XLOOKUP(A2,在途表!A:A,在途表!B:B)-XLOOKUP(A2,捐赠表!A:A,捐赠表!B:B))'

export const requirementSteps = [
  { id: 1, title: '确认安置方式', detail: '9网格转移安置8,100人，其中6,100人可安置在学校、社区服务中心和临时安置点等固定场所；甲3、甲6仍有2,000人需要帐篷安置' },
  { id: 2, title: '核验帐篷可用量', detail: '现有120顶与在途50顶已锁定用于甲1、甲2、甲8基础保障及安全库存，当前无法直接冲减甲3、甲6新增需求；已确认帐篷捐赠为0顶' },
  { id: 3, title: '计算其他物资净需求', detail: '先用SUMIFS汇总《9网格物资需求清单》总需求，再按"总需求−现有可用库存−在途−已确认捐赠−可调拨"计算净采购量；总需求由前序灾情数据和保障标准形成，不根据供应商报价反推' },
  { id: 4, title: '建立物资需求测算表', detail: 'WPS表格中用SUMIFS按网格汇总需求、XLOOKUP匹配库存与捐赠数据、MAX函数计算净采购量、条件格式标识超预算项目' },
  { id: 5, title: '形成两类执行路径', detail: '合同采购由S2统一供货并纳入HT-2025-001主合同；生活保障直采采用大型商超应急零售，如已有框架协议则直接下单，不纳入供应商综合遴选和主合同打包' },
]

export const executionPaths = [
  {
    id: 'contract',
    title: '合同采购路径',
    subtitle: 'HT-2025-001 主合同 · 初始中选供应商 S2 统一采购',
    materials: ['帐篷 500顶', '棉被 6,604床', '救生衣 468件', '急救包 324套'],
    control: '纳入供应商综合遴选、价格基准比价与主合同打包，执行12小时送达与验收付款条款',
  },
  {
    id: 'direct',
    title: '生活保障直采路径',
    subtitle: '大型商超应急零售 / 框架协议直采',
    materials: ['饮用水 629箱', '食品 1,704箱'],
    control: '如已有框架协议则按协议直接下单，不纳入供应商综合遴选和主合同打包；重点核验采购审批、即时/协议价格、订单或销售凭证、批次保质期、收货验收和支付凭证',
  },
]

export const gridPriorityOrder = ['甲3', '甲6', '甲5', '甲4', '甲7', '甲1', '甲9', '甲2', '甲8']

// 任务2：4类合同物资价格采集（历史价、市场参考价、S1/S2/S3有效报价）
export const priceQuotes = [
  { id: 'tent', name: '帐篷', unit: '元/顶', history: 850, market: 820, s1: 880, s2: 835, s3: 968 },
  { id: 'quilt', name: '棉被', unit: '元/床', history: 65, market: 63, s1: 67, s2: 64, s3: 72 },
  { id: 'vest', name: '救生衣', unit: '元/件', history: 75, market: 73, s1: 78, s2: 74, s3: 85 },
  { id: 'kit', name: '急救包', unit: '元/套', history: 180, market: 175, s1: 185, s2: 178, s3: 210 },
]

// 任务2：2类生活保障物资应急零售/框架直采价格核验（不纳入S1、S2、S3供应商评分）
export const directPriceControls = [
  { id: 'water', name: '饮用水', unit: '元/箱', history: 24, market: 23, control: 23.5, qty: 629, evidence: '询价截图、订单或销售凭证' },
  { id: 'food', name: '食品', unit: '元/箱', history: 80, market: 78, control: 79, qty: 1704, evidence: '询价截图、订单或销售凭证' },
]

export const priceAlertThresholds = { yellow: 5, red: 10 }

export const priceBenchmarkSteps = [
  { id: 1, title: '采集价格数据', detail: '合同采购物资至少采集历史采购价、最近市场参考价、三家供应商有效报价、税费口径、正常运输费用和应急交付附加成本；生活保障直采物资采集历史价、市场参考价及大型商超即时价/框架协议价，并留存询价截图、订单或销售凭证' },
  { id: 2, title: '统一价格口径', detail: '4类合同采购物资的供应商报价统一转换为含税货物单价，运输费用和应急人工成本单独列示；食品、饮用水按含税零售价/框架协议结算价核验，配送费如单独发生则单列，避免与货价混同' },
  { id: 3, title: '计算平均价、中位数和价格区间', detail: '以帐篷为例：平均价 (880+835+968)÷3 = 894.33元，中位数880元，报价区间835—968元' },
  { id: 4, title: '建立综合价格基准', detail: '为避免异常高价拉高基准，采用历史价、市场价、S1和S2有效报价的均值：帐篷基准价 (850+820+880+835)÷4 = 846.25元' },
  { id: 5, title: '计算价格偏差率', detail: '价格偏差率 =（供应商报价 − 综合基准价）÷ 综合基准价 × 100%，超过10%启动重点复核。S3报价有效但经济性较弱，列为高价备选供应商，不直接判定为违规报价' },
  { id: 6, title: '写入采购控制平台', detail: '4类合同物资价格基准与2类生活保障直采控制价同步写入，设置黄色预警阈值5%、红色预警阈值10%；后续合同变更、紧急分单或商超临时补货均须重新校验' },
]

export const priceBenchmarkOutputs = ['4类合同物资价格基准表', '2类生活保障物资应急零售/框架直采价格核验表', '价格偏差分析表', '报价口径校验单']

// 任务3：供应商综合评分（报价40%、交付20%、质量15%、资质10%、履约10%、距离5%）
// 报价得分按4类合同物资综合报价测算，食品与饮用水不参与评分
export const supplierWeights = { price: 0.4, delivery: 0.2, quality: 0.15, qualification: 0.1, fulfillment: 0.1, distance: 0.05 }

export const supplierCriteria = [
  { key: 'price', label: '报价', weight: '40%' },
  { key: 'delivery', label: '交付时间', weight: '20%' },
  { key: 'quality', label: '物资质量', weight: '15%' },
  { key: 'qualification', label: '供应商资质', weight: '10%' },
  { key: 'fulfillment', label: '历史履约率', weight: '10%' },
  { key: 'distance', label: '运输距离', weight: '5%' },
]

export const supplierProfiles = [
  { id: 'S1', name: 'S1供应商', price: 85, delivery: 80, quality: 90, qualification: 95, fulfillment: 95, distance: 30, deliveryPromise: '8小时', position: '第一备选供应商' },
  { id: 'S2', name: 'S2供应商', price: 92, delivery: 88, quality: 88, qualification: 90, fulfillment: 92, distance: 50, deliveryPromise: '12小时', position: 'HT-2025-001主供应商' },
  { id: 'S3', name: 'S3供应商', price: 60, delivery: 65, quality: 82, qualification: 55, fulfillment: 88, distance: 70, deliveryPromise: '6小时', position: '第二备选、极端情况兜底' },
]

export const supplierReviewChecks = [
  { role: '应急预算绩效岗', text: 'S2帐篷单价835元低于846.25元基准价，12小时交付承诺可满足甲3、甲6重点保障时限，初始方案未突破C方案预算' },
  { role: '资金核算风控岗', text: '核验S2营业资质、收款账户、关联关系和历史付款记录：S2合同主体、发票主体、收款账户一致，无关联交易预警' },
  { role: '财务主管统筹岗', text: '同意S2为HT-2025-001四类合同物资唯一初始主供应商，S1为第一备选、S3为第二备选和极端情况兜底；备选供应商在主供应商出现异常后方启动，不参与初始合同分单' },
]

// 任务4：初始合同（HT-2025-001 四类合同物资，S2 统一供货）
export const initialContracts = [
  {
    id: 'HT-2025-001',
    name: '主采购合同',
    supplier: 'S2',
    items: [
      { name: '帐篷', qty: 500, unit: '顶', price: 835 },
      { name: '棉被', qty: 6604, unit: '床', price: 64 },
      { name: '救生衣', qty: 468, unit: '件', price: 74 },
      { name: '急救包', qty: 324, unit: '套', price: 178 },
    ],
  },
]

// 生活保障直采订单（不构成对外采购合同，按框架协议或采购审批单+订单执行）
export const directPurchaseOrder = {
  id: 'ZC-2025-001',
  name: '生活保障应急零售/框架协议直采',
  channel: '大型商超应急零售',
  items: [
    { name: '饮用水', qty: 629, unit: '箱', price: 23.5 },
    { name: '食品', qty: 1704, unit: '箱', price: 79 },
  ],
  controls: ['采购审批', '即时价/框架协议价', '订单或销售凭证', '批次保质期', '收货验收', '支付凭证'],
}

export const contractControls = [
  '12小时内送达重点网格',
  '验收标准包括数量、规格、外观、防水性能和有效期',
  '验收合格后7日内付款，未验收部分暂停付款',
  '库存或交付能力发生重大变化须在1小时内报告',
  '如有不可抗力因素，经审批协商一致后可变更合同内容',
]

export const fundControlChecks = [
  'HT-2025-001合同和生活保障直采两部分初始预算占用均纳入C方案采购预算控制',
  '具体付款时再按限定性捐赠用途和政府财政资金规则进行来源匹配',
  '建立HT-001预算占用记录、预计付款计划和采购资金台账，同时建立食品、饮用水应急零售/框架直采台账',
  '付款前均须完成四流匹配；直采业务以框架协议或采购审批单+订单作为合同流依据',
]

// 任务5：第二次突发事件——S2库存突变（原500顶仅300顶12小时内可交付，50顶24小时，150顶无法保障）
export const supplierIncident = {
  alert: 'S2实时库存和运输能力发生重大变化：受仓库局部进水及车辆调度冲突影响，原合同500顶帐篷中，仅300顶可在12小时内交付，50顶可在24小时内交付，剩余150顶暂时无法保障。',
  in12h: 300,
  in24h: 50,
  unavailable: 150,
  gap12h: 200,
  contractGap: 150,
  affectedPeople: 800,
  firstBatchRate: 60,
  verification: '调取S2实时库存台账、仓库出入库记录、车辆调度记录、仓库视频和物流预计到达时间，交叉核验仓库局部进水属实，不属于虚假库存或恶意拒绝履约',
}

export const incidentDirectives = [
  { role: '采购成本保障岗', text: '立即核验库存和运输能力' },
  { role: '应急预算绩效岗', text: '测算对重点网格保障的影响' },
  { role: '资金核算风控岗', text: '暂停帐篷部分付款计划并准备合同变更' },
  { role: '御洪星', text: '同步更新到货预警看板' },
]

export const gridTransfers = [
  { from: '甲1', to: '甲3', qty: 20 },
  { from: '甲2', to: '甲6', qty: 15 },
  { from: '甲8', to: '甲6', qty: 15 },
]

export const transferRule = '数据透视表汇总各网格帐篷到位量和最低保障线，调拨后各网格最低保障完成率仍不低于80%；系统记录批次、调出时间、到达时间、经办人、接收人和24小时补回计划'

// S1/S3紧急询价（车辆应急调度与装卸人工属订单级固定附加成本，不按数量线性分摊）
export const emergencyQuotes = [
  {
    id: 'S1', capacity: 150, price: 880, arrival: '8小时', arrivalHours: 8,
    vehicles: 2, vehicleHours: 6, vehicleRate: 180,
    workers: 6, workerHours: 4, workerRate: 35,
  },
  {
    id: 'S3', capacity: 200, price: 968, arrival: '6小时', arrivalHours: 6,
    vehicles: 2, vehicleHours: 4, vehicleRate: 150,
    workers: 4, workerHours: 4, workerRate: 35,
  },
]

// 规划求解（混合整数模型）：MinZ = 880·x1 + 968·x3 + 3000·y1 + 1760·y3
// y1、y3 为0-1变量，表示是否启用该供应商；订单级固定成本仅在启用时发生
export const splitModel = {
  objective: 'Min Z = 880·x1 + 968·x3 + 3000·y1 + 1760·y3',
  variables: 'x1、x3 为向S1、S3采购的帐篷数量；y1、y3 表示是否启用该供应商（启用=1，不启用=0）',
  demand: 150,
  constraints: [
    'x1 + x3 = 150',
    '0 ≤ x1 ≤ 150·y1',
    '0 ≤ x3 ≤ 200·y3',
    'x1、x3 为非负整数',
    'y1、y3 为0-1变量',
    '所选供应商到货时间 ≤ 12小时',
  ],
  solverNote: '在Excel规划求解中将Z设置为最小值，改变x1、x3、y1、y3四个决策单元格，添加数量、供应能力、整数、0-1变量和时限约束',
  fixedCostNote: '车辆应急调度和装卸人工属于启用某供应商即发生的订单级固定成本，不按采购数量简单线性分摊；单位综合成本仅作为满量采购的参考口径',
  combos: [
    { id: 'A', s1: 150, s3: 0 },
    { id: 'B', s1: 100, s3: 50 },
    { id: 'C', s1: 50, s3: 100 },
    { id: 'D', s1: 0, s3: 150 },
  ],
  solution: { x1: 150, x3: 0, y1: 1, y3: 0 },
}

export const incidentSteps = [
  { id: 1, role: '采购成本保障岗', title: '核验异常真实性', detail: '调取S2实时库存台账、仓库出入库记录、车辆调度记录、仓库视频和物流预计到达时间。经交叉核验，仓库局部进水属实，不属于虚假库存或恶意拒绝履约' },
  { id: 2, role: '采购成本保障岗', title: '识别合同影响', detail: '原合同500顶中，12小时内可交付300顶，24小时内可交付50顶，无法确定交付150顶。12小时保障缺口=500−300=200顶；最终合同供应缺口=500−350=150顶' },
  { id: 3, role: '应急预算绩效岗', title: '测算网格保障影响', detail: '12小时缺口200顶×4人/顶=800人。如不调整，甲3、甲6约800名受灾群众无法按计划完成临时安置，第一批帐篷到位率仅为300÷500=60%' },
  { id: 4, role: '应急预算绩效岗', title: '查询网格可调拨量', detail: '使用数据透视表汇总各网格帐篷到位量和最低保障线：甲1可调出20顶、甲2可调出15顶、甲8可调出15顶，合计50顶，调拨后各网格最低保障完成率仍不低于80%；临时调拨可暂时保障50×4=200人，剩余需紧急分单采购150顶' },
  { id: 5, role: '资金核算风控岗', title: '暂停原付款计划', detail: '将HT-2025-001状态调整为"履约变更审核中"，暂停500顶帐篷对应预计付款，但不影响棉被、救生衣、急救包等合同物资正常履约，也不影响食品、饮用水应急零售/框架协议直采执行' },
  { id: 6, role: '采购成本保障岗', title: '启动S1、S3紧急询价', detail: '重点比较货物价格、运费增加、人工增加成本、可供应量和到货时间。S1可供150顶、880元/顶、8小时到达；S3可供200顶、968元/顶、6小时到达' },
  { id: 7, role: '采购成本保障岗', title: '识别订单级固定附加成本', detail: '车辆应急调度和装卸人工属于启用某供应商即发生的订单级固定成本，不按采购数量简单线性分摊。S1订单固定附加成本=2,160+840=3,000元；S3订单固定附加成本=1,200+560=1,760元；单位综合成本仅作为满量采购的参考口径' },
  { id: 8, role: '采购成本保障岗', title: '建立分单组合优化模型', detail: '设x1、x3为采购数量，y1、y3为0-1启用变量。目标函数 MinZ=880x1+968x3+3000y1+1760y3；约束 x1+x3=150、0≤x1≤150y1、0≤x3≤200y3、整数与0-1变量、到货时间≤12小时' },
  { id: 9, role: '采购成本保障岗', title: '比较四种可行组合', detail: '方案A 135,000元 < 方案B 141,160元 < 方案C 145,560元 < 方案D 146,960元；规划求解结果 x1=150、x3=0、y1=1、y3=0，方案A成本最低，相较全部选择S3节约11,960元；S1虽比S3晚2小时到达，但8小时仍满足12小时保障时限' },
  { id: 10, role: '应急预算绩效岗', title: '形成总体处置方案', detail: 'S2保留350顶（300顶12h内到达、50顶24h内到达）+ S1紧急分单150顶（8h到达）+ 甲1、甲2、甲8临时调拨50顶（2h到达）；12小时内可到位500顶，第一批重点保障完成率100%；S2后续50顶到达后补回三个调出网格' },
  { id: 11, role: '采购成本保障岗', title: '拟定HT-2025-001合同变更方案', detail: '帐篷数量由500顶调整为350顶，减少150顶，合同减少金额=150×835=125,250元，变更后金额=932,460−125,250=807,210元；棉被6,604床、救生衣468件、急救包324套的数量、单价、质量标准和付款条件不变；食品、饮用水直采路径不受本次变更影响' },
  { id: 12, role: '采购成本保障岗', title: '拟与S1签订HT-2025-003紧急分单合同', detail: '采购帐篷150顶，货物金额132,000元，车辆应急增加成本2,160元，装卸人工增加成本840元，合同总额135,000元；交付时间8小时；验收合格后7日内付款，未验收部分暂停付款' },
  { id: 13, role: '应急预算绩效岗', title: '重新测算成本和预备费', detail: '原帐篷采购成本=500×835=417,500元；变更后帐篷及紧急保障成本=350×835+150×880+2,160+840=427,250元；突发新增支出9,750元（价差6,750+运费人工3,000），预备费使用率2.59%，阶段性余额366,250元；变更后500顶综合平均成本854.50元/顶，剔除应急运输人工后货物均价848.50元/顶，与基准价偏差0.27%' },
  { id: 14, role: '资金核算风控岗', title: '重新进行预算占用和资金匹配', detail: 'HT-001变更后807,210元+HT-003 135,000元=942,210元，加生活保障直采149,397.50元，采购执行总额1,091,607.50元；较初始方案增加9,750元，全部由帐篷紧急分单产生并从C方案预备费列支；资金来源为政府财政拨款保障资金，不使用限定性食品捐赠和特殊人群保障资金' },
  { id: 15, role: '资金核算风控岗', title: '建立变更后付款和四流控制规则', detail: 'HT-001按变更后合同验收付款；HT-003分别核验150顶帐篷、132,000元货款、2,160元车辆应急成本、840元人工成本；食品、饮用水按框架协议/采购审批单、零售或订单凭证、到货验收、发票或小票及付款记录分项核验；网格调拨50顶不形成对外付款，但须形成出库单、调拨单、运输记录和接收确认单' },
  { id: 16, role: '网格物资调度专员', title: '执行网格调拨', detail: '甲1调出20顶至甲3，甲2调出15顶至甲6，甲8调出15顶至甲6；系统记录批次、调出时间、到达时间、经办人、接收人和24小时补回计划' },
]

export const incidentDecision = {
  paths: [
    { label: '继续等待S2', verdict: '成本最低但无法满足800人安置时限', accepted: false },
    { label: '全部改由备选供应商', verdict: '成本高且重新组织全量供货风险大', accepted: false },
    { label: 'S2保留350顶 + S1分单150顶 + 网格调拨50顶 + 合同变更 + 预备费控制', verdict: '可在12小时内完成500顶保障，新增支出仅9,750元', accepted: true },
  ],
  approvals: [
    '批准HT-001合同变更方案',
    '批准HT-003紧急分单采购',
    '批准临时调拨50顶',
    '批准使用预备费9,750元',
    '授权采购成本保障岗按审批结果办理合同变更和紧急采购合同签订',
  ],
}

export const incidentOutputs = [
  '供应商库存异常预警单', '库存真实性核验单', '重点物资短缺影响测算表', '网格可调拨测算表',
  'S1/S3紧急分单成本比较表', '规划求解结果表', '三方案决策比较表', 'HT-001合同变更单',
  'HT-001补充协议', 'HT-003紧急采购合同', '预备费使用申请表', '变更后预算占用表',
  '变更后付款计划', '供应商动态履约评价记录', '帐篷到货进度看板',
]

// 到货进度看板（处置后）
export const deliveryBoard = [
  { label: '网格调拨 50顶', status: '已出库', eta: '2小时内到达', tone: 'success' },
  { label: 'S1 分单 150顶', status: '运输中', eta: '预计8小时到达', tone: 'info' },
  { label: 'S2 主力 300顶', status: '装车完成', eta: '预计12小时到达', tone: 'info' },
  { label: 'S2 补充 50顶', status: '备货中', eta: '预计24小时到达（补回调出网格）', tone: 'warning' },
]

// 任务6：变更后合同控制与阶段移交
export const handoverStage2 = {
  procurement: ['HT-001变更合同及补充协议', 'HT-003紧急分单合同', '生活保障直采台账', 'S1/S3成本比较表', '网格调拨单', '供应商账户资料', '预计付款计划', '交付时限和验收标准'],
  budget: ['变更后采购执行1,091,607.50元', '预备费使用9,750元', '阶段性剩余预备费366,250元', '重点网格分配方案', '到货进度看板'],
  closing: 'HT-001由S2履行，HT-003由S1履行；S3未中选，但保留为极端情况下的备用供应商',
  next: '财务主管统筹岗下达第三阶段资金匹配和履约控制任务',
}
