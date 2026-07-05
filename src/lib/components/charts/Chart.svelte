<script lang="ts">
  import { echarts, type EChartsCoreOption } from "$lib/charts/echarts"

  let {
    option,
    height = "20rem",
    ariaLabel = "chart"
  }: {
    option: EChartsCoreOption
    height?: string
    ariaLabel?: string
  } = $props()

  let container: HTMLDivElement

  $effect(() => {
    const chart = echarts.init(container)
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.dispose()
    }
  })

  $effect(() => {
    const chart = echarts.getInstanceByDom(container)
    chart?.setOption(option, { notMerge: true })
  })
</script>

<div bind:this={container} style:height role="img" aria-label={ariaLabel}></div>
