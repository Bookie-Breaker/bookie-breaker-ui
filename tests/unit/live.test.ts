import { describe, expect, it } from "vitest"

import type { EdgeListItem, LineSnapshot } from "$lib/api/envelope"
import {
  filterLiveEdges,
  formatCountdown,
  groupLinesByGame,
  isLiveFlagged,
  liveInvalidationTargets
} from "$lib/utils/live"

function snapshot(overrides: Partial<LineSnapshot>): LineSnapshot {
  return {
    id: "s1",
    game_id: "g1",
    sportsbook_id: "sb",
    sportsbook_key: "draftkings",
    market_type: "MONEYLINE",
    selection: "Argentina",
    odds_american: -105,
    odds_decimal: 1.952,
    implied_probability: 0.512,
    timestamp: "2026-07-19T18:30:00Z",
    ...overrides
  } as LineSnapshot
}

describe("groupLinesByGame", () => {
  it("groups snapshots per game preserving first-seen game order", () => {
    const groups = groupLinesByGame([
      snapshot({ id: "a", game_id: "g1" }),
      snapshot({ id: "b", game_id: "g2" }),
      snapshot({ id: "c", game_id: "g1" })
    ])
    expect(groups.map((group) => group.gameId)).toEqual(["g1", "g2"])
    expect(groups[0].snapshots).toHaveLength(2)
    expect(groups[1].snapshots).toHaveLength(1)
  })

  it("sorts within a group by market, selection, then book so refetches don't shuffle rows", () => {
    const groups = groupLinesByGame([
      snapshot({ id: "a", market_type: "TOTAL", selection: "Over 2.5", sportsbook_key: "fanduel" }),
      snapshot({ id: "b", market_type: "MONEYLINE", selection: "Draw" }),
      snapshot({
        id: "c",
        market_type: "MONEYLINE",
        selection: "Argentina",
        sportsbook_key: "fanduel"
      }),
      snapshot({
        id: "d",
        market_type: "MONEYLINE",
        selection: "Argentina",
        sportsbook_key: "draftkings"
      })
    ])
    expect(groups[0].snapshots.map((entry) => entry.id)).toEqual(["d", "c", "b", "a"])
  })

  it("returns no groups for no snapshots", () => {
    expect(groupLinesByGame([])).toEqual([])
  })
})

describe("formatCountdown", () => {
  const now = Date.parse("2026-07-19T18:00:00Z")

  it("renders seconds under a minute", () => {
    expect(formatCountdown("2026-07-19T18:00:42Z", now)).toBe("42s")
  })

  it("renders minutes and zero-padded seconds under an hour", () => {
    expect(formatCountdown("2026-07-19T18:03:05Z", now)).toBe("3m 05s")
  })

  it("renders hours and zero-padded minutes above an hour", () => {
    expect(formatCountdown("2026-07-19T19:04:00Z", now)).toBe("1h 04m")
  })

  it("reports expired targets and tolerates bad timestamps", () => {
    expect(formatCountdown("2026-07-19T17:59:00Z", now)).toBe("expired")
    expect(formatCountdown("2026-07-19T18:00:00Z", now)).toBe("expired")
    expect(formatCountdown("not-a-date", now)).toBe("—")
  })
})

describe("filterLiveEdges", () => {
  it("keeps only edges whose runtime is_live flag is exactly true", () => {
    const edges = [
      { id: "live", is_live: true },
      { id: "pregame", is_live: false },
      { id: "unflagged" },
      { id: "truthy-string", is_live: "true" }
    ] as unknown as EdgeListItem[]
    expect(filterLiveEdges(edges).map((edge) => edge.id)).toEqual(["live"])
  })
})

describe("liveInvalidationTargets", () => {
  const base = {
    "edge.detected": ["app:edges", "app:dashboard"],
    "lines.updated": ["app:lines"],
    "bet.graded": ["app:bets"]
  }

  it("returns the static mapping for pregame payloads", () => {
    expect(liveInvalidationTargets("lines.updated", { is_live: false }, base)).toEqual([
      "app:lines"
    ])
    expect(liveInvalidationTargets("edge.detected", {}, base)).toEqual([
      "app:edges",
      "app:dashboard"
    ])
  })

  it("adds app:live for is_live lines.updated and edge.detected payloads", () => {
    expect(liveInvalidationTargets("lines.updated", { is_live: true }, base)).toEqual([
      "app:lines",
      "app:live"
    ])
    expect(liveInvalidationTargets("edge.detected", { is_live: true }, base)).toEqual([
      "app:edges",
      "app:dashboard",
      "app:live"
    ])
  })

  it("never adds app:live for other events, even flagged ones", () => {
    expect(liveInvalidationTargets("bet.graded", { is_live: true }, base)).toEqual(["app:bets"])
  })

  it("handles unknown events and unparseable payloads", () => {
    expect(liveInvalidationTargets("mystery.event", null, base)).toEqual([])
    expect(liveInvalidationTargets("lines.updated", null, base)).toEqual(["app:lines"])
  })
})

describe("isLiveFlagged", () => {
  it("requires an object payload with is_live strictly true", () => {
    expect(isLiveFlagged({ is_live: true })).toBe(true)
    expect(isLiveFlagged({ is_live: "true" })).toBe(false)
    expect(isLiveFlagged(null)).toBe(false)
    expect(isLiveFlagged("is_live")).toBe(false)
  })
})
