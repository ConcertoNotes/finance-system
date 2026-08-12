import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyWorkflowAction,
  buildComplianceReport,
  buildContractChangeReport,
  buildFundSwapReport,
  buildInsuranceReport,
  buildLedgerActivationReport,
  buildQualityReleaseReport,
  buildQualityReport,
  createWorkflowState,
} from '../src/domain/workflowArtifacts.js'

test('专项账套启用后形成可审计记录', () => {
  const state = applyWorkflowAction(createWorkflowState(), 'activate-ledger', {
    ledgerName: '洪涝救援专项账套',
    accountingPeriod: '2026-08',
    operator: '财务主管统筹岗',
  })

  assert.equal(state.ledger.status, 'active')
  assert.equal(state.ledger.accountingPeriod, '2026-08')
  assert.match(buildLedgerActivationReport(state.ledger), /需求-物资-资金-凭证/)
  assert.match(buildLedgerActivationReport(state.ledger), /5601\.03/)
})

test('数据质量和合规报告包含 Excel 的核查依据', () => {
  const quality = buildQualityReport()
  const compliance = buildComplianceReport()

  for (const text of ['COUNTBLANK(B2:K10) = 0', '3σ', '甲3 156mm', 'XLOOKUP']) {
    assert.match(quality, new RegExp(text.replace(/[()]/g, '\\$&')))
  }
  for (const text of ['95%', '采集合规', '清洗规范', '建模准确', '策略合规']) {
    assert.match(compliance, new RegExp(text))
  }
})

test('响应审批和保险审批保留岗位与审批状态', () => {
  let state = createWorkflowState()
  state = applyWorkflowAction(state, 'approve-response', { approver: '财务主管统筹岗', level: 'III', planId: 'B' })
  state = applyWorkflowAction(state, 'submit-insurance', { submitter: '采购成本保障岗', productId: 'II' })
  state = applyWorkflowAction(state, 'approve-insurance', { approver: '财务主管统筹岗' })

  assert.equal(state.responseApproval.status, 'approved')
  assert.equal(state.insuranceApproval.status, 'approved')
  assert.match(buildInsuranceReport(state.insuranceApproval), /74\.45/)
  assert.match(buildInsuranceReport(state.insuranceApproval), /11,000/)
})

test('三次突发事件处置动作生成对应单据', () => {
  let state = createWorkflowState()
  assert.equal(state.contractChange.status, 'pending')
  assert.equal(state.fundSwap.status, 'pending')
  assert.equal(state.qualityHold.status, 'pending')

  state = applyWorkflowAction(state, 'resolve-contract-change', { approver: '财务主管统筹岗' })
  state = applyWorkflowAction(state, 'resolve-fund-swap', { approver: '财务主管统筹岗' })
  state = applyWorkflowAction(state, 'release-quality-hold', { approver: '财务主管统筹岗' })

  assert.equal(state.contractChange.status, 'resolved')
  assert.equal(state.fundSwap.status, 'resolved')
  assert.equal(state.qualityHold.status, 'released')

  const changeReport = buildContractChangeReport(state.contractChange)
  assert.match(changeReport, /807,210/)
  assert.match(changeReport, /942,210/)
  assert.match(changeReport, /149,397\.50/)
  assert.match(changeReport, /1,091,607\.50/)
  assert.match(changeReport, /9,750/)
  assert.match(changeReport, /MinZ = 880·x1 \+ 968·x3 \+ 3000·y1 \+ 1760·y3/)
  assert.match(changeReport, /11,960/)

  const swapReport = buildFundSwapReport(state.fundSwap)
  assert.match(swapReport, /D01/)
  assert.match(swapReport, /U01/)
  assert.match(swapReport, /650,000/)

  const releaseReport = buildQualityReleaseReport(state.qualityHold)
  assert.match(releaseReport, /126,200/)
  assert.match(releaseReport, /8,800/)
  assert.match(releaseReport, /135,000/)
})

