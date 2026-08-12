<script setup>
import { computed, ref, watch } from 'vue'
import { CheckCheck, CircleDot, Filter, ListChecks, MessageSquareText, Send, ShieldAlert, Sparkles } from '@lucide/vue'
import RoleTaskPanel from '../components/RoleTaskPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { assistantRole, collaborationMessages, coreProblems, defaultRoles } from '../data/roles.js'
import { rehearsalStages, rehearsalTasks } from '../data/rehearsal.js'
import { getRoleTasksByIds } from '../data/roleplay.js'

const props = defineProps({ roles: { type: Array, default: () => defaultRoles } })
const emit = defineEmits(['toast'])
const filterRole = ref('all')
const filterStage = ref('all')
const filterTask = ref('all')
const note = ref('')
const allActors = computed(() => [...props.roles, assistantRole])
const messages = computed(() => collaborationMessages
  .filter((item) => filterRole.value === 'all' || item.roleId === filterRole.value)
  .filter((item) => filterStage.value === 'all' || item.stage === filterStage.value)
  .filter((item) => filterTask.value === 'all' || item.taskId === filterTask.value))
const roleById = (id) => allActors.value.find((role) => role.id === id) ?? assistantRole
const stageById = (id) => rehearsalStages.find((stage) => stage.id === id)

// 任务索引随岗位与阶段收敛：只列出当前筛选条件下真正有留痕的任务
const availableTasks = computed(() => rehearsalTasks.filter((task) => {
  const related = collaborationMessages.filter((item) => item.taskId === task.id)
  if (!related.length) return false
  if (filterStage.value !== 'all' && !related.some((item) => item.stage === filterStage.value)) return false
  if (filterRole.value !== 'all' && !related.some((item) => item.roleId === filterRole.value)) return false
  return true
}))

const activeTaskTitle = computed(() => rehearsalTasks.find((task) => task.id === filterTask.value)?.title ?? '')
const activeRoleTasks = computed(() => (filterTask.value === 'all' ? [] : getRoleTasksByIds([filterTask.value])))

watch([filterRole, filterStage], () => {
  if (filterTask.value !== 'all' && !availableTasks.value.some((task) => task.id === filterTask.value)) {
    filterTask.value = 'all'
  }
})

function sendMessage() {
  if (!note.value.trim()) return
  emit('toast', `协同指令已发送：${note.value.trim()}`)
  note.value = ''
}
</script>

