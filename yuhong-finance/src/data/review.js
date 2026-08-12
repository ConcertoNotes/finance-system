// 第四阶段（灾后复盘）：保险理赔、绩效评价、审计公开与参数回写

// 任务1：救援人员保险理赔（甲3网格救援人员腿部骨折）
export const insuranceClaim = {
  alert: '收到前方一名救援人员在甲3网格救援过程中受伤（腿部骨折）！',
  product: '保险II（高风险救援险）',
  medicalCost: 35000,
  deductible: 100,
  payoutRatio: 1,
  claimAmount: 34900,
  expectedClaim: 80000,
  claimDiff: 45100,
  steps: [
    { id: 1, title: '查询保险责任', detail: '保险II（高风险救援险）明确洪涝救援属于承保范围' },
    { id: 2, title: '判断承保范围', detail: '救援过程中受伤属于意外伤害，承保' },
    { id: 3, title: '检查报案时限', detail: '事故发生后24小时内报案，符合7天报案时限要求' },
    { id: 4, title: '整理理赔材料', detail: '事故证明由队长签字，医疗资料含诊断证明和费用清单，出勤记录来自救援队派单系统' },
    { id: 5, title: '测算预计赔款', detail: '医疗费用预计35,000元，免赔额100元，赔付比例100%，预计赔款34,900元' },
    { id: 6, title: '核对免赔与比例', detail: '赔款 = 35,000 − 100 = 34,900元' },
    { id: 7, title: '登记保险赔款', detail: '赔款34,900元登记入账' },
    { id: 8, title: '完成会计处理', detail: '借：银行存款 34,900；贷：营业外收入—保险赔款 34,900' },
  ],
  impact: '原预计保险赔款80,000元，实际34,900元，差额45,100元。项目通过红十字会补齐缺口后资金暂无缺口，不影响整体预算。',
}

// 任务2：预算执行差异分析
export const executionSummary = {
  budget: 4275091,
  actual: 4194750,
  unexecuted: 80341,
  executionRate: 98.12,
  deviationRate: 1.88,
  sources: [
    { label: '政府协同保障资金', amount: 2913300 },
    { label: '限定性捐赠', amount: 700000 },
    { label: '非限定性捐赠', amount: 546550 },
    { label: '保险赔款', amount: 34900 },
  ],
}

export const varianceItems = [
  { item: '帐篷货物', budget: 417500, actual: 424250, variance: 6750, direction: '不利', reason: '紧急分单S1单价880元高于S2的835元（价格差异）' },
  { item: '帐篷应急附加成本', budget: 0, actual: 3000, variance: 3000, direction: '不利', reason: '车辆应急2,160元+装卸人工840元（效率差异），与货物价差合计9,750元由预备费覆盖' },
  { item: '食品', budget: 134616, actual: 162616, variance: 28000, direction: '不利', reason: '灾情升级补货28,000元（数量差异）' },
  { item: '运输', budget: 190406, actual: 185406, variance: -5000, direction: '有利', reason: '路线优化节约5,000元' },
  { item: '保险保费', budget: 11000, actual: 11000, variance: 0, direction: '持平', reason: '按保险II方案执行，无差异' },
  { item: '保险赔款（资金来源）', budget: 80000, actual: 34900, variance: -45100, direction: '预测差异', reason: '属于资金来源预测差异，不计入救灾支出预算执行率' },
]

export const varianceCategories = [
  { type: '数量差异', cause: '灾情升级导致物资数量增加' },
  { type: '价格差异', cause: '紧急分单供应商单价变化' },
  { type: '效率差异', cause: '运费和装卸人工增加' },
  { type: '履约差异', cause: '10顶帐篷补货，费用由供应商承担，未增加项目支出' },
]

export const varianceOutputs = ['预算执行表', '价格-数量-效率差异分析表', '预备费执行表', '差异原因说明']

