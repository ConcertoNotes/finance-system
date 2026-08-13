<script setup>
// 财务共享平台 · 专项账套启用。
// 菜单路径与工作簿一致，学生需逐级点开菜单进入对应功能页办理业务。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'

const PAGES = ['new-ledger', 'subject-config', 'fund-category', 'grid-manage', 'link-rule', 'role-auth', 'risk-rule', 'ledger-activate']
const flow = useTaskFlow('s1-t1', PAGES)

const menu = [
  {
    id: 'm-fin',
    label: '财务管理',
    children: [
      {
        id: 'm-fin-proj',
        label: '专项项目管理',
        children: [
          {
            id: 'm-fin-proj-ledger',
            label: '专项账套管理',
            children: [{ id: 'new-ledger', label: '新增账套' }],
          },
        ],
      },
    ],
  },
  {
    id: 'm-base',
    label: '基础设置',
    children: [
      { id: 'm-base-subject', label: '会计科目', children: [{ id: 'subject-config', label: '专项科目配置' }] },
      { id: 'm-base-aux', label: '辅助核算', children: [{ id: 'grid-manage', label: '网格管理' }] },
    ],
  },
  {
    id: 'm-ledger',
    label: '专项账套',
    children: [
      { id: 'm-ledger-fund', label: '资金来源管理', children: [{ id: 'fund-category', label: '新增资金类别' }] },
      { id: 'm-ledger-map', label: '业务财务映射', children: [{ id: 'link-rule', label: '联动规则配置' }] },
      { id: 'm-ledger-risk', label: '风控中心', children: [{ id: 'risk-rule', label: '规则配置' }] },
      { id: 'ledger-activate', label: '账套启用校验' },
    ],
  },
  {
    id: 'm-sys',
    label: '系统管理',
    children: [{ id: 'm-sys-auth', label: '用户权限', children: [{ id: 'role-auth', label: '角色权限配置' }] }],
  },
]

const activeId = ref('')
const error = ref('')

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

const subjects = reactive(Object.fromEntries(subjectNames.map((n) => [n, false])))
const aux = reactive(Object.fromEntries(auxNames.map((n) => [n, false])))
const strictFunds = reactive(Object.fromEntries(fundNames.map((n) => [n, false])))
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

const chosenSubjects = computed(() => subjectNames.filter((n) => subjects[n]))
const chosenAux = computed(() => auxNames.filter((n) => aux[n]))
const chosenGrids = computed(() => gridNames.filter((n) => grids[n]))
const strictList = computed(() => fundNames.filter((n) => strictFunds[n]))
const enabledRules = computed(() => controlRules.filter((r) => rules[r.id]))
const pendingPages = computed(() => PAGES.filter((p) => p !== 'ledger-activate' && !flow.isDone(p)))

