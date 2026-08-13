<script setup>
// 变更后合同控制与阶段移交操作台。采购岗复核合同，预算岗确认预备费结余，风控岗建立映射，主管完成阶段审核。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import OperationBlock from './OperationBlock.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { PLAN_C_BUDGET_CAP, changeOrder, handoverSummary } from '../../data/procurement.js'
import { calculateChangeImpact } from '../../domain/procurement.js'
import { money, num, percent, signedPercent } from '../../domain/format.js'

const OPS = ['recheck', 'contingency', 'mapping', 'approve']
const flow = useTaskFlow('s2-t6', OPS)

const BASELINE_PRICE = 846.25

const CONTRACT_MAPPING = ['合同主体', '收款账户', '预算项目', '资金来源']
const DIRECT_MAPPING = ['商超或框架供货方', '采购审批', '订单', '票据', '收款账户', '预算项目']

const emergency = changeOrder.emergencyContract
const impact = computed(() => calculateChangeImpact())

const contractRows = computed(() => [
  {
    code: changeOrder.contractCode,
    executor: handoverSummary.contractExecutor[changeOrder.contractCode],
    content: `帐篷 ${changeOrder.tentBefore} → ${changeOrder.tentAfter} 顶，其余合同物资不变`,
    amount: impact.value.contractAfter,
  },
  {
    code: emergency.code,
    executor: handoverSummary.contractExecutor[emergency.code],
    content: `紧急分单帐篷 ${emergency.quantity} 顶，${emergency.arrivalHours} 小时到货`,
    amount: impact.value.emergency,
  },
])

const contractMapping = reactive(Object.fromEntries(CONTRACT_MAPPING.map((item) => [item, false])))
const directMapping = reactive(Object.fromEntries(DIRECT_MAPPING.map((item) => [item, false])))

const error = ref('')

const deviation = computed(() => (impact.value.goodsUnitCost - BASELINE_PRICE) / BASELINE_PRICE)
const mappedContract = computed(() => CONTRACT_MAPPING.filter((item) => contractMapping[item]))
const mappedDirect = computed(() => DIRECT_MAPPING.filter((item) => directMapping[item]))

function run(id, check) {
  const message = check ? check() : ''
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  flow.complete(id)
}

function checkMapping() {
  const rest =
    CONTRACT_MAPPING.length - mappedContract.value.length + (DIRECT_MAPPING.length - mappedDirect.value.length)
  return rest ? `还有 ${rest} 项映射关系未确认` : ''
}

function resetAll() {
  flow.reset()
  CONTRACT_MAPPING.forEach((item) => { contractMapping[item] = false })
  DIRECT_MAPPING.forEach((item) => { directMapping[item] = false })
  error.value = ''
}
</script>

