// 第三阶段领域逻辑：资金分类、付款匹配、四流核验与付款拆分

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

// 按类别汇总资金台账
export function summarizeFundEntries(entries, categories) {
  return categories.map((category) => {
    const rows = entries.filter((entry) => entry.category === category.id)
    return {
      ...category,
      count: rows.length,
      total: rows.reduce((sum, entry) => sum + entry.amount, 0),
    }
  })
}

// 限定性用途匹配：付款用途必须落在资金标签允许的用途内
export function checkRestrictedUsage(paymentUsage, fundEntry) {
  if (fundEntry.usage === '不限') return { pass: true, reason: '非限定性资金，用途不受限' }
  const pass = fundEntry.usage.includes(paymentUsage)
  return {
    pass,
    reason: pass
      ? `付款用途"${paymentUsage}"符合${fundEntry.id}限定用途"${fundEntry.usage}"`
      : `付款用途"${paymentUsage}"与${fundEntry.id}限定用途"${fundEntry.usage}"不一致，违反限定性条款`,
  }
}

// 资金错配处置后的账户余额（D01→U01，U01 支付车辆维修3万元）
export function getFundAccountBalances(entries, swapResolved, maintenanceAmount = 30000) {
  return entries.map((entry) => {
    if (entry.id === 'U01' && swapResolved) {
      return { ...entry, balance: entry.amount - maintenanceAmount, note: `已支付车辆维修${(maintenanceAmount / 10000).toFixed(0)}万元` }
    }
    if (entry.id === 'I01') return { ...entry, balance: 0, note: '复盘阶段理赔后到账' }
    return { ...entry, balance: entry.amount, note: '' }
  })
}

// 四流匹配：质量异常放行前后状态不同
export function getFourFlowStatus(items, qualityReleased) {
  const rows = items.map((item) => {
    if (!item.anomaly) return { ...item, status: '一致', pass: true }
    if (qualityReleased) {
      return {
        ...item,
        status: '整改后一致',
        pass: true,
        payment: '最终付款135,000元（含放行8,800元）',
        goods: '补货复验150顶全部合格',
      }
    }
    return { ...item, status: `异常，冻结${item.frozen.toLocaleString('zh-CN')}元`, pass: false }
  })
  const passed = rows.filter((row) => row.pass).length
  return {
    rows,
    passed,
    total: rows.length,
    passRate: round2((passed / rows.length) * 100),
  }
}

// 付款拆分：可支付 = 合格数量×单价 + 已完成且凭证齐全的附加成本；冻结 = 不合格数量×单价
export function splitPayment({ contractQty, qualifiedQty, unitPrice, extras = 0 }) {
  const frozen = round2((contractQty - qualifiedQty) * unitPrice)
  const payable = round2(qualifiedQty * unitPrice + extras)
  return { frozen, payable, total: round2(frozen + payable) }
}

// 验收合格率
export function acceptanceRate(qualified, total) {
  return round2((qualified / total) * 100)
}
