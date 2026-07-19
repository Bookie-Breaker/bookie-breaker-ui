import { describe, expect, it } from "vitest"

import {
  addLeg,
  basketLeague,
  canEvaluate,
  legLabel,
  MAX_LEGS,
  parlayEdgePoints,
  removeLeg,
  type ParlayLegDraft
} from "../../src/lib/utils/parlay"

function leg(overrides: Partial<ParlayLegDraft> = {}): ParlayLegDraft {
  return {
    game_external_id: "wc-semi-1",
    market_type: "MONEYLINE",
    side: "HOME",
    selection: "France",
    line_value: null,
    sportsbook_key: "draftkings",
    league: "FIFA_WC",
    edge_id: "edge-1",
    ...overrides
  }
}

describe("addLeg", () => {
  it("appends a compatible leg without mutating the input", () => {
    const legs = [leg()]
    const result = addLeg(legs, leg({ market_type: "TOTAL", side: "OVER", selection: "Over 2.5" }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.legs).toHaveLength(2)
    expect(legs).toHaveLength(1)
  })

  it("rejects a seventh leg", () => {
    const legs = Array.from({ length: MAX_LEGS }, (_, index) =>
      leg({ game_external_id: `game-${index}` })
    )
    const result = addLeg(legs, leg({ game_external_id: "game-extra" }))
    expect(result).toEqual({ ok: false, error: "A parlay takes at most 6 legs." })
  })

  it("rejects a cross-league leg with the basket league in the message", () => {
    const result = addLeg([leg()], leg({ game_external_id: "nba-1", league: "NBA" }))
    expect(result).toEqual({
      ok: false,
      error: "All legs must be in the same league — this parlay is FIFA_WC."
    })
  })

  it("lets a league-unknown manual leg join any basket (server is authoritative)", () => {
    const result = addLeg([leg()], leg({ game_external_id: "wc-semi-2", league: null }))
    expect(result.ok).toBe(true)
  })

  it("rejects an exact duplicate leg", () => {
    const result = addLeg([leg()], leg())
    expect(result).toEqual({ ok: false, error: "That leg is already in the parlay." })
  })

  it("rejects the opposite side of a market already in the basket", () => {
    const result = addLeg([leg()], leg({ side: "AWAY", selection: "Morocco" }))
    expect(result).toEqual({
      ok: false,
      error: "Conflicting picks on one market cannot be parlayed."
    })
  })

  it("allows different markets on the same game (same-game parlay)", () => {
    const result = addLeg(
      [leg()],
      leg({ market_type: "TOTAL", side: "OVER", selection: "Over 2.5", line_value: 2.5 })
    )
    expect(result.ok).toBe(true)
  })
})

describe("removeLeg", () => {
  it("removes by index without mutating", () => {
    const legs = [leg(), leg({ game_external_id: "wc-semi-2" })]
    const next = removeLeg(legs, 0)
    expect(next).toHaveLength(1)
    expect(next[0].game_external_id).toBe("wc-semi-2")
    expect(legs).toHaveLength(2)
  })
})

describe("basketLeague", () => {
  it("is null for an empty basket and ignores league-unknown legs", () => {
    expect(basketLeague([])).toBeNull()
    expect(basketLeague([leg({ league: null })])).toBeNull()
    expect(basketLeague([leg({ league: null }), leg({ league: "NBA" })])).toBe("NBA")
  })
})

describe("canEvaluate", () => {
  it("requires 2-6 legs", () => {
    expect(canEvaluate([])).toBe(false)
    expect(canEvaluate([leg()])).toBe(false)
    expect(canEvaluate([leg(), leg({ game_external_id: "wc-semi-2" })])).toBe(true)
    const six = Array.from({ length: 6 }, (_, index) => leg({ game_external_id: `g${index}` }))
    expect(canEvaluate(six)).toBe(true)
  })
})

describe("legLabel", () => {
  it("prefers the selection and falls back to side + market", () => {
    expect(legLabel(leg())).toBe("France")
    expect(legLabel(leg({ selection: null, market_type: "TOTAL", side: "OVER" }))).toBe(
      "OVER TOTAL"
    )
  })
})

describe("parlayEdgePoints", () => {
  it("is the joint probability minus the implied combined probability, in points", () => {
    // 0.31 - 1/3.64 = 0.31 - 0.2747 -> 3.53 points
    expect(parlayEdgePoints(0.31, 3.64)).toBeCloseTo(3.53, 1)
    expect(parlayEdgePoints(0.25, 4)).toBeCloseTo(0)
  })
})
