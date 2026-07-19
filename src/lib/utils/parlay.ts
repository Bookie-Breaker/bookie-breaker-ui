/**
 * Pure leg-basket rules for the parlay builder. These mirror the agent's
 * business rules (same league, 2-6 legs, no duplicate or conflicting legs
 * on one market) for instant feedback — the server stays authoritative.
 */

export const MIN_LEGS = 2
export const MAX_LEGS = 6

/** A leg the user has staged, from a detected edge or manual entry. */
export interface ParlayLegDraft {
  game_external_id: string
  market_type: string
  side: string
  /** Display label; manual legs fall back to "SIDE MARKET". */
  selection: string | null
  line_value: number | null
  sportsbook_key: string | null
  /** Unknown (null) for manual legs — the server resolves it. */
  league: string | null
  edge_id: string | null
}

export type AddLegResult = { ok: true; legs: ParlayLegDraft[] } | { ok: false; error: string }

/** The basket's league: the first leg that knows one wins. */
export function basketLeague(legs: ParlayLegDraft[]): string | null {
  return legs.find((leg) => leg.league)?.league ?? null
}

export function legLabel(leg: ParlayLegDraft): string {
  return leg.selection ?? `${leg.side} ${leg.market_type}`
}

/** Add a leg, enforcing size, same-league, and one-pick-per-market rules. */
export function addLeg(legs: ParlayLegDraft[], leg: ParlayLegDraft): AddLegResult {
  if (legs.length >= MAX_LEGS) {
    return { ok: false, error: `A parlay takes at most ${MAX_LEGS} legs.` }
  }
  const league = basketLeague(legs)
  if (league && leg.league && leg.league !== league) {
    return {
      ok: false,
      error: `All legs must be in the same league — this parlay is ${league}.`
    }
  }
  const clash = legs.find(
    (existing) =>
      existing.game_external_id === leg.game_external_id && existing.market_type === leg.market_type
  )
  if (clash) {
    return clash.side === leg.side
      ? { ok: false, error: "That leg is already in the parlay." }
      : { ok: false, error: "Conflicting picks on one market cannot be parlayed." }
  }
  return { ok: true, legs: [...legs, leg] }
}

export function removeLeg(legs: ParlayLegDraft[], index: number): ParlayLegDraft[] {
  return legs.filter((_, position) => position !== index)
}

/** True when the basket is a legal 2-6 leg parlay. */
export function canEvaluate(legs: ParlayLegDraft[]): boolean {
  return legs.length >= MIN_LEGS && legs.length <= MAX_LEGS
}

/**
 * Edge in percentage points: joint win probability minus the combined
 * price's implied probability (what PlaceParlayRequest.edge_percentage wants).
 */
export function parlayEdgePoints(jointProbability: number, combinedOddsDecimal: number): number {
  return (jointProbability - 1 / combinedOddsDecimal) * 100
}
