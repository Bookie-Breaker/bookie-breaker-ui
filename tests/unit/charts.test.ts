import { describe, expect, it } from "vitest"

import { breakdownOption } from "$lib/charts/breakdown"
import { calibrationOption } from "$lib/charts/calibration"
import { distributionOption } from "$lib/charts/distribution"
import { featureImportanceOption } from "$lib/charts/feature-importance"
import {
  bankrollHistoryFixture,
  breakdownFixture,
  calibrationFixture,
  distributionFixture,
  featureImportanceFixture,
  lineMovementFixture,
  playerShotsDistributionFixture
} from "$lib/charts/fixtures"
import { lineMovementOption } from "$lib/charts/line-movement"
import { playerDistributionOption } from "$lib/charts/player-distribution"
import { roiOption } from "$lib/charts/roi"
import { chartTheme } from "$lib/charts/theme"
import { winRateClvOption } from "$lib/charts/win-rate-clv"

const theme = chartTheme("dark")

type AnyOption = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

describe("lineMovementOption", () => {
  it("builds one series per (sportsbook, selection) with time data", () => {
    const option = lineMovementOption(lineMovementFixture, theme) as AnyOption
    expect(option.series).toHaveLength(2)
    expect(option.series[0].name).toBe("draftkings LAL -3.5")
    expect(option.series[0].data[0]).toEqual(["2026-03-01T12:00:00Z", -3.5])
    expect(option.xAxis.type).toBe("time")
  })

  it("adds a closing markLine only when a closing line exists", () => {
    const option = lineMovementOption(lineMovementFixture, theme) as AnyOption
    expect(option.series[0].markLine.data[0].yAxis).toBe(-5)
    expect(option.series[1].markLine).toBeUndefined()
  })

  it("drops movements without snapshots", () => {
    const option = lineMovementOption([{ sportsbook_key: "empty" }], theme) as AnyOption
    expect(option.series).toHaveLength(0)
  })
})

describe("featureImportanceOption", () => {
  it("sorts features by absolute weight ascending and colors by sign", () => {
    const option = featureImportanceOption(featureImportanceFixture, theme) as AnyOption
    const labels = option.yAxis.data as string[]
    expect(labels[labels.length - 1]).toBe("offensive rating delta")
    expect(labels[0]).toBe("rest days")
    const values = option.series[0].data.map((d: { value: number }) => d.value)
    expect(values[values.length - 1]).toBe(0.31)
  })
})

describe("distributionOption", () => {
  it("sorts values numerically and marks the mean and market line", () => {
    const option = distributionOption(distributionFixture, theme, { marketLine: -3.5 }) as AnyOption
    const data = option.series[0].data as [number, number][]
    expect(data[0][0]).toBe(-20)
    expect(data[data.length - 1][0]).toBe(20)
    const marks = option.series[0].markLine.data as { xAxis: number }[]
    expect(marks.map((m) => m.xAxis)).toEqual([4.1, -3.5])
  })
})

describe("playerDistributionOption", () => {
  it("sorts discrete values and marks the mean and prop line", () => {
    const option = playerDistributionOption(playerShotsDistributionFixture, theme, {
      propLine: 2.5
    }) as AnyOption
    const data = option.series[0].data as { value: [number, number] }[]
    expect(data[0].value[0]).toBe(0)
    expect(data[data.length - 1].value[0]).toBe(6)
    const marks = option.series[0].markLine.data as { xAxis: number }[]
    expect(marks.map((m) => m.xAxis)).toEqual([2.6, 2.5])
    expect(option.xAxis.minInterval).toBe(1)
  })

  it("highlights the bars clearing the prop line", () => {
    const option = playerDistributionOption(playerShotsDistributionFixture, theme, {
      propLine: 2.5
    }) as AnyOption
    const data = option.series[0].data as {
      value: [number, number]
      itemStyle: { color: string }
    }[]
    for (const point of data) {
      expect(point.itemStyle.color).toBe(point.value[0] > 2.5 ? theme.success : theme.primary)
    }
  })

  it("omits the prop-line mark and highlight without a line (yes/no props)", () => {
    const option = playerDistributionOption(playerShotsDistributionFixture, theme) as AnyOption
    const marks = option.series[0].markLine.data as { xAxis: number }[]
    expect(marks.map((m) => m.xAxis)).toEqual([2.6])
    const data = option.series[0].data as { itemStyle: { color: string } }[]
    for (const point of data) {
      expect(point.itemStyle.color).toBe(theme.primary)
    }
  })
})

describe("roiOption / winRateClvOption", () => {
  it("maps snapshots onto dual axes", () => {
    const roi = roiOption(bankrollHistoryFixture, theme) as AnyOption
    expect(roi.series[0].data).toHaveLength(30)
    expect(roi.series[1].yAxisIndex).toBe(1)

    const winRate = winRateClvOption(bankrollHistoryFixture, theme) as AnyOption
    expect(winRate.series.map((s: { name: string }) => s.name)).toEqual(["Win rate", "Avg CLV"])
  })
})

describe("calibrationOption", () => {
  it("plots only occupied bins plus the diagonal", () => {
    const option = calibrationOption(calibrationFixture, theme) as AnyOption
    const occupied = calibrationFixture.bins.filter((bin) => bin.bet_count > 0)
    expect(option.series[1].data).toHaveLength(occupied.length)
    expect(option.series[0].data).toEqual([
      [0, 0],
      [1, 1]
    ])
  })

  it("scales symbol size with bin volume", () => {
    const option = calibrationOption(calibrationFixture, theme) as AnyOption
    const sizeOf = option.series[1].symbolSize as (v: unknown, p: { dataIndex: number }) => number
    const occupied = calibrationFixture.bins.filter((bin) => bin.bet_count > 0)
    const biggest = occupied.reduce(
      (max, bin, index) => (bin.bet_count > occupied[max].bet_count ? index : max),
      0
    )
    expect(sizeOf(null, { dataIndex: biggest })).toBeGreaterThan(sizeOf(null, { dataIndex: 0 }))
  })
})

describe("breakdownOption", () => {
  it("colors ROI bars by sign", () => {
    const option = breakdownOption(breakdownFixture, theme) as AnyOption
    const roiBars = option.series[0].data as { value: number; itemStyle: { color: string } }[]
    expect(roiBars[0].itemStyle.color).toBe(theme.success)
    expect(roiBars[1].itemStyle.color).toBe(theme.error)
    expect(option.xAxis.data).toEqual(["SPREAD", "TOTAL", "MONEYLINE"])
  })
})
