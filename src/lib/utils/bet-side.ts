/**
 * Derive the emulator's side enum (HOME|AWAY|DRAW|OVER|UNDER) from an edge's
 * selection string. String matching against team names is best-effort —
 * callers must let the user override when this returns null.
 */

export type BetSide = "HOME" | "AWAY" | "DRAW" | "OVER" | "UNDER"

/**
 * Sides a bettor may pick for a market. DRAW exists only on three-way
 * moneylines (ADR-027) — it must never be offered for SPREAD or TOTAL.
 */
export function sidesForMarket(marketType: string): BetSide[] {
  if (marketType === "TOTAL") return ["OVER", "UNDER"]
  if (marketType === "MONEYLINE") return ["HOME", "AWAY", "DRAW"]
  return ["HOME", "AWAY"]
}

export function deriveSide(
  marketType: string,
  selection: string,
  homeTeam: string | null | undefined,
  awayTeam: string | null | undefined
): BetSide | null {
  const normalized = selection.trim().toLowerCase()
  if (marketType === "TOTAL") {
    if (normalized.startsWith("over") || normalized.startsWith("o ")) return "OVER"
    if (normalized.startsWith("under") || normalized.startsWith("u ")) return "UNDER"
    return null
  }
  // Three-way moneyline outcome (ADR-027): the lines pipeline names it "Draw".
  if (marketType === "MONEYLINE" && normalized === "draw") return "DRAW"
  const home = homeTeam?.trim().toLowerCase()
  const away = awayTeam?.trim().toLowerCase()
  if (home && (normalized.startsWith(home) || normalized.includes(` ${home} `))) return "HOME"
  if (away && (normalized.startsWith(away) || normalized.includes(` ${away} `))) return "AWAY"
  // Abbreviation-style selections ("LAL -3.5") vs full team names.
  const token = normalized.split(/\s+/)[0]
  if (home?.startsWith(token) || home?.split(/\s+/).some((word) => word === token)) return "HOME"
  if (away?.startsWith(token) || away?.split(/\s+/).some((word) => word === token)) return "AWAY"
  return null
}
