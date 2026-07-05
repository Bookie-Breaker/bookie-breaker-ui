import { json } from "@sveltejs/kit"

import type { PlaceBetRequest } from "$lib/api/envelope"
import { getBets, placeBet, type BetFilters } from "$lib/server/api/emulator"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

/** Cursor load-more for the ledger. */
export const GET: RequestHandler = async ({ fetch, url }) => {
  const filters: BetFilters = {}
  for (const key of ["league", "market_type", "result", "cursor"] as const) {
    const value = url.searchParams.get(key)
    if (value) filters[key] = value
  }
  const status = url.searchParams.get("status")
  if (status === "open" || status === "graded") filters.status = status
  try {
    return json(await getBets(fetch, filters))
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}

/** Place a paper bet, forwarding the client's idempotency key verbatim. */
export const POST: RequestHandler = async ({ fetch, request }) => {
  const idempotencyKey = request.headers.get("X-Idempotency-Key")
  if (!idempotencyKey) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "X-Idempotency-Key header is required" } },
      { status: 400 }
    )
  }
  const body = (await request.json()) as PlaceBetRequest
  try {
    return json(await placeBet(fetch, body, idempotencyKey), { status: 201 })
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
