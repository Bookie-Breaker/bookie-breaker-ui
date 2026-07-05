/**
 * Proxy +server.ts handlers invoked directly with msw-mocked upstreams.
 * msw's node interceptors catch Node's built-in fetch (undici MockAgent
 * does not), so these run without any real backend.
 */
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { GET as eventsGet } from "../../src/routes/api/events/+server"
import { GET as distributionsGet } from "../../src/routes/api/simulations/[gameId]/distributions/+server"
import { POST as betsPost } from "../../src/routes/api/bets/+server"

const EMULATOR = "http://localhost:8005"
const SIM = "http://localhost:8003"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function makeEvent(overrides: Record<string, unknown>): never {
  return { fetch: globalThis.fetch, ...overrides } as never
}

describe("POST /api/bets", () => {
  it("forwards the idempotency key and body, returning the envelope", async () => {
    let captured: { key: string | null; body: unknown } | null = null
    server.use(
      http.post(`${EMULATOR}/api/v1/emulator/bets`, async ({ request }) => {
        captured = { key: request.headers.get("X-Idempotency-Key"), body: await request.json() }
        return HttpResponse.json(
          {
            data: { id: "bet-1", selection: "LAL -3.5", odds_american: -110, stake: 1.5 },
            meta: {}
          },
          { status: 201 }
        )
      })
    )
    const request = new Request("http://ui/api/bets", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Idempotency-Key": "key-123" },
      body: JSON.stringify({ game_id: "g-1", selection: "LAL -3.5", side: "HOME", stake: 1.5 })
    })
    const response = await betsPost(makeEvent({ request }))
    expect(response.status).toBe(201)
    const body = (await response.json()) as { data: { id: string } }
    expect(body.data.id).toBe("bet-1")
    expect(captured).not.toBeNull()
    expect(captured!.key).toBe("key-123")
    expect((captured!.body as { side: string }).side).toBe("HOME")
  })

  it("rejects placement without an idempotency key", async () => {
    const request = new Request("http://ui/api/bets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    })
    const response = await betsPost(makeEvent({ request }))
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("passes upstream error envelopes through with their status", async () => {
    server.use(
      http.post(`${EMULATOR}/api/v1/emulator/bets`, () =>
        HttpResponse.json(
          { error: { code: "UNPROCESSABLE_ENTITY", message: "game already started" }, meta: {} },
          { status: 422 }
        )
      )
    )
    const request = new Request("http://ui/api/bets", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Idempotency-Key": "key-1" },
      body: JSON.stringify({ game_id: "g-1" })
    })
    const response = await betsPost(makeEvent({ request }))
    expect(response.status).toBe(422)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe("UNPROCESSABLE_ENTITY")
  })
})

describe("GET /api/simulations/[gameId]/distributions", () => {
  it("maps an expired simulation to a 404 error envelope", async () => {
    server.use(
      http.get(`${SIM}/api/v1/sim/games/game-1/latest`, () =>
        HttpResponse.json(
          { error: { code: "RESOURCE_NOT_FOUND", message: "no simulation" }, meta: {} },
          { status: 404 }
        )
      )
    )
    const response = await distributionsGet(makeEvent({ params: { gameId: "game-1" } }))
    expect(response.status).toBe(404)
  })

  it("chains latest -> distributions on success", async () => {
    server.use(
      http.get(`${SIM}/api/v1/sim/games/game-2/latest`, () =>
        HttpResponse.json({ data: { simulation_run_id: "sim-9" }, meta: {} })
      ),
      http.get(`${SIM}/api/v1/sim/simulations/sim-9/distributions`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("distribution_type")).toBe("all")
        return HttpResponse.json({ data: { distributions: {} }, meta: {} })
      })
    )
    const response = await distributionsGet(makeEvent({ params: { gameId: "game-2" } }))
    expect(response.status).toBe(200)
  })
})

describe("GET /api/events", () => {
  it("returns an SSE stream that reports bridge availability", async () => {
    const response = await eventsGet(makeEvent({}))
    expect(response.headers.get("Content-Type")).toBe("text/event-stream")
    const reader = response.body!.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    expect(text).toContain("event: hello")
    expect(text).toMatch(/"bridge": (true|false)/)
    await reader.cancel()
  })
})