<template>
  <PanelShell title="变更后合同控制与阶段移交" source="合同履约与阶段移交">
    <div class="op-progress">
      <div class="op-progress-track">
        <span class="op-progress-fill" :style="{ width: `${(flow.progress.value.done / flow.progress.value.total) * 100}%` }" />
      </div>
      <span class="op-progress-text">{{ flow.progress.value.done }} / {{ flow.progress.value.total }} 项操作完成</span>
      <button type="button" class="text-button" @click="resetAll">重置</button>
    </div>

    <p v-if="error" class="sys-toast danger">{{ error }}</p>

    <div class="op-flow">
      <OperationBlock
        title="复核变更后合同"
        hint="采购成本保障岗"
        :status="flow.status('recheck')"
        done-label="合同已复核"
      >
        <table class="calc-table compact">
          <thead>
            <tr><th>合同</th><th>履行方</th><th>内容</th><th class="col-total">金额</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in contractRows" :key="row.code">
              <th scope="row">{{ row.code }}</th>
              <td>{{ row.executor }}</td>
              <td>{{ row.content }}</td>
              <td class="col-total">{{ money(row.amount, 0) }} 元</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">两份合同合计</th>
              <td colspan="2">—</td>
              <td class="col-total">{{ money(impact.contractsTotal, 0) }} 元</td>
            </tr>
          </tfoot>
        </table>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('recheck')" @click="run('recheck')">复核合同</button>
        </div>

        <template #result>
          <p class="sys-toast">
            变更后合同复核完成，采购执行合计 {{ money(impact.executionTotal, 2) }} 元。
          </p>
          <ul class="sys-lines">
            <li>
              {{ changeOrder.contractCode }} 金额 {{ money(impact.contractAfter, 0) }} 元，
              由 {{ handoverSummary.contractExecutor[changeOrder.contractCode] }} 履行
            </li>
            <li>
              {{ emergency.code }} 金额 {{ money(impact.emergency, 0) }} 元，
              由 {{ handoverSummary.contractExecutor[emergency.code] }} 履行
            </li>
            <li>食品、饮用水应急零售/框架协议直采 {{ money(impact.directTotal, 2) }} 元</li>
            <li class="info">{{ handoverSummary.note }}</li>
          </ul>
          <p class="block-formula">
            两份合同合计 = {{ money(impact.contractAfter, 0) }} + {{ money(impact.emergency, 0) }} = {{ money(impact.contractsTotal, 0) }} 元
          </p>
          <p class="block-formula">
            采购执行合计 = {{ money(impact.contractsTotal, 0) }} + {{ money(impact.directTotal, 2) }} = {{ money(impact.executionTotal, 2) }} 元
          </p>
        </template>
      </OperationBlock>

      <OperationBlock
        title="确认预备费阶段性结余"
        hint="应急预算绩效岗"
        :status="flow.status('contingency')"
        done-label="阶段性结余已确认"
      >
        <div class="form-row">
          <label class="form-item">
            <span class="form-label">C方案总预算上限</span>
            <input class="form-control locked" :value="`${money(PLAN_C_BUDGET_CAP, 2)} 元`" readonly />
          </label>
          <label class="form-item">
            <span class="form-label">预备费总额</span>
            <input class="form-control locked" :value="`${money(impact.contingencyTotal, 0)} 元`" readonly />
          </label>
          <label class="form-item">
            <span class="form-label">本次紧急分单使用</span>
            <input class="form-control locked" :value="`${money(impact.contingencyUsed, 0)} 元`" readonly />
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('contingency')" @click="run('contingency')">
            确认结余
          </button>
        </div>

        <template #result>
          <p class="sys-toast">
            新增 {{ money(impact.contingencyUsed, 0) }} 元已纳入 C 方案预备费，C 方案总预算上限 {{ money(PLAN_C_BUDGET_CAP, 2) }} 元不变。
          </p>
          <div class="gauge-track">
            <span class="gauge-fill warn" :style="{ width: percent(impact.contingencyRate, 2) }"></span>
          </div>
          <p class="gauge-caption">
            预备费使用 {{ money(impact.contingencyUsed, 0) }} / {{ money(impact.contingencyTotal, 0) }} = {{ percent(impact.contingencyRate, 2) }}，
            第二阶段结束时预备费阶段性余额 {{ money(impact.contingencyLeft, 0) }} 元。
          </p>
          <div class="calc-subhead"><h3>帐篷综合成本复核</h3></div>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-label">{{ num(changeOrder.tentBefore, 0) }} 顶综合平均成本</span>
              <strong class="stat-value">{{ money(impact.averageUnitCost, 2) }} 元/顶</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">剔除应急运输和人工后</span>
              <strong class="stat-value">{{ money(impact.goodsUnitCost, 2) }} 元/顶</strong>
            </div>
            <div class="stat-cell">
              <span class="stat-label">与基准价 {{ BASELINE_PRICE }} 元偏差</span>
              <strong class="stat-value">{{ signedPercent(deviation, 2) }}</strong>
            </div>
          </div>
          <p class="calc-note">最终余额待复盘阶段结合全部实际结算差异统一计算。</p>
        </template>
      </OperationBlock>

      <OperationBlock
        title="建立合同与直采映射"
        hint="资金核算风控岗"
        :status="flow.status('mapping')"
        done-label="映射已建立"
      >
        <p class="form-desc">两份合同映射</p>
        <div class="checkbox-group">
          <label v-for="item in CONTRACT_MAPPING" :key="item" class="checkbox-item">
            <input v-model="contractMapping[item]" type="checkbox" :disabled="flow.isDone('mapping')" />{{ item }}
          </label>
        </div>
        <p class="form-desc">食品、饮用水直采业务映射</p>
        <div class="checkbox-group">
          <label v-for="item in DIRECT_MAPPING" :key="item" class="checkbox-item">
            <input v-model="directMapping[item]" type="checkbox" :disabled="flow.isDone('mapping')" />{{ item }}
          </label>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('mapping')" @click="run('mapping', checkMapping)">
            确认映射
          </button>
        </div>

        <template #result>
          <p class="sys-toast">映射已建立，后续按合同与直采业务分别核验，不得混同。</p>
          <ul class="sys-lines">
            <li>
              {{ changeOrder.contractCode }}、{{ emergency.code }} 已建立{{ mappedContract.join('、') }}映射
            </li>
            <li>食品、饮用水直采业务已建立{{ mappedDirect.join('、') }}映射</li>
          </ul>
        </template>
      </OperationBlock>

      <OperationBlock
        title="变更后合同控制审核"
        hint="财务主管统筹岗"
        :status="flow.status('approve')"
        done-label="审核通过"
      >
        <div class="stat-grid">
          <div class="stat-cell">
            <span class="stat-label">两份合同合计</span>
            <strong class="stat-value">{{ money(impact.contractsTotal, 0) }} 元</strong>
          </div>
          <div class="stat-cell">
            <span class="stat-label">生活保障直采</span>
            <strong class="stat-value">{{ money(impact.directTotal, 2) }} 元</strong>
          </div>
          <div class="stat-cell">
            <span class="stat-label">采购执行合计</span>
            <strong class="stat-value accent">{{ money(impact.executionTotal, 2) }} 元</strong>
          </div>
          <div class="stat-cell">
            <span class="stat-label">预备费阶段性余额</span>
            <strong class="stat-value">{{ money(impact.contingencyLeft, 0) }} 元</strong>
          </div>
        </div>
        <div class="action-row">
          <button type="button" class="primary-button" :disabled="flow.isDone('approve')" @click="run('approve')">审核通过</button>
        </div>

        <template #result>
          <p class="sys-toast">变更后合同控制审核通过。</p>
          <div class="calc-result">
            <p class="result-line">
              {{ changeOrder.contractCode }} {{ money(impact.contractAfter, 0) }} 元与 {{ emergency.code }}
              {{ money(impact.emergency, 0) }} 元合计 {{ money(impact.contractsTotal, 0) }} 元，
              加生活保障直采 {{ money(impact.directTotal, 2) }} 元，采购执行合计 {{ money(impact.executionTotal, 2) }} 元，
              较初始方案增加 {{ money(impact.executionTotal - impact.initialTotal, 0) }} 元并全部从 C 方案预备费列支，
              预备费阶段性余额 {{ money(impact.contingencyLeft, 0) }} 元结转下一阶段。
            </p>
          </div>
        </template>
      </OperationBlock>
    </div>
  </PanelShell>
</template>
