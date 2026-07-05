/** Histogram of a simulated discrete distribution (margin, total, scores). */
import type { Distribution } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function distributionOption(
  distribution: Distribution,
  theme: ChartTheme,
  options: { marketLine?: number | null; name?: string } = {}
): EChartsCoreOption {
  const points = Object.entries(distribution.values ?? {})
    .map(([value, probability]) => [Number(value), probability] as [number, number])
    .sort((a, b) => a[0] - b[0])
  const markData: object[] = []
  if (distribution.mean !== null && distribution.mean !== undefined) {
    markData.push({ xAxis: distribution.mean, label: { formatter: "mean" } })
  }
  if (options.marketLine !== null && options.marketLine !== undefined) {
    markData.push({
      xAxis: options.marketLine,
      label: { formatter: "line" },
      lineStyle: { color: theme.error }
    })
  }
  return {
    ...baseOption(theme),
    xAxis: { type: "value", scale: true, name: options.name ?? "", ...axisStyle(theme) },
    yAxis: { type: "value", name: "probability", ...axisStyle(theme) },
    series: [
      {
        type: "bar",
        data: points,
        barWidth: "80%",
        itemStyle: { color: theme.primary, opacity: 0.85 },
        markLine: markData.length
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { type: "dashed" as const, color: theme.subtext },
              data: markData
            }
          : undefined
      }
    ]
  }
}
