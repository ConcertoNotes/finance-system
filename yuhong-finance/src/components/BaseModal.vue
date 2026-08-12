<script setup>
import { X } from '@lucide/vue'

defineProps({ open: Boolean, title: String, description: String, width: { type: String, default: '560px' } })
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <section class="base-modal" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
        <header><div><h3>{{ title }}</h3><p v-if="description">{{ description }}</p></div><button class="icon-button" type="button" title="关闭" @click="$emit('close')"><X :size="18" /></button></header>
        <div class="modal-body"><slot /></div>
        <footer v-if="$slots.footer"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>
