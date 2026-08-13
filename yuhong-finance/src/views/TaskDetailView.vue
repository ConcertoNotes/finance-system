<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRole, getRoleName } from '../data/roles.js'
import { getNeighbourTasks, getTask, getTaskSeq } from '../data/tasks.js'
import TaskPanelHost from '../components/panels/TaskPanelHost.vue'

const route = useRoute()
const router = useRouter()

const roleId = computed(() => route.params.roleId)
const task = computed(() => getTask(route.params.taskKey))
const role = computed(() => getRole(roleId.value))
const seq = computed(() => getTaskSeq(roleId.value, route.params.taskKey))
const neighbours = computed(() => getNeighbourTasks(roleId.value, route.params.taskKey))

const collaboratorNames = computed(() =>
  task.value.roles.filter((id) => id !== task.value.owner).map(getRoleName).join('、'),
)

function goRole() {
  router.push({ name: 'role', params: { roleId: roleId.value } })
}

function goTask(target) {
  router.push({ name: 'task', params: { roleId: roleId.value, taskKey: target.key } })
}
</script>

<template>
  <div v-if="task && role" class="page task-page">
    <nav class="breadcrumb">
      <button type="button" class="crumb-link" @click="router.push('/')">首页</button>
      <span class="crumb-sep">/</span>
      <button type="button" class="crumb-link" @click="goRole">{{ role.name }}</button>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ task.title }}</span>
    </nav>

    <header class="task-header">
      <div class="task-header-main">
        <div class="task-header-tags">
          <span class="task-no-tag">任务 {{ seq }}</span>
          <span class="owner-tag">主责 <b>{{ getRoleName(task.owner) }}</b></span>
          <span v-if="collaboratorNames" class="stage-tag">协同 <b>{{ collaboratorNames }}</b></span>
        </div>
        <h1 class="task-title">{{ task.title }}</h1>
        <p class="task-summary">{{ task.summary }}</p>
      </div>
      <div class="task-header-actions">
        <button type="button" class="ghost-button" @click="goRole">返回岗位</button>
        <div class="task-nav">
          <button type="button" class="ghost-button" :disabled="!neighbours.prev" @click="goTask(neighbours.prev)">
            上一任务
          </button>
          <button type="button" class="primary-button" :disabled="!neighbours.next" @click="goTask(neighbours.next)">
            下一任务
          </button>
        </div>
      </div>
    </header>

    <div v-if="task.outputs.length" class="output-strip">
      <span class="output-label">任务输出</span>
      <span v-for="item in task.outputs" :key="item" class="output-chip">《{{ item }}》</span>
    </div>

    <TaskPanelHost :panel="task.panel" :task="task" />
  </div>

  <div v-else class="page">
    <p class="empty-hint">未找到该任务。</p>
  </div>
</template>
