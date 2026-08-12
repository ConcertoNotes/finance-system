import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('岗位选择器使用完整可点击的菜单并展示当前岗位', async () => {
  const source = await readFile(new URL('../src/components/AppHeader.vue', import.meta.url), 'utf8')

  assert.match(source, /class="role-select-trigger"/)
  assert.match(source, /aria-haspopup="listbox"/)
  assert.match(source, /activeRole\.name/)
  assert.match(source, /role-menu/)
  assert.match(source, /chooseRole\(role\.id\)/)
  assert.doesNotMatch(source, /<select/)
})

test('移动端仍保留岗位选择入口', async () => {
  const source = await readFile(new URL('../src/styles/index.css', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /\.header-search,\s*\.role-select\s*\{\s*display:\s*none/)
  assert.match(source, /\.role-select-trigger/)
})

test('顶部状态栏显示实时服务器时间', async () => {
  const source = await readFile(new URL('../src/components/AppHeader.vue', import.meta.url), 'utf8')

  assert.match(source, /serverClock/)
  assert.match(source, /setInterval/)
  assert.match(source, /服务器时间/)
})
