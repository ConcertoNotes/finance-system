<script setup>
import { ChevronsUp, CloudRain, X } from '@lucide/vue'

defineProps({
  items: { type: Array, required: true },
  activeView: { type: String, required: true },
  activeRole: { type: Object, required: true },
  rehearsalProgress: { type: Object, required: true },
  open: Boolean,
})

defineEmits(['navigate', 'close'])
</script>

<template>
  <div v-if="open" class="sidebar-scrim" @click="$emit('close')" />
  <aside class="app-sidebar" :class="{ open }">
    <div class="brand-block">
      <div class="brand-mark"><CloudRain :size="22" /></div>
      <div>
        <strong>御洪智策</strong>
        <span>应急财经决策平台</span>
      </div>
      <button class="sidebar-close icon-button" type="button" title="关闭导航" @click="$emit('close')"><X :size="18" /></button>
    </div>

    <div class="event-chip">
      <div class="event-chip__icon"><ChevronsUp :size="17" /></div>
      <div><span>当前事件</span><strong>汛情 F-2026-0803</strong></div>
      <i />
    </div>

    <nav class="main-nav" aria-label="主导航">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :class="{ active: activeView === item.id }"
        @click="$emit('navigate', item.id)"
      >
        <component :is="item.icon" :size="18" />
        <span>{{ item.label }}</span>
        <b v-if="item.id === 'rehearsal'">{{ rehearsalProgress.total }}</b>
      </button>
    </nav>

    <div class="sidebar-progress">
      <div class="section-label"><span>四阶段全流程演练</span><strong>{{ rehearsalProgress.completed }} / {{ rehearsalProgress.total }}</strong></div>
      <div class="progress-track"><i :style="{ width: `${rehearsalProgress.percentage}%` }" /></div>
      <p>当前：{{ rehearsalProgress.currentTitle }}</p>
    </div>

    <div class="sidebar-user">
      <div class="role-avatar" :style="{ '--role-color': activeRole.color }">{{ activeRole.shortName.slice(0, 1) }}</div>
      <div><strong>{{ activeRole.name }}</strong><span>{{ activeRole.code }} · 在线</span></div>
      <i class="online-dot" />
    </div>
  </aside>
</template>
