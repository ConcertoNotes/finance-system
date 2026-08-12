<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bell, Check, ChevronDown, Clock3, Search } from '@lucide/vue'

const props = defineProps({
  activeNavigation: { type: Object, required: true },
  activeRoleId: { type: String, required: true },
  roles: { type: Array, required: true },
  stage: { type: String, required: true },
})

const emit = defineEmits(['changeRole', 'changeStage', 'notify'])
const rolePicker = ref(null)
const roleMenuOpen = ref(false)
const now = ref(new Date())
const eventStartedAt = Date.now() - (2 * 60 * 60 + 30 * 60) * 1000
let clockTimer
const activeRole = computed(() => props.roles.find((role) => role.id === props.activeRoleId) ?? props.roles[0])
const serverClock = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
const serverDate = computed(() => now.value.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))
const eventElapsed = computed(() => {
  const elapsed = Math.max(0, Math.floor((now.value.getTime() - eventStartedAt) / 1000))
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})

function chooseRole(roleId) {
  emit('changeRole', roleId)
  roleMenuOpen.value = false
}

function closeRoleMenu(event) {
  if (event.key === 'Escape') roleMenuOpen.value = false
  if (event.type === 'pointerdown' && !rolePicker.value?.contains(event.target)) roleMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', closeRoleMenu)
  document.addEventListener('keydown', closeRoleMenu)
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeRoleMenu)
  document.removeEventListener('keydown', closeRoleMenu)
  window.clearInterval(clockTimer)
})
</script>

<template>
  <header class="app-header">
    <div class="page-identity">
      <p class="eyebrow">{{ activeNavigation.eyebrow }}</p>
      <h2>{{ activeNavigation.label }}</h2>
    </div>

    <div class="header-status">
      <span><Clock3 :size="15" /> 灾后 {{ eventElapsed }}</span>
      <i />
      <span>服务器时间 {{ serverDate }} {{ serverClock }}</span>
      <i />
      <span class="live-state">数据实时同步</span>
    </div>

    <div class="stage-switch" aria-label="灾情场景">
      <button type="button" :class="{ active: stage === 'baseline' }" @click="$emit('changeStage', 'baseline')">初始态</button>
      <button type="button" :class="{ active: stage === 'escalated' }" @click="$emit('changeStage', 'escalated')">升级态</button>
    </div>

    <button class="header-search icon-button" type="button" title="搜索"><Search :size="18" /></button>
    <button class="notification-button icon-button" type="button" title="通知" @click="$emit('notify')">
      <Bell :size="18" /><b>3</b>
    </button>
    <div ref="rolePicker" class="role-select">
      <button
        class="role-select-trigger"
        type="button"
        aria-haspopup="listbox"
        :aria-expanded="roleMenuOpen"
        @click="roleMenuOpen = !roleMenuOpen"
      >
        <span class="role-select-avatar" :style="{ '--role-color': activeRole.color }">{{ activeRole.shortName.slice(0, 1) }}</span>
        <span class="role-select-copy"><small>当前岗位</small><strong>{{ activeRole.name }}</strong></span>
        <ChevronDown :size="15" :class="{ rotated: roleMenuOpen }" />
      </button>
      <div v-if="roleMenuOpen" class="role-menu" role="listbox" aria-label="切换岗位">
        <button
          v-for="role in roles"
          :key="role.id"
          type="button"
          role="option"
          :aria-selected="role.id === activeRoleId"
          :class="{ active: role.id === activeRoleId }"
          @click="chooseRole(role.id)"
        >
          <span class="role-select-avatar" :style="{ '--role-color': role.color }">{{ role.shortName.slice(0, 1) }}</span>
          <span><strong>{{ role.name }}</strong><small>{{ role.code }} · {{ role.shortName }}</small></span>
          <Check v-if="role.id === activeRoleId" :size="16" />
        </button>
      </div>
    </div>
  </header>
</template>
