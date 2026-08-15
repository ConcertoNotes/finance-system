<script setup>
// 按当前《洪涝阶段二.xlsx》任务5前两步：交叉核验 + 可复制的合同影响测算表。
import { computed, reactive, ref } from 'vue'
import PanelShell from './PanelShell.vue'
import SystemShell from '../system/SystemShell.vue'
import { useTaskFlow } from '../../composables/useTaskFlow.js'
import { useFormPersist } from '../../composables/useFormPersist.js'
import { incident, verifyMaterials } from '../../data/procurement.js'
import { copyTsv } from '../../domain/clipboard.js'
import { num, percent } from '../../domain/format.js'

const PAGES = ['verify', 'impact']
const flow = useTaskFlow('s2-t5', PAGES)
const store = useFormPersist('s2-t5')

const menu = [
  {
    id: 'm-event',
    label: '突发事件处置',
    children: [
      { id: 'verify', label: '核验异常真实性' },
      { id: 'impact', label: '识别合同影响' },
    ],
  },
]

const fetched = ref(false)
const checked = reactive(Object.fromEntries(verifyMaterials.map((item) => [item, false])))
const activeId = ref('')
const error = ref('')
const copied = ref('')

const impactRows = computed(() => {
  const original = incident.originalQuantity
  const h12 = incident.deliverable12h
  const extra24 = incident.deliverable24h
  const confirmed24 = h12 + extra24
  const gap12 = original - h12
  const unknown = original - confirmed24
  return [
    { name: '原合同帐篷数量', qty: original, note: 'HT-2025-001原合同数量' },
    { name: '12小时内可交付', qty: h12, note: '可满足首批应急交付' },
    { name: '12小时保障缺口', qty: gap12, note: '12小时重点保障仍缺200顶' },
    { name: '12小时交付率', qty: h12 / original, note: '首批合同履约水平', rate: true },
    { name: '24小时内追加可交付', qty: extra24, note: '12小时后可追加供应' },
    { name: '24小时累计可交付', qty: confirmed24, note: '当前能够确认的合同供应量' },
    { name: '24小时累计交付率', qty: confirmed24 / original, note: '确定可履约比例', rate: true },
    { name: '无法确定交付数量', qty: unknown, note: '交付时间暂无法确定' },
    { name: '最终合同供应缺口', qty: unknown, note: '需启动备选供应保障' },
    { name: '不确定供应占比', qty: unknown / original, note: '原合同30%存在履约风险', rate: true },
  ]
})

store.restore({ fetched, checked })

function snapshot() {
  return { fetched: fetched.value, checked }
}

function fetchMaterials() {
  fetched.value = true
  verifyMaterials.forEach((item) => { checked[item] = true })
  store.persist(snapshot())
  error.value = ''
}

function saveVerify() {
  if (!fetched.value) {
    error.value = '请先调取S2供应商运输材料'
    return
  }
  if (verifyMaterials.some((item) => !checked[item])) {
    error.value = '五项材料均须核验'
    return
  }
  error.value = ''
  store.persist(snapshot())
  flow.complete('verify')
}

function saveImpact() {
  error.value = ''
  store.persist(snapshot())
  flow.complete('impact')
}

async function copyImpact() {
  await copyTsv([
    ['测算项目', '数量（顶）', '说明'],
    ...impactRows.value.map((row) => [row.name, row.rate ? percent(row.qty, 0) : row.qty, row.note]),
  ])
  copied.value = '合同影响测算表已复制，可粘贴到 Excel 计算'
}

function resetAll() {
  flow.reset()
  store.clear()
  fetched.value = false
  verifyMaterials.forEach((item) => { checked[item] = false })
  error.value = ''
  copied.value = ''
}
</script>

<template>
  <PanelShell title="第二次突发事件——供应商库存突变，重点物资无法按时足量交付" source="履约异常处置">
    <SystemShell
      system="应急采购管理系统"
      operator="采购成本保障岗"
      login-hint="登录后从左侧功能菜单逐级进入需要办理的业务页面。"
      :menu="menu"
      :completed="flow.done.value"
      :error="error"
      v-model:active-id="activeId"
      @reset="resetAll"
    >
      <template #default="{ leaf }">
        <template v-if="leaf === 'verify'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="fetchMaterials">调取S2供应商运输材料</button>
            <button type="button" class="primary-button" @click="saveVerify">一键交叉核验</button>
          </div>
          <p class="form-desc">{{ incident.title }}。第一步：核验异常真实性。</p>
          <div class="checkbox-group">
            <label v-for="item in verifyMaterials" :key="item" class="checkbox-item">
              <input v-model="checked[item]" type="checkbox" />{{ item }}：已核验
            </label>
          </div>
          <template v-if="flow.isDone('verify')">
            <section class="status-board">
              <h3>异常真实性核验结果：通过</h3>
              <ul>
                <li>异常供应商：S2</li>
                <li>关联合同：HT-2025-001</li>
                <li>异常类型：仓储受灾导致库存及交付能力下降</li>
                <li>现场情况：仓库局部进水</li>
                <li>数据一致性：✅ 多源数据相互印证</li>
                <li>虚假库存风险：✅ 未发现</li>
                <li>恶意拒绝履约风险：✅ 未发现</li>
                <li>综合判断：客观履约异常，进入应急供应保障调整流程。</li>
              </ul>
            </section>
          </template>
        </template>

        <template v-else-if="leaf === 'impact'">
          <div class="sys-toolbar">
            <button type="button" class="primary-button" @click="saveImpact">确认合同影响</button>
            <button type="button" class="ghost-button" @click="copyImpact">复制到 Excel 计算</button>
          </div>
          <p class="form-desc">原合同500顶中，12小时内可交付300顶，24小时内可交付50顶，无法确定交付150顶。本表要可以复制到 Excel 计算。</p>
          <div class="score-table-wrap">
            <table class="calc-table compact center-text">
              <thead><tr><th>测算项目</th><th>数量（顶）</th><th>说明</th></tr></thead>
              <tbody>
                <tr v-for="row in impactRows" :key="row.name">
                  <th scope="row">{{ row.name }}</th>
                  <td>{{ row.rate ? percent(row.qty, 0) : num(row.qty, 0) }}</td>
                  <td>{{ row.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="copied" class="calc-note">{{ copied }}</p>
          <p v-if="flow.isDone('impact')" class="sys-toast">12小时保障缺口 200 顶，最终合同供应缺口 150 顶。</p>
        </template>
      </template>
    </SystemShell>
  </PanelShell>
</template>
