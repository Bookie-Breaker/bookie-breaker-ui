import { json } from "@sveltejs/kit"

import { getDistributions, getLatestSimulation } from "$lib/server/api/simulation"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

/**
 * Lazy distribution fetch for a game. Simulation results live only in
 * Redis (~2h TTL), so 404 is an expected outcome the UI renders as an
 * "expired" empty state rather than an error.
 */
export const GET: RequestHandler = async ({ fetch, params }) => {
  try {
    const latest = await getLatestSimulation(fetch, params.gameId)
    const distributions = await getDistributions(fetch, latest.data.simulation_run_id, "all")
    return json(distributions)
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
