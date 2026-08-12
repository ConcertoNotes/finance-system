// 第三阶段（灾后6—24小时）：双资金匹配、验收核验与支付控制

export const PROJECT_CODE = 'ZYCD-2025-001'

// 任务1：救灾项目资金分类台账（4类资金、8笔资金明细，每笔含完整标签）
export const fundCategories = [
  { id: 'gov', name: '政府协同保障资金', color: '#d6a84b' },
  { id: 'restricted', name: '限定性社会捐赠', color: '#ef856d' },
  { id: 'unrestricted', name: '非限定性社会捐赠', color: '#55b7df' },
  { id: 'insurance', name: '保险赔款', color: '#7bc4a4' },
]

export const fundEntries = [
  { id: 'G01', category: 'gov', donor: '县财政局应急拨付', amount: 2000000, arrival: '灾后0.5h到账', usage: '应急物资采购/运输/安置', grids: '全部', deadline: '无限制', disclosure: '公开' },
  { id: 'G02', category: 'gov', donor: '市民政局救灾专项资金', amount: 800000, arrival: '灾后2h到账', usage: '受灾群众安置', grids: '全部', deadline: '无限制', disclosure: '公开' },
  { id: 'D01', category: 'restricted', donor: 'A企业（食品企业）', amount: 300000, arrival: '灾后1h到账', usage: '食品采购', grids: '甲3、甲6', deadline: '灾后30天', disclosure: '公开' },
  { id: 'D02', category: 'restricted', donor: 'B基金会', amount: 250000, arrival: '灾后3h到账', usage: '帐篷/棉被采购', grids: '全部', deadline: '灾后60天', disclosure: '公开' },
  { id: 'D03', category: 'restricted', donor: 'C爱心人士', amount: 150000, arrival: '灾后4h到账', usage: '儿童/老人特护', grids: '甲3', deadline: '灾后30天', disclosure: '公开' },
  { id: 'U01', category: 'unrestricted', donor: '线上公益平台', amount: 680000, arrival: '灾后2h到账', usage: '不限', grids: '全部', deadline: '灾后90天', disclosure: '公开' },
  { id: 'U02', category: 'unrestricted', donor: 'D企业集团', amount: 200000, arrival: '灾后5h到账', usage: '不限', grids: '全部', deadline: '灾后90天', disclosure: '公开' },
  { id: 'I01', category: 'insurance', donor: '救援人员意外险（预计）', amount: 80000, arrival: '复盘阶段到账', usage: '救援人员医疗/伤残', grids: '全部', deadline: '理赔后', disclosure: '内部' },
]

export const fundTagFields = ['资金来源', '捐赠人或拨款单位', '金额', '到账时间', '可使用用途', '可使用网格', '可使用对象', '使用期限', '剩余余额', '是否需要专项公开']

export const fundBalances = [
  { label: '政府协同保障资金', amount: 2913330.5, note: '余额2,913,330.5元' },
  { label: '红十字会转移限定性社会捐赠', amount: 700000, note: 'D01余额30万、D02余额25万、D03余额15万' },
  { label: '红十字会转移非限定性社会捐赠', amount: 880000, note: 'U01余额68万、U02余额20万' },
  { label: '保险赔付', amount: 0, note: '暂无赔付' },
]

export const fundTotalAvailable = 4493330.5

export const fundLedgerSkills = ['资金流水导入', '资金来源分类', '限定性条款识别', '资金用途编码', '专项台账建立', '资金余额计算', '银行流水与台账核对']

// 一人多岗多能：9网格资金下沉管理
export const gridSubAccounts = {
  initialQuota: 500000,
  total: 4500000,
  priority: ['甲3', '甲6', '甲5', '甲4', '甲7', '甲1', '甲9', '甲2', '甲8'],
  rules: [
    '按保障优先级排序，优先级高的网格优先调拨',
    '资金调拨需匹配用途标签',
    '限定性捐赠不得跨用途使用',
  ],
}

export const gridReadinessBoard = [
  { grid: '甲3', readiness: 100, quota: 500000, arrivalRate: 100 },
  { grid: '甲6', readiness: 100, quota: 500000, arrivalRate: 100 },
  { grid: '甲5', readiness: 52, quota: 500000, arrivalRate: 96, alert: true },
  { grid: '甲4', readiness: 86, quota: 500000, arrivalRate: 98 },
  { grid: '甲7', readiness: 84, quota: 500000, arrivalRate: 97 },
  { grid: '甲1', readiness: 92, quota: 500000, arrivalRate: 100 },
  { grid: '甲9', readiness: 90, quota: 500000, arrivalRate: 99 },
  { grid: '甲2', readiness: 95, quota: 500000, arrivalRate: 100 },
  { grid: '甲8', readiness: 96, quota: 500000, arrivalRate: 100 },
]

