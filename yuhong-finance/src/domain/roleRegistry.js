const STORAGE_KEY = 'yuhong-custom-roles'

export function loadCustomRoles(storage) {
  try {
    const value = storage?.getItem(STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomRoles(storage, roles) {
  storage?.setItem(STORAGE_KEY, JSON.stringify(roles))
}

export function validateNewRole(role, existingRoles) {
  const name = role.name?.trim()
  const shortName = role.shortName?.trim()
  const responsibility = role.responsibility?.trim()
  if (!name || !shortName || !responsibility) return { ok: false, message: '请填写岗位名称、简称和职责' }
  if (existingRoles.some((item) => item.name === name || item.shortName === shortName)) return { ok: false, message: '岗位名称或简称已存在' }
  return { ok: true, message: '' }
}

export function createRole(role, index = 0) {
  const id = role.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '') || `custom-${Date.now()}`
  return {
    id,
    name: role.name.trim(),
    shortName: role.shortName.trim(),
    code: role.code?.trim() || `C${String(index + 5).padStart(2, '0')}`,
    color: role.color || '#9c8fda',
    responsibility: role.responsibility.trim(),
    permissions: role.permissions?.length ? role.permissions : ['协同查看'],
    taskIds: [],
    custom: true,
  }
}
