import { error } from "@sveltejs/kit"

import type { BetDetailData, ParlayLeg } from "$lib/api/envelope"
import { getBet, getParlay } from "$lib/server/api/emulator"
import { UpstreamError } from "$lib/server/http"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, params, depends }) => {
  depends("app:bets")
  let bet: BetDetailData
  let parlayLegs: ParlayLeg[] | null = null
  try {
    bet = (await getBet(fetch, params.id)).data
  } catch (cause) {
    if (!(cause instanceof UpstreamError && cause.status === 404)) throw cause
    // Parlay parents may only be served from /parlays; fall back before 404ing.
    try {
      const parlay = (await getParlay(fetch, params.id)).data
      return { bet: parlay as BetDetailData, parlayLegs: parlay.legs }
    } catch (parlayCause) {
      if (parlayCause instanceof UpstreamError && parlayCause.status === 404) {
        error(404, "Bet not found")
      }
      throw parlayCause
    }
  }
  if (bet.is_parlay) {
    try {
      parlayLegs = (await getParlay(fetch, params.id)).data.legs
    } catch {
      parlayLegs = null // parent stats still render without the leg list
    }
  }
  return { bet, parlayLegs }
}
