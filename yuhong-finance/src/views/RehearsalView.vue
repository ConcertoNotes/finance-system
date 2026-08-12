<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, Circle, ExternalLink, FileOutput, Play, RotateCcw, Sparkles, TimerReset, UserRoundCog } from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import EscalationPlayback from '../components/EscalationPlayback.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { rehearsalStages, rehearsalTasks } from '../data/rehearsal.js'

const props = defineProps({
  stage: { type: String, default: 'baseline' },
  completedTaskIds: { type: Array, default: () => [] },
  autoAlert: { type: Boolean, default: true },
  requireApproval: { type: Boolean, default: true },
  showNarration: { type: Boolean, default: true },
})
const emit = defineEmits(['toast', 'changeStage', 'task-completed', 'reset-rehearsal', 'workflow-action', 'navigate'])
const selectedStageId = ref(1)
const selectedTaskId = ref(1)
const executing = ref(false)
const executionProgress = ref(0)
const approvalModalOpen = ref(false)
const playbackOpen = ref(false)
let timer

// 关键决策任务：任务7（升级）与三次突发事件处置任务
const criticalTasks = {
  7: { title: 'II 级响应升级审批', strong: 'B 方案切换至 C 方案', text: '预算上限 4,275,091 元，释放预备费 37.6 万元，并启动 255,091 元补充资金方案。' },
  13: { title: '合同变更组合方案审批', strong: 'S2 保留 350 顶 + S1 分单 150 顶 + 网格调拨 50 顶', text: '批准 HT-001 数量变更、HT-003 紧急分单合同 135,000 元、临时调拨 50 顶与预备费 9,750 元（使用率 2.59%）。' },
  18: { title: '资金来源替换审批', strong: '付款申请4 资金来源由 D01 改为 U01', text: '车辆维修 30,000 元违反 D01 限定性条款（限甲3/甲6食品采购），改用非限定性捐赠 U01，余额 68 万 → 65 万。' },
  21: { title: '冻结资金放行审批', strong: '先支付 126,200 元，冻结 8,800 元', text: '10 顶帐篷由 S1 无偿补货并复验合格后放行冻结款；不另扣违约金，履约评价扣 5 分并保留风险记录。' },
}

const taskAlerts = {
  7: '御洪星预警：甲3、甲6灾情异常更新，请立即重新判级',
  13: '御洪星预警：S2 库存突变，原 500 顶帐篷仅 300 顶可 12 小时内交付',
  18: '御洪星预警：付款申请4 资金用途错配，D01 限定性捐赠不得用于车辆维修',
  21: '御洪星预警：HT-003 质检仅 140 顶合格，10 顶外观和防水涂层破损',
}

const taskWorkflowActions = {
  13: 'resolve-contract-change',
  18: 'resolve-fund-swap',
  21: 'release-quality-hold',
}

const completed = computed(() => props.completedTaskIds)
const selectedStage = computed(() => rehearsalStages.find((stage) => stage.id === selectedStageId.value))
const stageTasks = computed(() => rehearsalTasks.filter((task) => selectedStage.value.taskIds.includes(task.id)))
const selectedTask = computed(() => rehearsalTasks.find((task) => task.id === selectedTaskId.value))
const totalProgress = computed(() => Math.round((completed.value.length / rehearsalTasks.length) * 100))
const activeCritical = computed(() => criticalTasks[selectedTaskId.value])

function stageProgress(stage) {
  const done = stage.taskIds.filter((taskId) => completed.value.includes(taskId)).length
  return { done, total: stage.taskIds.length }
}

function selectStage(stageId) {
  selectedStageId.value = stageId
  const stage = rehearsalStages.find((item) => item.id === stageId)
  const firstUnfinished = stage.taskIds.find((taskId) => !completed.value.includes(taskId))
  selectedTaskId.value = firstUnfinished ?? stage.taskIds[0]
}

function executeTask() {
  if (executing.value) return
  if (selectedTaskId.value === 7) {
    // 任务7 按 Excel 剧本走九步推演：御洪星预警 → 九步处置 → 财务主管升级审批
    playbackOpen.value = true
    return
  }
  if (criticalTasks[selectedTaskId.value] && props.requireApproval) {
    approvalModalOpen.value = true
    return
  }
  startExecution()
}

