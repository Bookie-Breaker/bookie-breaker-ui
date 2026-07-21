/**
 * Bet ledger and bet detail routes server-rendered.
 */
import { render } from "svelte/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const appState = vi.hoisted(() => ({ page: { url: new URL("http://ui/bets") } }))

vi.mock("$app/state", () => appState)
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidate: vi.fn() }))

import BetsPage from "../../src/routes/bets/+page.svelte"
import BetDetailPage from "../../src/routes/bets/[id]/+page.svelte"
import { betData, betDetail, edgeDetail, parlayLeg } from "../helpers/fixtures"

beforeEach(() => {
  appState.page.url = new URL("http://ui/bets")
})

function ledgerData(overrides: Record<string, unknown> = {}) {
  return { bets: [], nextCursor: null, prefillEdge: null, prefillLive: false, ...overrides }
}

describe("bets ledger page", () => {
  it("shows the empty state and the collapsed form by default", () => {
    const { body } = render(BetsPage, { props: { data: ledgerData() } as never })
    expect(body).toContain("No bets yet")
    expect(body).toContain("Place a bet")
    expect(body).not.toContain("Place a paper bet")
  })

  it("renders ledger rows with result badges, P/L, and CLV", () => {
    const bets = [
      betData(),
      betData({
        id: "b-2",
        selection: "BOS +3.5",
        result: "WIN",
        profit_loss: 1.36,
        clv: 0.021,
        graded_at: "2026-07-20T22:00:00Z"
      }),
      betData({ id: "b-3", selection: "Over 224.5", result: "LOSS", profit_loss: -1.5 })
    ]
    const { body } = render(BetsPage, { props: { data: ledgerData({ bets }) } as never })
    expect(body).toContain('href="/bets/b-2"')
    expect(body).toContain("PENDING")
    expect(body).toContain("preset-tonal-success")
    expect(body).toContain("preset-tonal-error")
    expect(body).toContain("+1.36u")
    expect(body).toContain("-1.50u")
    expect(body).toContain("2.10%") // CLV rendered at 2 digits
    expect(body).toContain("1.50u") // stake column
  })

  it("badges parlay and live bets in the selection cell", () => {
    const bets = [
      betData({ id: "b-parlay", is_parlay: true, selection: "3-leg parlay" }),
      betData({ id: "b-live", is_live: true, selection: "BOS ML (live)" })
    ]
    const { body } = render(BetsPage, { props: { data: ledgerData({ bets }) } as never })
    expect(body).toContain("PARLAY")
    expect(body).toContain("LIVE")
    // Parlay rows blank out per-leg market/book columns.
    expect(body).toContain('<td class="p-2">—</td>')
  })

  it("keeps the form collapsed on the server even with a prefill edge", () => {
    // showForm flips open in a client-only $effect; SSR ships it closed.
    const { body } = render(BetsPage, {
      props: { data: ledgerData({ prefillEdge: edgeDetail(), prefillLive: true }) } as never
    })
    expect(body).toContain("Place a bet")
    expect(body).not.toContain("Hide form")
  })
})

describe("bet detail page", () => {
  it("renders stake, model, and pending-grade cards for a straight bet", () => {
    const { body } = render(BetDetailPage, {
      props: { data: { bet: betDetail(), parlayLegs: null } } as never
    })
    expect(body).toContain("LAL -3.5")
    expect(body).toContain("1.50u")
    expect(body).toContain("$150.00 at -110")
    expect(body).toContain("pending")
    expect(body).toContain("awaiting final score")
    expect(body).toContain("edge at placement 4.00%")
    expect(body).toContain("no closing line captured")
    expect(body).toContain('href="/edges/')
    expect(body).not.toContain("Legs")
  })

  it("renders grade and CLV once settled", () => {
    const bet = betDetail({
      result: "WIN",
      profit_loss: 1.36,
      clv: 0.021,
      graded_at: "2026-07-20T22:00:00Z",
      closing_odds_american: -118,
      grade: {
        id: "grade-1",
        game_result_id: "gr-1",
        result: "WIN",
        result_description: "LAL covered -3.5 by winning by 7.",
        actual_home_score: 112,
        actual_away_score: 105,
        actual_margin: 7,
        actual_total: 217,
        graded_at: "2026-07-20T22:00:00Z"
      }
    })
    const { body } = render(BetDetailPage, {
      props: { data: { bet, parlayLegs: null } } as never
    })
    expect(body).toContain("+1.36u")
    expect(body).toContain("closed -118")
    expect(body).toContain("LAL covered -3.5 by winning by 7.")
    expect(body).toContain("Final: 105–112")
    expect(body).toContain("(margin 7, total 217)")
  })

  it("renders the leg table for parlay parents", () => {
    const bet = betDetail({ is_parlay: true, selection: "2-leg NBA parlay" })
    const legs = [
      parlayLeg(),
      parlayLeg({
        id: "leg-2",
        leg_index: 1,
        selection: "Over 224.5",
        market_type: "TOTAL",
        side: "OVER",
        line_value: 224.5,
        odds_american: -105,
        leg_status: "WIN"
      })
    ]
    const { body } = render(BetDetailPage, {
      props: { data: { bet, parlayLegs: legs } } as never
    })
    expect(body).toContain("PARLAY")
    expect(body).toContain("Legs")
    expect(body).toContain("LAL -3.5")
    expect(body).toContain("Over 224.5")
    expect(body).toContain("TOTAL OVER")
    expect(body).toContain("+224.5")
    expect(body).toContain("WIN")
  })
})
