import { json } from "@sveltejs/kit"

import type { AnalysisRequest } from "$lib/api/envelope"
import { streamAnalysis } from "$lib/server/api/agent"

import type { RequestHandler } from "./$types"

/**
 * Chat proxy: pipes the agent's SSE analysis stream straight through.
 * If the agent answers JSON instead (error envelope, or an older agent
 * without the stream route), that passes through too — the client
 * branches on Content-Type.
 */
export const POST: RequestHandler = async ({ fetch, request }) => {
  const body = (await request.json()) as AnalysisRequest
  let upstream: Response
  try {
    upstream = await streamAnalysis(fetch, body)
  } catch {
    return json(
      { error: { code: "DEPENDENCY_ERROR", message: "The agent service is unavailable" } },
      { status: 502 }
    )
  }
  const contentType = upstream.headers.get("content-type") ?? "application/json"
  const headers: Record<string, string> = { "content-type": contentType }
  if (contentType.includes("text/event-stream")) {
    headers["cache-control"] = "no-cache"
    headers["x-accel-buffering"] = "no"
  }
  return new Response(upstream.body, { status: upstream.status, headers })
}
