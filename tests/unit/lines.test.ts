import { describe, expect, it } from "vitest"

import { bestOddsBySelection, selectionKey } from "$lib/utils/lines"

// Three-way soccer moneyline (ADR-027) across two books, plus a total —
// best odds must be tracked per (market, selection), never per game.
const soccerSnapshots = [
  { market_type: "MONEYLINE", selection: "Arsenal", odds_american: -120 },
  { market_type: "MONEYLINE", selection: "Draw", odds_american: 240 },
  { market_type: "MONEYLINE", selection: "Chelsea", odds_american: 310 },
  { market_type: "MONEYLINE", selection: "Arsenal", odds_american: -125 },
  { market_type: "MONEYLINE", selection: "Draw", odds_american: 250 },
  { market_type: "MONEYLINE", selection: "Chelsea", odds_american: 305 },
  { market_type: "TOTAL", selection: "Over 2.5", odds_american: -105 }
]

describe("bestOddsBySelection", () => {
  it("tracks the best price for each of the three moneyline outcomes", () => {
    const best = bestOddsBySelection(soccerSnapshots)
    expect(best.get("MONEYLINE|Arsenal")).toBe(-120)
    expect(best.get("MONEYLINE|Draw")).toBe(250)
    expect(best.get("MONEYLINE|Chelsea")).toBe(310)
    expect(best.get("TOTAL|Over 2.5")).toBe(-105)
  })

  it("does not let the long-odds Draw absorb the highlight from other outcomes", () => {
    const best = bestOddsBySelection(soccerSnapshots)
    const homeBest = best.get(selectionKey({ market_type: "MONEYLINE", selection: "Arsenal" }))
    expect(homeBest).not.toBe(best.get("MONEYLINE|Draw"))
    expect(homeBest).toBe(-120)
  })
})
