import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('驾驶舱使用 ECharts 雨量水位融合图', async () => {
  const packageSource = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const dashboardSource = await readFile(new URL('../src/views/DashboardView.vue', import.meta.url), 'utf8')
  const chartSource = await readFile(new URL('../src/components/HydrologyChart.vue', import.meta.url), 'utf8').catch(() => '')

  assert.ok(packageSource.dependencies?.echarts)
  assert.match(dashboardSource, /HydrologyChart/)
  assert.match(chartSource, /echarts\/core/)
  assert.match(chartSource, /type:\s*'bar'/)
  assert.match(chartSource, /type:\s*'line'/)
})

test('九网格卡片包含风险等级和水位信息', async () => {
  const source = await readFile(new URL('../src/components/GridHeatmap.vue', import.meta.url), 'utf8')

  assert.match(source, /riskMeta/)
  assert.match(source, /grid\.waterLevel/)
  assert.match(source, /grid-card-status/)
})

test('KPI 卡片接受 Lucide 函数组件', async () => {
  const source = await readFile(new URL('../src/components/MetricCard.vue', import.meta.url), 'utf8')

  assert.match(source, /icon:\s*\[Object, Function\]/)
})
