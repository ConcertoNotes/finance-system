<script setup>
// 应急财务平台 · 第一次突发事件：受灾人数突然增加。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { abcPlanMap } from '../../data/abcBudget.js'
import {
  checkItems,
  extraMaterial,
  extraMaterialCards,
  extraMaterialFoot,
  fiscalAfterG03,
  incrementDrivers,
  paramShift,
  secondDecision,
  secondWaveBatch,
  secondWaveRows,
} from '../../data/emergencyUpdate.js'
import { cResilience, gridFoodShifts } from '../../domain/emergencyUpdate.js'
import { money, num, percent } from '../../domain/format.js'

const PAGES = [
  'import-wave',
  'verify',
  'dashboard',
  'match-plan',
  'params',
  'drivers',
  'gap',
  'decision',
  'material',
  'fund-status',
]
const flow = useTaskFlow('s1-t8', PAGES)
const store = useFormPersist('s1-t8')

const menu = [
  {
    id: 'm-data',
    label: '灾情数据中心',
    children: [
      {
        id: 'm-data-dyn',
        label: '动态灾情更新',
        children: [{ id: 'import-wave', label: '导入二次报送数据' }],
      },
    ],
  },
  {
    id: 'm-quality',
    label: '数据质量',
    children: [{ id: 'verify', label: '动态数据校验' }],
  },
  {
    id: 'm-bi',
    label: 'BI驾驶舱',
    children: [{ id: 'dashboard', label: '更新九网格驾驶舱' }],
  },
  {
    id: 'm-resp',
    label: '响应管理',
    children: [{ id: 'match-plan', label: '响应等级与预算方案映射' }],
  },
  {
    id: 'm-model',
    label: '预算模型',
    children: [
      {
        id: 'm-model-param',
        label: '成本动因参数',
        children: [{ id: 'params', label: '参数调整' }],
      },
      { id: 'drivers', label: '预算增量分析' },
      { id: 'gap', label: '资金缺口测算' },
    ],
  },
  {
    id: 'm-collab',
    label: '跨岗协同',
    children: [
      { id: 'decision', label: '预算方案二次决策' },
      { id: 'material', label: '新增物资分析' },
      { id: 'fund-status', label: '资金状态汇总' },
    ],
  },
]

const planC = abcPlanMap.C
const food = computed(() => gridFoodShifts())
const resilience = computed(() => cResilience())

const activeId = ref('')
const error = ref('')
const batchName = ref('')
const sources = reactive(Object.fromEntries(secondWaveBatch.sources.map((name) => [name, false])))
const checks = reactive(Object.fromEntries(checkItems.map((name) => [name, false])))
const params = reactive({
  shelterDays: '',
  relocated: '',
  roadBreaks: '',
  gridJia3: '',
  gridJia6: '',
})

store.restore({ batchName, sources, checks, params })

const chosenSources = computed(() => secondWaveBatch.sources.filter((name) => sources[name]))
const chosenChecks = computed(() => checkItems.filter((name) => checks[name]))

function snapshot() {
  return { batchName, sources, checks, params }
}

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  store.persist(snapshot())
  flow.complete(id)
}

function checkImport() {
  if (batchName.value.trim() !== secondWaveBatch.name) return `数据批次须选择「${secondWaveBatch.name}」`
  if (chosenSources.value.length !== secondWaveBatch.sources.length) {
    return '数据来源须同时勾选应急管理局二次报送、无人机二次巡航'
  }
  return ''
}

function checkVerify() {
  if (!flow.isDone('import-wave')) return '尚未导入二次报送数据'
  if (chosenChecks.value.length !== checkItems.length) return '须完成来源授权、网格编号、时间戳、原始记录与无人机巡航匹配核验'
  return ''
}

function checkParams() {
  if (Number(params.shelterDays) !== paramShift.shelterDays.next) return '预计安置天数须由 3 天调整为 5 天'
  if (Number(params.relocated) !== paramShift.relocated.next) return '转移安置人数须由 7000 更新为 8100'
  if (Number(params.roadBreaks) !== paramShift.roadBreaks.next) return '道路中断网格须由 3 个更新为 5 个'
  if (Number(params.gridJia3) !== paramShift.gridJia3.next) return '甲3转移安置人数须由 1500 改为 2100'
  if (Number(params.gridJia6) !== paramShift.gridJia6.next) return '甲6转移安置人数须由 1200 改为 1700'
  return ''
}

