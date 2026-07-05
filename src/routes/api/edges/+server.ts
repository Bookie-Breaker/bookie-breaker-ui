import { json } from "@sveltejs/kit"

import { getEdges, type EdgeFilters } from "$lib/server/api/agent"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

/** Cursor load-more for the edges table (append without navigation). */
export const GET: RequestHandler = async ({ fetch, url }) => {
  const filters: EdgeFilters = {}
  for (const key of ["league", "market_type", "cursor"] as const) {
    const value = url.searchParams.get(key)
    if (value) filters[key] = value
  }
  const minEdge = url.searchParams.get("min_edge")
  if (minEdge) filters.min_edge = Number(minEdge)
  try {
    return json(await getEdges(fetch, filters))
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