export const multiRoleShowcase = [
  { subRole: '网格财经架构师', mainRole: '财务主管统筹岗', action: '设计9网格资金统筹规则：9个网格各设子账户，初始额度各50万元合计450万元；按保障优先级调拨，限定性捐赠不得跨用途', output: '9网格资金统筹规则卡' },
  { subRole: '网格数据分析师', mainRole: '应急预算绩效岗', action: '数据透视表汇总9网格物资到位情况，甲5网格物资到位率仅52%，标红预警', output: '9网格物资到位率看板' },
  { subRole: '网格资金调度专员', mainRole: '采购成本保障岗', action: '激活9个网格子账户（初始额度各50万元），完成资金调度优先级排序：甲3>甲6>甲5>甲4>甲7>甲1>甲9>甲2>甲8', output: '9网格资金调度到账率看板' },
  { subRole: '网格财务专员', mainRole: '资金核算风控岗', action: '记录9个网格子账户初始额度激活流水，每账户50万元合计450万元入账，流水号生成并同步资金台账', output: '9网格子账户初始额度激活记录' },
]

// 任务2：付款申请与资金来源匹配（8项匹配条件）
export const paymentConditions = [
  '预算项目是否存在', '预算余额是否充足', '资金用途是否匹配', '网格是否匹配',
  '受益对象是否匹配', '支付期限是否满足', '申请人权限是否满足', '合同和发票是否齐全',
]

export const paymentApplications = [
  {
    id: 'PAY-01', contract: 'HT-2025-001', subject: 'HT-2025-001变更后合同付款（帐篷350顶、棉被6,604床、救生衣468件、急救包324套）', amount: 807210,
    source: '政府财政拨款保障资金', sourceId: 'G01',
    checks: [
      { label: '预算项目', result: 'ZYCD-2025-001-采购 → 存在', pass: true },
      { label: '预算余额', result: '4,278,517.50元，合同与预备费占用已登记 → 充足', pass: true },
      { label: '资金用途', result: '应急物资采购 → 匹配政府财政拨款保障资金', pass: true },
      { label: '三方主体', result: '合同主体、发票主体、收款账户均为S2 → 一致', pass: true },
      { label: '支付期限', result: '验收合格后7日内 → 待验收后执行', pass: true },
    ],
    conclusion: '进入验收后付款队列',
    status: 'queued',
  },
  {
    id: 'PAY-02', contract: 'ZC-2025-001', subject: '生活保障物资应急零售/框架协议直采付款（饮用水629箱、食品1,704箱）', amount: 149397.5,
    source: '政府财政拨款保障资金', sourceId: 'G01',
    checks: [
      { label: '合同流依据', result: '框架协议或采购审批单+订单 → 齐全', pass: true },
      { label: '价格核验', result: '饮用水23.5元/箱、食品79元/箱，与直采控制价一致', pass: true },
      { label: '批次保质期', result: '到货批次保质期符合应急发放要求', pass: true },
      { label: '票据凭证', result: '零售发票或小票、订单与销售凭证齐全', pass: true },
      { label: '资金来源', result: '不使用限定性食品捐赠和特殊人群保障资金 → 合规', pass: true },
    ],
    conclusion: '进入验收后付款队列，与合同采购分账核验不得混同',
    status: 'queued',
  },
  {
    id: 'PAY-03', contract: 'HT-2025-003', subject: 'HT-2025-003紧急分单合同付款', amount: 135000,
    source: '政府协同保障资金（预备费项目）', sourceId: 'G01',
    checks: [
      { label: '货物金额', result: '150顶 × 880元/顶 = 132,000元', pass: true },
      { label: '车辆应急增加成本', result: '2辆 × 6小时 × 180元/车小时 = 2,160元', pass: true },
      { label: '装卸人工增加成本', result: '6人 × 4小时 × 35元/人小时 = 840元', pass: true },
      { label: '资金来源', result: '政府协同保障资金中的预备费项目 → 匹配', pass: true },
      { label: '支付条件', result: '帐篷及应急运输、装卸服务全部验收后7日内付款', pass: true },
    ],
    conclusion: '进入验收后付款队列',
    status: 'queued',
  },
  {
    id: 'PAY-04', contract: '车辆维修', subject: '救援车辆维修费', amount: 30000,
    source: '拟使用D01限定性捐赠', sourceId: 'D01',
    checks: [
      { label: '预算项目', result: 'ZYCD-2025-001-运输 → 存在', pass: true },
      { label: '预算余额', result: '充足', pass: true },
      { label: '资金用途', result: '车辆维修 → 待御洪星校验资金用途标签', pass: false },
    ],
    conclusion: '资金用途待校验',
    status: 'pending',
  },
]

