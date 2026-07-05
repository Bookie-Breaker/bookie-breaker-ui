/** Bankroll and ROI over time from GET /bankroll/history snapshots. */
import type { BankrollSnapshot } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function roiOption(snapshots: BankrollSnapshot[], theme: ChartTheme): EChartsCoreOption {
  return {
    ...baseOption(theme),
    legend: { top: 0, textStyle: { color: theme.subtext } },
    xAxis: { type: "time", ...axisStyle(theme) },
    yAxis: [
      { type: "value", name: "bankroll (u)", scale: true, ...axisStyle(theme) },
      {
        type: "value",
        name: "ROI",
        axisLabel: {
          ...axisStyle(theme).axisLabel,
          formatter: (value: number) => `${(value * 100).toFixed(0)}%`
        },
        splitLine: { show: false },
        axisLine: axisStyle(theme).axisLine
      }
    ],
    series: [
      {
        name: "Bankroll",
        type: "line",
        showSymbol: false,
        data: snapshots.map((s) => [s.timestamp ?? "", s.bankroll_units]),
        lineStyle: { width: 2, color: theme.primary },
        itemStyle: { color: theme.primary }
      },
      {
        name: "ROI",
        type: "line",
        yAxisIndex: 1,
        showSymbol: false,
        data: snapshots.map((s) => [s.timestamp ?? "", s.roi]),
        lineStyle: { width: 2, type: "dashed", color: theme.success },
        itemStyle: { color: theme.success }
      }
    ]
  }
}
