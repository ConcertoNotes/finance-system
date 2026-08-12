const roleHomeViews = {
  'finance-lead': 'dashboard',
  procurement: 'procurement',
  'budget-performance': 'budget',
  'fund-risk': 'funds',
}

export function getRoleHomeView(roleId) {
  return roleHomeViews[roleId] ?? 'collaboration'
}
