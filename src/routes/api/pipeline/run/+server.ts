import { json } from "@sveltejs/kit"

import { runPipeline } from "$lib/server/api/agent"
import { UpstreamError } from "$lib/server/http"

import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ fetch, request }) => {
  const body = (await request.json().catch(() => ({}))) as { league?: string }
  try {
    return json(await runPipeline(fetch, body.league ?? "NBA"), { status: 202 })
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.body }, { status: error.status })
    }
    throw error
  }
}
