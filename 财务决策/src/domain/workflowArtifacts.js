import { complianceChecks, cleaningSteps } from '../data/disaster.js'
import { insuranceProducts } from '../data/procurement.js'
import { ledgerAccounts } from '../data/funds.js'

export const WORKFLOW_STATE_KEY = 'yuhong-workflow-state'

export function createWorkflowState() {
  return {
    ledger: { status: 'pending', ledgerName: '洪涝救援专项账套', accountingPeriod: '2026-08', operator: '', activatedAt: '' },
    responseApproval: { status: 'pending', approver: '', level: '', planId: '', approvedAt: '' },
    insuranceApproval: { status: 'draft', submitter: '', approver: '', productId: 'II', submittedAt: '', approvedAt: '' },
    contractChange: { status: 'pending', approver: '', resolvedAt: '' },
    fundSwap: { status: 'pending', approver: '', resolvedAt: '' },
    qualityHold: { status: 'pending', approver: '', releasedAt: '' },
  }
}

export function loadWorkflowState(storage) {
  const fallback = createWorkflowState()
  try {
    const stored = JSON.parse(storage.getItem(WORKFLOW_STATE_KEY) || '{}')
    return {
      ledger: { ...fallback.ledger, ...stored.ledger },
      responseApproval: { ...fallback.responseApproval, ...stored.responseApproval },
      insuranceApproval: { ...fallback.insuranceApproval, ...stored.insuranceApproval },
      contractChange: { ...fallback.contractChange, ...stored.contractChange },
      fundSwap: { ...fallback.fundSwap, ...stored.fundSwap },
      qualityHold: { ...fallback.qualityHold, ...stored.qualityHold },
    }
  } catch {
    return fallback
  }
}

export function saveWorkflowState(storage, state) {
  storage.setItem(WORKFLOW_STATE_KEY, JSON.stringify(state))
}

export function applyWorkflowAction(state, action, payload = {}) {
  const timestamp = payload.timestamp || new Date().toISOString()
  if (action === 'activate-ledger') {
    return { ...state, ledger: { ...state.ledger, ...payload, status: 'active', activatedAt: timestamp } }
  }
  if (action === 'approve-response') {
    return { ...state, responseApproval: { ...state.responseApproval, ...payload, status: 'approved', approvedAt: timestamp } }
  }
  if (action === 'submit-response') {
    return { ...state, responseApproval: { ...state.responseApproval, ...payload, status: 'submitted', submittedAt: timestamp } }
  }
  if (action === 'submit-insurance') {
    return { ...state, insuranceApproval: { ...state.insuranceApproval, ...payload, status: 'submitted', submittedAt: timestamp } }
  }
  if (action === 'approve-insurance') {
    return { ...state, insuranceApproval: { ...state.insuranceApproval, ...payload, status: 'approved', approvedAt: timestamp } }
  }
  if (action === 'resolve-contract-change') {
    return { ...state, contractChange: { ...state.contractChange, ...payload, status: 'resolved', resolvedAt: timestamp } }
  }
  if (action === 'resolve-fund-swap') {
    return { ...state, fundSwap: { ...state.fundSwap, ...payload, status: 'resolved', resolvedAt: timestamp } }
  }
  if (action === 'release-quality-hold') {
    return { ...state, qualityHold: { ...state.qualityHold, ...payload, status: 'released', releasedAt: timestamp } }
  }
  return state
}

function formatTime(value) {
  if (!value) return '待生成'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
}

export function buildLedgerActivationReport(ledger) {
  const accounts = ledgerAccounts.map((item) => `${item.code}  ${item.name}（${item.direction}）`).join('\n')
  return `专项账套启用单
单据编号：LEDGER-F-20260803
账套名称：${ledger.ledgerName}
会计期间：${ledger.accountingPeriod}
启用岗位：${ledger.operator || '财务主管统筹岗'}
启用时间：${formatTime(ledger.activatedAt)}

专项核算科目
${accounts}

联动规则：需求-物资-资金-凭证四链联动
控制结论：账实相符，全程可溯，可用于后续审计与信息披露。`
}

