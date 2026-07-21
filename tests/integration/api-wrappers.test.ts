/**
 * Thin server API wrappers exercised against msw-mocked upstreams: each test
 * asserts the exact path, method, query, and headers the wrapper produces.
 */
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  acknowledgeAlert,
  evaluateParlay,
  getAlerts,
  getDashboard,
  getEdgeDetail,
  getEdges,
  getPipelineRun,
  getSlate,
  runPipeline,
  streamAnalysis
} from "$lib/server/api/agent"
import { getAnalysis } from "$lib/server/api/agent-analysis"
import {
  getBankroll,
  getBankrollHistory,
  getBet,
  getBets,
  getBreakdown,
  getCalibration,
  getParlay,
  getPerformance,
  placeBet,
  placeParlay
} from "$lib/server/api/emulator"
import { getBestLines, getCurrentLines, getMovement, getSportsbooks } from "$lib/server/api/lines"
import { UpstreamError } from "$lib/server/http"

const AGENT = "http://localhost:8006"
const EMULATOR = "http://localhost:8005"
const LINES = "http://localhost:8001"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const ok = (data: unknown = {}) => HttpResponse.json({ data, meta: {} })

describe("agent wrappers", () => {
  it("getEdges forwards filters as query params", async () => {
    let url: URL | null = null
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 50, has_more: false } }
        })
      })
    )
    await getEdges(fetch, { league: "NBA", min_edge: 2.5, is_stale: false })
    expect(url!.searchParams.get("league")).toBe("NBA")
    expect(url!.searchParams.get("min_edge")).toBe("2.5")
    expect(url!.searchParams.get("is_stale")).toBe("false")
  })

  it("getEdgeDetail URL-encodes the edge id", async () => {
    server.use(http.get(`${AGENT}/api/v1/agent/edges/e%201`, () => ok({ id: "e 1" })))
    const envelope = await getEdgeDetail(fetch, "e 1")
    expect((envelope.data as { id: string }).id).toBe("e 1")
  })

  it("getSlate and getDashboard hit their endpoints with optional filters", async () => {
    const seen: string[] = []
    server.use(
      http.get(`${AGENT}/api/v1/agent/slate`, ({ request }) => {
        seen.push(new URL(request.url).search)
        return ok({ date: "2026-07-20", games: [] })
      }),
      http.get(`${AGENT}/api/v1/agent/dashboard`, ({ request }) => {
        seen.push(new URL(request.url).search)
        return ok()
      })
    )
    await getSlate(fetch, { league: "EPL", date: "2026-07-20" })
    await getDashboard(fetch) // no league — no query string at all
    expect(seen[0]).toBe("?league=EPL&date=2026-07-20")
    expect(seen[1]).toBe("")
  })

  it("getAlerts and acknowledgeAlert round-trip", async () => {
    let method = ""
    server.use(
      http.get(`${AGENT}/api/v1/agent/alerts`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("acknowledged")).toBe("false")
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 10, has_more: false } }
        })
      }),
      http.put(`${AGENT}/api/v1/agent/alerts/alert-1/acknowledge`, ({ request }) => {
        method = request.method
        return ok({ id: "alert-1" })
      })
    )
    await getAlerts(fetch, { acknowledged: false, limit: 10 })
    await acknowledgeAlert(fetch, "alert-1")
    expect(method).toBe("PUT")
  })

  it("evaluateParlay POSTs the legs body", async () => {
    let body: unknown = null
    server.use(
      http.post(`${AGENT}/api/v1/agent/parlays/evaluate`, async ({ request }) => {
        body = await request.json()
        return ok({ joint_probability: 0.31 })
      })
    )
    await evaluateParlay(fetch, { legs: [], persist: false } as never)
    expect(body).toEqual({ legs: [], persist: false })
  })

  it("runPipeline and getPipelineRun target the pipeline endpoints", async () => {
    let body: unknown = null
    server.use(
      http.post(`${AGENT}/api/v1/agent/pipeline/run`, async ({ request }) => {
        body = await request.json()
        return ok({ pipeline_run_id: "run-1" })
      }),
      http.get(`${AGENT}/api/v1/agent/pipeline/runs/run-1`, () => ok({ pipeline_run_id: "run-1" }))
    )
    await runPipeline(fetch, "NHL")
    expect(body).toEqual({ league: "NHL" })
    const run = await getPipelineRun(fetch, "run-1")
    expect(run.data.pipeline_run_id).toBe("run-1")
  })

  it("streamAnalysis returns the raw upstream response untouched", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("sse", { headers: { "content-type": "text/event-stream" } }))
    const response = await streamAnalysis(
      fetchFn as never,
      {
        analysis_type: "PERFORMANCE_REVIEW",
        question: "How am I doing?"
      } as never
    )
    expect(await response.text()).toBe("sse")
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${AGENT}/api/v1/agent/analysis/stream`)
    expect((init.headers as Record<string, string>).accept).toBe("text/event-stream")
    expect(init.method).toBe("POST")
  })

  it("getAnalysis reads a single analysis by id", async () => {
    server.use(http.get(`${AGENT}/api/v1/agent/analysis/an-1`, () => ok({ id: "an-1" })))
    const envelope = await getAnalysis(fetch, "an-1")
    expect((envelope.data as { id: string }).id).toBe("an-1")
  })

  it("rethrows upstream error envelopes as UpstreamError", async () => {
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges/missing`, () =>
        HttpResponse.json(
          { error: { code: "RESOURCE_NOT_FOUND", message: "nope" }, meta: {} },
          { status: 404 }
        )
      )
    )
    const error = await getEdgeDetail(fetch, "missing").catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(UpstreamError)
    expect((error as UpstreamError).status).toBe(404)
  })
})

