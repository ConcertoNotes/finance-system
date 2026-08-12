<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  labels: { type: Array, required: true },
  rainfall: { type: Array, required: true },
  waterLevel: { type: Array, required: true },
})

const chartHost = ref(null)
const chart = shallowRef(null)
let resizeObserver

const option = computed(() => ({
  animationDuration: 700,
  animationEasing: 'cubicOut',
  color: ['#60a5fa', '#1d4ed8'],
  grid: { left: 44, right: 42, top: 48, bottom: 32 },
  legend: {
    top: 8,
    right: 8,
    itemWidth: 16,
    itemHeight: 8,
    textStyle: { color: '#64748b', fontSize: 10 },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255,255,255,.96)',
    borderColor: '#dbe3ee',
    borderWidth: 1,
    textStyle: { color: '#111827', fontSize: 11 },
    extraCssText: 'box-shadow: 0 12px 30px rgba(15,23,42,.12); border-radius: 6px;',
  },
  xAxis: {
    type: 'category',
    data: props.labels,
    axisLine: { lineStyle: { color: '#dbe3ee' } },
    axisTick: { show: false },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  yAxis: [
    {
      type: 'value', name: 'mm', min: 0,
      nameTextStyle: { color: '#94a3b8', fontSize: 9 },
      splitLine: { lineStyle: { color: '#edf1f6', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
    {
      type: 'value', name: 'm', min: 0,
      nameTextStyle: { color: '#94a3b8', fontSize: 9 },
      splitLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
  ],
  series: [
    {
      name: '降雨量', type: 'bar', data: props.rainfall, barMaxWidth: 22,
      itemStyle: { color: 'rgba(96,165,250,.72)', borderRadius: [4, 4, 0, 0] },
    },
    {
      name: '实时水位', type: 'line', yAxisIndex: 1, data: props.waterLevel,
      smooth: 0.35, symbol: 'circle', symbolSize: 6,
      lineStyle: { color: '#1d4ed8', width: 3 },
      itemStyle: { color: '#ffffff', borderColor: '#1d4ed8', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(29,78,216,.18)' }, { offset: 1, color: 'rgba(29,78,216,.01)' }],
        },
      },
    },
  ],
}))

onMounted(() => {
  chart.value = init(chartHost.value)
  chart.value.setOption(option.value)
  resizeObserver = new ResizeObserver(() => chart.value?.resize())
  resizeObserver.observe(chartHost.value)
})

watch(option, (nextOption) => chart.value?.setOption(nextOption), { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart.value?.dispose()
})
</script>

<template>
  <div ref="chartHost" class="hydrology-chart" role="img" aria-label="降雨量与实时水位融合趋势图" />
</template>