export const paymentFormulas = ['XLOOKUP匹配资金用途', 'SUMIFS计算剩余余额', 'IF判断是否满足支付条件', '条件格式标记错配']

// 任务3：第三次突发事件——限定性捐赠用途错配（D01→U01）
export const fundMismatchIncident = {
  alert: '检测到资金用途错配！付款申请4（车辆维修30,000元）拟使用D01限定性捐赠资金，但D01限定用于甲3、甲6网格食品采购，用途不一致！',
  agreement: '本笔捐赠限用于甲3、甲6网格受灾群众食品采购，不得挪作他用。',
  steps: [
    { id: 1, title: 'OCR识别付款申请字段', detail: '付款申请4用途为"救援车辆维修"，金额30,000元' },
    { id: 2, title: '匹配资金用途标签', detail: '原拟使用D01限定性捐赠（A企业食品企业捐赠30万元，限甲3/甲6食品采购）' },
    { id: 3, title: '发现用途不一致', detail: '车辆维修 ≠ 食品采购，违反限定性条款' },
    { id: 4, title: '暂停付款', detail: '冻结该笔付款申请' },
    { id: 5, title: '调取捐赠协议', detail: 'D01协议明确约定"限用于甲3、甲6网格受灾群众食品采购，不得挪作他用"' },
    { id: 6, title: '说明错配原因', detail: '资金核算风控岗在匹配付款来源时，误将限定性捐赠用于非食品用途' },
    { id: 7, title: '查询其他可用资金', detail: '非限定性捐赠余额880,000元（U01 68万 + U02 20万），政府协同保障资金余额充足' },
    { id: 8, title: '比较可用资金来源', detail: '非限定性捐赠与政府协同保障资金均可用于车辆维修，选择非限定性捐赠U01支付' },
    { id: 9, title: '重新选择合规资金来源', detail: '付款申请4资金来源由D01改为U01' },
    { id: 10, title: '重新计算各账户余额', detail: 'D01余额仍为30万元，U01余额由68万元减至65万元' },
  ],
  reviews: [
    { role: '应急预算绩效岗', text: '资金替换后不影响其他网格预算：D01仍用于甲3/甲6食品采购，U01余额65万元仍可覆盖其他非限定用途支出，不造成新的资金缺口' },
    { role: '采购成本保障岗', text: '确认车辆维修为救援必要支出：有维修合同、维修单和价格依据，金额30,000元合理' },
    { role: '财务主管统筹岗', text: '决定更换资金来源D01→U01，补充资金替换测算表，付款申请4重新进入付款流程' },
  ],
  outputs: ['资金错配预警单', '付款冻结记录', '资金替换测算表', '主管审核记录', '重新匹配结果'],
}

// 任务4：采购、调拨和捐赠物资验收入库（机器狗扫码采集、无人机影像存证）
export const acceptanceSections = [
  {
    id: 'HT-2025-001', title: 'HT-2025-001合同物资验收（S2）',
    rows: [
      { name: '帐篷（S2）', contract: '350顶', received: '350顶', qualified: '350顶', note: '300顶12小时内送达甲3、甲6，50顶24小时内到达补回甲1、甲2、甲8', pass: true },
      { name: '棉被', contract: '6,604床', received: '6,604床', qualified: '6,604床', note: '按合同到货验收合格', pass: true },
      { name: '救生衣', contract: '468件', received: '468件', qualified: '468件', note: '按合同到货验收合格', pass: true },
      { name: '急救包', contract: '324套', received: '324套', qualified: '324套', note: '按合同到货验收合格', pass: true },
    ],
  },
  {
    id: 'ZC-2025-001', title: '生活保障物资直采验收（应急零售/框架协议）',
    rows: [
      { name: '饮用水', contract: '629箱', received: '629箱', qualified: '629箱', note: '核验采购审批、即时/协议价格、订单或销售凭证、批次保质期后验收合格', pass: true },
      { name: '食品', contract: '1,704箱', received: '1,704箱', qualified: '1,704箱', note: '核验采购审批、即时/协议价格、订单或销售凭证、批次保质期后验收合格', pass: true },
    ],
  },
  {
    id: 'HT-2025-003', title: 'HT-2025-003紧急分单物资验收',
    rows: [
      { name: '帐篷（S1）', contract: '150顶', received: '150顶', qualified: '首次合格140顶', note: '10顶运输途中外观及防水涂层破损；首次合格率93.33%、不合格率6.67%', pass: false },
    ],
  },
  {
    id: 'transfer', title: '网格内部调拨验收',
    rows: [
      { name: '帐篷调拨', contract: '50顶', received: '50顶', qualified: '50顶', note: '甲1调出20顶、甲2调出15顶、甲8调出15顶，2小时内到达甲3、甲6；调拨单、出库单、运输记录和接收确认单齐全', pass: true },
    ],
  },
  {
    id: 'donation', title: '社会捐赠物资验收入库',
    rows: [
      { name: '饮用水', contract: '200箱', received: '200箱', qualified: '200箱', note: '全部到货验收合格', pass: true },
      { name: '食品', contract: '150箱', received: '150箱', qualified: '150箱', note: '全部到货验收合格', pass: true },
      { name: '棉被', contract: '100床', received: '100床', qualified: '100床', note: '全部到货验收合格', pass: true },
    ],
  },
]

