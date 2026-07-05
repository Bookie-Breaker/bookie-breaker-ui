/**
 * Derive the emulator's side enum (HOME|AWAY|OVER|UNDER) from an edge's
 * selection string. String matching against team names is best-effort —
 * callers must let the user override when this returns null.
 */

export type BetSide = "HOME" | "AWAY" | "OVER" | "UNDER"

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
