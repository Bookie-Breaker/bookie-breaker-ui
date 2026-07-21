import { afterEach, describe, expect, it, vi } from "vitest"

import { axisStyle, baseOption, chartTheme } from "$lib/charts/theme"
import {
  formatDate,
  formatDateTime,
  formatLine,
  formatPoints,
  formatUnits
} from "$lib/utils/format"
import { newIdempotencyKey } from "$lib/utils/idempotency"

describe("formatLine", () => {
  it("signs positive lines and passes negatives through", () => {
    expect(formatLine(3.5)).toBe("+3.5")
    expect(formatLine(-3.5)).toBe("-3.5")
    expect(formatLine(0)).toBe("0")
  })

  it("renders a dash for missing lines", () => {
    expect(formatLine(null)).toBe("—")
    expect(formatLine(undefined)).toBe("—")
  })
})

describe("date formatting", () => {
  it("renders a dash for missing or invalid dates", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDate("")).toBe("—")
    expect(formatDate("not-a-date")).toBe("—")
    expect(formatDateTime(null)).toBe("—")
    expect(formatDateTime("not-a-date")).toBe("—")
  })

  it("formats valid ISO dates with month and day", () => {
    expect(formatDate("2026-07-20T12:00:00Z")).toMatch(/Jul/)
    expect(formatDate("2026-07-20T12:00:00Z")).toMatch(/2026/)
    expect(formatDateTime("2026-07-20T12:00:00Z")).toMatch(/Jul/)
  })
})

describe("format edge cases", () => {
  it("handles null points/units and unsigned points", () => {
    expect(formatPoints(null)).toBe("—")
    expect(formatPoints(4.2)).toBe("4.20%")
    expect(formatUnits(null)).toBe("—")
    expect(formatUnits(0)).toBe("0.00u")
  })
})

describe("newIdempotencyKey", () => {
  it("returns unique UUIDs", () => {
    const first = newIdempotencyKey()
    const second = newIdempotencyKey()
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(first).not.toBe(second)
  })
})

describe("chartTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns static fallbacks without a document (SSR)", () => {
    const dark = chartTheme("dark")
    const light = chartTheme("light")
    expect(dark.text).toBe("#e2e8f0")
    expect(light.text).toBe("#1e293b")
    expect(dark.series).toHaveLength(7)
  })

  it("reads Skeleton CSS variables in a browser, falling back per-token", () => {
    vi.stubGlobal("document", { documentElement: {} })
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn().mockReturnValue({
        getPropertyValue: (name: string) => (name === "--color-primary-500" ? " #123456 " : "")
      })
    )
    const theme = chartTheme("light")
    expect(theme.primary).toBe("#123456") // trimmed CSS var wins
    expect(theme.success).toBe("#16a34a") // empty var falls back
  })

  it("builds base and axis scaffolding from the theme tokens", () => {
    const theme = chartTheme("dark")
    const base = baseOption(theme)
    expect(base.color).toBe(theme.series)
    expect(base.tooltip.backgroundColor).toBe(theme.tooltipBg)
    const axis = axisStyle(theme)
    expect(axis.axisLabel.color).toBe(theme.subtext)
    expect(axis.splitLine.lineStyle.color).toBe(theme.splitLine)
  })
})
