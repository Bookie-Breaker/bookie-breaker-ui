import { json } from "@sveltejs/kit"

import type { RequestHandler } from "./$types"

/** Liveness probe for the compose healthcheck. */
export const GET: RequestHandler = () => {
  return json({ status: "ok", service: "ui" })
}
