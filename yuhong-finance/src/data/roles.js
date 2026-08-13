// 岗位注册表。名称、权限与限制均取自《洪涝阶段一》财务主管统筹岗任务1第六步「设置岗位权限」。

export const roles = [
  {
    id: 'finance-lead',
    name: '财务主管统筹岗',
    shortName: '统筹岗',
    code: 'F01',
    responsibility: '专项账套启用、数据合规准入、重大方案审批与跨岗位统筹',
    permissions: ['专项账套启用', '预算及重大调整审批', '付款审批', '异常事项最终复核', '全项目数据查看'],
    restriction: '',
  },
  {
    id: 'procurement',
    name: '采购成本保障岗',
    shortName: '采购岗',
    code: 'P02',
    subRole: '网格物资调度专员',
    responsibility: '灾情数据采集、保险比选、采购需求测算、价格基准与合同履约管理',
    permissions: ['采购需求', '价格分析', '供应商评价', '合同及履约管理'],
    restriction: '不得直接修改资金来源。',
  },
  {
    id: 'budget-performance',
    name: '应急预算绩效岗',
    shortName: '预算岗',
    code: 'B03',
    responsibility: '成本动因转换、预算测算、预算占用率复核与预备费管理',
    permissions: ['灾情数据读取', 'BI分析', '预算编制', '预算调整申请', '绩效分析'],
    restriction: '不得直接付款。',
  },
  {
    id: 'fund-risk',
    name: '资金核算风控岗',
    shortName: '风控岗',
    code: 'R04',
    responsibility: '资金分类、预算占用、付款核验、四流匹配与会计核算',
    permissions: ['资金分类', '预算占用', '付款核验', '四流匹配', '会计核算', '银行对账'],
    restriction: '不得自行审批本人提交的付款。',
  },
]

export const assistant = {
  id: 'yuhong-star',
  name: '数字人御洪星',
  shortName: '御洪星',
  code: 'AI',
  responsibility: '多源灾情数据采集、异常监测与跨岗位风险提示',
  permissions: ['数据采集', '风险提示', '异常监测', '信息推送', '证据归集'],
  restriction: '仅提供辅助决策，不拥有最终审批权限。',
}

const roleMap = new Map(roles.map((role) => [role.id, role]))
roleMap.set(assistant.id, assistant)

export function getRole(roleId) {
  return roleMap.get(roleId) ?? null
}

export function getRoleName(roleId) {
  return roleMap.get(roleId)?.name ?? roleId
}

export function getRoleShortName(roleId) {
  return roleMap.get(roleId)?.shortName ?? roleId
}
