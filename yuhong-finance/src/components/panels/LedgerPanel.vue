<script setup>
// 专项账套启用操作台。学生依次执行操作，每完成一项即显示平台回执并解锁下一项。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'

const OPS = ['profile', 'subjects', 'funds', 'grids', 'chain', 'permissions', 'rules', 'activate']
const flow = useTaskFlow('s1-t1', OPS)

const form = reactive({
  name: '洪涝应急救援专项账套',
  code: 'HJ-2026-001',
  projectType: '应急救援专项',
  accountingMode: '独立专项辅助核算',
  startDate: '灾情发生当日',
  currency: '人民币',
  period: '当前会计期间',
})

const subjectNames = ['捐赠收入', '应急采购支出', '运输支出', '保险支出', '设备及救援保障支出', '其他应急救援支出']
const auxNames = ['项目', '网格', '资金来源', '物资类别']
const fundNames = ['政府财政拨款保障资金', '限定性社会捐赠', '非限定性社会捐赠', '保险赔款', '其他合规项目资金']
const gridNames = '123456789'.split('').map((n) => `甲${n}`)

const subjects = reactive(Object.fromEntries(subjectNames.map((n) => [n, true])))
const aux = reactive(Object.fromEntries(auxNames.map((n) => [n, true])))
const strictFunds = reactive(Object.fromEntries(fundNames.map((n) => [n, n === '限定性社会捐赠'])))
const grids = reactive(Object.fromEntries(gridNames.map((n) => [n, false])))
const rules = reactive({ 规则1: false, 规则2: false, 规则3: false, 规则4: false, 规则5: false })

const chainRows = [
  { step: '①需求单', bind: '网格编号、需求物资、需求数量、预算项目' },
  { step: '②采购/物资单', bind: '网格编号、物资编码、采购数量、供应商、合同编号' },
  { step: '③付款申请', bind: '预算额度、资金来源、资金用途标签、合同编号' },
  { step: '④会计凭证', bind: '会计科目、专项项目、网格、资金来源、合同编号' },
]

const chainRules = [
  '无需求依据 → 不得形成采购申请',
  '超预算 → 自动预警',
  '资金用途不匹配 → 阻断付款',
  '未完成验收 → 暂停支付',
  '四流数据不一致 → 转人工复核',
]

const controlRules = [
  { id: '规则1', name: '预算控制', trigger: '付款申请金额 ＞ 剩余预算额度', action: '红色预警，禁止提交付款' },
  { id: '规则2', name: '资金用途控制', trigger: '实际付款用途 ≠ 资金用途标签', action: '资金用途错配预警，自动阻断' },
  { id: '规则3', name: '合同控制', trigger: '付款申请无有效合同或直采依据', action: '转人工复核' },
  { id: '规则4', name: '履约控制', trigger: '验收状态 ≠ 已验收', action: '暂停付款' },
  { id: '规则5', name: '四流校验', trigger: '合同流、物资流、票据流、资金流存在异常', action: '自动进入异常审核队列' },
]

const rolePermissions = [
  { name: '财务主管统筹岗', permissions: '专项账套启用、预算及重大调整审批、付款审批、异常事项最终复核、全项目数据查看', limit: '—' },
  { name: '应急预算绩效岗', permissions: '灾情数据读取、BI分析、预算编制、预算调整申请、绩效分析', limit: '不得直接付款' },
  { name: '采购成本保障岗', permissions: '采购需求、价格分析、供应商评价、合同及履约管理', limit: '不得直接修改资金来源' },
  { name: '资金核算风控岗', permissions: '资金分类、预算占用、付款核验、四流匹配、会计核算、银行对账', limit: '不得自行审批本人提交的付款' },
  { name: '数字人御洪星', permissions: '数据采集、风险提示、异常监测、信息推送、证据归集', limit: '仅提供辅助决策，无最终审批权限' },
]

const checkItems = ['需求关联', '预算项目关联', '资金来源关联', '会计科目关联', '网格辅助核算', '权限校验']

const error = ref('')
const activated = ref(flow.isDone('activate'))

const chosenSubjects = computed(() => subjectNames.filter((n) => subjects[n]))
const chosenAux = computed(() => auxNames.filter((n) => aux[n]))
const chosenGrids = computed(() => gridNames.filter((n) => grids[n]))
const strictList = computed(() => fundNames.filter((n) => strictFunds[n]))
const enabledRules = computed(() => controlRules.filter((r) => rules[r.id]))

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
  if (id === 'activate') activated.value = true
}

function selectAllGrids() {
  gridNames.forEach((n) => { grids[n] = true })
}

function enableAllRules() {
  controlRules.forEach((r) => { rules[r.id] = true })
}

