<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getRole } from '../data/roles.js'
import { getTask, getTasksByRole } from '../data/tasks.js'

/**
 * 全局「清除本页数据」按钮。
 * 根据当前路由决定清除范围：任务页只清该任务，岗位页清该岗位全部任务，
 * 首页清整站任务记录。清除后通知外层重挂载视图，让面板状态归零。
 */
const emit = defineEmits(['cleared'])
const route = useRoute()

const FLOW_PREFIX = 'yuhong-flow-'
const FORM_PREFIX = 'yuhong-form-'

const scope = computed(() => {
  if (route.name === 'task') {
    const task = getTask(route.params.taskKey)
    if (!task) return null
    return {
      label: '清除本任务记录',
      keys: [`${FLOW_PREFIX}${task.key}`, `${FORM_PREFIX}${task.key}`],
    }
  }
  if (route.name === 'role') {
    const role = getRole(route.params.roleId)
    if (!role) return null
    return {
      label: '清除本岗位记录',
      keys: getTasksByRole(role.id).flatMap((task) => [`${FLOW_PREFIX}${task.key}`, `${FORM_PREFIX}${task.key}`]),
    }
  }
  if (route.name === 'home') {
    return { label: '清除全部记录', keys: null }
  }
  return null
})

const arming = ref(false)
const cleared = ref(false)
let armTimer = null
let tipTimer = null

watch(
  () => route.fullPath,
  () => {
    arming.value = false
    cleared.value = false
  },
)

onBeforeUnmount(() => {
  clearTimeout(armTimer)
  clearTimeout(tipTimer)
})

function allFlowKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(FLOW_PREFIX) || key.startsWith(FORM_PREFIX))) keys.push(key)
  }
  return keys
}

function onClick() {
  if (!scope.value) return

  if (!arming.value) {
    arming.value = true
    clearTimeout(armTimer)
    armTimer = setTimeout(() => {
      arming.value = false
    }, 4000)
    return
  }

  const keys = scope.value.keys ?? allFlowKeys()
  keys.forEach((key) => localStorage.removeItem(key))

  clearTimeout(armTimer)
  arming.value = false
  cleared.value = true
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    cleared.value = false
  }, 2000)

  emit('cleared')
}
</script>

<template>
  <div v-if="scope" class="clear-data">
    <span v-if="cleared" class="clear-tip">已清除</span>
    <button
      type="button"
      class="clear-button"
      :class="{ arming }"
      :title="arming ? '再次点击执行清除' : '清除当前页面保存的操作记录'"
      @click="onClick"
    >
      {{ arming ? '确认清除？' : scope.label }}
    </button>
  </div>
</template>
