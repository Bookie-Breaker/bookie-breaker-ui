/**
 * Remaining proxy +server.ts handlers invoked directly with msw-mocked
 * upstreams (same setup as proxy-routes.test.ts).
 */
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { PUT as acknowledgePut } from "../../src/routes/api/alerts/[id]/acknowledge/+server"
import { GET as betsGet } from "../../src/routes/api/bets/+server"
import { GET as edgesGet } from "../../src/routes/api/edges/+server"
import { GET as movementGet } from "../../src/routes/api/lines/[gameId]/movement/+server"
import { POST as pipelineRunPost } from "../../src/routes/api/pipeline/run/+server"
import { GET as healthzGet } from "../../src/routes/healthz/+server"

const AGENT = "http://localhost:8006"
const EMULATOR = "http://localhost:8005"
const LINES = "http://localhost:8001"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function makeEvent(overrides: Record<string, unknown>): never {
  return { fetch: globalThis.fetch, ...overrides } as never
}

describe("GET /api/edges", () => {
  it("forwards allowlisted filters (including numeric min_edge) upstream", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, ({ request }) => {
        search = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 50, has_more: false } }
        })
      })
    )
    const response = await edgesGet(
      makeEvent({
        url: new URL("http://ui/api/edges?league=NBA&min_edge=2.5&cursor=c-1&ignored=x")
      })
    )
    expect(response.status).toBe(200)
    expect(search!.get("league")).toBe("NBA")
    expect(search!.get("min_edge")).toBe("2.5")
    expect(search!.get("cursor")).toBe("c-1")
    expect(search!.get("ignored")).toBeNull() // allowlist, not passthrough
  })

  it("passes upstream error envelopes through with their status", async () => {
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, () =>
        HttpResponse.json(
          { error: { code: "DEPENDENCY_ERROR", message: "agent down" }, meta: {} },
          { status: 502 }
        )
      )
    )
    const response = await edgesGet(makeEvent({ url: new URL("http://ui/api/edges") }))
    expect(response.status).toBe(502)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe("DEPENDENCY_ERROR")
  })
})

describe("GET /api/bets", () => {
  it("maps status and is_live params onto typed filters", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets`, ({ request }) => {
        search = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 50, has_more: false } }
        })
      })
    )
    const response = await betsGet(
      makeEvent({ url: new URL("http://ui/api/bets?status=open&is_live=false&result=WIN") })
    )
    expect(response.status).toBe(200)
    expect(search!.get("status")).toBe("open")
    expect(search!.get("is_live")).toBe("false")
    expect(search!.get("result")).toBe("WIN")
  })

  it("drops an invalid status instead of forwarding it", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets`, ({ request }) => {
        search = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 50, has_more: false } }
        })
      })
    )
    await betsGet(makeEvent({ url: new URL("http://ui/api/bets?status=bogus&is_live=maybe") }))
    expect(search!.get("status")).toBeNull()
    expect(search!.get("is_live")).toBeNull()
  })

  it("passes upstream errors through with their status", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets`, () =>
        HttpResponse.json(
          { error: { code: "DEPENDENCY_ERROR", message: "emulator down" }, meta: {} },
          { status: 502 }
        )
      )
    )
    const response = await betsGet(makeEvent({ url: new URL("http://ui/api/bets") }))
    expect(response.status).toBe(502)
  })
})

describe("GET /api/lines/[gameId]/movement", () => {
  it("forwards the market_type filter for the row expansion", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${LINES}/api/v1/lines/game/g-1/movement`, ({ request }) => {
        search = new URL(request.url).searchParams
        return HttpResponse.json({ data: [], meta: {} })
      })
    )
    const response = await movementGet(
      makeEvent({
        params: { gameId: "g-1" },
        url: new URL("http://ui/api/lines/g-1/movement?market_type=TOTAL")
      })
    )
    expect(response.status).toBe(200)
    expect(search!.get("market_type")).toBe("TOTAL")
  })

  it("passes a movement 404 through", async () => {
    server.use(
      http.get(`${LINES}/api/v1/lines/game/g-9/movement`, () =>
        HttpResponse.json(
          { error: { code: "RESOURCE_NOT_FOUND", message: "no game" }, meta: {} },
          { status: 404 }
        )
      )
    )
    const response = await movementGet(
      makeEvent({ params: { gameId: "g-9" }, url: new URL("http://ui/api/lines/g-9/movement") })
    )
    expect(response.status).toBe(404)
  })
})

describe("PUT /api/alerts/[id]/acknowledge", () => {
  it("acknowledges via the agent and returns the envelope", async () => {
    server.use(
      http.put(`${AGENT}/api/v1/agent/alerts/alert-1/acknowledge`, () =>
        HttpResponse.json({ data: { id: "alert-1", acknowledged_at: "now" }, meta: {} })
      )
    )
    const response = await acknowledgePut(makeEvent({ params: { id: "alert-1" } }))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { data: { id: string } }
    expect(body.data.id).toBe("alert-1")
  })

  it("passes an unknown-alert 404 through", async () => {
    server.use(
      http.put(`${AGENT}/api/v1/agent/alerts/ghost/acknowledge`, () =>
        HttpResponse.json(
          { error: { code: "RESOURCE_NOT_FOUND", message: "no alert" }, meta: {} },
          { status: 404 }
        )
      )
    )
    const response = await acknowledgePut(makeEvent({ params: { id: "ghost" } }))
    expect(response.status).toBe(404)
  })
})

describe("POST /api/pipeline/run", () => {
  it("forwards the requested league and returns 202", async () => {
    let body: unknown = null
    server.use(
      http.post(`${AGENT}/api/v1/agent/pipeline/run`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ data: { pipeline_run_id: "run-1" }, meta: {} })
      })
    )
    const request = new Request("http://ui/api/pipeline/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ league: "EPL" })
    })
    const response = await pipelineRunPost(makeEvent({ request }))
    expect(response.status).toBe(202)
    expect(body).toEqual({ league: "EPL" })
  })

  it("defaults to NBA when the body is not JSON", async () => {
    let body: unknown = null
    server.use(
      http.post(`${AGENT}/api/v1/agent/pipeline/run`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ data: { pipeline_run_id: "run-2" }, meta: {} })
      })
    )
    const request = new Request("http://ui/api/pipeline/run", { method: "POST", body: "not-json" })
    const response = await pipelineRunPost(makeEvent({ request }))
    expect(response.status).toBe(202)
    expect(body).toEqual({ league: "NBA" })
  })

  it("passes upstream errors through with their status", async () => {
    server.use(
      http.post(`${AGENT}/api/v1/agent/pipeline/run`, () =>
        HttpResponse.json(
          { error: { code: "DEPENDENCY_ERROR", message: "scheduler busy" }, meta: {} },
          { status: 503 }
        )
      )
    )
    const request = new Request("http://ui/api/pipeline/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    })
    const response = await pipelineRunPost(makeEvent({ request }))
    expect(response.status).toBe(503)
  })
})

describe("GET /healthz", () => {
  it("reports liveness for the compose healthcheck", async () => {
    const response = await healthzGet(makeEvent({}))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "ok", service: "ui" })
  })
})
