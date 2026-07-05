import { json } from "@sveltejs/kit"

import { getMovement } from "$lib/server/api/lines"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

/** Lazy movement fetch for the lines page row expansion. */
export const GET: RequestHandler = async ({ fetch, params, url }) => {
  try {
    return json(
      await getMovement(fetch, params.gameId, {
        market_type: url.searchParams.get("market_type") ?? undefined
      })
    )
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
