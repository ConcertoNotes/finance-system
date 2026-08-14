<script setup>
// 各小步水平步骤条。样式对齐参考页：编号圆点 + 连线，当前步高亮。
defineProps({
  steps: { type: Array, required: true },
  activeId: { type: String, default: '' },
  completed: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])
</script>

<template>
  <div class="step-bar-wrap">
    <ol class="step-bar" aria-label="办理步骤">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-bar-item"
        :class="{
          active: activeId === step.id,
          done: completed.includes(step.id),
        }"
      >
        <button type="button" class="step-bar-btn" @click="emit('select', step.id)">
          <span class="step-bar-index">{{ completed.includes(step.id) ? '✓' : index + 1 }}</span>
          <span class="step-bar-label">{{ step.label }}</span>
        </button>
        <span v-if="index < steps.length - 1" class="step-bar-line" aria-hidden="true" />
      </li>
    </ol>
    <p class="step-bar-meta">已办理 {{ completed.length }} / {{ steps.length }} · 每步点「保存」后进度前进</p>
  </div>
</template>
