import { json } from "@sveltejs/kit"

import type { ParlayEvaluateRequest } from "$lib/api/envelope"
import { evaluateParlay } from "$lib/server/api/agent"
import { UpstreamError } from "$lib/server/http"
import { MAX_LEGS, MIN_LEGS } from "$lib/utils/parlay"

import type { RequestHandler } from "./$types"

/** Evaluate a parlay via the agent. Leg-count check mirrors the server rule. */
export const POST: RequestHandler = async ({ fetch, request }) => {
  const body = (await request.json()) as ParlayEvaluateRequest
  if (!Array.isArray(body.legs) || body.legs.length < MIN_LEGS || body.legs.length > MAX_LEGS) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `A parlay takes ${MIN_LEGS}-${MAX_LEGS} legs`
        }
      },
      { status: 400 }
    )
  }
  try {
    return json(await evaluateParlay(fetch, body))
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
