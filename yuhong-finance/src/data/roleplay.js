// 岗位任务台账聚合入口：按「任务 × 岗位」还原各阶段工作表原文，供任务索引与岗位分工面板调用
// 新阶段的工作表整理完成后，在此追加导入即可自动接入协同页任务索引与各业务页分工面板

import { stage1RoleTasks } from './stage1Roleplay.js'
import { stage2RoleTasks } from './stage2Roleplay.js'

const STAGE_LABELS = ['一', '二', '三', '四']

// 四阶段是一条连续链路：id 为演练全局任务号，no 为该阶段工作表内的任务序号
const withStage = (tasks, stage) => tasks.map((task) => ({
  ...task,
  stage,
  stageLabel: `阶段${STAGE_LABELS[stage - 1]}`,
  sourceLabel: `阶段${STAGE_LABELS[stage - 1]}·任务${task.no}`,
}))

export const allRoleTasks = [...withStage(stage1RoleTasks, 1), ...withStage(stage2RoleTasks, 2)]

// 已完成原文录入的阶段，未列出的阶段任务不会渲染分工面板
export const roleplayStages = [1, 2]

// 阶段衔接：上一阶段的结论如何成为下一阶段的输入口径，用于在阶段起点展示链路连续性
export const stageHandovers = [
  {
    from: 1,
    to: 2,
    fromTitle: '第一阶段 · 灾后0—1小时 · 灾情判级与滚动预算',
    toTitle: '第二阶段 · 灾后1—6小时 · 应急采购与合同决策',
    trigger: '第一次突发事件处置完成，响应升级至 II 级并切换 C 方案后，财务主管统筹岗下达采购任务',
    links: [
      { topic: '灾情口径', output: '转移安置 8,100 人，道路中断 5 个网格，甲3、甲6 为重点关注', input: '8,100 人中 6,100 人固定场所安置，甲3、甲6 剩余 2,000 人帐篷安置，ROUNDUP(2000÷4)=500 顶', taskId: 9 },
      { topic: '保障优先级', output: '御洪星提示甲3、甲6 受灾最严重，建议优先保障', input: '采购与配送顺序 甲3>甲6>甲5>甲4>甲7>甲1>甲9>甲2>甲8，重点网格 12 小时内送达', taskId: 9 },
      { topic: '预算参数', output: '帐篷单价 850 元/顶（4 人一顶）、棉被 65 元/床、救生衣 75 元/件、急救包 180 元/套', input: '作为历史采购价进入综合基准价：帐篷 (850+820+880+835)÷4 = 846.25 元', taskId: 10 },
      { topic: '价格风险', output: '采购成本保障岗预警：帐篷需追加采购，市场价格可能上涨 5—8%，建议尽快锁价', input: '价格偏差率预警阈值黄色 5%、红色 10%；S3 报价偏差 14.39% 列为高价备选', taskId: 10 },
      { topic: '预算上限', output: 'C 方案总预算 4,275,091 元（编制稿），覆盖 8,100 人', input: '阶段二复核后按 4,278,517.50 元控制，初始采购占用 1,081,857.50 元，占用率 25.29%', taskId: 12, note: '两者相差 3,426.50 元，为阶段二按物资明细重算后的复核差异，C 方案覆盖范围与响应等级不变' },
      { topic: '预备费', output: '释放预备费 37.6 万元，要求单独核算', input: '第二次突发事件紧急分单新增 9,750 元从预备费列支，使用率 2.59%，阶段性余额 366,250 元', taskId: 13 },
      { topic: '资金来源', output: '当前可用资金 402 万元，全部 6 小时内可支付；缺口 255,091 元待复盘阶段到账', input: '采购执行以政府财政拨款保障资金匹配，不使用限定性食品捐赠和特殊人群保障资金', taskId: 12 },
      { topic: '保险支出', output: '保险II 审批通过，50 人总保费 11,000 元，已计入 C 方案', input: '保险支出不纳入第二阶段物资采购范围，按保险支出专项科目单独跟踪', taskId: 8 },
    ],
  },
]

export function getStageHandover(toStage) {
  return stageHandovers.find((item) => item.to === toStage)
}

export function getRoleTaskById(taskId) {
  return allRoleTasks.find((task) => task.id === taskId)
}

export function getRoleTasksByIds(taskIds) {
  return allRoleTasks.filter((task) => taskIds.includes(task.id))
}

// 业务页锚点：view 为视图编号，tab 可选；不传 tab 时返回该视图下的全部任务
export function getRoleTasksByView(viewId, tabId) {
  return allRoleTasks.filter((task) => {
    if (task.view !== viewId) return false
    if (tabId === undefined) return true
    return task.tab === tabId
  })
}

// 某岗位参与的任务清单，仅保留该岗位自己的发言
export function getTasksByRole(roleId) {
  return allRoleTasks
    .filter((task) => task.posts.some((post) => post.roleId === roleId))
    .map((task) => ({
      ...task,
      posts: task.posts.filter((post) => post.roleId === roleId),
    }))
}
