import { getEdgeDetail } from "$lib/server/api/agent"
import { getBets, type BetFilters } from "$lib/server/api/emulator"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, depends, url }) => {
  depends("app:bets")
  const filters: BetFilters = {}
  const league = url.searchParams.get("league")
  if (league) filters.league = league
  const marketType = url.searchParams.get("market_type")
  if (marketType) filters.market_type = marketType
  const result = url.searchParams.get("result")
  if (result) filters.result = result
  const status = url.searchParams.get("status")
  if (status === "open" || status === "graded") filters.status = status

  // "Bet this edge" arrives as ?edge=<id>; prefill the form from the edge.
  const edgeId = url.searchParams.get("edge")
  const [page, edge] = await Promise.allSettled([
    getBets(fetch, filters),
    edgeId ? getEdgeDetail(fetch, edgeId) : Promise.reject(new Error("none"))
  ])

  return {
    bets: page.status === "fulfilled" ? page.value.data : [],
    nextCursor:
      page.status === "fulfilled" ? (page.value.meta.pagination.next_cursor ?? null) : null,
    prefillEdge: edge.status === "fulfilled" ? edge.value.data : null
  }
}
