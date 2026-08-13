<script setup>
defineProps({
  nodes: { type: Array, required: true },
  activeId: { type: String, default: '' },
  openIds: { type: Array, required: true },
  completed: { type: Array, required: true },
  depth: { type: Number, default: 0 },
})

defineEmits(['toggle', 'open'])
</script>

<template>
  <ul class="sys-menu" :class="`depth-${depth}`">
    <li v-for="node in nodes" :key="node.id">
      <button
        type="button"
        class="sys-menu-item"
        :class="{
          branch: !!node.children,
          leaf: !node.children,
          active: activeId === node.id,
          open: openIds.includes(node.id),
          done: !node.children && completed.includes(node.id),
        }"
        :style="{ paddingLeft: `${10 + depth * 14}px` }"
        @click="node.children ? $emit('toggle', node.id) : $emit('open', node.id)"
      >
        <span class="sys-menu-caret">{{ node.children ? (openIds.includes(node.id) ? '▾' : '▸') : '' }}</span>
        <span class="sys-menu-icon" :class="node.children ? 'folder' : 'leaf-icon'" />
        <span class="sys-menu-label">{{ node.label }}</span>
        <span v-if="!node.children && completed.includes(node.id)" class="sys-menu-check">✓</span>
      </button>

      <SystemMenuNode
        v-if="node.children && openIds.includes(node.id)"
        :nodes="node.children"
        :active-id="activeId"
        :open-ids="openIds"
        :completed="completed"
        :depth="depth + 1"
        @toggle="$emit('toggle', $event)"
        @open="$emit('open', $event)"
      />
    </li>
  </ul>
</template>
