// 数据源：洪涝阶段一全.xlsx
// 预算岗任务8、统筹岗二次决策、采购岗新增物资分析、风控岗资金状态汇总。

import { abcPlanMap } from './abcBudget.js'

export const FOOD_RATE = 25

export const secondWaveBatch = {
  name: '灾后第一次动态更新',
  sources: ['应急管理局二次报送', '无人机二次巡航'],
  path: '应急财务平台 → 灾情数据中心 → 动态灾情更新 → 导入二次报送数据',
}

export const secondWaveRows = [
  { grid: '甲3', metric: '受灾人数', old: 2200, next: 3000, delta: 800 },
  { grid: '甲3', metric: '转移安置人数', old: 1500, next: 2100, delta: 600 },
  { grid: '甲3', metric: '被困人数', old: 320, next: 440, delta: 120 },
  { grid: '甲3', metric: '死亡和失踪', old: 8, next: 33, delta: 25 },
  { grid: '甲6', metric: '受灾人数', old: 1800, next: 2500, delta: 700 },
  { grid: '甲6', metric: '转移安置人数', old: 1200, next: 1700, delta: 500 },
  { grid: '甲6', metric: '被困人数', old: 280, next: 380, delta: 100 },
  { grid: '甲6', metric: '死亡和失踪', old: 4, next: 17, delta: 13 },
]

export const checkItems = ['来源授权', '网格编号', '时间戳', '原始记录', '无人机巡航匹配']

export const paramShift = {
  shelterDays: { old: 3, next: 5 },
  relocated: { old: 7000, next: 8100 },
  roadBreaks: { old: 3, next: 5 },
  gridJia3: { old: 1500, next: 2100 },
  gridJia6: { old: 1200, next: 1700 },
}

export const incrementDrivers = [
  { name: '安置期延长（3→5天）', share: 0.67 },
  { name: '受灾人数增加', share: 0.28 },
  { name: '道路绕行', share: 0.05 },
]

export const fiscalAtHalfHour = [
  { id: 'G01', plan: 2_000_000, arrived: 2_000_000, status: '已到账' },
  { id: 'G02', plan: 800_000, arrived: 800_000, status: '已到账' },
  { id: 'G03首批', plan: 860_000, arrived: 860_000, status: '已到账' },
  { id: 'G03剩余', plan: 360_000, arrived: 0, status: '追加审批中' },
]

export const confirmedFundsAtHalfHour = 3_660_000
export const plannedFiscal = 4_020_000

export const fiscalAfterG03 = {
  planned: 4_020_000,
  firstArrived: 3_660_000,
  supplement: 360_000,
  cumulative: 4_020_000,
  arrivalRate: 1,
  status: '全部到位，可用于符合规定的救灾支出',
  donationRule: '严格按照捐赠协议用途执行，不得用于不匹配支出',
}

export const bApproval = {
  level: 'III级',
  plan: abcPlanMap.B,
  available: confirmedFundsAtHalfHour,
  controlMode: '总额控制 + 分项控制',
  opinion:
    'III级响应对应B方案，当前已确认财政资金覆盖率125.82%，无资金缺口。同意启动B方案，预算上限2,909,004元，其中预备费290,900.40元单独控制。',
}

export const secondDecision = {
  levelFrom: 'III级',
  levelTo: 'II级',
  planFrom: 'B',
  planTo: 'C',
  cap: abcPlanMap.C.total,
  reserve: abcPlanMap.C.reserve,
  reserveState: '已批准释放',
  fiscal: plannedFiscal,
  fiscalState: '已到账',
  redCross: 258_517.5,
  redCrossState: '待到账、待用途标签确认',
}

export const extraMaterial = [
  { item: '追加采购物资', current: '帐篷', advice: '需追加采购' },
  { item: '重点保障网格', current: '甲3、甲6', advice: '优先保障' },
  { item: '需求变化原因', current: '甲3、甲6转移安置人数增加', advice: '原有帐篷保障量不足，形成新增采购需求' },
  { item: '市场供应能力', current: '当前市场供应能力充足', advice: '具备追加采购条件' },
  { item: '当前价格风险', current: '市场价格预计上涨 5%—8%', advice: '存在短期涨价风险' },
  { item: '采购紧迫程度', current: '较高', advice: '建议尽快启动询价、锁定供应量和价格' },
  { item: '采购控制原则', current: '在C方案预算控制范围内执行', advice: '不得突破批准预算上限' },
  { item: '建议措施', current: '启动帐篷追加采购', advice: '尽快锁价、锁量、锁定交付时间' },
  { item: '风险状态', current: '🟡 价格上涨预警', advice: '加快采购决策，防止采购成本进一步增加' },
]

export const extraMaterialCards = [
  { label: '重点物资', value: '帐篷' },
  { label: '重点网格', value: '甲3、甲6' },
  { label: '价格预警', value: '预计上涨5%—8%' },
]

export const extraMaterialFoot =
  '市场供应能力充足，但存在5%—8%的短期价格上涨风险，建议立即启动追加采购询价，优先锁定甲3、甲6帐篷供应数量、采购价格及交付时限。'
