<script setup>
defineProps({
  role: { type: Object, required: true },
  size: { type: String, default: 'md' },
})
</script>

<template>
  <span class="role-badge" :class="`size-${size}`">
    <span class="role-badge-mark">{{ role.code }}</span>
    <span class="role-badge-name">{{ role.shortName }}</span>
  </span>
</template>
