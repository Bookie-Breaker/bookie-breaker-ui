/** Grouped performance breakdown (by league, market, sportsbook, month). */
import type { BreakdownData } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function breakdownOption(breakdown: BreakdownData, theme: ChartTheme): EChartsCoreOption {
  const groups = breakdown.breakdowns
  const percentAxis = {
    ...axisStyle(theme),
    axisLabel: {
      ...axisStyle(theme).axisLabel,
      formatter: (value: number) => `${(value * 100).toFixed(0)}%`
    }
  }
  return {
    ...baseOption(theme),
    legend: { top: 0, textStyle: { color: theme.subtext } },
    xAxis: { type: "category", data: groups.map((group) => group.group), ...axisStyle(theme) },
    yAxis: { type: "value", name: "ROI / win rate", ...percentAxis },
    series: [
      {
        name: "ROI",
        type: "bar",
        data: groups.map((group) => ({
          value: group.roi,
          itemStyle: { color: group.roi >= 0 ? theme.success : theme.error }
        })),
        barMaxWidth: 28
      },
      {
        name: "Win rate",
        type: "bar",
        data: groups.map((group) => group.win_rate),
        itemStyle: { color: theme.primary, opacity: 0.7 },
        barMaxWidth: 28
      }
    ]
  }
}
