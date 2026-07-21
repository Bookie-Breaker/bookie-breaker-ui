/**
 * Performance route, the dev chart playground, and the root layout
 * server-rendered.
 */
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { describe, expect, it, vi } from "vitest"

const appState = vi.hoisted(() => ({ page: { url: new URL("http://ui/performance") } }))
const environment = vi.hoisted(() => ({ dev: true, browser: false }))

vi.mock("$app/state", () => appState)
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidate: vi.fn() }))
vi.mock("$app/environment", () => environment)
vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html } }))

import Layout from "../../src/routes/+layout.svelte"
import DevChartsPage from "../../src/routes/dev/charts/+page.svelte"
import PerformancePage from "../../src/routes/performance/+page.svelte"
import { bankrollHistoryFixture, breakdownFixture, calibrationFixture } from "$lib/charts/fixtures"
import { performanceData } from "../helpers/fixtures"

function perfData(overrides: Record<string, unknown> = {}) {
  return {
    groupBy: "market_type",
    performance: performanceData(),
    history: { interval: "per_bet", snapshots: bankrollHistoryFixture },
    calibration: calibrationFixture,
    breakdown: breakdownFixture,
    ...overrides
  }
}

describe("performance page", () => {
  it("renders the stat cards and all four charts from healthy data", () => {
    const { body } = render(PerformancePage, { props: { data: perfData() } as never })
    expect(body).toContain("6.2%") // ROI card
    expect(body).toContain("+4.10u over 137 bets")
    expect(body).toContain("72-63-2 · streaks W6/L4")
    expect(body).toContain("1.40%") // avg CLV at 2 digits
    expect(body).toContain("brier 0.213")
    expect(body).toContain('aria-label="bankroll and roi"')
    expect(body).toContain('aria-label="win rate and clv"')
    expect(body).toContain('aria-label="calibration plot"')
    expect(body).toContain('aria-label="performance breakdown"')
    expect(body).toContain("137 settled bets")
  })

  it("falls back to the error panel when the emulator is down", () => {
    const { body } = render(PerformancePage, {
      props: {
        data: perfData({ performance: null, history: null, calibration: null, breakdown: null })
      } as never
    })
    expect(body).toContain("The bookie-emulator service is unavailable.")
    expect(body.match(/No graded bets yet/g)!.length).toBeGreaterThanOrEqual(2)
    expect(body).toContain("Not enough data")
  })

  it("renders null-metric placeholders for a fresh book", () => {
    const performance = performanceData({
      avg_clv: null,
      brier_score: null,
      calibration_error: null,
      roi: -0.02,
      total_profit_units: -1.2
    })
    const { body } = render(PerformancePage, {
      props: { data: perfData({ performance }) } as never
    })
    expect(body).toContain("—")
    expect(body).toContain("no settled bets")
    expect(body).toContain("text-error-500") // negative ROI tone
  })
})

describe("dev charts playground", () => {
  it("renders every option builder against fixtures in dev", () => {
    const { body } = render(DevChartsPage, { props: {} })
    expect(body).toContain("Chart playground")
    for (const label of [
      "line movement",
      "feature importance",
      "margin distribution",
      "bankroll and roi",
      "win rate and clv",
      "calibration plot",
      "performance breakdown"
    ]) {
      expect(body).toContain(`aria-label="${label}"`)
    }
  })
})

describe("root layout", () => {
  it("wires header, nav, chat, and toasts around the page content", () => {
    const children = createRawSnippet(() => ({ render: () => "<p>page-content</p>" }))
    const { body } = render(Layout, { props: { children } as never })
    expect(body).toContain("page-content")
    expect(body).toContain("BookieBreaker")
    expect(body).toContain('aria-label="Primary"') // nav
    expect(body).toContain('aria-label="Toggle analyst chat"')
    expect(body).toContain('aria-live="polite"') // toasts region
  })
})
