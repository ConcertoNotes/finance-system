export const dataSources = [
  { id: 'emergency', name: '应急管理局平台', type: '灾情报送', status: 'connected', records: 9, latency: '12s' },
  { id: 'weather', name: '气象局平台', type: '气象水文', status: 'connected', records: 54, latency: '8s' },
  { id: 'rescue', name: '蓝天救援队', type: '现场核验', status: 'connected', records: 18, latency: '31s' },
  { id: 'drone', name: '无人机巡航', type: '影像识别', status: 'connected', records: 9, latency: '18s' },
]

export const dataQuality = [
  { label: '数据完整率', value: 100, unit: '%' },
  { label: '数据及时率', value: 100, unit: '%' },
  { label: '异常记录数', value: 0, unit: '条' },
  { label: '未核验网格', value: 0, unit: '个' },
  { label: '无人机影像匹配', value: 9, unit: '/9' },
]

export const pipelineMilestones = [
  { id: 'collect', label: '多源数据采集', progress: '100%', detail: '应急、气象、救援队与无人机数据已接入', status: 'completed' },
  { id: 'code', label: '采集代码执行', progress: '100%', detail: 'flood_data_pipeline.py 执行完成', status: 'completed' },
  { id: 'extract', label: '多维数据提取', progress: '78%', detail: '提取过程里程碑已留痕，最终数据已完成', status: 'milestone' },
  { id: 'security', label: '数据安全规则', progress: '已启用', detail: '敏感数据（需授权）', status: 'secured' },
  { id: 'monitor', label: '异常波动监测', progress: '运行中', detail: '降水量偏离阈值 3σ', status: 'monitoring' },
  { id: 'clean', label: '标准清洗校验', progress: '100%', detail: '标准化、去重、完整性和来源校验通过', status: 'completed' },
]

const baselineGrids = [
  { id: '甲1', name: '东堤居民区', affected: 900, trapped: 80, relocated: 500, special: 120, roadBlocked: false, rainfall: 96, waterLevel: 2.8, distance: 12, priority: 6 },
  { id: '甲2', name: '北岸产业园', affected: 1000, trapped: 90, relocated: 600, special: 135, roadBlocked: false, rainfall: 108, waterLevel: 3.1, distance: 18, priority: 5 },
  { id: '甲3', name: '临河老城区', affected: 2200, trapped: 320, relocated: 1500, special: 430, roadBlocked: true, rainfall: 156, waterLevel: 5.8, distance: 26, priority: 1 },
  { id: '甲4', name: '西南安置区', affected: 1100, trapped: 100, relocated: 700, special: 160, roadBlocked: false, rainfall: 121, waterLevel: 3.7, distance: 31, priority: 4 },
  { id: '甲5', name: '沿江物流带', affected: 1500, trapped: 120, relocated: 900, special: 210, roadBlocked: true, rainfall: 132, waterLevel: 4.3, distance: 38, priority: 3 },
  { id: '甲6', name: '低洼村落群', affected: 1800, trapped: 280, relocated: 1200, special: 365, roadBlocked: true, rainfall: 148, waterLevel: 5.4, distance: 43, priority: 2 },
  { id: '甲7', name: '南部农业区', affected: 850, trapped: 40, relocated: 600, special: 110, roadBlocked: false, rainfall: 116, waterLevel: 3.2, distance: 49, priority: 7 },
  { id: '甲8', name: '新城社区', affected: 700, trapped: 30, relocated: 500, special: 90, roadBlocked: false, rainfall: 88, waterLevel: 2.5, distance: 22, priority: 8 },
  { id: '甲9', name: '北部高地区', affected: 650, trapped: 20, relocated: 500, special: 80, roadBlocked: false, rainfall: 74, waterLevel: 2.1, distance: 34, priority: 9 },
]

export const disasterTrends = {
  labels: ['0h', '1h', '2h', '3h', '4h', '5h'],
  rainfall: [82, 96, 118, 137, 146, 151],
  waterLevel: [2.1, 2.7, 3.4, 4.2, 4.9, 5.6],
}

export function getGridSnapshot(stage = 'baseline') {
  return baselineGrids.map((grid) => {
    if (stage !== 'escalated') return { ...grid }
    if (grid.id === '甲3') {
      return { ...grid, affected: 3000, trapped: 440, relocated: 2100, rainfall: 171, waterLevel: 6.4 }
    }
    if (grid.id === '甲6') {
      return { ...grid, affected: 2500, trapped: 380, relocated: 1700, rainfall: 165, waterLevel: 6.1 }
    }
    if (grid.id === '甲4' || grid.id === '甲7') return { ...grid, roadBlocked: true }
    return { ...grid }
  })
}

export const cleaningSteps = [
  { id: 1, title: '字段标准化', detail: '网格编号甲1—甲9；时间灾后0小时；降雨毫米；水位米', status: 'passed' },
  { id: 2, title: '重复数据删除', detail: '以网格编号为主键去重，无重复记录', status: 'passed', formula: '数据 → 删除重复项（主键：网格编号）' },
  { id: 3, title: '缺失值检查', detail: 'COUNTBLANK(B2:K10) = 0，数据完整', status: 'passed', formula: '=COUNTBLANK(B2:K10)' },
  { id: 4, title: '3σ 异常检查', detail: '甲3 156mm、甲6 148mm确认为真实灾情并重点关注', status: 'verified', formula: '=IF(OR(I2>$M$3,I2<$M$4),"异常","正常")' },
  { id: 5, title: '来源与时间校验', detail: '基础信息、行政归属、人口基数和采集时间一致', status: 'passed', formula: '=XLOOKUP(A2,网格基础信息!A:A,网格基础信息!B:G)' },
]

export const complianceChecks = [
  { label: '采集合规', score: 100, basis: '来源授权与采集留痕' },
  { label: '清洗规范', score: 100, basis: '标准化、去重、完整性与异常核验' },
  { label: '建模准确', score: 98, basis: '图表与数据维度 100% 匹配' },
  { label: '策略合规', score: 99, basis: '优先级具有明确数据支撑' },
]
