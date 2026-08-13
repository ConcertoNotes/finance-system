<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { assistant, roles } from '../data/roles.js'
import { getTasksByRole } from '../data/tasks.js'
import ClearPageData from '../components/ClearPageData.vue'

const route = useRoute()
const router = useRouter()

const COLLAPSE_KEY = 'yuhong-sidebar-collapsed'
const collapsed = ref(false)
const clock = ref('')

/* 清除数据后自增，强制当前视图重新挂载，使面板从 localStorage 重新读取（此时已为空）。 */
const viewVersion = ref(0)

function remountView() {
  viewVersion.value += 1
}

onMounted(() => {
  const saved = localStorage.getItem(COLLAPSE_KEY)
  if (saved !== null) collapsed.value = JSON.parse(saved)
  tick()
  setInterval(tick, 1000)
})

function tick() {
  clock.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function toggleSidebar() {
  collapsed.value = !collapsed.value
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed.value))
}

const activeRoleId = computed(() => route.params.roleId ?? '')
const activeTaskKey = computed(() => route.params.taskKey ?? '')

const navRoles = computed(() =>
  roles.map((role) => {
    const tasks = getTasksByRole(role.id)
    return { ...role, tasks, total: tasks.length }
  }),
)

function openRole(roleId) {
  router.push({ name: 'role', params: { roleId } })
}

function openTask(roleId, taskKey) {
  router.push({ name: 'task', params: { roleId, taskKey } })
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand" @click="router.push('/')">
        <span class="brand-mark">御</span>
        <div class="brand-text">
          <h1>御洪智策</h1>
          <p>洪涝应急财经决策平台</p>
        </div>
      </div>
      <div class="header-meta">
        <span class="event-chip"><span class="meta-key">汛情</span>F-2026-0803</span>
        <span class="project-chip"><span class="meta-key">项目</span>HJ-2026-001</span>
        <span class="clock">{{ clock }}</span>
        <ClearPageData @cleared="remountView" />
      </div>
    </header>

    <div class="app-body">
      <aside class="app-sidebar" :class="{ collapsed }">
        <button class="sidebar-toggle" type="button" @click="toggleSidebar">
          <span class="toggle-icon">{{ collapsed ? '»' : '«' }}</span>
          <span v-if="!collapsed" class="toggle-label">收起导航</span>
        </button>

        <nav class="sidebar-nav">
          <router-link to="/" class="nav-item" :class="{ active: route.name === 'home' }">
            <span class="nav-code">00</span>
            <span v-if="!collapsed" class="nav-label">首页总览</span>
          </router-link>

          <p v-if="!collapsed" class="nav-group-title">岗位工作台</p>

          <div v-for="role in navRoles" :key="role.id" class="nav-role">
            <button
              type="button"
              class="nav-item role-item"
              :class="{ active: activeRoleId === role.id }"
              @click="openRole(role.id)"
            >
              <span class="nav-code">{{ role.code }}</span>
              <span v-if="!collapsed" class="nav-label">{{ role.name }}</span>
              <span v-if="!collapsed" class="nav-count">{{ role.total }}</span>
            </button>

            <div v-if="!collapsed && activeRoleId === role.id" class="nav-tasks">
              <button
                v-for="task in role.tasks"
                :key="task.key"
                type="button"
                class="nav-task"
                :class="{ active: activeTaskKey === task.key }"
                @click="openTask(role.id, task.key)"
              >
                <span class="nav-task-no">{{ task.seq }}</span>
                <span class="nav-task-title">{{ task.title }}</span>
              </button>
              <p v-if="!role.tasks.length" class="nav-empty">本岗位暂无任务</p>
            </div>
          </div>

          <p v-if="!collapsed" class="nav-group-title">辅助资源</p>

          <router-link to="/assistant" class="nav-item" :class="{ active: route.name === 'assistant' }">
            <span class="nav-code">{{ assistant.code }}</span>
            <span v-if="!collapsed" class="nav-label">{{ assistant.name }}</span>
          </router-link>
          <router-link to="/workbooks" class="nav-item" :class="{ active: route.name === 'workbooks' }">
            <span class="nav-code">DS</span>
            <span v-if="!collapsed" class="nav-label">补充数据表</span>
          </router-link>
        </nav>
      </aside>

      <main class="app-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="`${route.fullPath}#${viewVersion}`" />
        </router-view>
      </main>
    </div>
  </div>
</template>
