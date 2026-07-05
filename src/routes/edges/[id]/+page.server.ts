import { error } from "@sveltejs/kit"

import { getEdgeDetail } from "$lib/server/api/agent"
import { getAnalysis } from "$lib/server/api/agent-analysis"
import { getMovement } from "$lib/server/api/lines"
import { UpstreamError } from "$lib/server/http"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, params, depends }) => {
  depends("app:edges")
  let edge
  try {
    edge = (await getEdgeDetail(fetch, params.id)).data
  } catch (cause) {
    if (cause instanceof UpstreamError && cause.status === 404) {
      error(404, "Edge not found")
    }
    throw cause
  }

  const [movement, analysis] = await Promise.allSettled([
    getMovement(fetch, edge.game_external_id, { market_type: edge.market_type }),
    edge.analysis ? getAnalysis(fetch, edge.analysis.id) : Promise.reject(new Error("none"))
  ])

  return {
    edge,
    movement: movement.status === "fulfilled" ? movement.value.data : null,
    analysis: analysis.status === "fulfilled" ? analysis.value.data : null
  }
}
