<script setup>
import { computed, ref } from 'vue'
import {
  BarChart3, BookOpenCheck, Boxes, ClipboardCheck, Database, LayoutDashboard, Menu,
  Network, Settings, ShieldCheck, Sparkles, WalletCards, X,
} from '@lucide/vue'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import AssistantPanel from './components/AssistantPanel.vue'
import ToastStack from './components/ToastStack.vue'
import { rehearsalTasks } from './data/rehearsal.js'
import { defaultRoles } from './data/roles.js'
import { clearRehearsalProgress, loadRehearsalProgress, saveRehearsalProgress } from './domain/rehearsalProgress.js'
import { loadCustomRoles } from './domain/roleRegistry.js'
import { getRoleHomeView } from './domain/roleWorkspace.js'
import { applyWorkflowAction, createWorkflowState, loadWorkflowState, saveWorkflowState } from './domain/workflowArtifacts.js'
import DashboardView from './views/DashboardView.vue'
import DataCenterView from './views/DataCenterView.vue'
import BudgetView from './views/BudgetView.vue'
import ProcurementView from './views/ProcurementView.vue'
import FundsView from './views/FundsView.vue'
import CollaborationView from './views/CollaborationView.vue'
import RehearsalView from './views/RehearsalView.vue'
import ReviewView from './views/ReviewView.vue'
import SettingsView from './views/SettingsView.vue'

const navigation = [
  { id: 'dashboard', label: '综合驾驶舱', eyebrow: 'COMMAND OVERVIEW', icon: LayoutDashboard },
  { id: 'data', label: '灾情数据中心', eyebrow: 'DATA GOVERNANCE', icon: Database },
  { id: 'budget', label: '预算决策中心', eyebrow: 'BUDGET SCENARIOS', icon: BarChart3 },
  { id: 'procurement', label: '采购与成本', eyebrow: 'PROCUREMENT', icon: Boxes },
  { id: 'funds', label: '资金核算风控', eyebrow: 'FUND CONTROL', icon: WalletCards },
  { id: 'review', label: '复盘与绩效', eyebrow: 'REVIEW & FEEDBACK', icon: ClipboardCheck },
  { id: 'collaboration', label: '应急协同', eyebrow: 'ROLE WORKFLOW', icon: Network },
  { id: 'rehearsal', label: '阶段演练', eyebrow: 'STAGE REHEARSAL', icon: BookOpenCheck },
  { id: 'settings', label: '系统配置', eyebrow: 'CONFIGURATION', icon: Settings },
]

const storedRehearsalProgress = loadRehearsalProgress(window.localStorage, rehearsalTasks.map((task) => task.id))
const REHEARSAL_SETTINGS_KEY = 'yuhong-rehearsal-settings'
const defaultRehearsalSettings = { autoAlert: true, requireApproval: true, showNarration: true }
let storedRehearsalSettings = defaultRehearsalSettings
try {
  storedRehearsalSettings = { ...defaultRehearsalSettings, ...JSON.parse(window.localStorage.getItem(REHEARSAL_SETTINGS_KEY) || '{}') }
} catch {
  storedRehearsalSettings = defaultRehearsalSettings
}
const activeView = ref('dashboard')
const stage = ref(storedRehearsalProgress.includes(7) ? 'escalated' : 'baseline')
const activeRoleId = ref(defaultRoles[0].id)
const assistantOpen = ref(false)
const sidebarOpen = ref(false)
const toasts = ref([])
const customRoles = ref(loadCustomRoles(window.localStorage))
const completedRehearsalTasks = ref(storedRehearsalProgress)
const preserveRehearsalProgress = ref(true)
const rehearsalSettings = ref(storedRehearsalSettings)
const workflowState = ref(loadWorkflowState(window.localStorage))

const viewComponents = {
  dashboard: DashboardView,
  data: DataCenterView,
  budget: BudgetView,
  procurement: ProcurementView,
  funds: FundsView,
  review: ReviewView,
  collaboration: CollaborationView,
  rehearsal: RehearsalView,
  settings: SettingsView,
}