function resetAll() {
  flow.reset()
  gridNames.forEach((n) => { grids[n] = false })
  controlRules.forEach((r) => { rules[r.id] = false })
  activated.value = false
  error.value = ''
}
</script>

<template>
  <PanelShell title="洪涝应急救援专项账套" source="专项账套管理">
    <div class="op-progress">
      <div class="op-progress-track">
        <span class="op-progress-fill" :style="{ width: `${(flow.progress.value.done / flow.progress.value.total) * 100}%` }" />
      </div>
      <span class="op-progress-text">{{ flow.progress.value.done }} / {{ flow.progress.value.total }} 项操作完成</span>
      <button type="button" class="text-button" @click="resetAll">重置</button>
    </div>

    <p v-if="error" class="sys-toast danger">{{ error }}</p>

    <div class="op-flow">
      <OperationBlock title="新建专项账套" :status="flow.status('profile')" done-label="账套已建立">
        <div class="form-row">
          <label class="form-item">
            <span class="form-label required">账套名称</span>
            <input v-model="form.name" class="form-control" :disabled="flow.isDone('profile')" />
          </label>
          <label class="form-item">
            <span class="form-label required">项目编码</span>
            <input v-model="form.code" class="form-control" :disabled="flow.isDone('profile')" />
          </label>
        </div>
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">项目类型</span>
            <select v-model="form.projectType" class="form-control" :disabled="flow.isDone('profile')">
              <option>应急救援专项</option><option>日常业务项目</option>
            </select>
          </label>
          <label class="form-item">
            <span class="form-label">核算方式</span>
            <select v-model="form.accountingMode" class="form-control" :disabled="flow.isDone('profile')">
              <option>独立专项辅助核算</option><option>并入日常核算</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">启用日期</span>
            <input v-model="form.startDate" class="form-control" :disabled="flow.isDone('profile')" />
          </label>
          <label class="form-item">
            <span class="form-label">核算币种</span>
            <select v-model="form.currency" class="form-control" :disabled="flow.isDone('profile')">
              <option>人民币</option>
            </select>
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('profile')"
            @click="run('profile', () => (form.name.trim() && form.code.trim() ? '' : '账套名称与项目编码为必填项'))">保存</button>
        </div>

        <template #result>
          <p class="sys-toast">专项账套「{{ form.name }}」创建成功，项目编码 {{ form.code }}。</p>
          <dl class="block-fields">
            <div class="field-row"><dt>核算方式</dt><dd>{{ form.accountingMode }}</dd></div>
            <div class="field-row"><dt>会计期间</dt><dd>{{ form.period }}</dd></div>
            <div class="field-row"><dt>账套状态</dt><dd>配置中，尚未启用</dd></div>
          </dl>
        </template>
      </OperationBlock>

      <OperationBlock title="专项核算科目配置" :status="flow.status('subjects')" done-label="科目已配置">
        <div class="checkbox-group">
          <label v-for="n in subjectNames" :key="n" class="checkbox-item">
            <input v-model="subjects[n]" type="checkbox" :disabled="flow.isDone('subjects')" />{{ n }}
          </label>
        </div>
        <p class="form-desc">辅助核算维度</p>
        <div class="checkbox-group">
          <label v-for="n in auxNames" :key="n" class="checkbox-item">
            <input v-model="aux[n]" type="checkbox" :disabled="flow.isDone('subjects')" />{{ n }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('subjects')"
            @click="run('subjects', () => (chosenSubjects.length && chosenAux.length === 4 ? '' : '需勾选专项科目，且辅助核算须同时包含项目、网格、资金来源、物资类别'))">保存</button>
        </div>

        <template #result>
          <p class="sys-toast">{{ chosenSubjects.length }} 个科目已挂接专项辅助核算标签。</p>
          <ul class="sys-lines">
            <li v-for="n in chosenSubjects" :key="n">{{ n }} · 辅助核算：{{ chosenAux.join(' + ') }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock title="资金来源分类" :status="flow.status('funds')" done-label="用途标签已生效">
        <table class="calc-table compact">
          <thead><tr><th>资金来源标签</th><th style="width: 140px">用途强制校验</th></tr></thead>
          <tbody>
            <tr v-for="n in fundNames" :key="n">
              <th scope="row">{{ n }}</th>
              <td>
                <label class="checkbox-item inline">
                  <input v-model="strictFunds[n]" type="checkbox" :disabled="flow.isDone('funds')" />
                  {{ strictFunds[n] ? '开启' : '关闭' }}
                </label>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('funds')"
            @click="run('funds', () => (strictFunds['限定性社会捐赠'] ? '' : '限定性社会捐赠必须开启用途强制校验'))">保存</button>
        </div>

        <template #result>
          <p class="sys-toast">5 类资金来源标签已建立，{{ strictList.length }} 类开启用途强制校验。</p>
          <ul class="sys-lines">
            <li v-for="n in strictList" :key="n" class="warn">{{ n }} · 付款用途与协议不一致时自动预警并阻断支付</li>
            <li class="info">资金使用属性：是否限定用途、限定使用网格、限定物资类别、到账时间、可支付时间、当前可用余额</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock title="9 网格辅助核算维度" :status="flow.status('grids')" done-label="网格维度已建立">
        <div class="checkbox-group tight">
          <label v-for="n in gridNames" :key="n" class="checkbox-item">
            <input v-model="grids[n]" type="checkbox" :disabled="flow.isDone('grids')" />{{ n }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="flow.isDone('grids')" @click="selectAllGrids">全选甲1—甲9</button>
          <button type="button" class="primary-button" :disabled="flow.isDone('grids')"
            @click="run('grids', () => (chosenGrids.length === 9 ? '' : `还有 ${9 - chosenGrids.length} 个网格未建立`))">保存</button>
        </div>

        <template #result>
          <p class="sys-toast">9 个网格辅助核算维度建立完成：{{ chosenGrids.join('、') }}。</p>
          <p class="block-path">洪涝应急救援专项 → 甲3网格 → 帐篷 → 应急采购支出</p>
        </template>
      </OperationBlock>

      <OperationBlock title="需求—物资—资金—凭证联动规则" :status="flow.status('chain')" done-label="联动已启用">
        <ol class="chain-list">
          <li v-for="row in chainRows" :key="row.step">
            <span class="chain-step">{{ row.step }}</span>
            <span class="chain-bind">{{ row.bind }}</span>
          </li>
        </ol>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('chain')" @click="run('chain')">保存并启用</button>
        </div>

        <template #result>
          <p class="sys-toast">四层联动关系已建立，以下控制规则同步生效。</p>
          <ul class="sys-lines">
            <li v-for="r in chainRules" :key="r" class="info">{{ r }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock title="岗位权限配置" :status="flow.status('permissions')" done-label="权限已下发">
        <div class="score-table-wrap">
          <table class="calc-table compact">
            <thead><tr><th>角色</th><th>权限</th><th>限制</th></tr></thead>
            <tbody>
              <tr v-for="row in rolePermissions" :key="row.name">
                <th scope="row">{{ row.name }}</th><td>{{ row.permissions }}</td><td>{{ row.limit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('permissions')" @click="run('permissions')">保存权限</button>
        </div>

        <template #result>
          <p class="sys-toast">5 个角色权限配置完成，不相容职务已分离。</p>
        </template>
      </OperationBlock>

      <OperationBlock title="风控中心规则配置" :status="flow.status('rules')" done-label="5 项规则运行中">
        <table class="calc-table compact">
          <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>触发条件</th><th>系统动作</th></tr></thead>
          <tbody>
            <tr v-for="rule in controlRules" :key="rule.id">
              <td><input v-model="rules[rule.id]" type="checkbox" :disabled="flow.isDone('rules')" /></td>
              <th scope="row">{{ rule.id }}<em class="row-unit">{{ rule.name }}</em></th>
              <td>{{ rule.trigger }}</td>
              <td>{{ rule.action }}</td>
            </tr>
          </tbody>
        </table>
        <div class="action-row">
          <button type="button" class="secondary-button" :disabled="flow.isDone('rules')" @click="enableAllRules">全部启用</button>
          <button type="button" class="primary-button" :disabled="flow.isDone('rules')"
            @click="run('rules', () => (enabledRules.length === 5 ? '' : `还有 ${5 - enabledRules.length} 项控制规则未启用`))">启用规则</button>
        </div>

        <template #result>
          <p class="sys-toast">5 项控制规则已启用并进入运行状态。</p>
          <ul class="sys-lines">
            <li v-for="r in enabledRules" :key="r.id">{{ r.name }} · {{ r.action }}</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock title="联动校验与账套启用" :status="flow.status('activate')" done-label="账套已启用">
        <div class="check-grid">
          <div v-for="item in checkItems" :key="item" class="check-cell" :class="{ done: activated }">
            <span class="check-mark">{{ activated ? '✓' : '·' }}</span>{{ item }}
          </div>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('activate')" @click="run('activate')">校验测试并正式启用</button>
        </div>

        <template #result>
          <ul class="sys-lines">
            <li v-for="item in checkItems" :key="item">{{ item }}：通过</li>
          </ul>
          <p class="sys-toast">专项账套配置校验通过 · 洪涝应急救援专项账套 —— 已启用。</p>
          <div class="calc-result">
            <p class="result-line">
              后续每笔救灾资金都必须经过预算控制、资金用途匹配和业务凭证关联后才能进入支付流程，
              实现资金来源清楚、预算占用可控、物资去向可查、会计凭证可追溯。
            </p>
          </div>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>
