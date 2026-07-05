/** Line movement over time: one series per (sportsbook, selection). */
import type { LineMovement } from "$lib/api/envelope"
import type { EChartsCoreOption } from "$lib/charts/echarts"
import { axisStyle, baseOption, type ChartTheme } from "$lib/charts/theme"

export function lineMovementOption(
  movements: LineMovement[],
  theme: ChartTheme
): EChartsCoreOption {
  const series = movements
    .filter((movement) => (movement.line_snapshots ?? []).length > 0)
    .map((movement) => ({
      name: `${movement.sportsbook_key ?? "book"} ${movement.selection ?? ""}`.trim(),
      type: "line" as const,
      showSymbol: false,
      step: "end" as const,
      data: (movement.line_snapshots ?? []).map((snapshot) => [
        snapshot.timestamp ?? "",
        snapshot.line_value ?? null
      ]),
      markLine:
        movement.closing_line !== null && movement.closing_line !== undefined
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { type: "dashed" as const, color: theme.subtext },
              data: [{ yAxis: movement.closing_line, label: { formatter: "close" } }]
            }
          : undefined
    }))
  return {
    ...baseOption(theme),
    legend: { top: 0, textStyle: { color: theme.subtext } },
    xAxis: { type: "time", ...axisStyle(theme) },
    yAxis: { type: "value", scale: true, name: "line", ...axisStyle(theme) },
    series
  }
}