export function buildQualityReport() {
  return `灾情数据质量校验单
单据编号：DQ-F-20260803
数据范围：甲1至甲9，共9个网格
数据来源：应急管理局平台、气象局平台、蓝天救援队、无人机巡航

${cleaningSteps.map((item, index) => `${index + 1}. ${item.title}：${item.detail}${item.id === 5 ? '；XLOOKUP基础信息匹配通过' : ''}`).join('\n')}

质量结论：完整率100%，及时率100%，异常记录0，未核验网格0，无人机影像匹配9/9。`
}

export function buildComplianceReport() {
  return `数据建模合规检测报告
报告编号：CMP-F-20260803
合规阈值：95%
依据：自然灾害救助条例、应急物资保障管理办法

${complianceChecks.map((item) => `${item.label}：${item.score}%｜${item.basis}`).join('\n')}

检测结论：四维全部通过，可视化图表与数据维度100%匹配，无合规风险，准予同步预算系统与财经决策驾驶舱。`
}

export function buildInsuranceReport(approval) {
  const product = insuranceProducts.find((item) => item.id === (approval.productId || 'II')) || insuranceProducts[1]
  return `救援人员保险比选报告
报告编号：INS-F-20260803
提交岗位：${approval.submitter || '采购成本保障岗'}
审批岗位：${approval.approver || '财务主管统筹岗'}
审批状态：${approval.status === 'approved' ? '审核通过' : approval.status === 'submitted' ? '待审批' : '草稿'}

推荐方案：保险${product.id}（${product.name}）
综合得分：74.45分
投保人数：50人
人均保费：${product.premium}元
总保费：${(product.premium * 50).toLocaleString('zh-CN')}元
承保范围：${product.coverageText}
理赔资料：${product.claims}
等待期：${product.waitingDays}天
赔付时效：${product.payoutDays}天

预算影响：保险III比保险II多支出3,000元，占C方案预算0.07%。
资金来源：政府协同保障资金。`
}

export function buildResponseApprovalReport(approval) {
  return `响应等级审批记录
记录编号：RSP-F-20260803
建议岗位：应急预算绩效岗
审批岗位：${approval.approver || '财务主管统筹岗'}
审批状态：${approval.status === 'approved' ? '审核通过' : approval.status === 'submitted' ? '待审批' : '待提交'}
响应等级：${approval.level || 'III'}级
对应方案：${approval.planId || 'B'}方案
预算上限：${(approval.planId || 'B') === 'C' ? '4,275,091' : '2,909,004'}元
预备费：${(approval.planId || 'B') === 'C' ? '376,000元' : '10%（约290,000元）'}

复核结论：数据来源合规，9个网格采集时间一致，五项硬性阈值判级逻辑成立。`
}

