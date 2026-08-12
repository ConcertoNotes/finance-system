<script setup>
import { ref } from 'vue'
import { ArrowRight, ChevronDown, GitCommitVertical, Info } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  handover: { type: Object, required: true },
  defaultOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['jump-task'])

const open = ref(props.defaultOpen)
</script>

<template>
  <section class="panel handover-panel" :class="{ collapsed: !open }">
    <header class="panel-header handover-header" @click="open = !open">
      <div>
        <p class="section-index">STAGE CONTINUITY</p>
        <h3>上一阶段移交<i class="task-code">第{{ handover.from === 1 ? '一' : '二' }}阶段 → 第{{ handover.to === 2 ? '二' : '三' }}阶段</i></h3>
      </div>
      <div class="panel-actions">
        <StatusBadge :label="`${handover.links.length} 项口径承接`" tone="info" />
        <button class="icon-button" type="button" :title="open ? '收起' : '展开'">
          <ChevronDown :size="17" :class="{ flipped: open }" />
        </button>
      </div>
    </header>

    <template v-if="open">
      <div class="handover-trigger">
        <GitCommitVertical :size="15" />
        <p>{{ handover.trigger }}</p>
      </div>

      <div class="handover-axis">
        <div class="handover-node from"><span>{{ handover.fromTitle }}</span></div>
        <ArrowRight :size="16" />
        <div class="handover-node to"><span>{{ handover.toTitle }}</span></div>
      </div>

      <div class="handover-links">
        <article v-for="link in handover.links" :key="link.topic">
          <strong class="handover-topic">{{ link.topic }}</strong>
          <div class="handover-flow">
            <div class="handover-out">
              <span>上阶段结论</span>
              <p>{{ link.output }}</p>
            </div>
            <ArrowRight :size="15" />
            <div class="handover-in">
              <span>本阶段口径</span>
              <p>{{ link.input }}</p>
            </div>
          </div>
          <div class="handover-foot">
            <button type="button" class="text-button" @click="emit('jump-task', link.taskId)">承接于任务 {{ link.taskId }}</button>
            <small v-if="link.note"><Info :size="12" />{{ link.note }}</small>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
