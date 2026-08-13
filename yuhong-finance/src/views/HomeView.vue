<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { roles } from '../data/roles.js'
import { allTasksInOrder, getTasksByRole } from '../data/tasks.js'

const router = useRouter()

const roleCards = computed(() =>
  roles.map((role) => {
    const tasks = getTasksByRole(role.id)
    return { ...role, total: tasks.length, lead: tasks.filter((t) => t.owner === role.id).length }
  }),
)
</script>

<template>
  <div class="page">
    <header class="page-title-bar">
      <div class="page-title-main">
        <h1 class="page-title">御洪智策 · 洪涝应急财经决策平台</h1>
        <p class="page-subtitle">
          业务内容取自四份岗位工作簿与两张计算表。左侧选择岗位后，右侧显示该岗位承担的全部任务卡片，点击卡片进入任务操作台。
        </p>
      </div>
      <div class="page-title-side">
        <div class="title-stats">
          <div><strong>4</strong><span>业务岗位</span></div>
          <div><strong>{{ allTasksInOrder.length }}</strong><span>业务任务</span></div>
        </div>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <h2>岗位工作台</h2>
        <span class="panel-source">点击岗位进入其任务卡片列表</span>
      </div>
      <div class="panel-body">
        <div class="role-grid">
          <button
            v-for="role in roleCards"
            :key="role.id"
            type="button"
            class="role-card"
            @click="router.push({ name: 'role', params: { roleId: role.id } })"
          >
            <div class="role-card-head">
              <span class="role-card-mark">{{ role.code }}</span>
              <span class="role-card-count">{{ role.total }} 个任务</span>
            </div>
            <h3 class="role-card-title">{{ role.name }}</h3>
            <p class="role-card-desc">{{ role.responsibility }}</p>
            <div class="role-card-stages">
              <span>主责 <b>{{ role.lead }}</b></span>
              <span>协同 <b>{{ role.total - role.lead }}</b></span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>业务流程全景</h2>
        <span class="panel-source">{{ allTasksInOrder.length }} 项任务按执行顺序排列</span>
      </div>
      <div class="panel-body">
        <ol class="stage-flow">
          <li
            v-for="task in allTasksInOrder"
            :key="task.key"
            @click="router.push({ name: 'task', params: { roleId: task.owner, taskKey: task.key } })"
          >
            <span class="flow-no">{{ task.seq }}</span>
            <div class="flow-body">
              <strong>{{ task.title }}</strong>
              <p>{{ task.summary }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>
