/** Win rate and average CLV over time from bankroll history snapshots. */
import type { BankrollSnapshot } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function winRateClvOption(
  snapshots: BankrollSnapshot[],
  theme: ChartTheme
): EChartsCoreOption {
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
    xAxis: { type: "time", ...axisStyle(theme) },
    yAxis: [
      { type: "value", name: "win rate", max: 1, min: 0, ...percentAxis },
      {
        type: "value",
        name: "avg CLV",
        ...percentAxis,
        splitLine: { show: false },
        scale: true
      }
    ],
    series: [
      {
        name: "Win rate",
        type: "line",
        showSymbol: false,
        data: snapshots.map((s) => [s.timestamp ?? "", s.win_rate]),
        lineStyle: { width: 2, color: theme.primary },
        itemStyle: { color: theme.primary }
      },
      {
        name: "Avg CLV",
        type: "line",
        yAxisIndex: 1,
        showSymbol: false,
        data: snapshots.map((s) => [s.timestamp ?? "", s.avg_clv ?? null]),
        lineStyle: { width: 2, type: "dashed", color: theme.warning },
        itemStyle: { color: theme.warning }
      }
    ]
  }
}
