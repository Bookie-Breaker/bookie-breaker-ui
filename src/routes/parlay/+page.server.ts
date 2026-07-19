import { getEdgeDetail, getEdges } from "$lib/server/api/agent"
import { deriveSide } from "$lib/utils/bet-side"
import type { ParlayLegDraft } from "$lib/utils/parlay"

import type { PageServerLoad } from "./$types"

/** Parlay v1 is team markets only (ADR-028). */
const TEAM_MARKETS = new Set(["SPREAD", "TOTAL", "MONEYLINE"])

/** Cap the detail fan-out (list items lack game_external_id, ADR-016 types). */
const DETAIL_LIMIT = 20

/** An edge offered as a pickable parlay leg, with display context. */
export interface EdgeLegOption {
  leg: ParlayLegDraft
  edge_percentage: number
  odds_american: number
  matchup: string
  scheduled_start: string
}

export const load: PageServerLoad = async ({ fetch, depends }) => {
  depends("app:parlays")

  const page = await getEdges(fetch, { limit: 50 })
  const teamEdges = page.data
    .filter((edge) => TEAM_MARKETS.has(edge.market_type) && !edge.is_stale)
    .slice(0, DETAIL_LIMIT)

  // The evaluate API keys legs on game_external_id + side, which only the
  // detail payload can supply; fetch details in parallel and skip failures.
  const details = await Promise.allSettled(teamEdges.map((edge) => getEdgeDetail(fetch, edge.id)))

  const edgeLegs: EdgeLegOption[] = details.flatMap((result) => {
    if (result.status !== "fulfilled") return []
    const edge = result.value.data
    const side =
      deriveSide(
        edge.market_type,
        edge.selection,
        edge.game?.home_team.abbreviation,
        edge.game?.away_team.abbreviation
      ) ??
      deriveSide(
        edge.market_type,
        edge.selection,
        edge.game?.home_team.name,
        edge.game?.away_team.name
      )
    // A leg needs an unambiguous side; undeterminable edges stay manual-entry.
    if (!side) return []
    return [
      {
        leg: {
          game_external_id: edge.game_external_id,
          market_type: edge.market_type,
          side,
          selection: edge.selection,
          line_value: edge.betting_line?.line_value ?? null,
          sportsbook_key: edge.sportsbook_key,
          league: edge.league,
          edge_id: edge.id
        },
        edge_percentage: edge.edge_percentage,
        odds_american: edge.odds_american,
        matchup: edge.game
          ? `${edge.game.away_team.abbreviation} @ ${edge.game.home_team.abbreviation}`
          : edge.game_external_id,
        scheduled_start: edge.game?.scheduled_start ?? edge.expires_at
      }
    ]
  })

  return { edgeLegs }
}
