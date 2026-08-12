import test from 'node:test'
import assert from 'node:assert/strict'

import { loadCustomRoles, saveCustomRoles, validateNewRole } from '../src/domain/roleRegistry.js'

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }
}

test('合法岗位可保存并读取', () => {
  const storage = createStorage()
  const roles = [{ id: 'audit', name: '审计复核岗', shortName: '审计岗', code: 'A05', responsibility: '复核审计证据', permissions: ['审计复核'] }]
  saveCustomRoles(storage, roles)
  assert.deepEqual(loadCustomRoles(storage), roles)
})

test('损坏的本地数据回退为空岗位列表', () => {
  const storage = createStorage({ 'yuhong-custom-roles': '{broken' })
  assert.deepEqual(loadCustomRoles(storage), [])
})

test('新增岗位校验必填项和重名', () => {
  assert.equal(validateNewRole({ name: '', shortName: '' }, []).ok, false)
  assert.equal(validateNewRole({ name: '财务主管统筹岗', shortName: '新岗位' }, [{ name: '财务主管统筹岗', shortName: '统筹岗' }]).ok, false)
  assert.equal(validateNewRole({ name: '审计复核岗', shortName: '审计岗', responsibility: '审计复核' }, []).ok, true)
})