function resetAll() {
  flow.reset()
  store.clear()
  batchName.value = ''
  secondWaveBatch.sources.forEach((name) => { sources[name] = false })
  checkItems.forEach((name) => { checks[name] = false })
  Object.assign(params, { shelterDays: '', relocated: '', roadBreaks: '', gridJia3: '', gridJia6: '' })
  error.value = ''
}
</script>

<template>
  <PanelShell title="第一次突发事件——受灾人数突然增加" source="应急财务平台">
    <SystemShell
      system="应急财务平台"
      operator="应急预算绩效岗"
      login-hint="登录后导入二次报送数据，完成方案切换、参数重测与跨岗回执。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'import-wave'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('import-wave', checkImport)">导入甲3、甲6更新数据</button>
          </div>
          <p class="form-desc">{{ secondWaveBatch.path }}</p>
          <div class="form-row">
            <label class="form-item">
              <span class="form-label required">数据批次</span>
              <select v-model="batchName" class="form-control">
                <option value="">请选择</option>
                <option>{{ secondWaveBatch.name }}</option>
                <option>灾后0小时初始数据</option>
              </select>
            </label>
          </div>
          <p class="form-desc">数据来源</p>
          <div class="checkbox-group">
            <label v-for="name in secondWaveBatch.sources" :key="name" class="checkbox-item">
              <input v-model="sources[name]" type="checkbox" />{{ name }}
            </label>
          </div>
          <table class="calc-table">
            <thead>
              <tr><th>网格</th><th>指标</th><th>原值</th><th>新值</th><th>增量</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in secondWaveRows" :key="`${row.grid}-${row.metric}`">
                <th scope="row">{{ row.grid }}</th>
                <td>{{ row.metric }}</td>
                <td>{{ num(row.old, 0) }}</td>
                <td>{{ num(row.next, 0) }}</td>
                <td>{{ num(row.delta, 0) }}</td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('import-wave')">
            <p class="sys-toast">甲3、甲6 二次灾情数据已导入。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'verify'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('verify', checkVerify)">确认有效</button>
          </div>
          <p class="form-desc">系统自动核验来源授权、网格编号、时间戳、原始记录、无人机巡航匹配。</p>
          <div class="checkbox-group">
            <label v-for="name in checkItems" :key="name" class="checkbox-item">
              <input v-model="checks[name]" type="checkbox" />{{ name }}
            </label>
          </div>
          <template v-if="flow.isDone('verify')">
            <p class="sys-toast">来源一致、时间戳一致，甲3/甲6 数据复核通过。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'dashboard'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('dashboard')">更新九网格BI驾驶舱</button>
          </div>
          <p class="form-desc">工作簿标注「出现图片，图片待补充先放空」。驾驶舱图稍后补入，本步先完成更新动作。</p>
          <div class="sys-welcome">
            <p class="sys-welcome-title">九网格 BI 驾驶舱</p>
            <p class="sys-welcome-sub">图面待补充</p>
          </div>
          <template v-if="flow.isDone('dashboard')">
            <p class="sys-toast">九网格 BI 驾驶舱已按二次报送数据更新。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'match-plan'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('match-plan')">重新匹配方案</button>
          </div>
          <p class="form-desc">原响应等级 III级 → B方案；最新响应等级 II级 → C方案。</p>
          <template v-if="flow.isDone('match-plan')">
            <p class="sys-toast">已重新匹配并加载 C 方案参数。</p>
            <table class="calc-table">
              <thead>
                <tr><th>指标</th><th>C方案</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">总预算（元）</th><td>{{ money(planC.total, 1) }}</td></tr>
                <tr><th scope="row">安置期（天）</th><td>{{ planC.days }}</td></tr>
                <tr><th scope="row">覆盖人数（人）</th><td>{{ num(planC.people, 0) }}</td></tr>
                <tr><th scope="row">单位受益成本（元/人）</th><td>{{ num(planC.total / planC.people, 2) }}</td></tr>
                <tr><th scope="row">适用灾情</th><td>{{ planC.applicable }}</td></tr>
              </tbody>
            </table>
          </template>
        </template>

        <template v-else-if="leaf === 'params'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('params', checkParams)">保存参数并重新测算</button>
          </div>
          <p class="form-desc">预算模型 → 成本动因参数 → 参数调整。保存后按人天公式重算食品、饮水、帐篷、运输等预算。</p>
          <div class="param-grid">
            <label class="form-item">
              <span class="form-label">预计安置天数（天）</span>
              <input v-model.number="params.shelterDays" class="form-control" type="number" min="1" />
            </label>
            <label class="form-item">
              <span class="form-label">转移安置人数（人）</span>
              <input v-model.number="params.relocated" class="form-control" type="number" min="0" />
            </label>
            <label class="form-item">
              <span class="form-label">道路中断网格（个）</span>
              <input v-model.number="params.roadBreaks" class="form-control" type="number" min="0" />
            </label>
            <label class="form-item">
              <span class="form-label">甲3转移安置人数</span>
              <input v-model.number="params.gridJia3" class="form-control" type="number" min="0" />
            </label>
            <label class="form-item">
              <span class="form-label">甲6转移安置人数</span>
              <input v-model.number="params.gridJia6" class="form-control" type="number" min="0" />
            </label>
          </div>
          <template v-if="flow.isDone('params')">
            <p class="sys-toast">参数已保存，预算模型已按 C 方案口径重算。</p>
            <table class="calc-table">
              <thead>
                <tr><th>网格</th><th>安置人天</th><th>食品预算（元）</th><th>原食品预算（元）</th><th>新增食品预算（元）</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">甲3</th>
                  <td>{{ num(food.jia3.personDays, 0) }}</td>
                  <td>{{ money(food.jia3.food, 0) }}</td>
                  <td>{{ money(food.jia3.oldFood, 0) }}</td>
                  <td>{{ money(food.jia3.increment, 0) }}</td>
                </tr>
                <tr>
                  <th scope="row">甲6</th>
                  <td>{{ num(food.jia6.personDays, 0) }}</td>
                  <td>{{ money(food.jia6.food, 0) }}</td>
                  <td>{{ money(food.jia6.oldFood, 0) }}</td>
                  <td>{{ money(food.jia6.increment, 0) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="form-desc">甲3：2100×5×25=262,500，原 1500×3×25=112,500，新增 150,000 元。甲6：1700×5×25=212,500，原 1200×3×25=90,000，新增 122,500 元。饮水、临时安置、帐篷、运输、设备连续运行和特殊人群保障同步重算。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'drivers'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('drivers')">分析预算增加主要原因</button>
          </div>
          <template v-if="flow.isDone('drivers')">
            <p class="sys-toast">安置期延长贡献约 67% 增量，受灾人数增加约 28%，道路绕行约 5%。</p>
            <table class="calc-table">
              <thead>
                <tr><th>增量来源</th><th>贡献占比</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in incrementDrivers" :key="item.name">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ percent(item.share, 0) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </template>

        <template v-else-if="leaf === 'gap'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('gap')">计算新增资金缺口</button>
          </div>
          <template v-if="flow.isDone('gap')">
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">短期资金缺口</span>
                <strong class="stat-value accent">{{ money(resilience.gap, 1) }} 元</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">可用资金覆盖率</span>
                <strong class="stat-value">{{ resilience.percent.toFixed(2) }}%</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">应急缓冲率</span>
                <strong class="stat-value">{{ resilience.bufferPercent.toFixed(2) }}%</strong>
              </div>
            </div>
            <p class="sys-toast">4,020,000 / 4,278,517.50 × 100% = 93.96%；376,000 / 4,278,517.50 × 100% = 8.79%。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'decision'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('decision')">确认二次决策</button>
          </div>
          <p class="form-desc">财务主管统筹岗：响应升级后将预算方案由 B 切换为 C。</p>
          <dl class="block-fields">
            <div class="field-row"><dt>响应等级</dt><dd>{{ secondDecision.levelFrom }} → {{ secondDecision.levelTo }}</dd></div>
            <div class="field-row"><dt>预算方案</dt><dd>{{ secondDecision.planFrom }} → {{ secondDecision.planTo }}</dd></div>
            <div class="field-row"><dt>C方案预算上限</dt><dd>{{ money(secondDecision.cap, 1) }} 元</dd></div>
            <div class="field-row"><dt>预备费</dt><dd>{{ money(secondDecision.reserve, 0) }} 元｜{{ secondDecision.reserveState }}</dd></div>
            <div class="field-row"><dt>政府财政资金</dt><dd>{{ money(secondDecision.fiscal, 0) }} 元｜{{ secondDecision.fiscalState }}</dd></div>
            <div class="field-row"><dt>资金覆盖率</dt><dd>{{ resilience.percent.toFixed(2) }}%</dd></div>
            <div class="field-row"><dt>短期资金缺口</dt><dd>{{ money(secondDecision.redCross, 1) }} 元</dd></div>
            <div class="field-row"><dt>红十字会划转申请</dt><dd>{{ money(secondDecision.redCross, 1) }} 元｜{{ secondDecision.redCrossState }}</dd></div>
          </dl>
          <template v-if="flow.isDone('decision')">
            <p class="sys-toast">二次决策已确认：III级 → II级，B方案 → C方案。</p>
          </template>
        </template>

        <template v-else-if="leaf === 'material'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('material')">确认新增物资分析</button>
          </div>
          <p class="form-desc">采购成本保障岗：在 C 方案预算控制范围内启动帐篷追加采购。</p>
          <div class="stat-grid">
            <div v-for="card in extraMaterialCards" :key="card.label" class="stat-cell">
              <span class="stat-label">{{ card.label }}</span>
              <strong class="stat-value small">{{ card.value }}</strong>
            </div>
          </div>
          <table class="calc-table">
            <thead>
              <tr><th>信息项目</th><th>当前情况</th><th>处置建议</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in extraMaterial" :key="row.item">
                <th scope="row">{{ row.item }}</th>
                <td>{{ row.current }}</td>
                <td>{{ row.advice }}</td>
              </tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('material')">
            <p class="sys-toast">{{ extraMaterialFoot }}</p>
          </template>
        </template>

        <template v-else-if="leaf === 'fund-status'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="run('fund-status')">确认资金状态</button>
          </div>
          <p class="form-desc">资金核算风控岗：G03 补充到账后更新资金状态汇总。</p>
          <table class="calc-table">
            <thead>
              <tr><th>指标</th><th>更新结果</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">政府财政资金计划总额</th><td>{{ money(fiscalAfterG03.planned, 0) }} 元</td></tr>
              <tr><th scope="row">灾后0.5h已到账</th><td>{{ money(fiscalAfterG03.firstArrived, 0) }} 元</td></tr>
              <tr><th scope="row">G03本次补充到账</th><td>{{ money(fiscalAfterG03.supplement, 0) }} 元</td></tr>
              <tr><th scope="row">灾后0.8h累计到账</th><td>{{ money(fiscalAfterG03.cumulative, 0) }} 元</td></tr>
              <tr><th scope="row">财政资金到位率</th><td>{{ percent(fiscalAfterG03.arrivalRate, 0) }}</td></tr>
              <tr><th scope="row">财政资金状态</th><td>{{ fiscalAfterG03.status }}</td></tr>
              <tr><th scope="row">限定性捐赠控制原则</th><td>{{ fiscalAfterG03.donationRule }}</td></tr>
            </tbody>
          </table>
          <template v-if="flow.isDone('fund-status')">
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-label">政府财政资金</span>
                <strong class="stat-value small">402万元｜到位率100%｜🟢 全部到位</strong>
              </div>
              <div class="stat-cell">
                <span class="stat-label">限定性捐赠</span>
                <strong class="stat-value small">用途受限｜🟡 按协议匹配使用</strong>
              </div>
            </div>
          </template>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
