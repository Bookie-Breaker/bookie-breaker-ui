import { error } from "@sveltejs/kit"

import { getBet } from "$lib/server/api/emulator"
import { UpstreamError } from "$lib/server/http"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, params, depends }) => {
  depends("app:bets")
  try {
    return { bet: (await getBet(fetch, params.id)).data }
  } catch (cause) {
    if (cause instanceof UpstreamError && cause.status === 404) {
      error(404, "Bet not found")
    }
    throw cause
  }
}
