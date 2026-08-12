import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearRehearsalProgress,
  loadRehearsalProgress,
  saveRehearsalProgress,
} from '../src/domain/rehearsalProgress.js'

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}

test('演练进度保存后只读取有效任务编号', () => {
  const storage = createStorage()
  saveRehearsalProgress(storage, [3, 1, 1, 9, '2'])
  assert.deepEqual(loadRehearsalProgress(storage, [1, 2, 3, 4, 5, 6, 7, 8]), [1, 3])
})

test('损坏的演练进度回退为空列表', () => {
  const storage = createStorage({ 'yuhong-rehearsal-progress': '{broken' })
  assert.deepEqual(loadRehearsalProgress(storage, [1, 2, 3, 4, 5, 6, 7, 8]), [])
})

test('关闭保留演练进度时清除本地记录', () => {
  const storage = createStorage({ 'yuhong-rehearsal-progress': '[1,2]' })
  clearRehearsalProgress(storage)
  assert.deepEqual(loadRehearsalProgress(storage, [1, 2, 3]), [])
})