export const acceptanceOutputs = ['HT-001验收单', 'HT-003验收单', '网格调拨验收单', '捐赠物资验收单', '质检记录', '无人机影像索引', '机器狗扫码记录']

// 任务5：四流匹配核验（合同流、物资流、票据流、资金流）
export const fourFlowItems = [
  { id: 1, name: 'S2帐篷（HT-001）', contract: '350顶 / 292,250元', goods: '验收350顶', invoice: '票据350顶', payment: '待付292,250元', anomaly: false },
  { id: 2, name: 'S1帐篷及应急服务（HT-003）', contract: '150顶货物132,000元 + 车辆2,160元 + 人工840元 = 135,000元', goods: '签收150顶，首次合格140顶', invoice: '票据135,000元', payment: '初步应付126,200元', anomaly: true, frozen: 8800 },
  { id: 3, name: '棉被（HT-001）', contract: '6,604床 / 422,656元', goods: '验收6,604床', invoice: '票据6,604床', payment: '待付422,656元', anomaly: false },
  { id: 4, name: '救生衣（HT-001）', contract: '468件 / 34,632元', goods: '验收468件', invoice: '票据468件', payment: '待付34,632元', anomaly: false },
  { id: 5, name: '急救包（HT-001）', contract: '324套 / 57,672元', goods: '验收324套', invoice: '票据324套', payment: '待付57,672元', anomaly: false },
  { id: 6, name: '饮用水（直采）', contract: '框架协议/采购审批单 629箱 / 14,781.50元', goods: '验收629箱', invoice: '零售发票或小票629箱', payment: '待付14,781.50元', anomaly: false },
  { id: 7, name: '食品（直采）', contract: '框架协议/采购审批单 1,704箱 / 134,616元', goods: '验收1,704箱', invoice: '零售发票或小票1,704箱', payment: '待付134,616元', anomaly: false },
  { id: 8, name: '网格调拨帐篷', contract: '调拨单50顶 / 不形成对外付款', goods: '甲1、甲2、甲8调出50顶，2小时到达', invoice: '出库单、运输记录、接收确认单', payment: '无对外付款', anomaly: false },
]

export const fourFlowDefinitions = [
  { flow: '合同流', checks: '合同主体、数量、单价和金额' },
  { flow: '物资流', checks: '到货、合格验收、调拨和发放' },
  { flow: '票据流', checks: '开票单位、金额和物资明细' },
  { flow: '资金流', checks: '付款申请、资金来源、支付金额和收款账户' },
]

