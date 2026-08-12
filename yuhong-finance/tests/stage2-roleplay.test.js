import test from 'node:test'
import assert from 'node:assert/strict'

import { assistantRole, defaultRoles } from '../src/data/roles.js'
import { rehearsalStages, rehearsalTasks } from '../src/data/rehearsal.js'
import { stage1RoleTasks } from '../src/data/stage1Roleplay.js'
import { stage2RoleTasks } from '../src/data/stage2Roleplay.js'
import {
  allRoleTasks, getRoleTaskById, getRoleTasksByIds, getRoleTasksByView, getStageHandover,
  getTasksByRole, stageHandovers,
} from '../src/data/roleplay.js'

test('第一阶段任务台账覆盖工作表内的任务1至任务8', () => {
  assert.equal(stage1RoleTasks.length, 8)
  assert.deepEqual(stage1RoleTasks.map((task) => task.no), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(stage1RoleTasks.map((task) => task.id), [1, 2, 3, 4, 5, 6, 7, 8])
})

test('第二阶段任务台账覆盖工作表内的任务1至任务6', () => {
  assert.equal(stage2RoleTasks.length, 6)
  assert.deepEqual(stage2RoleTasks.map((task) => task.no), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(stage2RoleTasks.map((task) => task.id), [9, 10, 11, 12, 13, 14])
})

test('台账任务编号与阶段演练前两阶段任务一一对应', () => {
  const stage1 = rehearsalStages.find((stage) => stage.id === 1)
  const stage2 = rehearsalStages.find((stage) => stage.id === 2)
  assert.deepEqual(stage1RoleTasks.map((task) => task.id), stage1.taskIds)
  assert.deepEqual(stage2RoleTasks.map((task) => task.id), stage2.taskIds)
  allRoleTasks.forEach((task) => {
    assert.ok(rehearsalTasks.some((item) => item.id === task.id), `任务 ${task.id} 应存在于演练任务表`)
  })
})

test('所有发言均归属已注册岗位或数字人，且带原文行区间', () => {
  const actorIds = [...defaultRoles.map((role) => role.id), assistantRole.id]
  allRoleTasks.forEach((task) => {
    assert.ok(task.posts.length > 0, `任务${task.id} 应至少有一个岗位发言`)
    assert.ok(task.summary, `任务${task.id} 应有摘要`)
    task.posts.forEach((post) => {
      assert.ok(actorIds.includes(post.roleId), `未知岗位 ${post.roleId}`)
      assert.match(post.source, /A\d+—A\d+$/)
      assert.ok(post.lines.length > 0)
      post.lines.forEach((line) => assert.ok(line.text || line.formula, '每行须有正文或公式'))
    })
  })
})

test('第二阶段任务1、任务2 为采购岗独立完成，任务3至任务6 四岗位齐备', () => {
  const rolesOf = (no) => [...new Set(stage2RoleTasks.find((task) => task.no === no).posts.map((post) => post.roleId))]
  assert.deepEqual(rolesOf(1), ['procurement'])
  assert.deepEqual(rolesOf(2), ['procurement'])
  for (const no of [3, 4, 5, 6]) {
    assert.equal(rolesOf(no).length, 4, `任务${no} 应有四个岗位参与`)
  }
})

test('第一阶段突发事件任务由御洪星预警并汇集四个岗位', () => {
  const incident = stage1RoleTasks.find((task) => task.no === 7)
  assert.equal(incident.posts[0].roleId, 'yuhong-star')
  const roles = new Set(incident.posts.map((post) => post.roleId))
  for (const roleId of ['finance-lead', 'budget-performance', 'fund-risk', 'procurement', 'yuhong-star']) {
    assert.ok(roles.has(roleId), `任务7 应包含 ${roleId}`)
  }
})

test('第二阶段突发事件保留采购岗切换网格物资调度专员的副岗记录', () => {
  const incident = stage2RoleTasks.find((task) => task.no === 5)
  const subRolePost = incident.posts.find((post) => post.subRole)
  assert.equal(subRolePost.subRole, '网格物资调度专员')
  assert.equal(subRolePost.roleId, 'procurement')
})

test('每个任务都锚定到业务视图，且与演练任务的目标视图一致', () => {
  allRoleTasks.forEach((task) => {
    assert.ok(task.view, `任务${task.id} 应有视图锚点`)
    const rehearsal = rehearsalTasks.find((item) => item.id === task.id)
    assert.equal(task.view, rehearsal.targetView, `任务${task.id} 视图锚点应与演练目标视图一致`)
  })
})

test('按视图与标签取任务：采购页五个业务标签加保险比选', () => {
  assert.deepEqual(getRoleTasksByView('procurement', 'demand').map((task) => task.id), [9])
  assert.deepEqual(getRoleTasksByView('procurement', 'contracts').map((task) => task.id), [12, 14])
  assert.deepEqual(getRoleTasksByView('procurement', 'incident').map((task) => task.id), [13])
  assert.deepEqual(getRoleTasksByView('procurement', 'insurance').map((task) => task.id), [8])
  assert.deepEqual(getRoleTasksByView('data').map((task) => task.id), [2, 3])
  assert.deepEqual(getRoleTasksByView('budget', 'drivers').map((task) => task.id), [4])
  assert.deepEqual(getRoleTasksByView('budget', 'scenarios').map((task) => task.id), [5])
  assert.deepEqual(getRoleTasksByView('budget', 'response').map((task) => task.id), [6])
  assert.deepEqual(getRoleTasksByView('dashboard').map((task) => task.id), [7])
  assert.deepEqual(getRoleTasksByView('funds', 'overview').map((task) => task.id), [1])
  assert.deepEqual(getRoleTasksByView('funds', 'payments'), [])
})

test('按岗位取任务索引时只保留该岗位自己的发言', () => {
  const fundRisk = getTasksByRole('fund-risk')
  assert.deepEqual(fundRisk.map((task) => task.id), [7, 11, 12, 13, 14])
  fundRisk.forEach((task) => task.posts.forEach((post) => assert.equal(post.roleId, 'fund-risk')))

  const procurement = getTasksByRole('procurement')
  assert.deepEqual(procurement.map((task) => task.id), [2, 7, 8, 9, 10, 11, 12, 13, 14])

  const assistant = getTasksByRole('yuhong-star')
  assert.deepEqual(assistant.map((task) => task.id), [3, 6, 7])
})

test('按编号取任务可跨阶段命中', () => {
  assert.equal(getRoleTaskById(4).title, '将灾情数据转换为成本动因')
  assert.equal(getRoleTaskById(13).title, '第二次突发事件：供应商库存突变处置')
  assert.equal(getRoleTaskById(99), undefined)
  assert.deepEqual(getRoleTasksByIds([1, 14]).map((task) => task.id), [1, 14])
})

test('任务编号跨阶段连续，且保留工作表内的原始序号', () => {
  assert.deepEqual(allRoleTasks.map((task) => task.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
  allRoleTasks.forEach((task, index) => {
    assert.equal(task.id, index + 1, '全局任务号应连续无断档')
    assert.equal(task.stage, task.id <= 8 ? 1 : 2)
    assert.equal(task.sourceLabel, `${task.stageLabel}·任务${task.no}`)
  })
  // 同一个 no 在两个阶段各出现一次，必须靠 id 区分
  assert.equal(getRoleTaskById(5).sourceLabel, '阶段一·任务5')
  assert.equal(getRoleTaskById(13).sourceLabel, '阶段二·任务5')
})

test('阶段衔接把第一阶段结论承接到第二阶段口径', () => {
  const handover = getStageHandover(2)
  assert.equal(handover.from, 1)
  assert.equal(handover.to, 2)
  assert.ok(handover.links.length >= 8)
  handover.links.forEach((link) => {
    assert.ok(link.topic && link.output && link.input)
    assert.ok(getRoleTaskById(link.taskId), `衔接项「${link.topic}」指向的任务 ${link.taskId} 应存在`)
  })
  const topics = handover.links.map((link) => link.topic)
  for (const topic of ['灾情口径', '预算上限', '预备费', '资金来源']) {
    assert.ok(topics.includes(topic), `应包含衔接主题 ${topic}`)
  }
})

test('预算上限衔接项标注了两阶段 3,426.50 元的复核差异', () => {
  const ceiling = getStageHandover(2).links.find((link) => link.topic === '预算上限')
  assert.match(ceiling.output, /4,275,091/)
  assert.match(ceiling.input, /4,278,517\.50/)
  assert.match(ceiling.input, /25\.29%/)
  assert.match(ceiling.note, /3,426\.50/)
})

test('阶段衔接仅覆盖已录入原文的阶段', () => {
  assert.deepEqual(stageHandovers.map((item) => item.to), [2])
  assert.equal(getStageHandover(3), undefined)
})

test('第一阶段台账关键数字与阶段一口径一致', () => {
  const content = JSON.stringify(stage1RoleTasks)
  for (const figure of ['2,816,906', '2,909,004', '4,275,091', '1,366,087', '255,091', '94.03%', '74.45', '11000']) {
    assert.ok(content.includes(figure), `阶段一台账应包含关键数字 ${figure}`)
  }
})

test('第二阶段台账关键金额与第二阶段口径一致', () => {
  const content = JSON.stringify(stage2RoleTasks)
  for (const figure of ['932,460', '149,397.50', '1,081,857.50', '807,210', '942,210', '1,091,607.50', '11,960', '25.29%', '2.59%']) {
    assert.ok(content.includes(figure), `台账应包含关键数字 ${figure}`)
  }
  assert.ok(content.includes('Min Z = 880·x1 + 968·x3 + 3000·y1 + 1760·y3'))
})
