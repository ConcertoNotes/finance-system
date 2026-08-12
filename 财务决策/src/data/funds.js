export const fundSnapshots = {
  baseline: {
    available: 4020000,
    payableIn6h: 3660000,
    occupied: 0,
    demand: 2909004,
    gap: 0,
    coverage: 138.19,
    reserve: 290000,
    bufferRate: 9.97,
  },
  escalated: {
    available: 4020000,
    payableIn6h: 4020000,
    occupied: 2909004,
    demand: 4275091,
    gap: 255091,
    coverage: 94.03,
    reserve: 376000,
    bufferRate: 8.8,
  },
}

export const ledgerAccounts = [
  { code: '4601', name: '捐赠收入', direction: '收入', amount: 0, status: '待补充' },
  { code: '5601.01', name: '应急采购支出', direction: '支出', amount: 1487500, status: '已占用' },
  { code: '5601.02', name: '运输支出', direction: '支出', amount: 185406, status: '已预算' },
  { code: '5601.03', name: '保险支出', direction: '支出', amount: 11000, status: '已审核' },
]

export const auditTrail = [
  { id: 'REQ-0107', type: '需求', content: '甲3、甲6追加安置保障', time: '02:11', status: '已核验' },
  { id: 'MAT-0236', type: '物资', content: '追加帐篷 275 顶', time: '02:20', status: '待锁价' },
  { id: 'PAY-0089', type: '资金', content: '政府协同保障资金', time: '02:24', status: '可支付' },
  { id: 'VCH-0042', type: '凭证', content: '应急采购支出凭证', time: '02:29', status: '待复核' },
]

export const riskChecks = [
  { label: '资金用途限制', status: '通过', detail: '政府协同资金无限定性条件' },
  { label: '6 小时支付能力', status: '通过', detail: '升级阶段 402 万元可支付' },
  { label: '预备费单独核算', status: '通过', detail: '37.6 万元独立科目管理' },
  { label: '新增资金缺口', status: '预警', detail: '255,091 元待红十字会捐赠资金补充' },
]
