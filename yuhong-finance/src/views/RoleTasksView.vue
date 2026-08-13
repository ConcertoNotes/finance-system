<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRole } from '../data/roles.js'
import { getRoleSteps, getTasksByRole } from '../data/tasks.js'
import RoleBadge from '../components/RoleBadge.vue'
import TaskCard from '../components/TaskCard.vue'

const route = useRoute()
const router = useRouter()

const role = computed(() => getRole(route.params.roleId))

const taskList = computed(() =>
  getTasksByRole(route.params.roleId).map((task) => ({
    task,
    ownSteps: getRoleSteps(task, route.params.roleId).length,
  })),
)

const leadCount = computed(() => taskList.value.filter((e) => e.task.owner === role.value.id).length)

const moduleTitle = computed(() => `${role.value.name.replace(/岗$/, '')}模块`)

function openTask(taskKey) {
  router.push({ name: 'task', params: { roleId: route.params.roleId, taskKey } })
}
</script>

<template>
  <div v-if="role" class="page">
    <header class="page-title-bar">
      <div class="page-title-main">
        <h1 class="page-title">{{ role.name }}</h1>
        <p class="page-subtitle">{{ role.responsibility }}</p>
      </div>
      <div class="page-title-side">
        <RoleBadge :role="role" size="lg" />
        <div class="title-stats">
          <div><strong>{{ taskList.length }}</strong><span>承担任务</span></div>
          <div><strong>{{ leadCount }}</strong><span>其中主责</span></div>
        </div>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <h2>岗位权限与边界</h2>
      </div>
      <div class="panel-body permission-body">
        <div class="permission-tags">
          <span v-for="item in role.permissions" :key="item" class="permission-tag">{{ item }}</span>
        </div>
        <p v-if="role.restriction" class="permission-limit">
          <span class="limit-label">权限限制</span>{{ role.restriction }}
        </p>
        <p v-if="role.subRole" class="permission-sub">
          <span class="limit-label">网格副岗</span>{{ role.subRole }}
        </p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>{{ moduleTitle }}</h2>
        <span class="panel-source">共 {{ taskList.length }} 项任务，点击卡片进入</span>
      </div>
      <div class="panel-body">
        <div v-if="taskList.length" class="task-grid">
          <TaskCard
            v-for="entry in taskList"
            :key="entry.task.key"
            :task="entry.task"
            :role-id="role.id"
            :own-steps="entry.ownSteps"
            @open="openTask"
          />
        </div>
        <p v-else class="empty-hint">本岗位暂无任务。</p>
      </div>
    </section>
  </div>
</template>
