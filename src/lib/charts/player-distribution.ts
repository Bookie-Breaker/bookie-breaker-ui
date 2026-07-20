/**
 * Histogram of one player stat's simulated distribution (Phase 7 Wave 3).
 * Same shape as distribution.ts, tuned for small discrete counts: integer
 * ticks, a marker at the prop line, and the over-the-line bars highlighted.
 */
import type { Distribution } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function playerDistributionOption(
  distribution: Distribution,
  theme: ChartTheme,
  options: { propLine?: number | null; name?: string } = {}
): EChartsCoreOption {
  const propLine = options.propLine ?? null
  const points = Object.entries(distribution.values ?? {})
    .map(([value, probability]) => [Number(value), probability] as [number, number])
    .sort((a, b) => a[0] - b[0])
  const data = points.map(([value, probability]) => ({
    value: [value, probability],
    // P(count > line): the outcomes clearing the prop line render in the
    // success color so the "over" region reads at a glance.
    itemStyle: {
      color: propLine !== null && value > propLine ? theme.success : theme.primary,
      opacity: 0.85
    }
  }))
  const markData: object[] = []
  if (distribution.mean !== null && distribution.mean !== undefined) {
    markData.push({ xAxis: distribution.mean, label: { formatter: "mean" } })
  }
  if (propLine !== null) {
    markData.push({
      xAxis: propLine,
      label: { formatter: "line" },
      lineStyle: { color: theme.error }
    })
  }
  return {
    ...baseOption(theme),
    xAxis: {
      type: "value",
      scale: true,
      minInterval: 1,
      name: options.name ?? "",
      ...axisStyle(theme)
    },
    yAxis: { type: "value", name: "probability", ...axisStyle(theme) },
    series: [
      {
        type: "bar",
        data,
        barWidth: "80%",
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
