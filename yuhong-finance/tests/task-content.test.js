import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { roles } from '../src/data/roles.js'
import { allTasksInOrder, getRoleSteps, getTask, getTaskSeq, getTasksByRole, tasks } from '../src/data/tasks.js'

const roleIds = roles.map((role) => role.id)

test('共 13 个任务，前 8 个来自第一阶段（含补充表）、后 5 个来自当前阶段二工作簿', () => {
  assert.equal(tasks.length, 13)
  assert.equal(tasks.filter((t) => t.stage === 1).length, 8)
  assert.equal(tasks.filter((t) => t.stage === 2).length, 5)
})

test('全流程任务号连续 1—13，第二份工作簿的任务1接续为任务9', () => {
  assert.deepEqual(
    allTasksInOrder.map((task) => task.seq),
    Array.from({ length: 13 }, (_, i) => i + 1),
  )
  assert.equal(allTasksInOrder.find((task) => task.key === 's2-t1').seq, 9)
  assert.equal(allTasksInOrder.find((task) => task.key === 's2-t5').seq, 13)
  assert.equal(getTask('s2-t6'), null)
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
  assert.equal(getTaskSeq('finance-lead', 's2-t1'), 5)
  assert.equal(getTaskSeq('procurement', 's2-t5'), 8)
  assert.equal(getTaskSeq('fund-risk', 's2-t4'), 3)
})

test('第一份工作簿的任务标题与原文一致', () => {
  const titles = tasks
    .filter((task) => task.stage === 1)
    .sort((a, b) => a.no - b.no)
    .map((task) => task.title)
  assert.deepEqual(titles, [
    '启用洪涝应急救援专项账套',
    '建设洪涝应急救援数据采集系统',
    '数据建模分析合规性检测',
    '救援人员保险方案比较',
    '将灾情数据转换为成本动因',
    '编制ABC等级预算',
    'B方案预算审批',
    '第一次突发事件——受灾人数突然增加',
  ])
})