<template>
  <div class="page-content collaboration-page">
    <section class="page-intro"><div><p class="eyebrow">EMERGENCY COLLABORATION</p><h1>应急协同</h1><p>财务主管统筹岗、采购成本保障岗、应急预算绩效岗、资金核算风控岗与数字人御洪星四阶段联动</p></div><StatusBadge label="5 个协同主体在线" tone="success" dot /></section>

    <section class="role-strip"><button type="button" :class="{ active: filterRole === 'all' }" @click="filterRole = 'all'"><div class="role-avatar role-all"><Filter :size="16" /></div><span>全部动态</span><strong>{{ collaborationMessages.length }}</strong></button><button v-for="role in allActors" :key="role.id" type="button" :class="{ active: filterRole === role.id }" :title="role.motto" @click="filterRole = role.id"><div class="role-avatar" :style="{ '--role-color': role.color }">{{ role.id === 'yuhong-star' ? 'AI' : role.shortName.slice(0, 1) }}</div><span>{{ role.name }}</span><strong>{{ collaborationMessages.filter((item) => item.roleId === role.id).length }}</strong></button></section>

    <section class="stage-filter-strip">
      <button type="button" :class="{ active: filterStage === 'all' }" @click="filterStage = 'all'">全部阶段</button>
      <button v-for="stage in rehearsalStages" :key="stage.id" type="button" :class="{ active: filterStage === stage.id }" @click="filterStage = stage.id">{{ stage.name }} · {{ stage.window }}</button>
    </section>

    <section class="task-filter-strip">
      <span class="task-filter-label"><ListChecks :size="14" />任务索引</span>
      <div class="task-filter-scroll">
        <button type="button" :class="{ active: filterTask === 'all' }" @click="filterTask = 'all'">全部任务</button>
        <button v-for="task in availableTasks" :key="task.id" type="button" :class="{ active: filterTask === task.id }" @click="filterTask = task.id">
          <b>{{ task.id }}</b>{{ task.title }}
        </button>
      </div>
    </section>

    <RoleTaskPanel v-if="activeRoleTasks.length" :tasks="activeRoleTasks" :default-open="true" />

    <section class="collaboration-layout">
      <article class="panel timeline-panel"><header class="panel-header"><div><p class="section-index">DECISION TIMELINE</p><h3>{{ filterTask !== 'all' ? `任务 ${filterTask} · ${activeTaskTitle}` : filterStage === 'all' ? '四阶段协同时间线' : `${stageById(filterStage).name}协同时间线` }}</h3></div><StatusBadge :label="`${messages.length} 条决策留痕`" tone="info" /></header><div class="collaboration-timeline"><div v-for="message in messages" :key="message.id" class="timeline-item" :class="`message-${message.type}`"><div class="timeline-time">{{ message.time }}</div><div class="timeline-marker"><i /></div><div class="timeline-content"><div><span class="role-avatar small" :style="{ '--role-color': roleById(message.roleId).color }">{{ message.roleId === 'yuhong-star' ? 'AI' : roleById(message.roleId).shortName.slice(0, 1) }}</span><strong>{{ roleById(message.roleId).name }}</strong><StatusBadge :label="`${stageById(message.stage).name} · 任务 ${message.taskId}`" tone="neutral" /></div><p>{{ message.text }}</p><small><CheckCheck :size="13" /> 已同步至财经决策链</small></div></div></div></article>
      <aside class="collaboration-side">
        <article class="panel problem-card"><header class="panel-header"><div><p class="section-index">CORE PROBLEMS</p><h3>三大核心问题</h3></div><ShieldAlert :size="19" /></header><div class="problem-list"><div v-for="problem in coreProblems" :key="problem.id"><strong>{{ problem.id }}. {{ problem.title }}</strong><p>{{ problem.detail }}</p></div></div></article>
        <article class="panel subrole-card"><header class="panel-header"><div><p class="section-index">DUAL POSTS</p><h3>主岗与网格副岗</h3></div><Sparkles :size="19" /></header><ul class="dual-post-list"><li v-for="role in props.roles.filter((item) => item.subRole)" :key="role.id"><div class="role-avatar small" :style="{ '--role-color': role.color }">{{ role.shortName.slice(0, 1) }}</div><div><strong>{{ role.name }}</strong><span>副岗 · {{ role.subRole.name }}</span><small>{{ role.subRole.motto }}</small></div></li></ul></article>
        <article class="panel assistant-status-card"><header class="panel-header"><div><p class="section-index">AI COORDINATOR</p><h3>数字人御洪星</h3></div><Sparkles :size="19" /></header><div class="ai-orbit"><div><Sparkles :size="30" /></div><span>{{ collaborationMessages.filter((item) => item.roleId === 'yuhong-star').length }}</span><small>跨岗位事件</small></div><ul><li><CircleDot :size="13" />4 次突发事件全部预警</li><li><CircleDot :size="13" />响应升级与合同变更已记录</li><li><CircleDot :size="13" />资金错配与质检异常已拦截</li></ul></article>
        <article class="panel dispatch-panel"><header class="panel-header"><div><p class="section-index">QUICK DISPATCH</p><h3>下发协同指令</h3></div><MessageSquareText :size="19" /></header><textarea v-model="note" rows="4" placeholder="输入岗位协同指令…" /><button class="primary-button full-width" type="button" @click="sendMessage"><Send :size="15" />发送并留痕</button></article>
      </aside>
    </section>
  </div>
</template>
