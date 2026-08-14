import assert from 'node:assert/strict'
import test from 'node:test'

import { roles } from '../src/data/roles.js'
import { allTasksInOrder, getRoleSteps, getTask, getTaskSeq, getTasksByRole, tasks } from '../src/data/tasks.js'

const roleIds = roles.map((role) => role.id)

test('共 14 个任务，前 8 个来自第一阶段（含补充表）、后 6 个来自第二份', () => {
  assert.equal(tasks.length, 14)
  assert.equal(tasks.filter((t) => t.stage === 1).length, 8)
  assert.equal(tasks.filter((t) => t.stage === 2).length, 6)
})

test('全流程任务号连续 1—14，第二份工作簿的任务1接续为任务9', () => {
  assert.deepEqual(
    allTasksInOrder.map((task) => task.seq),
    Array.from({ length: 14 }, (_, i) => i + 1),
  )
  assert.equal(allTasksInOrder.find((task) => task.key === 's2-t1').seq, 9)
  assert.equal(allTasksInOrder.find((task) => task.key === 's2-t6').seq, 14)
})

test('岗位内任务号从 1 连续排到本岗位任务总数', () => {
  for (const roleId of roleIds) {
    const list = getTasksByRole(roleId)
    assert.deepEqual(
      list.map((task) => task.seq),
      list.map((_, i) => i + 1),
    )
  }
})

test('同一任务在不同岗位下有各自的岗位内编号', () => {
  // 阶段二突发事件处置：统筹岗第 7 项、采购岗第 8 项、风控岗第 4 项
  assert.equal(getTaskSeq('finance-lead', 's2-t5'), 7)
  assert.equal(getTaskSeq('procurement', 's2-t5'), 8)
  assert.equal(getTaskSeq('fund-risk', 's2-t5'), 4)
})

test('第一份工作簿的任务标题与原文一致', () => {
  const titles = tasks
    .filter((task) => task.stage === 1)
    .sort((a, b) => a.no - b.no)
    .map((task) => task.title)
  assert.deepEqual(titles, [
    '启用洪涝应急救援专项账套',
    '搭建洪涝应急救援数据采集系统',
    '数据建模分析合规性检测',
    '救援人员保险方案比较',
    '将灾情数据转换为成本动因',
    '编制A、B、C三受灾等级预算',
    'B方案预算审批',
    '第一次突发事件——受灾人数突然增加',
  ])
})

test('任务归属与工作表一致', () => {
  assert.equal(getTask('s1-t1').owner, 'finance-lead')
  assert.equal(getTask('s1-t2').owner, 'procurement')
  assert.equal(getTask('s1-t3').owner, 'finance-lead')
  assert.equal(getTask('s1-t4').owner, 'procurement')
  assert.equal(getTask('s1-t5').owner, 'budget-performance')
  assert.equal(getTask('s1-t6').owner, 'budget-performance')
  assert.equal(getTask('s1-t7').owner, 'finance-lead')
  assert.equal(getTask('s1-t8').owner, 'budget-performance')
})

test('资金核算风控岗承担补充表突发事件与后 4 项阶段二任务', () => {
  const list = getTasksByRole('fund-risk')
  assert.equal(list.length, 5)
  assert.equal(list[0].key, 's1-t8')
  assert.ok(list.slice(1).every((task) => task.stage === 2))
})

test('每个岗位的任务数与工作簿分工一致', () => {
  assert.equal(getTasksByRole('finance-lead').length, 8)
  assert.equal(getTasksByRole('procurement').length, 9)
  assert.equal(getTasksByRole('budget-performance').length, 7)
  assert.equal(getTasksByRole('fund-risk').length, 5)
})

test('岗位任务顺序为第一份工作簿在前、第二份在后', () => {
  for (const roleId of roleIds) {
    const list = getTasksByRole(roleId)
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1]
      const curr = list[i]
      assert.ok(prev.stage < curr.stage || (prev.stage === curr.stage && prev.no < curr.no))
    }
  }
})

test('突发事件处置为四岗协同的 16 步流程加统筹岗决策', () => {
  const task = getTask('s2-t5')
  assert.deepEqual([...task.roles].sort(), [...roleIds].sort())
  assert.equal(task.stepCount, 17)
  const labels = task.steps.map((step) => step.label)
  assert.ok(labels.includes('第一步'))
  assert.ok(labels.includes('第十六步'))
  assert.ok(labels.includes('决策'))
})

test('突发事件处置第十六步由采购岗切换为网格物资调度专员', () => {
  const step = getTask('s2-t5').steps.find((item) => item.label === '第十六步')
  assert.equal(step.roleId, 'procurement')
  assert.equal(step.subRole, '网格物资调度专员')
})

test('每个岗位在其任务中都有可展示的步骤', () => {
  for (const roleId of roleIds) {
    for (const task of getTasksByRole(roleId)) {
      assert.ok(getRoleSteps(task, roleId).length > 0, `${roleId} 在 ${task.key} 无步骤`)
    }
  }
})

test('所有步骤都有内容块且块类型在已知集合内', () => {
  const known = new Set(['text', 'label', 'sub', 'path', 'action', 'speech', 'formula', 'note', 'code', 'list', 'fields', 'table'])
  for (const task of tasks) {
    for (const step of task.steps) {
      assert.ok(step.blocks.length > 0, `${step.id} 无内容块`)
      for (const block of step.blocks) {
        assert.ok(known.has(block.t), `未知块类型 ${block.t} @ ${step.id}`)
      }
    }
  }
})

test('启用专项账套保留关键配置与内控规则原文', () => {
  const text = JSON.stringify(getTask('s1-t1'))
  assert.ok(text.includes('HJ-2026-001'))
  assert.ok(text.includes('洪涝应急救援专项账套'))
  assert.ok(text.includes('用途强制校验'))
  assert.ok(text.includes('四流数据不一致'))
})

test('合规性检测保留两层检测的关键口径', () => {
  const text = JSON.stringify(getTask('s1-t3'))
  assert.ok(text.includes('一票否决'))
  assert.ok(text.includes('95%'))
  for (const code of ['C01', 'C02', 'C03', 'C04', 'C05', 'C06']) {
    assert.ok(text.includes(code), `缺少合规项 ${code}`)
  }
})

test('突发事件处置输出清单来自统筹岗原文', () => {
  const outputs = getTask('s2-t5').outputs
  assert.equal(outputs.length, 15)
  assert.ok(outputs.includes('规划求解结果表'))
  assert.ok(outputs.includes('HT-003紧急采购合同'))
})

test('每个任务都绑定了演算面板', () => {
  for (const task of tasks) {
    assert.ok(task.panel, `${task.key} 缺少 panel`)
  }
})

test('补充表任务保留 ABC 预算、B 方案审批与二次灾情关键口径', () => {
  const abc = JSON.stringify(getTask('s1-t6'))
  assert.ok(abc.includes('2816906'))
  assert.ok(abc.includes('2909004'))
  assert.ok(abc.includes('4278517.5'))

  const approval = JSON.stringify(getTask('s1-t7'))
  assert.ok(approval.includes('125.82%'))
  assert.ok(approval.includes('2,909,004'))
  assert.ok(approval.includes('III级'))

  const wave = getTask('s1-t8')
  assert.deepEqual([...wave.roles].sort(), [...roleIds].sort())
  const text = JSON.stringify(wave)
  assert.ok(text.includes('258517.50') || text.includes('258,517.50'))
  assert.ok(text.includes('93.96%'))
  assert.ok(text.includes('甲3'))
  assert.ok(text.includes('甲6'))
})
