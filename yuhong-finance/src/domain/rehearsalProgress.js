const STORAGE_KEY = 'yuhong-rehearsal-progress'

export function loadRehearsalProgress(storage, validTaskIds) {
  try {
    const value = storage?.getItem(STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((taskId) => validTaskIds.includes(taskId)))].sort((a, b) => a - b)
  } catch {
    return []
  }
}

export function saveRehearsalProgress(storage, taskIds) {
  storage?.setItem(STORAGE_KEY, JSON.stringify(taskIds))
}

export function clearRehearsalProgress(storage) {
  storage?.removeItem(STORAGE_KEY)
}
