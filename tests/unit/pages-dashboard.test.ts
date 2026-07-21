/**
 * Dashboard route server-rendered with load-function-shaped data.
 */
import { render } from "svelte/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("$app/navigation", () => ({ invalidate: vi.fn() }))

import DashboardPage from "../../src/routes/+page.svelte"
import { alertData, dashboardData } from "../helpers/fixtures"

type Data = {
  dashboard: ReturnType<typeof dashboardData> | null
  alerts: ReturnType<typeof alertData>[]
}

function renderPage(data: Data) {
  return render(DashboardPage, { props: { data } as never })
}

describe("dashboard page", () => {
  it("renders the four stat cards from a healthy dashboard", () => {
    const { body } = renderPage({ dashboard: dashboardData(), alerts: [] })
    expect(body).toContain("Active edges")
    expect(body).toContain("top: LAL -3.5 (+4.0%)")
    expect(body).toContain("2.7u exposure")
    expect(body).toContain("6.2%") // all-time ROI
    expect(body).toContain("+4.10u over 137 bets")
    expect(body).toContain("last: COMPLETED · 3 edges")
    expect(body).toContain("Run pipeline")
  })

  it("falls back to an error panel when the agent is down", () => {
    const { body } = renderPage({ dashboard: null, alerts: [] })
    expect(body).toContain("The agent service is unavailable.")
    expect(body).not.toContain("Active edges")
  })

  it("handles missing optional dashboard sections", () => {
    const dashboard = dashboardData({
      active_edges: { count: 0, avg_edge_pct: 0, by_league: {}, top_edge: null },
      open_bets: null,
      performance_summary: null,
      pipeline_status: { next_scheduled_run: null, last_run: null }
    } as never)
    const { body } = renderPage({ dashboard, alerts: [] })
    expect(body).toContain("no active edges")
    expect(body).toContain("emulator unavailable")
    expect(body).toContain("no runs yet")
  })

  it("lists unacknowledged alerts with edge links", () => {
    const { body } = renderPage({
      dashboard: dashboardData(),
      alerts: [alertData(), alertData({ id: "a-2", message: "Second alert", priority: "LOW" })]
    })
    expect(body).toContain("New NBA edge: LAL -3.5 (+4.0%)")
    expect(body).toContain("Second alert")
    expect(body).toContain('href="/edges/11111111-1111-4111-8111-111111111111"')
    expect(body.match(/Acknowledge/g)).toHaveLength(2)
  })

  it("shows the empty state when no alerts are pending", () => {
    const { body } = renderPage({ dashboard: dashboardData(), alerts: [] })
    expect(body).toContain("No alerts")
  })
})
