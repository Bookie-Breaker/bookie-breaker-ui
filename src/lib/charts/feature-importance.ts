/** Horizontal bar chart of model feature importance for a prediction. */
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function featureImportanceOption(
  importance: Record<string, number>,
  theme: ChartTheme
): EChartsCoreOption {
  const entries = Object.entries(importance).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))
  return {
    ...baseOption(theme),
    tooltip: { ...baseOption(theme).tooltip, trigger: "item" },
    xAxis: { type: "value", ...axisStyle(theme) },
    yAxis: {
      type: "category",
      data: entries.map(([name]) => name.replaceAll("_", " ")),
      ...axisStyle(theme)
    },
    series: [
      {
        type: "bar",
        data: entries.map(([, weight]) => ({
          value: weight,
          itemStyle: { color: weight >= 0 ? theme.primary : theme.warning }
        })),
        barMaxWidth: 18
      }
    ]
  }
}
