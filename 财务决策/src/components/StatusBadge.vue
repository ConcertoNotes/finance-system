<script setup>
defineProps({ label: String, tone: { type: String, default: 'neutral' }, dot: Boolean })
</script>

<template><span class="status-badge" :class="`status-${tone}`"><i v-if="dot" />{{ label }}</span></template>
