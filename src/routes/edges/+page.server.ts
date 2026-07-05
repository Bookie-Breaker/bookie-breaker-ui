import { getEdges, type EdgeFilters } from "$lib/server/api/agent"

import type { PageServerLoad } from "./$types"

function filtersFromParams(params: URLSearchParams): EdgeFilters {
  const filters: EdgeFilters = {}
  const league = params.get("league")
  if (league) filters.league = league
  const marketType = params.get("market_type")
  if (marketType) filters.market_type = marketType
  const minEdge = params.get("min_edge")
  if (minEdge) filters.min_edge = Number(minEdge)
  if (params.get("include_stale") === "1") filters.is_stale = undefined
  return filters
}

export const load: PageServerLoad = async ({ fetch, depends, url }) => {
  depends("app:edges")
  const page = await getEdges(fetch, filtersFromParams(url.searchParams))
  return {
    edges: page.data,
    nextCursor: page.meta.pagination.next_cursor ?? null,
    hasMore: page.meta.pagination.has_more
  }
}
