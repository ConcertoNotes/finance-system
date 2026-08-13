import { isRef, toRaw } from 'vue'

export const FORM_PREFIX = 'yuhong-form-'

function snapshotOf(value) {
  if (isRef(value)) return value.value
  return toRaw(value)
}

function applySaved(target, saved) {
  if (isRef(target)) {
    target.value = saved
    return
  }
  if (Array.isArray(target) && Array.isArray(saved)) {
    target.splice(0, target.length, ...saved.map((item) => (
      item && typeof item === 'object' ? { ...item } : item
    )))
    return
  }
  if (target && typeof target === 'object' && saved && typeof saved === 'object') {
    Object.assign(target, saved)
  }
}

/**
 * 任务表单持久化。学生填写后点保存写入 localStorage，刷新后仍在。
 * 与 useTaskFlow 的办理进度分开存储，清除记录时两套一起删。
 */
export function useFormPersist(taskKey) {
  const storageKey = `${FORM_PREFIX}${taskKey}`

  function read() {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function persist(parts) {
    const payload = {}
    Object.entries(parts).forEach(([name, value]) => {
      payload[name] = snapshotOf(value)
    })
    localStorage.setItem(storageKey, JSON.stringify(payload))
  }

  function restore(parts) {
    const saved = read()
    if (!saved) return
    Object.entries(parts).forEach(([name, target]) => {
      if (saved[name] == null) return
      applySaved(target, saved[name])
    })
  }

  function clear() {
    localStorage.removeItem(storageKey)
  }

  return { persist, restore, clear, storageKey }
}
