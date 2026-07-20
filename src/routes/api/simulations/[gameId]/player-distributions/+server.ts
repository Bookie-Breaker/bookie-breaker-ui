import { json } from "@sveltejs/kit"

import { getLatestSimulation, getPlayerDistributions } from "$lib/server/api/simulation"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

/**
 * Lazy player-distribution fetch for a game (Phase 7 Wave 3). Mirrors the
 * distributions proxy: results live only in Redis (~2h TTL) and props are
 * captured only for include_player_props runs, so 404 is an expected outcome
 * the UI renders as an "expired/unavailable" empty state rather than an error.
 * Optional stat_type/player_id filters pass through to the engine.
 */
export const GET: RequestHandler = async ({ fetch, params, url }) => {
  try {
    const latest = await getLatestSimulation(fetch, params.gameId)
    const distributions = await getPlayerDistributions(fetch, latest.data.simulation_run_id, {
      stat_type: url.searchParams.get("stat_type") ?? undefined,
      player_id: url.searchParams.get("player_id") ?? undefined
    })
    return json(distributions)
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