// 任务3：6维度20项绩效评价
export const performanceDimensions = [
  {
    id: 'budget', name: '预算维度', tone: 'gold',
    items: [
      { label: '预算执行率', formula: '4,194,750 ÷ 4,275,091 × 100%', value: '98.12%', good: true },
      { label: '预算偏差率', formula: '(4,275,091 − 4,194,750) ÷ 4,275,091 × 100%', value: '1.88%', good: true },
      { label: '预备费使用率', formula: '9,750 ÷ 376,000 × 100%', value: '2.59%（剩余366,250元）', good: true },
    ],
  },
  {
    id: 'procurement', name: '采购维度', tone: 'green',
    items: [
      { label: '初始S2帐篷价格偏差率', formula: '(835 − 846.25) ÷ 846.25 × 100%', value: '-1.33%', good: true },
      { label: '变更后帐篷货物平均单价', formula: '(350×835 + 150×880) ÷ 500', value: '848.50元/顶', good: true },
      { label: '变更后价格偏差率', formula: '(848.50 − 846.25) ÷ 846.25 × 100%', value: '0.27%', good: true },
      { label: '备选供应商遴选节约额', formula: '全选S3综合成本146,960 − 选S1综合成本135,000', value: '11,960元', good: true },
    ],
  },
  {
    id: 'fund', name: '资金维度', tone: 'cyan',
    items: [
      { label: '资金用途匹配率', formula: '限定性捐赠错配1笔已暂停并改用U01', value: '100%', good: true },
      { label: '资金及时支付率', formula: '8 ÷ 9 × 100%（1笔因用途错配暂停后补付）', value: '88.89%', good: false },
    ],
  },
  {
    id: 'fulfillment', name: '履约维度', tone: 'info',
    items: [
      { label: '变更后按时交付率', formula: '10 ÷ 10 × 100%，所有批次均在变更后合同节点内完成', value: '100%', good: true },
      { label: '首次帐篷验收合格率', formula: '490 ÷ 500 × 100%（补货后100%）', value: '98.0%', good: true },
      { label: '首次帐篷不合格率', formula: '10 ÷ 500 × 100%', value: '2.0%', good: true },
      { label: 'HT-003供应商整改及时率', formula: '1 ÷ 1 × 100%', value: '100%', good: true },
    ],
  },
  {
    id: 'benefit', name: '效益维度', tone: 'purple',
    items: [
      { label: '受益人数', formula: '9网格转移安置全覆盖', value: '8,100人', good: true },
      { label: '单位受益成本', formula: '4,194,750 ÷ 8,100', value: '517.87元/人', good: true },
      { label: '12小时重点帐篷保障完成率', formula: '500 ÷ 500 × 100%', value: '100%', good: true },
      { label: '各网格最低保障完成率', formula: '9 ÷ 9 × 100%', value: '100%', good: true },
    ],
  },
  {
    id: 'risk', name: '风控维度', tone: 'danger',
    items: [
      { label: '业务突发事件整改完成率', formula: '4项全部识别、4 ÷ 4 × 100%', value: '100%', good: true },
      { label: '四流匹配通过率', formula: '首次7 ÷ 8 = 87.5%，整改后8 ÷ 8', value: '首次87.5% → 整改后100%', good: true },
      { label: '预备费证据完备性', formula: '9,750元支出均具备异常预警、成本比较、合同变更和审批证据', value: '完备', good: true },
    ],
  },
]

export const collaborationReview = [
  { role: '采购成本保障岗', text: '完成价格基准、S1/S3运费和人工成本测算、规划求解及合同变更' },
  { role: '应急预算绩效岗', text: '完成影响人数、网格调拨、预备费和绩效测算' },
  { role: '资金核算风控岗', text: '完成资金来源、预算占用、付款拆分和四流匹配' },
  { role: '财务主管统筹岗', text: '在各岗位证据齐全后作出组合方案决策' },
]

export const performanceOutputs = ['项目绩效评价表', '9网格绩效对比表', '单位受益成本分析表', '预备费绩效表', '异常整改闭环表']

// 任务4：审计证据链和信息公开
export const auditChain = [
  '灾情数据', '响应判级', '预算方案', '采购申请', '价格比较', '采购合同',
  '验收入库', '票据', '付款', '会计凭证', '绩效结果',
]

