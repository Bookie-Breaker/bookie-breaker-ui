import { render } from "svelte/server"
import { describe, expect, it } from "vitest"

import type { EdgeListItem } from "$lib/api/envelope"
import EdgesTable from "$lib/components/tables/EdgesTable.svelte"

function edge(overrides: Partial<EdgeListItem>): EdgeListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    game_id: "22222222-2222-4222-8222-222222222222",
    league: "EPL",
    home_team: "ARS",
    away_team: "CHE",
    scheduled_start: "2026-07-05T19:00:00Z",
    market_type: "MONEYLINE",
    selection: "Arsenal",
    predicted_probability: 0.48,
    implied_probability: 0.44,
    edge_percentage: 4.0,
    expected_value: 0.07,
    odds_american: -120,
    sportsbook_key: "draftkings",
    kelly_fraction: 0.05,
    recommended_stake: 1.0,
    confidence: 0.8,
    detected_at: "2026-07-05T12:00:00Z",
    expires_at: "2026-07-05T19:00:00Z",
    is_stale: false,
    is_live: false,
    has_paper_bet: false,
    paper_bet_id: null,
    ...overrides
  }
}

// Three-way soccer moneyline (ADR-027): Home, Draw, and Away edges must all
// render as ordinary rows — the Draw outcome is just one more selection.
const threeWayEdges: EdgeListItem[] = [
  edge({ selection: "Arsenal" }),
  edge({
    id: "11111111-1111-4111-8111-111111111112",
    selection: "Draw",
    odds_american: 250,
    predicted_probability: 0.31,
    implied_probability: 0.27
  }),
  edge({
    id: "11111111-1111-4111-8111-111111111113",
    selection: "Chelsea",
    odds_american: 310,
    predicted_probability: 0.24,
    implied_probability: 0.22
  })
]

describe("EdgesTable", () => {
  it("renders a Draw edge alongside home and away selections", () => {
    const { body } = render(EdgesTable, { props: { edges: threeWayEdges } })
    expect(body).toContain("Arsenal")
    expect(body).toContain("Draw")
    expect(body).toContain("Chelsea")
    expect(body).toContain("+250")
    // One row per edge, Draw included.
    expect(body.match(/href="\/edges\//g)).toHaveLength(3)
  })
})
