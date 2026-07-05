/** Thin typed wrappers over the simulation-engine REST API (port 8003). */
import type { DistributionsData, Envelope, SimulationRun } from "$lib/api/envelope"
import { serviceUrl } from "$lib/server/env"
import { upstream } from "$lib/server/http"

const base = () => serviceUrl("SIMULATION_ENGINE_URL")

export function getLatestSimulation(
  fetchFn: typeof fetch,
  gameId: string
): Promise<Envelope<SimulationRun>> {
  return upstream(base(), `/api/v1/sim/games/${encodeURIComponent(gameId)}/latest`, { fetchFn })
}

export function getDistributions(
  fetchFn: typeof fetch,
  simulationId: string,
  distributionType: "margin" | "total" | "home_score" | "away_score" | "all" = "all"
): Promise<Envelope<DistributionsData>> {
  return upstream(
    base(),
    `/api/v1/sim/simulations/${encodeURIComponent(simulationId)}/distributions`,
    {
      fetchFn,
      query: { distribution_type: distributionType }
    }
  )
}