test('第二份工作簿的任务标题与当前阶段二原文一致', () => {
  const titles = tasks
    .filter((task) => task.stage === 2)
    .sort((a, b) => a.no - b.no)
    .map((task) => task.title)
  assert.deepEqual(titles, [
    '生成9网格采购需求',
    '建立分层采购价格基准',
    '合同物资供应商综合评分与初始遴选',
    '初始合同、直采控制与预算占用',
    '第二次突发事件——供应商库存突变，重点物资无法按时足量交付',
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

test('资金核算风控岗承担补充表突发事件与阶段二任务3、任务4', () => {
  const list = getTasksByRole('fund-risk')
  assert.equal(list.length, 3)
  assert.equal(list[0].key, 's1-t8')
  assert.deepEqual(list.slice(1).map((task) => task.key), ['s2-t3', 's2-t4'])
})

test('每个岗位的任务数与当前工作簿分工一致', () => {
  assert.equal(getTasksByRole('finance-lead').length, 7)
  assert.equal(getTasksByRole('procurement').length, 8)
  assert.equal(getTasksByRole('budget-performance').length, 5)
  assert.equal(getTasksByRole('fund-risk').length, 3)
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

test('任务5按当前表只保留核验与合同影响两步', () => {
  const task = getTask('s2-t5')
  assert.deepEqual(task.roles, ['procurement'])
  assert.ok(task.steps.some((step) => String(step.title).includes('核验异常真实性') || String(step.label).includes('第一步')))
  assert.ok(task.steps.some((step) => String(step.title).includes('识别合同影响') || String(step.label).includes('第二步')))
  assert.ok(!task.steps.some((step) => step.label === '第十六步'))
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

test('资金类别页面保留工作簿规定的六项资金使用属性', () => {
  const source = readFileSync(new URL('../src/components/panels/LedgerPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /limitedUse: true/)
  assert.match(source, /<input v-model="fundAttrs\.limitedUse" type="checkbox" \/>是否限定用途/)
  assert.match(source, /限定使用网格/)
  assert.match(source, /限定物资类别/)
  assert.match(source, /到账时间/)
  assert.match(source, /可支付时间/)
  assert.match(source, /当前可用余额/)
  assert.match(source, /limitedGrids/)
  assert.match(source, /limitedMaterials/)
  assert.match(source, /arrivalTime/)
  assert.match(source, /payableTime/)
  assert.match(source, /balance/)
})

test('保险方案选择按钮展开可编辑结果表', () => {
  const source = readFileSync(new URL('../src/components/panels/InsurancePanel.vue', import.meta.url), 'utf8')
  assert.match(source, /const showDecision = ref\(false\)/)
  assert.match(source, /@click="showDecision = true"/)
  assert.match(source, /v-if="showDecision"/)
  assert.match(source, /v-model="decision\.company"/)
  assert.match(source, /v-model="decision\.score"/)
  assert.match(source, /v-model="decision\.premium"/)
  assert.match(source, /v-model="decision\.fundingSource"/)
  assert.match(source, /v-model="decision\.conclusion"/)
  assert.match(source, /class="decision-input editable"/)
})

test('预算启动页选择B方案后才显示可编辑预算额度表', () => {
  const source = readFileSync(new URL('../src/components/panels/BudgetApprovalPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /const controlForm = reactive\(\{/)
  assert.match(source, /v-if="selectedPlan === 'B'"/)
  assert.match(source, /v-model="controlForm\.total"/)
  assert.match(source, /v-model="controlForm\.execution"/)
  assert.match(source, /v-model="controlForm\.reserve"/)
  assert.match(source, /v-model="controlForm\.cap"/)
  assert.match(source, /class="field-input editable"/)
  assert.match(source, /watch\(controlForm, \(\) => store\.persist\(snapshot\(\)\), \{ deep: true \}\)/)
})

test('账套启用校验按钮点击后转圈 3 秒再执行既有校验', () => {
  const source = readFileSync(new URL('../src/components/panels/LedgerPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /const isLedgerValidating = ref\(false\)/)
  assert.match(source, /function startLedgerActivationValidation\(\) \{/)
  assert.match(source, /if \(isLedgerValidating\.value\) return/)
  assert.match(source, /isLedgerValidating\.value = true/)
  assert.match(source, /setTimeout\(\(\) => \{/)
  assert.match(source, /\}, 3000\)/)
  assert.match(source, /save\('ledger-activate'/)
  assert.match(source, /isLedgerValidating\.value = false/)
  assert.match(source, /:disabled="isLedgerValidating"/)
  assert.match(source, /v-if="isLedgerValidating"/)
  assert.match(source, /校验中…/)
  assert.match(source, /class="spinner"/)
})

test('ABC预算编制页不显示三方案预算录入表', () => {
  const source = readFileSync(new URL('../src/components/panels/AbcBudgetPanel.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /<tr v-for="plan in abcPlans"/)
  assert.doesNotMatch(source, /v-model="totals\[plan\.id\]"/)
})

test('合规性检测保留两层检测的关键口径', () => {
  const text = JSON.stringify(getTask('s1-t3'))
  assert.ok(text.includes('一票否决'))
  assert.ok(text.includes('95%'))
  for (const code of ['C01', 'C02', 'C03', 'C04', 'C05', 'C06']) {
    assert.ok(text.includes(code), `缺少合规项 ${code}`)
  }
})

test('当前阶段二任务5输出清单来自采购岗原文', () => {
  const outputs = getTask('s2-t5').outputs
  assert.ok(outputs.includes('异常真实性核验结果'))
  assert.ok(outputs.includes('合同影响测算表'))
})

test('每个任务都绑定了演算面板', () => {
  for (const task of tasks) {
    assert.ok(task.panel, `${task.key} 缺少 panel`)
  }
})

test('质量准入公式可编辑并随编辑自动保存', () => {
  const source = readFileSync(new URL('../src/components/panels/CompliancePanel.vue', import.meta.url), 'utf8')
  assert.match(source, /const formulas = reactive\(\{/)
  assert.match(source, /v-model="formulas\.completeness"/)
  assert.match(source, /v-model="formulas\.timeliness"/)
  assert.match(source, /watch\(\[formulas, docs, referenceMode, evidenceStarted\], \(\) => store\.persist\(snapshot\(\)\), \{ deep: true \}\)/)
  assert.match(source, /class="block-formula editable"/)
})

test('规则依据页需先点击「新建规则」才展开挂接内容，且展开状态与挂接内容随编辑自动保存', () => {
  const source = readFileSync(new URL('../src/components/panels/CompliancePanel.vue', import.meta.url), 'utf8')
  assert.match(source, /evidenceStarted = ref\(false\)/)
  assert.match(source, /新建规则/)
  assert.match(source, /v-if="evidenceStarted"/)
  assert.match(source, /evidenceStarted/)
  assert.match(source, /收起规则/)
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