const activeNavigation = computed(() => navigation.find((item) => item.id === activeView.value))
const allRoles = computed(() => [...defaultRoles, ...customRoles.value])
const activeRole = computed(() => allRoles.value.find((role) => role.id === activeRoleId.value) ?? defaultRoles[0])
const activeComponent = computed(() => viewComponents[activeView.value])
const rehearsalProgress = computed(() => {
  const completed = completedRehearsalTasks.value.length
  const currentTask = rehearsalTasks.find((task) => !completedRehearsalTasks.value.includes(task.id))
  return {
    completed,
    total: rehearsalTasks.length,
    percentage: Math.round((completed / rehearsalTasks.length) * 100),
    currentTitle: currentTask?.title ?? '四阶段演练已完成',
  }
})
const activeViewProps = computed(() => {
  if (activeView.value === 'collaboration') return { roles: allRoles.value }
  if (activeView.value === 'settings') return { roles: allRoles.value, preserveRehearsalProgress: preserveRehearsalProgress.value, rehearsalSettings: rehearsalSettings.value }
  if (activeView.value === 'rehearsal') return { stage: stage.value, completedTaskIds: completedRehearsalTasks.value, ...rehearsalSettings.value }
  return { stage: stage.value, workflowState: workflowState.value }
})

function navigate(id) {
  activeView.value = id
  sidebarOpen.value = false
}

function changeRole(roleId) {
  const role = allRoles.value.find((item) => item.id === roleId)
  if (!role) return

  const targetView = getRoleHomeView(roleId)
  activeRoleId.value = roleId
  activeView.value = targetView
  sidebarOpen.value = false
  const destination = navigation.find((item) => item.id === targetView)?.label ?? '应急协同'
  addToast(`已切换至${role.name}，进入${destination}`, 'info')
}

function addToast(message, tone = 'success') {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, message, tone })
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }, 3200)
}

function updateCustomRoles(roles) {
  customRoles.value = roles
}

function completeRehearsalTask(taskId) {
  if (completedRehearsalTasks.value.includes(taskId)) return
  completedRehearsalTasks.value = [...completedRehearsalTasks.value, taskId].sort((a, b) => a - b)
  if (preserveRehearsalProgress.value) saveRehearsalProgress(window.localStorage, completedRehearsalTasks.value)
}

function resetRehearsalProgress() {
  completedRehearsalTasks.value = []
  clearRehearsalProgress(window.localStorage)
  workflowState.value = createWorkflowState()
  saveWorkflowState(window.localStorage, workflowState.value)
}

function updatePreserveRehearsalProgress(enabled) {
  preserveRehearsalProgress.value = enabled
  if (enabled) saveRehearsalProgress(window.localStorage, completedRehearsalTasks.value)
  else clearRehearsalProgress(window.localStorage)
}

function updateRehearsalSettings(settings) {
  rehearsalSettings.value = { ...defaultRehearsalSettings, ...settings }
  window.localStorage.setItem(REHEARSAL_SETTINGS_KEY, JSON.stringify(rehearsalSettings.value))
  addToast('演练行为设置已生效', 'info')
}

function handleWorkflowAction({ action, payload }) {
  workflowState.value = applyWorkflowAction(workflowState.value, action, payload)
  saveWorkflowState(window.localStorage, workflowState.value)
}
</script>

<template>
  <div class="app-shell" :class="{ 'is-escalated': stage === 'escalated' }">
    <button class="mobile-menu icon-button" type="button" title="打开导航" @click="sidebarOpen = true">
      <Menu :size="20" />
    </button>

    <AppSidebar
      :active-view="activeView"
      :active-role="activeRole"
      :items="navigation"
      :open="sidebarOpen"
      :rehearsal-progress="rehearsalProgress"
      @navigate="navigate"
      @close="sidebarOpen = false"
    />

    <main class="app-main">
      <AppHeader
        :active-navigation="activeNavigation"
        :active-role-id="activeRoleId"
        :roles="allRoles"
        :stage="stage"
        @change-role="changeRole"
        @change-stage="stage = $event"
        @notify="addToast('已标记全部预警为已读')"
      />

      <component
        :is="activeComponent"
        v-bind="activeViewProps"
        @toast="addToast($event)"
        @change-stage="stage = $event"
        @roles-updated="updateCustomRoles"
        @task-completed="completeRehearsalTask"
        @reset-rehearsal="resetRehearsalProgress"
        @change-preserve-progress="updatePreserveRehearsalProgress"
        @update-rehearsal-settings="updateRehearsalSettings"
        @workflow-action="handleWorkflowAction"
        @navigate="navigate"
      />
    </main>

    <button class="assistant-fab" type="button" title="御洪星助手" @click="assistantOpen = !assistantOpen">
      <X v-if="assistantOpen" :size="20" />
      <Sparkles v-else :size="20" />
    </button>
    <AssistantPanel
      v-if="assistantOpen"
      :active-view="activeView"
      :stage="stage"
      @action="addToast($event)"
      @close="assistantOpen = false"
    />
    <ToastStack :toasts="toasts" />
  </div>
</template>
