<script setup>
import { computed } from 'vue'
import { getRoleShortName } from '../data/roles.js'

const props = defineProps({
  task: { type: Object, required: true },
  roleId: { type: String, required: true },
  ownSteps: { type: Number, default: 0 },
})

defineEmits(['open'])

const isLead = computed(() => props.task.owner === props.roleId)
const collaborators = computed(() => props.task.roles.filter((id) => id !== props.roleId))
const collaboratorNames = computed(() => collaborators.value.map(getRoleShortName).join('、'))
</script>

<template>
  <button type="button" class="task-card" @click="$emit('open', task.key)">
    <div class="task-card-head">
      <span class="task-no">任务 {{ task.seq }}</span>
      <span class="task-role-tag" :class="isLead ? 'lead' : 'support'">
        {{ isLead ? '主责' : '协同' }}
      </span>
    </div>

    <h3 class="task-card-title">{{ task.title }}</h3>
    <p class="task-card-desc">{{ task.summary }}</p>

    <div class="task-card-meta">
      <span class="meta-chip">本岗 {{ ownSteps }} 步</span>
      <span class="meta-chip">全流程 {{ task.stepCount }} 步</span>
      <span v-if="task.outputs.length" class="meta-chip">输出 {{ task.outputs.length }} 项</span>
    </div>

    <div v-if="collaborators.length" class="task-card-roles">
      <span class="collab-text">协同 {{ collaboratorNames }}</span>
    </div>
  </button>
</template>
