import test from 'node:test'
import assert from 'node:assert/strict'

test('四个默认岗位切换到各自的核心工作台', async () => {
  const { getRoleHomeView } = await import('../src/domain/roleWorkspace.js').catch(() => ({}))
  assert.equal(typeof getRoleHomeView, 'function')
  assert.equal(getRoleHomeView('finance-lead'), 'dashboard')
  assert.equal(getRoleHomeView('procurement'), 'procurement')
  assert.equal(getRoleHomeView('budget-performance'), 'budget')
  assert.equal(getRoleHomeView('fund-risk'), 'funds')
})

test('新增岗位默认进入应急协同工作台', async () => {
  const { getRoleHomeView } = await import('../src/domain/roleWorkspace.js').catch(() => ({}))
  assert.equal(typeof getRoleHomeView, 'function')
  assert.equal(getRoleHomeView('custom-audit'), 'collaboration')
})