describe("emulator wrappers", () => {
  it("placeBet and placeParlay forward the idempotency key", async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post(`${EMULATOR}/api/v1/emulator/bets`, ({ request }) => {
        keys.push(request.headers.get("X-Idempotency-Key"))
        return ok({ id: "bet-1" })
      }),
      http.post(`${EMULATOR}/api/v1/emulator/parlays`, ({ request }) => {
        keys.push(request.headers.get("X-Idempotency-Key"))
        return ok({ id: "parlay-1" })
      })
    )
    await placeBet(fetch, {} as never, "key-a")
    await placeParlay(fetch, {} as never, "key-b")
    expect(keys).toEqual(["key-a", "key-b"])
  })

  it("getBets forwards ledger filters; getBet and getParlay read by id", async () => {
    let search = ""
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 50, has_more: false } }
        })
      }),
      http.get(`${EMULATOR}/api/v1/emulator/bets/bet-1`, () => ok({ id: "bet-1" })),
      http.get(`${EMULATOR}/api/v1/emulator/parlays/parlay-1`, () => ok({ id: "parlay-1" }))
    )
    await getBets(fetch, { status: "open", is_live: true, league: "NBA" })
    expect(search).toBe("?status=open&is_live=true&league=NBA")
    expect(((await getBet(fetch, "bet-1")).data as { id: string }).id).toBe("bet-1")
    expect(((await getParlay(fetch, "parlay-1")).data as { id: string }).id).toBe("parlay-1")
  })

  it("performance reads hit their four endpoints with the right queries", async () => {
    const paths: string[] = []
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/performance`, ({ request }) => {
        paths.push(new URL(request.url).search)
        return ok()
      }),
      http.get(`${EMULATOR}/api/v1/emulator/performance/breakdown`, ({ request }) => {
        paths.push(new URL(request.url).search)
        return ok()
      }),
      http.get(`${EMULATOR}/api/v1/emulator/performance/calibration`, ({ request }) => {
        paths.push(new URL(request.url).search)
        return ok()
      }),
      http.get(`${EMULATOR}/api/v1/emulator/bankroll`, () => ok()),
      http.get(`${EMULATOR}/api/v1/emulator/bankroll/history`, ({ request }) => {
        paths.push(new URL(request.url).search)
        return ok()
      })
    )
    await getPerformance(fetch, { league: "NBA" })
    await getBreakdown(fetch, "league", { date_from: "2026-07-01" })
    await getCalibration(fetch, { bins: 10 })
    await getBankroll(fetch)
    await getBankrollHistory(fetch, { interval: "per_bet" })
    expect(paths).toEqual([
      "?league=NBA",
      "?group_by=league&date_from=2026-07-01",
      "?bins=10",
      "?interval=per_bet"
    ])
  })
})

describe("lines wrappers", () => {
  it("getCurrentLines forwards live filters", async () => {
    let search = ""
    server.use(
      http.get(`${LINES}/api/v1/lines/current`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { pagination: { limit: 200, has_more: false } }
        })
      })
    )
    await getCurrentLines(fetch, { is_live: true, limit: 200 })
    expect(search).toBe("?is_live=true&limit=200")
  })

  it("getMovement, getBestLines, and getSportsbooks target the game endpoints", async () => {
    const paths: string[] = []
    server.use(
      http.get(`${LINES}/api/v1/lines/game/g-1/movement`, ({ request }) => {
        paths.push(new URL(request.url).pathname + new URL(request.url).search)
        return ok([])
      }),
      http.get(`${LINES}/api/v1/lines/game/g-1/best`, ({ request }) => {
        paths.push(new URL(request.url).pathname)
        return ok([])
      }),
      http.get(`${LINES}/api/v1/lines/sportsbooks`, ({ request }) => {
        paths.push(new URL(request.url).pathname)
        return ok([])
      })
    )
    await getMovement(fetch, "g-1", { market_type: "SPREAD" })
    await getBestLines(fetch, "g-1")
    await getSportsbooks(fetch)
    expect(paths).toEqual([
      "/api/v1/lines/game/g-1/movement?market_type=SPREAD",
      "/api/v1/lines/game/g-1/best",
      "/api/v1/lines/sportsbooks"
    ])
  })
})
