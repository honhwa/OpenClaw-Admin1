<template>
  <div class="line-chart">
    <div class="chart-header" v-if="title">
      <h4>{{ title }}</h4>
      <div class="chart-actions" v-if="timeRanges.length > 0">
        <n-radio-group v-model:value="currentRange" @update:value="handleRangeChange">
          <n-radio-button 
            v-for="range in timeRanges" 
            :key="range.value"
            :value="range.value"
            size="small"
          >
            {{ range.label }}
          </n-radio-button>
        </n-radio-group>
      </div>
    </div>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { NRadioButton, NRadioGroup } from 'naive-ui'

interface Props {
  title?: string
  data: Array<{ name: string; value: number }>
  timeRanges?: Array<{ label: string; value: string }>
  xAxisKey?: string
  seriesData?: Array<{ name: string; data: number[] }>
  colors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  timeRanges: () => [
    { label: '日', value: 'day' },
    { label: '周', value: 'week' },
    { label: '月', value: 'month' },
    { label: '年', value: 'year' }
  ],
  colors: () => ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C']
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null
const currentRange = ref('week')

const emit = defineEmits<{
  (e: 'range-change', range: string): void
}>()

const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.data.map(d => d.name),
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#606266' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } },
      axisLabel: { color: '#606266' }
    },
    series: props.seriesData || [{
      type: 'line',
      data: props.data.map(d => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: props.colors[0] },
      lineStyle: { width: 3 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ])
      }
    }],
    animationDuration: 800,
    animationEasing: 'cubicOut' as const
  }
  
  chartInstance.setOption(option)
}

const handleRangeChange = (range: string) => {
  emit('range-change', range)
}

const resizeChart = () => {
  chartInstance?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})

watch(() => props.data, () => {
  if (chartInstance) {
    initChart()
  }
}, { deep: true })

watch(() => props.seriesData, () => {
  if (chartInstance) {
    initChart()
  }
}, { deep: true })

defineExpose({
  resize: resizeChart
})
</script>

<style scoped>
.line-chart {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-actions {
  display: flex;
  gap: 4px;
}

.chart-container {
  width: 100%;
  height: 300px;
}
</style>