function save(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function resetAll() {
  flow.reset()
  subjectNames.forEach((n) => { subjects[n] = false })
  auxNames.forEach((n) => { aux[n] = false })
  fundNames.forEach((n) => { strictFunds[n] = false })
  gridNames.forEach((n) => { grids[n] = false })
  controlRules.forEach((r) => { rules[r.id] = false })
  error.value = ''
}
</script>

<template>
  <PanelShell title="专项账套启用" source="财务共享平台">
    <SystemShell
      system="财务共享平台"
      operator="财务主管统筹岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <!-- 财务管理 → 专项项目管理 → 专项账套管理 → 新增账套 -->
        <template v-if="leaf === 'new-ledger'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('new-ledger')"
              @click="save('new-ledger', () => (form.name.trim() && form.code.trim() ? '' : '账套名称与项目编码为必填项'))">保存</button>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">账套名称</span>
              <input v-model="form.name" class="form-control" :disabled="flow.isDone('new-ledger')" />
            </label>
            <label class="form-item">
              <span class="form-label required">项目编码</span>
              <input v-model="form.code" class="form-control" :disabled="flow.isDone('new-ledger')" />
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">项目类型</span>
              <select v-model="form.projectType" class="form-control" :disabled="flow.isDone('new-ledger')">
                <option>应急救援专项</option><option>日常业务项目</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">核算方式</span>
              <select v-model="form.accountingMode" class="form-control" :disabled="flow.isDone('new-ledger')">
                <option>独立专项辅助核算</option><option>并入日常核算</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">启用日期</span>
              <input v-model="form.startDate" class="form-control" :disabled="flow.isDone('new-ledger')" />
            </label>
            <label class="form-item">
              <span class="form-label">核算币种</span>
              <select v-model="form.currency" class="form-control" :disabled="flow.isDone('new-ledger')">
                <option>人民币</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label">会计期间</span>
              <input v-model="form.period" class="form-control" :disabled="flow.isDone('new-ledger')" />
            </label>
            <div class="form-item" />
          </div>
          <template v-if="flow.isDone('new-ledger')">
            <p class="sys-toast">专项账套「{{ form.name }}」创建成功，项目编码 {{ form.code }}，当前状态：配置中。</p>
          </template>
        </template>

        <!-- 基础设置 → 会计科目 → 专项科目配置 -->
        <template v-else-if="leaf === 'subject-config'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('subject-config')"
              @click="save('subject-config', () => (chosenSubjects.length === 6 && chosenAux.length === 4 ? '' : '需勾选全部 6 个专项科目，辅助核算须同时包含项目、网格、资金来源、物资类别'))">保存</button>
          </div>
          <p class="form-desc">在现有会计科目体系基础上勾选需要挂接专项辅助核算标签的科目，不另造一套科目。</p>
          <div class="checkbox-group">
            <label v-for="n in subjectNames" :key="n" class="checkbox-item">
              <input v-model="subjects[n]" type="checkbox" :disabled="flow.isDone('subject-config')" />{{ n }}
            </label>
          </div>
          <p class="form-desc">辅助核算维度</p>
          <div class="checkbox-group">
            <label v-for="n in auxNames" :key="n" class="checkbox-item">
              <input v-model="aux[n]" type="checkbox" :disabled="flow.isDone('subject-config')" />{{ n }}
            </label>
          </div>
          <dl class="block-fields">
            <div class="field-row"><dt>项目统一选择</dt><dd>洪涝应急救援专项项目</dd></div>
          </dl>
          <template v-if="flow.isDone('subject-config')">
            <p class="sys-toast">{{ chosenSubjects.length }} 个科目已挂接专项辅助核算标签。</p>
            <ul class="sys-lines">
              <li v-for="n in chosenSubjects" :key="n">{{ n }} · 辅助核算：{{ chosenAux.join(' + ') }}</li>
            </ul>
          </template>
        </template>

        <!-- 专项账套 → 资金来源管理 → 新增资金类别 -->
        <template v-else-if="leaf === 'fund-category'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('fund-category')"
              @click="save('fund-category', () => (strictFunds['限定性社会捐赠'] ? '' : '限定性捐赠必须开启用途强制校验'))">保存</button>
          </div>
          <table class="calc-table compact">
            <thead><tr><th>资金来源标签</th><th style="width: 150px">用途强制校验</th></tr></thead>
            <tbody>
              <tr v-for="n in fundNames" :key="n">
                <th scope="row">{{ n }}</th>
                <td>
                  <label class="checkbox-item inline">
                    <input v-model="strictFunds[n]" type="checkbox" :disabled="flow.isDone('fund-category')" />
                    {{ strictFunds[n] ? '开启' : '关闭' }}
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="form-desc">资金使用属性：是否限定用途、限定使用网格、限定物资类别、到账时间、可支付时间、当前可用余额。</p>
          <template v-if="flow.isDone('fund-category')">
            <p class="sys-toast">5 类资金来源标签已建立，{{ strictList.length }} 类开启用途强制校验。</p>
            <ul class="sys-lines">
              <li v-for="n in strictList" :key="n" class="warn">{{ n }} · 付款用途与协议不一致时自动预警并阻断支付</li>
            </ul>
          </template>
        </template>

        <!-- 基础设置 → 辅助核算 → 网格管理 -->
        <template v-else-if="leaf === 'grid-manage'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="flow.isDone('grid-manage')"
              @click="gridNames.forEach((n) => (grids[n] = true))">全选甲1—甲9</button>
            <button type="button" class="primary-button" :disabled="flow.isDone('grid-manage')"
              @click="save('grid-manage', () => (chosenGrids.length === 9 ? '' : `还有 ${9 - chosenGrids.length} 个网格未新增`))">保存</button>
          </div>
          <div class="checkbox-group tight">
            <label v-for="n in gridNames" :key="n" class="checkbox-item">
              <input v-model="grids[n]" type="checkbox" :disabled="flow.isDone('grid-manage')" />{{ n }}
            </label>
          </div>
          <p class="block-path">辅助核算层级：洪涝应急救援专项 → 网格 → 物资/费用项目</p>
          <template v-if="flow.isDone('grid-manage')">
            <p class="sys-toast">9 个网格辅助核算维度建立完成：{{ chosenGrids.join('、') }}。</p>
            <p class="block-path">洪涝应急救援专项 → 甲3网格 → 帐篷 → 应急采购支出</p>
          </template>
        </template>

        <!-- 专项账套 → 业务财务映射 → 联动规则配置 -->
        <template v-else-if="leaf === 'link-rule'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('link-rule')" @click="save('link-rule')">保存并启用</button>
          </div>
          <ol class="chain-list">
            <li v-for="row in chainRows" :key="row.step">
              <span class="chain-step">{{ row.step }}</span>
              <span class="chain-bind">{{ row.bind }}</span>
            </li>
          </ol>
          <template v-if="flow.isDone('link-rule')">
            <p class="sys-toast">四层联动关系已建立，以下控制规则同步生效。</p>
            <ul class="sys-lines">
              <li v-for="r in chainRules" :key="r" class="info">{{ r }}</li>
            </ul>
          </template>
        </template>

        <!-- 系统管理 → 用户权限 → 角色权限配置 -->
        <template v-else-if="leaf === 'role-auth'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('role-auth')" @click="save('role-auth')">保存权限</button>
          </div>
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
          <template v-if="flow.isDone('role-auth')">
            <p class="sys-toast">5 个角色权限配置完成，不相容职务已分离。</p>
          </template>
        </template>

        <!-- 专项账套 → 风控中心 → 规则配置 -->
        <template v-else-if="leaf === 'risk-rule'">
          <div class="sys-toolbar">
            <button type="button" class="secondary-button" :disabled="flow.isDone('risk-rule')"
              @click="controlRules.forEach((r) => (rules[r.id] = true))">全部启用</button>
            <button type="button" class="primary-button" :disabled="flow.isDone('risk-rule')"
              @click="save('risk-rule', () => (enabledRules.length === 5 ? '' : `还有 ${5 - enabledRules.length} 项控制规则未启用`))">启用规则</button>
          </div>
          <table class="calc-table compact">
            <thead><tr><th style="width: 56px">启用</th><th>规则</th><th>触发条件</th><th>系统动作</th></tr></thead>
            <tbody>
              <tr v-for="rule in controlRules" :key="rule.id">
                <td><input v-model="rules[rule.id]" type="checkbox" :disabled="flow.isDone('risk-rule')" /></td>
                <th scope="row">{{ rule.id }}<em class="row-unit">{{ rule.name }}</em></th>
                <td>{{ rule.trigger }}</td>
                <td>{{ rule.action }}</td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('risk-rule')">
            <p class="sys-toast">5 项控制规则已启用并进入运行状态。</p>
            <ul class="sys-lines">
              <li v-for="r in enabledRules" :key="r.id">{{ r.name }} · {{ r.action }}</li>
            </ul>
          </template>
        </template>

        <!-- 专项账套 → 账套启用校验 -->
        <template v-else-if="leaf === 'ledger-activate'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" :disabled="flow.isDone('ledger-activate')"
              @click="save('ledger-activate', () => (pendingPages.length ? `还有 ${pendingPages.length} 个功能页未办理，无法通过校验` : ''))">
              校验测试并正式启用
            </button>
          </div>
          <div class="check-grid">
            <div v-for="item in checkItems" :key="item" class="check-cell" :class="{ done: flow.isDone('ledger-activate') }">
              <span class="check-mark">{{ flow.isDone('ledger-activate') ? '✓' : '·' }}</span>{{ item }}
            </div>
          </div>
          <template v-if="flow.isDone('ledger-activate')">
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
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
