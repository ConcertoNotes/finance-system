<script setup>
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps({
  panel: { type: String, default: '' },
  task: { type: Object, required: true },
})

const registry = {
  ledger: defineAsyncComponent(() => import('./LedgerPanel.vue')),
  collect: defineAsyncComponent(() => import('./CollectPanel.vue')),
  compliance: defineAsyncComponent(() => import('./CompliancePanel.vue')),
  insurance: defineAsyncComponent(() => import('./InsurancePanel.vue')),
  'cost-driver': defineAsyncComponent(() => import('./CostDriverPanel.vue')),
  'abc-budget': defineAsyncComponent(() => import('./AbcBudgetPanel.vue')),
  'budget-approval': defineAsyncComponent(() => import('./BudgetApprovalPanel.vue')),
  'emergency-update': defineAsyncComponent(() => import('./EmergencyUpdatePanel.vue')),
  demand: defineAsyncComponent(() => import('./DemandPanel.vue')),
  price: defineAsyncComponent(() => import('./PricePanel.vue')),
  supplier: defineAsyncComponent(() => import('./SupplierPanel.vue')),
  contract: defineAsyncComponent(() => import('./ContractPanel.vue')),
  split: defineAsyncComponent(() => import('./SplitPanel.vue')),
  handover: defineAsyncComponent(() => import('./HandoverPanel.vue')),
}

const component = computed(() => registry[props.panel] ?? null)
</script>

<template>
  <component :is="component" v-if="component" :task="task" />
  <section v-else class="panel calc-panel">
    <div class="panel-header"><h2>演算面板</h2></div>
    <div class="panel-body"><p class="empty-hint">本任务暂无交互演算。</p></div>
  </section>
</template>
