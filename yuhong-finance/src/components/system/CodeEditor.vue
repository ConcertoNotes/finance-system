<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  minRows: { type: Number, default: 16 },
})

const emit = defineEmits(['update:modelValue'])

const fullscreen = ref(false)
const lineCount = computed(() => Math.max(props.minRows, (props.modelValue || '').split('\n').length))
const lineNos = computed(() => Array.from({ length: lineCount.value }, (_, i) => i + 1))

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}
</script>

<template>
  <div class="code-editor" :class="{ fullscreen }">
    <div class="code-editor-bar">
      <span class="code-editor-dot" />
      <span class="code-editor-dot amber" />
      <span class="code-editor-dot green" />
      <span class="code-editor-title">python · 采集脚本</span>
      <button type="button" class="code-editor-full" @click="toggleFullscreen">
        {{ fullscreen ? '退出全屏' : '全屏' }}
      </button>
    </div>
    <div class="code-editor-body">
      <div class="code-editor-gutter" aria-hidden="true">
        <span v-for="n in lineNos" :key="n">{{ n }}</span>
      </div>
      <textarea
        class="code-editor-input"
        :value="modelValue"
        :rows="minRows"
        spellcheck="false"
        autocomplete="off"
        @input="onInput"
      />
    </div>
  </div>
</template>