export const auditFindings = [
  { id: 1, issue: '开具的发票抬头不规范', owner: '资金核算风控岗', fix: '对接供应商重开发票，重开发票已上传', status: '已整改' },
  { id: 2, issue: '配送运输单仅有司机签字，无对方公司盖章', owner: '采购成本保障岗', fix: '运输明细单补盖公章并上传', status: '已整改' },
  { id: 3, issue: '工时记录表未提供身份证复印件', owner: '应急预算绩效岗', fix: '联系救援队员补充资料并上传', status: '已整改' },
]

export const disclosureTiers = [
  {
    tier: '公众层', audience: '社会公众与捐赠人',
    items: ['捐赠资金总额 70万 + 88万 = 158万元', '主要使用方向：食品30万、帐篷棉被25万、其他103万', '受益人数8,100人', '物资发放9网格全覆盖'],
  },
  {
    tier: '监管层', audience: '主管部门与监管机构',
    items: ['预算执行率98.12%', '资金用途匹配率100%', '帐篷首次验收合格率98.0%（补货后100%）', '四流整改后通过率100%', '业务异常整改完成率100%'],
  },
  {
    tier: '内部层', audience: '内部管理与审计',
    items: ['S1、S2、S3报价及资质资料', 'S1/S3运费和人工成本测算', 'HT-001变更协议、HT-003紧急分单合同', '付款账户、原始凭证及4次突发事件风险记录'],
  },
]

export const disclosureNote = '身份证号、手机号、银行账号等敏感信息脱敏后公开。'

export const auditOutputs = ['审计底稿', '异常整改记录', '脱敏公开表', '项目绩效报告']

// 任务5：价值验证逆向优化（预算参数回写，阈值5%）
export const WRITEBACK_THRESHOLD = 5

export const parameterWritebacks = [
  {
    id: 'transport', name: '运输系数', original: 8.5, actual: 9.2, unit: '元/公里·辆',
    deviation: 8.2, action: 'update', newValue: 9.2,
    reason: '山区道路绕行导致实际成本高于原标准，偏差率8.2%超过回写阈值5%，更新运输系数',
  },
  {
    id: 'quality-loss', name: '帐篷质量损耗参数', original: 3, actual: 2, unit: '%',
    deviation: -33.33, action: 'weighted', newValue: 2.5,
    reason: '实际首次不合格率2%低于预计3%，绝对偏差超过阈值；考虑单次样本波动，按50%历史+50%本次加权：3%×50%+2%×50%=2.5%',
  },
  {
    id: 'water-price', name: '饮用水采购单价', original: 24, actual: 23.5, unit: '元/箱',
    deviation: -2.08, action: 'keep', newValue: 24,
    reason: '偏差率-2.08%未超过回写阈值5%，不更新',
  },
  {
    id: 'special-care', name: '特殊人群保障标准', original: 120, actual: 135, unit: '元/人',
    deviation: 12.5, action: 'update', newValue: 135,
    reason: '特殊人群实际保障成本高于普通人群，偏差率12.5%超过阈值，更新分类保障标准',
  },
  {
    id: 'grid-rule', name: '高优先级网格资金分配规则', original: null, actual: null, unit: '',
    deviation: 1.92, action: 'optimize', newValue: null,
    reason: '甲3单位受益成本527.79元/人高于项目平均517.87元/人（差异率1.92%）。优化规则：对高优先级网格设置动态预备费，按道路中断、特殊人群和供应链风险评分自动调整，不再固定追加10%',
  },
]

export const writebackSkills = ['对比预算参数和实际参数', '计算偏差率', '判断是否超过回写阈值', '更新预算参数库', '使用新参数重新模拟下一次救援预算']

export const closedLoop = ['实际执行结果', '绩效评价', '发现预算参数偏差', '修正参数', '提高下一次预算准确性']

export const stage4Summary = '第四阶段完成救援人员保险理赔（赔款34,900元）、预算执行差异分析（实际支付419.475万元、执行率98.12%、偏差率1.88%）、6维度20项绩效评价；对9,750元预备费支出完成价格、运费和人工成本追踪；帐篷首次验收合格率98.0%、补货后100%，四流整改后通过率100%；完成审计证据链归集、3条审计异常整改、分层信息公开和预算参数回写，实现预算、采购、合同、调拨、验收、支付和绩效数据闭环。'
