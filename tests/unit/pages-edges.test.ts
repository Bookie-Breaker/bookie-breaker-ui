/**
 * Edges list and edge detail routes server-rendered with mocked $app state.
 */
import { render } from "svelte/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const appState = vi.hoisted(() => ({ page: { url: new URL("http://ui/edges") } }))

vi.mock("$app/state", () => appState)
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidate: vi.fn() }))
vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html } }))

import EdgesPage from "../../src/routes/edges/+page.svelte"
import EdgeDetailPage from "../../src/routes/edges/[id]/+page.svelte"
import { edgeDetail, edgeListItem } from "../helpers/fixtures"

beforeEach(() => {
  appState.page.url = new URL("http://ui/edges")
})

describe("edges page", () => {
  it("shows the empty state when no edges match", () => {
    const { body } = render(EdgesPage, {
      props: { data: { edges: [], nextCursor: null, hasMore: false } } as never
    })
    expect(body).toContain("No edges right now")
    expect(body).not.toContain("Load more")
  })

  it("renders the table sorted by edge size", () => {
    const edges = [
      edgeListItem({ id: "e-small", selection: "BOS +3.5", edge_percentage: 2.0 }),
      edgeListItem({ id: "e-big", selection: "LAL -3.5", edge_percentage: 5.5 })
    ]
    const { body } = render(EdgesPage, {
      props: { data: { edges, nextCursor: "c-2", hasMore: true } } as never
    })
    expect(body.indexOf("LAL -3.5")).toBeLessThan(body.indexOf("BOS +3.5")) // 5.5% first
    expect(body).toContain("Market class")
    expect(body).toContain('href="/edges/e-big"')
  })

  it("filters to player props on the props tab and drops the market select", () => {
    appState.page.url = new URL("http://ui/edges?market_class=props")
    const edges = [
      edgeListItem({ id: "e-game", selection: "LAL -3.5", market_type: "SPREAD" }),
      edgeListItem({
        id: "e-prop",
        selection: "Bukayo Saka Over 2.5",
        market_type: "PLAYER_PROP"
      })
    ]
    const { body } = render(EdgesPage, {
      props: { data: { edges, nextCursor: null, hasMore: false } } as never
    })
    // EdgesTable renders the parsed prop view, not the raw selection string.
    expect(body).toContain("Bukayo Saka")
    expect(body).toContain(">OVER</span>")
    expect(body).not.toContain("LAL -3.5")
    expect(body).not.toContain("Market</span>") // market select hidden on props tab
  })

  it("filters out prop edges on the game-lines tab", () => {
    appState.page.url = new URL("http://ui/edges?market_class=game")
    const edges = [
      edgeListItem({ id: "e-game", selection: "LAL -3.5", market_type: "SPREAD" }),
      edgeListItem({ id: "e-prop", selection: "Saka Over 2.5", market_type: "PLAYER_PROP" })
    ]
    const { body } = render(EdgesPage, {
      props: { data: { edges, nextCursor: null, hasMore: false } } as never
    })
    expect(body).toContain("LAL -3.5")
    expect(body).not.toContain("Saka Over 2.5")
  })

  it("shows the props-specific empty state", () => {
    appState.page.url = new URL("http://ui/edges?market_class=props")
    const { body } = render(EdgesPage, {
      props: {
        data: { edges: [edgeListItem({ market_type: "SPREAD" })], nextCursor: null, hasMore: false }
      } as never
    })
    expect(body).toContain("No player-prop edges right now")
  })
})

function detailData(overrides: Record<string, unknown> = {}) {
  return { edge: edgeDetail(), movement: null, analysis: null, ...overrides }
}

describe("edge detail page", () => {
  it("renders the header stats, matchup, and bet CTA", () => {
    const { body } = render(EdgeDetailPage, { props: { data: detailData() } as never })
    expect(body).toContain("LAL -3.5")
    expect(body).toContain("BOS @ LAL")
    expect(body).toContain("56.0%") // model probability
    expect(body).toContain("simulation: 54.0%")
    expect(body).toContain("odds -110 (1.909)")
    expect(body).toContain("kelly 0.050 · stake 1.20u")
    expect(body).toContain('href="/bets?edge=')
    expect(body).toContain("Feature importance")
  })

  it("shows the placed-bet badge instead of the CTA once bet", () => {
    const edge = edgeDetail({
      paper_bet: { id: "b-1", stake: 1.5, result: "PENDING", placed_at: "2026-07-20T13:00:00Z" }
    })
    const { body } = render(EdgeDetailPage, { props: { data: detailData({ edge }) } as never })
    expect(body).toContain("bet placed: 1.50u (PENDING)")
    expect(body).not.toContain("Bet this edge")
  })

  it("marks stale edges and degrades gracefully without prediction detail", () => {
    const edge = edgeDetail({ is_stale: true, prediction: null, confidence: null })
    const { body } = render(EdgeDetailPage, { props: { data: detailData({ edge }) } as never })
    expect(body).toContain("stale")
    expect(body).toContain("No prediction detail")
    expect(body).toContain("No movement history")
    expect(body).toContain("No analysis yet")
  })

  it("renders movement chart and analysis content when present", () => {
    const data = detailData({
      movement: [{ game_id: "odds-game-1" }],
      analysis: {
        id: "an-1",
        title: "Why LAL covers",
        model_used: "llama3",
        created_at: "2026-07-20T12:00:00Z",
        content: "# Verdict\n\nLakers cover."
      }
    })
    const { body } = render(EdgeDetailPage, { props: { data } as never })
    expect(body).toContain('aria-label="line movement"')
    expect(body).toContain("Why LAL covers")
    expect(body).toContain("Lakers cover.")
  })

  it("renders the player-prop presentation for prop edges", () => {
    const edge = edgeDetail({
      market_type: "PLAYER_PROP",
      selection: "Bukayo Saka Over 2.5",
      stat_type: "player_shots",
      prop_type: "OVER_UNDER",
      betting_line: {
        id: "line-1",
        line_value: 2.5,
        odds_american: -105,
        sportsbook_key: "draftkings",
        timestamp: "2026-07-20T11:00:00Z"
      }
    } as never)
    const { body } = render(EdgeDetailPage, { props: { data: detailData({ edge }) } as never })
    expect(body).toContain("Bukayo Saka")
    expect(body).toContain("OVER")
    expect(body).toContain("Shots")
    expect(body).toContain("Player simulation distribution")
    expect(body).not.toContain("Simulation distributions</h2>")
  })
})
