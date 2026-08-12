<script setup>
import { reactive, ref } from 'vue'
import { Check, Plus, Settings2, SlidersHorizontal, UserRoundPlus, UsersRound } from '@lucide/vue'
import BaseModal from '../components/BaseModal.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { budgetParameters } from '../data/budget.js'
import { defaultRoles } from '../data/roles.js'
import { createRole, loadCustomRoles, saveCustomRoles, validateNewRole } from '../domain/roleRegistry.js'

const props = defineProps({
  roles: { type: Array, default: () => defaultRoles },
  preserveRehearsalProgress: { type: Boolean, default: true },
  rehearsalSettings: { type: Object, default: () => ({ autoAlert: true, requireApproval: true, showNarration: true }) },
})
const emit = defineEmits(['toast', 'rolesUpdated', 'change-preserve-progress', 'update-rehearsal-settings'])
const modalOpen = ref(false)
const customRoles = ref(loadCustomRoles(window.localStorage))
const error = ref('')
const form = reactive({ name: '', shortName: '', code: '', responsibility: '', color: '#9c8fda', permissionsText: '协同查看' })
const settings = reactive({ ...props.rehearsalSettings })

function openModal() {
  Object.assign(form, { name: '', shortName: '', code: '', responsibility: '', color: '#9c8fda', permissionsText: '协同查看' })
  error.value = ''
  modalOpen.value = true
}

function addRole() {
  const roleDraft = {
    ...form,
    permissions: form.permissionsText.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
  }
  const result = validateNewRole(roleDraft, props.roles)
  if (!result.ok) {
    error.value = result.message
    return
  }
  const role = createRole(roleDraft, props.roles.length)
  customRoles.value = [...customRoles.value, role]
  saveCustomRoles(window.localStorage, customRoles.value)
  emit('rolesUpdated', customRoles.value)
  emit('toast', `${role.name}已加入岗位注册表`)
  modalOpen.value = false
}

function updateRehearsalSetting(key, value) {
  settings[key] = value
  emit('update-rehearsal-settings', { ...settings })
}
</script>

<template>
  <div class="page-content settings-page">
    <section class="page-intro"><div><p class="eyebrow">SYSTEM CONFIGURATION</p><h1>系统配置</h1><p>岗位注册、预算参数与比赛演练行为配置</p></div><button class="primary-button" type="button" @click="openModal"><UserRoundPlus :size="16" />新增岗位</button></section>
    <section class="settings-layout">
      <article class="panel role-registry-panel"><header class="panel-header"><div><p class="section-index">EXTENSIBLE ROLE MODEL</p><h3>岗位注册表</h3></div><StatusBadge :label="`${roles.length} 个岗位`" tone="info" /></header><div class="role-registry-list"><div v-for="role in roles" :key="role.id"><div class="role-avatar large" :style="{ '--role-color': role.color }">{{ role.shortName.slice(0, 1) }}</div><div><strong>{{ role.name }}<StatusBadge v-if="role.custom" label="自定义" tone="info" /><StatusBadge v-else-if="role.subRole" :label="`副岗 · ${role.subRole.name}`" tone="neutral" /></strong><p>{{ role.responsibility }}</p><p v-if="role.motto" class="role-motto">{{ role.motto }}{{ role.subRole ? ` ／ ${role.subRole.motto}` : '' }}</p><div class="permission-tags"><span v-for="permission in role.permissions" :key="permission">{{ permission }}</span></div></div><span class="role-code">{{ role.code }}</span></div></div></article>
      <aside class="settings-side"><article class="panel"><header class="panel-header"><div><p class="section-index">REHEARSAL PREFERENCES</p><h3>演练设置</h3></div><Settings2 :size="19" /></header><div class="toggle-list"><label><div><strong>异常自动预警</strong><span>任务 7/13/18/21 自动触发御洪星警告</span></div><input :checked="settings.autoAlert" type="checkbox" @change="updateRehearsalSetting('autoAlert', $event.target.checked)" /><i /></label><label><div><strong>关键决策审批</strong><span>方案升级与突发处置保留财务主管确认</span></div><input :checked="settings.requireApproval" type="checkbox" @change="updateRehearsalSetting('requireApproval', $event.target.checked)" /><i /></label><label><div><strong>保留演练进度</strong><span>刷新后继续当前任务</span></div><input :checked="preserveRehearsalProgress" type="checkbox" @change="emit('change-preserve-progress', $event.target.checked)" /><i /></label><label><div><strong>岗位旁白提示</strong><span>显示比赛讲解关键句</span></div><input :checked="settings.showNarration" type="checkbox" @change="updateRehearsalSetting('showNarration', $event.target.checked)" /><i /></label></div></article></aside>
    </section>
    <section class="panel settings-parameters"><header class="panel-header"><div><p class="section-index">BUDGET MASTER DATA</p><h3>预算参数</h3></div><SlidersHorizontal :size="19" /></header><div class="parameter-table"><div class="table-head"><span>参数名称</span><span>当前标准</span><span>单位</span><span>说明</span><span>状态</span></div><div v-for="parameter in budgetParameters" :key="parameter.id"><strong>{{ parameter.name }}</strong><span>{{ parameter.value }}</span><span>{{ parameter.unit }}</span><span>{{ parameter.note || '专项预算标准' }}</span><StatusBadge label="已启用" tone="success" /></div></div></section>

    <BaseModal :open="modalOpen" title="新增岗位" description="岗位将加入导航协同筛选，并保存在当前浏览器" @close="modalOpen = false"><form class="role-form" @submit.prevent="addRole"><label><span>岗位名称</span><input v-model="form.name" placeholder="例如：审计复核岗" /></label><label><span>岗位简称</span><input v-model="form.shortName" placeholder="例如：审计岗" /></label><label><span>岗位编码</span><input v-model="form.code" placeholder="留空自动生成" /></label><label><span>标识颜色</span><input v-model="form.color" type="color" /></label><label class="full-field"><span>权限标签</span><input v-model="form.permissionsText" placeholder="例如：审计复核，凭证查看，风险预警" /></label><label class="full-field"><span>岗位职责</span><textarea v-model="form.responsibility" rows="3" placeholder="描述该岗位在应急财经决策中的职责" /></label><p v-if="error" class="form-error">{{ error }}</p></form><template #footer><button class="secondary-button" type="button" @click="modalOpen = false">取消</button><button class="primary-button" type="button" @click="addRole"><Plus :size="15" />加入岗位注册表</button></template></BaseModal>
  </div>
</template>