function finishPlayback() {
  playbackOpen.value = false
  if (props.requireApproval) {
    approvalModalOpen.value = true
    return
  }
  completeEscalation()
}

function completeEscalation() {
  emit('task-completed', 7)
  emit('changeStage', 'escalated')
  emit('toast', '任务 7 已完成：响应升级至 II 级并切换 C 方案，驾驶舱与资金状态已更新')
  advanceToNext(7)
}

function goToWorkspace() {
  if (!selectedTask.value.targetView) return
  emit('navigate', selectedTask.value.targetView)
}

function startExecution() {
  executing.value = true
  executionProgress.value = 0
  timer = window.setInterval(() => {
    executionProgress.value = Math.min(100, executionProgress.value + 10)
    if (executionProgress.value === 100) {
      window.clearInterval(timer)
      executing.value = false
      const taskId = selectedTaskId.value
      emit('task-completed', taskId)
      if (taskId === 7) emit('changeStage', 'escalated')
      if (taskWorkflowActions[taskId]) emit('workflow-action', { action: taskWorkflowActions[taskId], payload: { approver: '财务主管统筹岗' } })
      emit('toast', `任务 ${taskId} 已完成：${selectedTask.value.output}`)
      advanceToNext(taskId)
    }
  }, 90)
}

function advanceToNext(taskId) {
  const index = rehearsalTasks.findIndex((task) => task.id === taskId)
  const nextTask = rehearsalTasks[index + 1]
  if (!nextTask) return
  selectedTaskId.value = nextTask.id
  const nextStage = rehearsalStages.find((stage) => stage.taskIds.includes(nextTask.id))
  if (nextStage && nextStage.id !== selectedStageId.value) {
    selectedStageId.value = nextStage.id
    emit('toast', `进入${nextStage.name}：${nextStage.theme}`)
  }
}

function approveCriticalTask() {
  approvalModalOpen.value = false
  emit('toast', '财务主管统筹岗已确认处置方案')
  if (selectedTaskId.value === 7) {
    completeEscalation()
    return
  }
  startExecution()
}

function resetRehearsal() {
  selectedStageId.value = 1
  selectedTaskId.value = 1
  executionProgress.value = 0
  emit('reset-rehearsal')
  emit('changeStage', 'baseline')
  emit('toast', '四阶段演练已重置')
}

onBeforeUnmount(() => window.clearInterval(timer))

watch(selectedTaskId, (taskId) => {
  if (taskAlerts[taskId] && props.autoAlert) emit('toast', taskAlerts[taskId])
})
</script>

