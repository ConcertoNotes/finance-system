import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('界面文字字号不低于 12px', async () => {
  const source = await readFile(new URL('../src/styles/index.css', import.meta.url), 'utf8')
  const sizes = [
    ...[...source.matchAll(/font-size:\s*(\d+)px/g)].map((match) => Number(match[1])),
    ...[...source.matchAll(/font:\s*[^;\n]*?\b(\d+)px(?:\/[^\s;]+)?/g)].map((match) => Number(match[1])),
  ]

  assert.ok(sizes.length > 0)
  assert.equal(Math.min(...sizes), 12)
  assert.doesNotMatch(source, /IBM Plex Mono/)
})
