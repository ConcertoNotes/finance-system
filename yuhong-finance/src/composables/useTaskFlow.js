import { computed, ref, watch } from 'vue'

/**
 * 任务操作流。学生按顺序执行操作，每完成一项就解锁下一项并留下结果。
 *
 * 界面上不出现「第几步」字样：未完成的操作显示为待执行，当前可执行的高亮，
 * 已完成的折叠为结果。
 *
 * @param {string} taskKey 任务标识，用于 localStorage 隔离
 * @param {string[]} ids   操作标识，按执行顺序排列
 */
export function useTaskFlow(taskKey, ids) {
  const storageKey = `yuhong-flow-${taskKey}`
  const done = ref(loadDone())

  function loadDone() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((id) => ids.includes(id)) : []
    } catch {
      return []
    }
  }

  watch(done, (value) => localStorage.setItem(storageKey, JSON.stringify(value)), { deep: true })

  const activeId = computed(() => ids.find((id) => !done.value.includes(id)) ?? null)

  function isDone(id) {
    return done.value.includes(id)
  }

  function status(id) {
    if (isDone(id)) return 'done'
    return activeId.value === id ? 'active' : 'locked'
  }

  /** 完成一项操作；同时补齐它前面所有未完成的操作，避免出现空洞。 */
  function complete(id) {
    const index = ids.indexOf(id)
    if (index === -1) return
    const next = ids.slice(0, index + 1)
    done.value = [...new Set([...done.value, ...next])]
  }

  /** 撤销到该操作之前，其后的结果一并清空。 */
  function revert(id) {
    const index = ids.indexOf(id)
    if (index === -1) return
    done.value = done.value.filter((item) => ids.indexOf(item) < index)
  }

  function reset() {
    done.value = []
    localStorage.removeItem(storageKey)
  }

  const progress = computed(() => ({
    done: done.value.length,
    total: ids.length,
    finished: done.value.length === ids.length,
  }))

  return { done, activeId, isDone, status, complete, revert, reset, progress }
}