// 任务6：第四次突发事件——紧急分单帐篷质量验收异常
export const qualityIncident = {
  alert: 'HT-2025-003合同显示150顶，电子签收150顶，发票按150顶开具，但质检仅有140顶合格，10顶存在外观和防水涂层破损。',
  frozenQty: 10,
  frozenAmount: 8800,
  payableAmount: 126200,
  steps: [
    { id: 1, role: '资金核算风控岗', title: '对比五方数据', detail: '合同150顶、签收150顶、票据150顶、合格140顶，差异10顶' },
    { id: 2, role: '资金核算风控岗', title: '计算异常货物金额', detail: '冻结金额 = 10顶 × 880元/顶 = 8,800元' },
    { id: 3, role: '资金核算风控岗', title: '计算初步可支付金额', detail: '合格货物140×880=123,200元 + 车辆应急2,160元 + 人工840元 = 126,200元' },
    { id: 4, role: '资金核算风控岗', title: '付款拆分', detail: 'HT-2025-003付款申请拆分为"可支付126,200元"和"冻结8,800元"，生成付款暂停记录' },
    { id: 5, role: '采购成本保障岗', title: '核查不合格原因', detail: '10顶为运输途中包装破损导致外观和防水涂层受损，不属于型号错误或数量短缺' },
    { id: 6, role: '采购成本保障岗', title: '发出整改通知', detail: '要求S1在6小时内无偿补货10顶并承担补货运输和再次验收费用；供应商动态评价扣5分' },
    { id: 7, role: '采购成本保障岗', title: '补货复验', detail: 'S1补货10顶到达，机器狗重新扫码、无人机记录到货位置，质检复验10顶全部合格' },
    { id: 8, role: '应急预算绩效岗', title: '测算总体影响', detail: '500顶首次合格490顶（98.0%），补货前由网格机动库存临时保障40人，整改后总体合格率100%' },
    { id: 9, role: '资金核算风控岗', title: '补货后重新四流匹配', detail: 'HT-003合同150顶、最终验收150顶、票据150顶、货款132,000元、应急运输人工3,000元、最终付款135,000元 → 一致' },
    { id: 10, role: '财务主管统筹岗', title: '放行冻结资金', detail: '审批后放行冻结的8,800元，记录首次异常、整改过程和最终一致状态' },
  ],
  decision: '先支付126,200元，冻结8,800元；补货复验合格后支付8,800元。供应商已无偿补货并承担整改费用，不另扣经济违约金，但履约评价扣5分并保留风险记录。',
  outputs: ['四流匹配异常单', '未验收金额测算表', '付款拆分单', '付款暂停记录', '供应商整改通知', '补货运输记录', '重新验收单', '付款放行审批单', '供应商履约扣分记录'],
}

// 任务7：会计核算与银行对账
export const accountingSteps = [
  { id: 1, title: '审核原始凭证', detail: '采购合同、验收单、发票、付款申请、捐赠协议、保险合同等' },
  { id: 2, title: '按资金性质分类', detail: '政府协同保障资金支出、限定性捐赠支出、非限定性捐赠支出、保险赔款收入（预计）' },
  { id: 3, title: '按项目编码归集', detail: `全部支出按项目编码${PROJECT_CODE}归集` },
  { id: 4, title: '登记资金台账与凭证', detail: '登记资金台账、生成记账凭证' },
  { id: 5, title: '银行对账', detail: '核对银行流水、识别未达账项、完成账表核对' },
]

export const journalEntries = [
  { id: 'VCH-101', date: '灾后22h', summary: 'HT-2025-001变更后合同货款', debit: '物资采购支出 807,210.00', credit: '银行存款 807,210.00', source: '政府财政拨款保障资金', status: '已复核' },
  { id: 'VCH-102', date: '灾后22h', summary: '生活保障物资应急零售/框架协议直采货款', debit: '物资采购支出 149,397.50', credit: '银行存款 149,397.50', source: '政府财政拨款保障资金', status: '已复核' },
  { id: 'VCH-103', date: '灾后23h', summary: 'HT-2025-003首笔可支付款项', debit: '物资采购支出 126,200.00', credit: '银行存款 126,200.00', source: '政府财政拨款保障资金（预备费）', status: '已复核' },
  { id: 'VCH-104', date: '复验后', summary: 'HT-2025-003冻结款放行支付', debit: '物资采购支出 8,800.00', credit: '银行存款 8,800.00', source: '政府财政拨款保障资金（预备费）', status: '待放行' },
  { id: 'VCH-105', date: '灾后23h', summary: '救援车辆维修费（资金来源已替换）', debit: '运输支出 30,000.00', credit: '银行存款 30,000.00', source: '非限定性捐赠U01', status: '已复核' },
]

export const bankReconciliation = {
  ledgerBalance: 4493330.5,
  bankBalance: 4502130.5,
  unrecordedItems: [
    { label: '企业已付、银行未达：HT-2025-003冻结款8,800元（放行后出账）', amount: 8800 },
  ],
  adjustedNote: '调节后账面余额与银行余额一致，账表核对完成',
}

export const accountingOutputs = ['原始凭证审核表', '项目支出台账', '记账凭证', '银行对账表', '资金余额表']

// 第三阶段移交
export const handoverStage3 = {
  fundRisk: ['实际支付金额', '各资金来源使用金额', '未支付金额'],
  procurement: ['实际采购单价', '实际采购数量', '实际运输费用', '履约情况'],
  next: '财务主管统筹岗启动复盘阶段',
}
