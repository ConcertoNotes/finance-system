<script setup>
// 模拟业务系统外壳：登录 → 逐级点开菜单 → 进入功能页面。
// 工作簿里的「A → B → C」导航路径在这里是真的要一层层点进去的。
import { computed, ref, watch } from 'vue'
import SystemMenuNode from './SystemMenuNode.vue'
import StepBar from './StepBar.vue'

const SESSION_KEY = 'yuhong-sys-logged-in'

const props = defineProps({
  system: { type: String, required: true },
  menu: { type: Array, required: true },
  activeId: { type: String, default: '' },
  completed: { type: Array, default: () => [] },
  operator: { type: String, default: '' },
  loginHint: { type: String, default: '' },
  org: { type: String, default: '应急财经专网' },
  account: { type: String, default: 'HJ-2026-001' },
  error: { type: String, default: '' },
  steps: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:activeId', 'reset'])

const loggedIn = ref(typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1')
const openIds = ref([])
const password = ref('********')

/** 把 activeId 反查成菜单路径，用于面包屑与自动展开。 */
function findPath(nodes, id, trail = []) {
  for (const node of nodes) {
    const next = [...trail, node]
    if (node.id === id) return next
    if (node.children) {
      const hit = findPath(node.children, id, next)
      if (hit) return hit
    }
  }
  return null
}

const path = computed(() => (props.activeId ? findPath(props.menu, props.activeId) ?? [] : []))
const activeNode = computed(() => path.value[path.value.length - 1] ?? null)

const leafCount = computed(() => {
  let total = 0
  const walk = (nodes) => nodes.forEach((n) => (n.children ? walk(n.children) : (total += 1)))
  walk(props.menu)
  return total
})

watch(
  () => props.activeId,
  (id) => {
    if (!id) return
    const trail = findPath(props.menu, id)
    if (!trail) return
    const branches = trail.slice(0, -1).map((n) => n.id)
    openIds.value = [...new Set([...openIds.value, ...branches])]
  },
  { immediate: true },
)

function toggle(id) {
  openIds.value = openIds.value.includes(id)
    ? openIds.value.filter((item) => item !== id)
    : [...openIds.value, id]
}

function open(id) {
  emit('update:activeId', id)
}

function login() {
  loggedIn.value = true
  sessionStorage.setItem(SESSION_KEY, '1')
}

function logout() {
  loggedIn.value = false
  openIds.value = []
  emit('update:activeId', '')
}

defineExpose({ logout })
</script>

<template>
  <div v-if="!loggedIn" class="sys-login">
    <div class="sys-login-brand">
      <span class="sys-login-logo">御</span>
      <div>
        <p class="sys-login-org">{{ org }}</p>
        <h3 class="sys-login-title">{{ system }}</h3>
      </div>
    </div>
    <form class="sys-login-card" @submit.prevent="login">
      <label class="sys-login-field">
        登录账号
        <input class="form-control" :value="operator || '业务操作员'" readonly />
      </label>
      <label class="sys-login-field">
        登录密码
        <input v-model="password" class="form-control" type="password" autocomplete="off" />
      </label>
      <button type="submit" class="primary-button sys-login-btn">登录</button>
      <p class="sys-login-hint">统一身份认证{{ loginHint ? ` · ${loginHint}` : '' }}</p>
    </form>
    <p class="sys-login-foot">洪涝应急救援项目 {{ account }}</p>
  </div>

  <div v-else class="sys-app">
    <div class="sys-app-bar">
      <span class="sys-app-mark">御</span>
      <span class="sys-app-title">{{ system }}</span>
      <span class="sys-app-progress">已办理 {{ completed.length }} / {{ leafCount }}</span>
      <span class="sys-app-user">{{ operator }}</span>
      <button type="button" class="sys-app-exit" @click="logout">退出</button>
    </div>

    <div class="sys-app-body">
      <nav class="sys-app-menu">
        <SystemMenuNode
          :nodes="menu"
          :active-id="activeId"
          :open-ids="openIds"
          :completed="completed"
          @toggle="toggle"
          @open="open"
        />
      </nav>

      <div class="sys-app-main">
        <div v-if="path.length" class="sys-crumb">
          <template v-for="(node, index) in path" :key="node.id">
            <span v-if="index" class="sys-crumb-sep">/</span>
            <span class="sys-crumb-item" :class="{ current: index === path.length - 1 }">{{ node.label }}</span>
          </template>
        </div>

        <StepBar
          v-if="steps.length"
          :steps="steps"
          :active-id="activeId"
          :completed="completed"
          @select="open"
        />

        <p v-if="error" class="sys-toast danger sys-error">{{ error }}</p>

        <div v-if="activeNode" class="sys-page">
          <div class="sys-page-head">
            <h3 class="sys-page-title">{{ activeNode.label }}</h3>
            <span v-if="completed.includes(activeNode.id)" class="op-badge done">已完成</span>
          </div>
          <slot :leaf="activeNode.id" :node="activeNode" />
        </div>

        <div v-else class="sys-welcome">
          <p class="sys-welcome-title">请从左侧功能菜单逐级进入需要办理的业务页面</p>
          <p class="sys-welcome-sub">{{ system }} · 共 {{ leafCount }} 个功能页</p>
        </div>
      </div>
    </div>

    <div class="sys-status">
      <span>{{ org }}</span>
      <span>账套 {{ account }}</span>
      <span>操作员 {{ operator }}</span>
      <button type="button" @click="emit('reset')">重置办理</button>
    </div>
  </div>
</template>
