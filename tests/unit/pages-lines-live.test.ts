/**
 * Lines and Live routes server-rendered, including best-odds highlighting.
 */
import { render } from "svelte/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const appState = vi.hoisted(() => ({ page: { url: new URL("http://ui/lines") } }))

vi.mock("$app/state", () => appState)
vi.mock("$app/navigation", () => ({ goto: vi.fn() }))

import LinesPage from "../../src/routes/lines/+page.svelte"
import LivePage from "../../src/routes/live/+page.svelte"
import { edgeListItem, lineSnapshot } from "../helpers/fixtures"

beforeEach(() => {
  appState.page.url = new URL("http://ui/lines")
})

describe("lines page", () => {
  it("shows the empty state without lines", () => {
    const { body } = render(LinesPage, { props: { data: { lines: [] } } as never })
    expect(body).toContain("No current lines")
  })

  it("groups snapshots per game and bolds the best price per selection", () => {
    const lines = [
      lineSnapshot({ id: "s-1", sportsbook_key: "draftkings", odds_american: -110 }),
      lineSnapshot({ id: "s-2", sportsbook_key: "pinnacle", odds_american: -105 }),
      lineSnapshot({
        id: "s-3",
        game_id: "other-game",
        selection: "Over 224.5",
        market_type: "TOTAL",
        odds_american: -102,
        is_opening: true,
        is_closing: true
      })
    ]
    const { body } = render(LinesPage, { props: { data: { lines } } as never })
    // Two game cards, one per game_id.
    expect(body.match(/Show movement/g)).toHaveLength(2)
    // -105 beats -110 for the same (market, selection).
    const bold = body.indexOf("text-success-500 font-bold")
    expect(bold).toBeGreaterThan(-1)
    expect(body.slice(bold, bold + 300)).toContain("-105")
    // Opening/closing badges on the flagged snapshot.
    expect(body).toContain(">open</span>")
    expect(body).toContain(">close</span>")
  })
})

describe("live page", () => {
  it("shows the all-quiet empty state without live games or edges", () => {
    const { body } = render(LivePage, {
      props: { data: { liveLines: [], liveEdges: [] } } as never
    })
    expect(body).toContain("No live games right now")
  })

  it("renders live edges with countdown chips and bet-live CTAs", () => {
    const future = new Date(Date.now() + 5 * 60_000).toISOString()
    const liveEdges = [
      { ...edgeListItem({ id: "e-1", expires_at: future }), is_live: true },
      {
        ...edgeListItem({
          id: "e-2",
          selection: "BOS ML",
          expires_at: "2020-01-01T00:00:00Z", // long expired
          has_paper_bet: true
        }),
        is_live: true
      }
    ]
    const { body } = render(LivePage, {
      props: { data: { liveLines: [], liveEdges } } as never
    })
    expect(body).toContain("IN PLAY")
    expect(body.match(/data-testid="edge-countdown"/g)).toHaveLength(2)
    expect(body).toContain("expired")
    expect(body).toContain("preset-tonal-error") // expired chip tone
    expect(body).toContain('href="/bets?edge=e-1&amp;live=1"')
    expect(body).toContain("bet placed") // already-bet edge loses the CTA
    expect(body).toContain("No live lines")
  })

  it("renders live line groups with the LIVE badge and best-odds bolding", () => {
    const liveLines = [
      lineSnapshot({ id: "s-1", is_live: true, odds_american: -110 }),
      lineSnapshot({ id: "s-2", is_live: true, sportsbook_key: "pinnacle", odds_american: -104 })
    ]
    const { body } = render(LivePage, {
      props: { data: { liveLines, liveEdges: [] } } as never
    })
    expect(body).toContain("No live edges")
    expect(body).toContain(">LIVE</span>")
    const bold = body.indexOf("text-success-500 font-bold")
    expect(body.slice(bold, bold + 300)).toContain("-104")
  })
})
