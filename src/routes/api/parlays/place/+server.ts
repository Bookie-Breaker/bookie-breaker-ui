import { json } from "@sveltejs/kit"

import type { PlaceParlayRequest } from "$lib/api/envelope"
import { placeParlay } from "$lib/server/api/emulator"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

/** Place a paper parlay, forwarding the client's idempotency key verbatim. */
export const POST: RequestHandler = async ({ fetch, request }) => {
  const idempotencyKey = request.headers.get("X-Idempotency-Key")
  if (!idempotencyKey) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "X-Idempotency-Key header is required" } },
      { status: 400 }
    )
  }
  const body = (await request.json()) as PlaceParlayRequest
  try {
    return json(await placeParlay(fetch, body, idempotencyKey), { status: 201 })
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
