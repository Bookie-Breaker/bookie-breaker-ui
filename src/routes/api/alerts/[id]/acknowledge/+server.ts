import { json } from "@sveltejs/kit"

import { acknowledgeAlert } from "$lib/server/api/agent"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

export const PUT: RequestHandler = async ({ fetch, params }) => {
  try {
    return json(await acknowledgeAlert(fetch, params.id))
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
