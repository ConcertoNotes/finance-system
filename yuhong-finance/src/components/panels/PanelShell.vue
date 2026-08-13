<script setup>
defineProps({
  title: { type: String, default: '' },
  source: { type: String, default: '' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <div class="sys-host">
    <slot />
  </div>
</template>
