<script setup>
import { ArrowRight, Bot, ShieldAlert, Sparkles, X } from '@lucide/vue'
import { computed } from 'vue'

const props = defineProps({ activeView: String, stage: String })
defineEmits(['close', 'action'])

const insight = computed(() => props.stage === 'escalated'
  ? { tone: 'danger', title: '灾情升级提示', text: '甲3、甲6指标已越过 II 级阈值，C 方案资金缺口 255,091 元。', action: '查看升级决策链' }
  : { tone: 'normal', title: '御洪星研判', text: '甲3、甲6受灾最严重，当前综合判定为 III 级响应，建议采用 B 方案。', action: '查看判级依据' })
</script>

<template>
<aside class="assistant-panel">
  <header>
    <div class="assistant-avatar"><Sparkles :size="19" /></div>
    <div><strong>数字人御洪星</strong><span><i /> 决策协同在线</span></div>
    <button class="icon-button" type="button" title="关闭助手" @click="$emit('close')"><X :size="17" /></button>
  </header>
  <div class="assistant-body">
    <div class="assistant-context"><Bot :size="16" /> 正在分析 · {{ activeView }}</div>
    <section class="assistant-insight" :class="insight.tone">
      <ShieldAlert :size="19" />
      <div><strong>{{ insight.title }}</strong><p>{{ insight.text }}</p></div>
    </section>
    <button class="assistant-action" type="button" @click="$emit('action', insight.action)">
      <span>{{ insight.action }}</span><ArrowRight :size="16" />
    </button>
    <div class="assistant-log">
      <span>02:30</span><p>响应审批记录已同步</p>
      <span>02:24</span><p>资金可用性校验完成</p>
      <span>02:18</span><p>无人机影像匹配 9/9</p>
    </div>
  </div>
</aside>
</template>