<template>
  <div class="page-content rehearsal-page" aria-label="任务 1 至任务 27 四阶段全流程演练">
    <section class="page-intro"><div><p class="eyebrow">FOUR-STAGE REHEARSAL</p><h1>阶段演练</h1><p>按比赛叙事完整串联四阶段、四岗位与四次突发事件的财经决策流程</p></div><button class="secondary-button" type="button" @click="resetRehearsal"><RotateCcw :size="15" />重置演练</button></section>

    <section class="rehearsal-progress-panel"><div><span>演练总进度</span><strong>{{ completed.length }} / {{ rehearsalTasks.length }}</strong></div><div class="progress-track wide"><i :style="{ width: `${totalProgress}%` }" /></div><b>{{ totalProgress }}%</b></section>

    <section class="stage-tabs">
      <button v-for="stage in rehearsalStages" :key="stage.id" type="button" :class="{ active: selectedStageId === stage.id, done: stageProgress(stage).done === stageProgress(stage).total }" @click="selectStage(stage.id)">
        <span>{{ stage.name }} · {{ stage.window }}</span>
        <strong>{{ stage.theme }}</strong>
        <div class="stage-tab-progress"><i :style="{ width: `${(stageProgress(stage).done / stageProgress(stage).total) * 100}%` }" /></div>
        <small>{{ stageProgress(stage).done }} / {{ stageProgress(stage).total }} · {{ stage.goal }}</small>
      </button>
    </section>

    <section class="rehearsal-layout">
      <aside class="task-rail"><button v-for="task in stageTasks" :key="task.id" type="button" :class="{ active: selectedTaskId === task.id, completed: completed.includes(task.id) }" @click="selectedTaskId = task.id"><span><Check v-if="completed.includes(task.id)" :size="14" /><template v-else>{{ String(task.id).padStart(2, '0') }}</template></span><div><strong>{{ task.title }}</strong><small>{{ task.role }} · {{ task.duration }}</small></div><ChevronRight :size="16" /></button></aside>
      <main class="task-workspace">
        <section class="task-hero" :class="{ 'task-critical': Boolean(activeCritical) }"><div class="task-number">TASK {{ String(selectedTask.id).padStart(2, '0') }}</div><div><StatusBadge :label="selectedTask.role" tone="info" /><h2>{{ selectedTask.title }}</h2><p>{{ selectedTask.summary }}</p></div><div class="task-duration"><TimerReset :size="17" /><span>建议用时</span><strong>{{ selectedTask.duration }}</strong></div></section>
        <section v-if="showNarration" class="task-narration"><Sparkles :size="17" /><div><span>比赛讲解旁白</span><p>{{ selectedTask.narration }}</p></div></section>
        <section class="task-grid"><article class="panel task-steps-panel"><header class="panel-header"><div><p class="section-index">EXECUTION STEPS</p><h3>执行步骤</h3></div><UserRoundCog :size="19" /></header><ol><li v-for="(step, index) in selectedTask.steps" :key="step"><span>{{ String(index + 1).padStart(2, '0') }}</span><p>{{ step }}</p><CheckCircle2 v-if="completed.includes(selectedTask.id)" :size="17" /></li></ol></article><article class="panel task-output-panel"><header class="panel-header"><div><p class="section-index">KEY OUTPUT</p><h3>关键指标与产出</h3></div><FileOutput :size="19" /></header><div class="task-metrics"><div v-for="metric in selectedTask.metrics" :key="metric"><Circle :size="10" /><span>{{ metric }}</span></div></div><div class="output-document"><FileOutput :size="24" /><div><span>任务产出</span><strong>{{ selectedTask.output }}</strong><small>{{ completed.includes(selectedTask.id) ? '已生成并同步' : '等待执行生成' }}</small></div></div><button class="primary-button full-width task-execute" type="button" :disabled="executing" @click="executeTask"><Play :size="16" />{{ executing ? `正在执行 ${executionProgress}%` : selectedTask.id === 7 ? '进入九步处置推演' : completed.includes(selectedTask.id) ? '重新复核任务' : '开始执行任务' }}</button><button v-if="selectedTask.targetView" class="secondary-button full-width task-workspace-link" type="button" @click="goToWorkspace"><ExternalLink :size="15" />{{ selectedTask.actionLabel || '前往实操页面' }}</button><div v-if="executing" class="progress-track wide"><i :style="{ width: `${executionProgress}%` }" /></div></article></section>
      </main>
    </section>

    <BaseModal :open="playbackOpen" title="第一次突发事件 · 受灾人数突然增加" description="按 Excel 剧本九步处置：导入数据 → 校验来源 → 更新驾驶舱 → 重新判级 → 更新安置人天 → 重算成本 → 对比预算 → 归因分析 → 资金缺口" width="880px" @close="playbackOpen = false">
      <EscalationPlayback @finish="finishPlayback" />
    </BaseModal>
    <BaseModal :open="approvalModalOpen" :title="activeCritical?.title ?? '关键决策审批'" description="关键决策审批已启用，需财务主管统筹岗确认后执行" @close="approvalModalOpen = false"><div class="critical-approval"><AlertTriangle :size="24" /><div><strong>{{ activeCritical?.strong }}</strong><p>{{ activeCritical?.text }}</p></div></div><template #footer><button class="secondary-button" type="button" @click="approvalModalOpen = false">暂缓</button><button class="primary-button" type="button" @click="approveCriticalTask"><Check :size="15" />确认并执行</button></template></BaseModal>
  </div>
</template>