export function buildContractChangeReport(contractChange) {
  return `HT-2025-001合同变更单 / HT-2025-003紧急分单合同
单据编号：CHG-F-20260803
审批状态：${contractChange.status === 'resolved' ? '审批通过' : '待审批'}
审批岗位：${contractChange.approver || '财务主管统筹岗'}
审批时间：${formatTime(contractChange.resolvedAt)}

一、突发事件
S2仓库局部进水及车辆调度冲突，原合同500顶帐篷仅300顶可12小时内交付，
50顶24小时内交付，150顶暂时无法保障。经交叉核验属实，非虚假库存或恶意拒绝履约。

二、分单组合优化（混合整数规划）
目标函数 MinZ = 880·x1 + 968·x3 + 3000·y1 + 1760·y3
约束 x1+x3=150、0≤x1≤150·y1、0≤x3≤200·y3、x1与x3为非负整数、y1与y3为0-1变量、到货≤12小时
车辆应急调度与装卸人工属订单级固定成本，仅在启用该供应商时发生，不按采购量线性分摊
方案A（S1 150顶）135,000元 < 方案B 141,160元 < 方案C 145,560元 < 方案D（S3 150顶）146,960元
规划求解结果 x1=150、x3=0、y1=1、y3=0，相较全部选择S3节约11,960元

三、处置组合（三方案比较后采用）
S2保留350顶（300顶12h + 50顶24h）
S1紧急分单150顶（8小时到达，HT-2025-003）
甲1/甲2/甲8临时调拨50顶（2小时到达，24小时内补回）
12小时到位量 = 300 + 150 + 50 = 500顶，重点保障完成率100%

四、合同变更
HT-2025-001：帐篷500顶→350顶，减少金额125,250元，变更后807,210元
（棉被6,604床、救生衣468件、急救包324套的数量、单价、质量标准与付款条件不变）
HT-2025-003：货物132,000元 + 车辆应急2,160元 + 装卸人工840元 = 135,000元
两份合同合计942,210元；食品、饮用水应急零售/框架协议直采149,397.50元不受本次变更影响
采购执行合计1,091,607.50元，较原方案增加9,750元，全部从C方案预备费列支
预备费使用率2.59%，阶段性余额366,250元
变更后500顶综合平均成本854.50元/顶，剔除应急运输人工后货物均价848.50元/顶，与846.25元基准偏差0.27%

五、控制要求
HT-001由S2履行，HT-003由S1履行，S3未中选但保留为极端情况下的备用供应商。
后续按新合同分别完成验收、票据和付款核验，不得合并付款；
食品、饮用水按框架协议或采购审批单、订单凭证、到货验收、发票及付款记录分项核验；
网格调拨50顶不形成对外付款，但须形成出库单、调拨单、运输记录和接收确认单。
资金来源为政府财政拨款保障资金，不使用限定性食品捐赠和特殊人群保障资金。`
}

export function buildFundSwapReport(fundSwap) {
  return `资金替换测算表（付款申请4）
单据编号：SWP-F-20260803
审批状态：${fundSwap.status === 'resolved' ? '审批通过' : '待审批'}
审批岗位：${fundSwap.approver || '财务主管统筹岗'}
审批时间：${formatTime(fundSwap.resolvedAt)}

一、错配情况
付款申请4（救援车辆维修30,000元）拟使用D01限定性捐赠，
D01协议约定"限用于甲3、甲6网格受灾群众食品采购，不得挪作他用"，
车辆维修 ≠ 食品采购，违反限定性条款，已暂停付款。

二、替换方案
资金来源由D01改为U01（非限定性捐赠，线上公益平台）。
D01余额仍为300,000元；U01余额由680,000元减至650,000元。

三、影响评估
D01仍用于甲3/甲6食品采购；U01余额仍可覆盖其他非限定用途支出，
不造成新的资金缺口，不影响其他网格预算。

四、整改动作
资金错配预警单、付款冻结记录、主管审核记录、重新匹配结果已归档。`
}

export function buildQualityReleaseReport(qualityHold) {
  return `付款拆分与放行审批单（HT-2025-003）
单据编号：QRL-F-20260803
审批状态：${qualityHold.status === 'released' ? '冻结款已放行' : '冻结中'}
审批岗位：${qualityHold.approver || '财务主管统筹岗'}
放行时间：${formatTime(qualityHold.releasedAt)}

一、异常情况
合同150顶、签收150顶、票据150顶，首次质检合格140顶，
10顶运输途中外观和防水涂层破损，差异10顶。

二、付款拆分
可支付 = 140顶 × 880元 + 车辆应急2,160元 + 人工840元 = 126,200元
冻结 = 10顶 × 880元 = 8,800元

三、整改与复验
S1在6小时内无偿补货10顶并承担补货运输和再次验收费用，复验全部合格。
整改后四流匹配：合同150顶、验收150顶、票据150顶、付款135,000元 → 一致。

四、处理结论
先支付126,200元；补货复验合格后放行8,800元。
不另扣经济违约金，供应商履约评价扣5分并保留风险记录。`
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
