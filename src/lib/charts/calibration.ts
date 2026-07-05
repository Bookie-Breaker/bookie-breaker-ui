/**
 * Reliability diagram: avg predicted probability vs actual win rate per
 * bin, point size proportional to bin volume, with the perfect-calibration
 * diagonal for reference (UI-007).
 */
import type { CalibrationData } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function calibrationOption(
  calibration: CalibrationData,
  theme: ChartTheme
): EChartsCoreOption {
  const occupied = calibration.bins.filter(
    (bin) =>
      bin.bet_count > 0 && bin.avg_predicted_probability !== null && bin.actual_win_rate !== null
  )
  const maxCount = Math.max(1, ...occupied.map((bin) => bin.bet_count))
  const percentAxis = {
    ...axisStyle(theme),
    axisLabel: {
      ...axisStyle(theme).axisLabel,
      formatter: (value: number) => `${(value * 100).toFixed(0)}%`
    }
  }
  return {
    ...baseOption(theme),
    tooltip: {
      ...baseOption(theme).tooltip,
      trigger: "item",
      formatter: (params: { dataIndex: number; seriesType: string }) => {
        if (params.seriesType !== "scatter") return ""
        const bin = occupied[params.dataIndex]
        return [
          `bin ${(bin.lower * 100).toFixed(0)}–${(bin.upper * 100).toFixed(0)}%`,
          `predicted ${((bin.avg_predicted_probability ?? 0) * 100).toFixed(1)}%`,
          `actual ${((bin.actual_win_rate ?? 0) * 100).toFixed(1)}%`,
          `${bin.bet_count} bets`
        ].join("<br/>")
      }
    },
    xAxis: { type: "value", name: "predicted", min: 0, max: 1, ...percentAxis },
    yAxis: { type: "value", name: "actual", min: 0, max: 1, ...percentAxis },
    series: [
      {
        name: "Perfect calibration",
        type: "line",
        showSymbol: false,
        silent: true,
        data: [
          [0, 0],
          [1, 1]
        ],
        lineStyle: { type: "dashed", color: theme.subtext, width: 1 }
      },
      {
        name: "Bins",
        type: "scatter",
        data: occupied.map((bin) => [bin.avg_predicted_probability, bin.actual_win_rate]),
        symbolSize: (_value: unknown, params: { dataIndex: number }) =>
          10 + 30 * Math.sqrt(occupied[params.dataIndex].bet_count / maxCount),
        itemStyle: { color: theme.primary, opacity: 0.8 }
      }
    ]
  }
}
