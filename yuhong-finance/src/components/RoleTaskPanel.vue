<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronDown, Users } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import { assistantRole, defaultRoles } from '../data/roles.js'

const props = defineProps({
  tasks: { type: Array, required: true },
  defaultOpen: { type: Boolean, default: false },
})

const open = ref(props.defaultOpen)
const filterRole = ref('all')

// 数字人御洪星也会在任务中发言，需与四个岗位一同参与筛选
const actors = [...defaultRoles, assistantRole]
const roleById = (id) => actors.find((role) => role.id === id) ?? assistantRole
const initialOf = (role) => (role.id === 'yuhong-star' ? 'AI' : role.shortName.slice(0, 1))

// 出现在当前任务集合中的岗位，按固定顺序排列并统计发言条数
const involvedRoles = computed(() => {
  const counts = new Map()
  props.tasks.forEach((task) => task.posts.forEach((post) => {
    counts.set(post.roleId, (counts.get(post.roleId) ?? 0) + post.lines.length)
  }))
  return actors.filter((role) => counts.has(role.id)).map((role) => ({ ...role, count: counts.get(role.id) }))
})

const visibleTasks = computed(() => props.tasks
  .map((task) => ({
    ...task,
    posts: filterRole.value === 'all' ? task.posts : task.posts.filter((post) => post.roleId === filterRole.value),
  }))
  .filter((task) => task.posts.length > 0))

const totalLines = computed(() => props.tasks.reduce(
  (sum, task) => sum + task.posts.reduce((inner, post) => inner + post.lines.length, 0), 0,
))

// 切换到另一组任务时，上一次选中的岗位可能不参与，回到全部避免出现空列表
watch(() => props.tasks, () => { filterRole.value = 'all' })
</script>

<template>
  <section class="panel role-task-panel" :class="{ collapsed: !open }">
    <header class="panel-header role-task-header" @click="open = !open">
      <div>
        <p class="section-index">ROLE × TASK LEDGER</p>
        <h3>本任务岗位分工<i class="task-code">{{ tasks.map((task) => `任务${task.id}`).join(' · ') }}</i></h3>
      </div>
      <div class="panel-actions">
        <span class="role-dots">
          <i v-for="role in involvedRoles" :key="role.id" :style="{ '--role-color': role.color }" :title="role.name">{{ initialOf(role) }}</i>
        </span>
        <StatusBadge :label="`${involvedRoles.length} 个岗位 · ${totalLines} 条`" tone="info" />
        <button class="icon-button" type="button" :title="open ? '收起' : '展开'">
          <ChevronDown :size="17" :class="{ flipped: open }" />
        </button>
      </div>
    </header>

    <template v-if="open">
      <div class="role-task-filter">
        <button type="button" :class="{ active: filterRole === 'all' }" @click="filterRole = 'all'">
          <Users :size="13" />全部岗位
        </button>
        <button
          v-for="role in involvedRoles"
          :key="role.id"
          type="button"
          :class="{ active: filterRole === role.id }"
          :style="{ '--role-color': role.color }"
          @click="filterRole = role.id"
        >{{ role.name }}<b>{{ role.count }}</b></button>
      </div>

      <div class="role-task-body">
        <article v-for="task in visibleTasks" :key="task.id" class="role-task-group">
          <div class="role-task-title">
            <span>任务{{ task.id }}</span>
            <strong>{{ task.title }}</strong>
            <em v-if="task.sourceLabel">{{ task.sourceLabel }}</em>
            <small>{{ task.summary }}</small>
          </div>
          <div
            v-for="(post, index) in task.posts"
            :key="`${task.id}-${post.roleId}-${index}`"
            class="role-post"
            :style="{ '--role-color': roleById(post.roleId).color }"
          >
            <div class="role-post-head">
              <i class="role-avatar small" :style="{ '--role-color': roleById(post.roleId).color }">{{ initialOf(roleById(post.roleId)) }}</i>
              <strong>{{ roleById(post.roleId).name }}</strong>
              <StatusBadge v-if="post.subRole" :label="`切换副岗 · ${post.subRole}`" tone="warning" />
              <small>{{ post.source }}</small>
            </div>
            <ul class="role-post-lines">
              <li v-for="(line, lineIndex) in post.lines" :key="lineIndex">
                <b v-if="line.step" class="line-step">{{ line.step }}</b>
                <b v-else-if="line.label" class="line-label">{{ line.label }}</b>
                <p v-if="line.text">{{ line.text }}</p>
                <code v-if="line.formula">{{ line.formula }}</code>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
