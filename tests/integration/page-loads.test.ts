/**
 * +page.server.ts load functions invoked directly with msw-mocked upstreams,
 * covering happy paths, allSettled degradation, and 404 mapping.
 */
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { load as rawDashboardLoad } from "../../src/routes/+page.server"
import { load as rawBetDetailLoad } from "../../src/routes/bets/[id]/+page.server"
import { load as rawBetsLoad } from "../../src/routes/bets/+page.server"
import { load as rawEdgeDetailLoad } from "../../src/routes/edges/[id]/+page.server"
import { load as rawEdgesLoad } from "../../src/routes/edges/+page.server"
import { load as rawLinesLoad } from "../../src/routes/lines/+page.server"
import { load as rawLiveLoad } from "../../src/routes/live/+page.server"
import { load as rawParlayLoad } from "../../src/routes/parlay/+page.server"
import { load as rawPerformanceLoad } from "../../src/routes/performance/+page.server"
import { load as rawSlateLoad } from "../../src/routes/slate/+page.server"

/** PageServerLoad's return union includes void; every load here returns data. */
function strict<E, R>(loadFn: (event: E) => R | Promise<R>) {
  return async (event: E) => (await loadFn(event)) as Exclude<Awaited<R>, void>
}

const dashboardLoad = strict(rawDashboardLoad)
const betDetailLoad = strict(rawBetDetailLoad)
const betsLoad = strict(rawBetsLoad)
const edgeDetailLoad = strict(rawEdgeDetailLoad)
const edgesLoad = strict(rawEdgesLoad)
const linesLoad = strict(rawLinesLoad)
const liveLoad = strict(rawLiveLoad)
const parlayLoad = strict(rawParlayLoad)
const performanceLoad = strict(rawPerformanceLoad)
const slateLoad = strict(rawSlateLoad)
import {
  betData,
  betDetail,
  edgeDetail,
  edgeListItem,
  lineSnapshot,
  parlayLeg
} from "../helpers/fixtures"

const AGENT = "http://localhost:8006"
const EMULATOR = "http://localhost:8005"
const LINES = "http://localhost:8001"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const ok = (data: unknown) => HttpResponse.json({ data, meta: {} })
const page = (data: unknown[], pagination: Record<string, unknown> = {}) =>
  HttpResponse.json({ data, meta: { pagination: { limit: 50, has_more: false, ...pagination } } })
const notFound = () =>
  HttpResponse.json(
    { error: { code: "RESOURCE_NOT_FOUND", message: "missing" }, meta: {} },
    { status: 404 }
  )
const down = () =>
  HttpResponse.json(
    { error: { code: "DEPENDENCY_ERROR", message: "down" }, meta: {} },
    { status: 502 }
  )

function makeEvent(overrides: Record<string, unknown> = {}): never {
  return { fetch: globalThis.fetch, depends: vi.fn(), ...overrides } as never
}

describe("dashboard load", () => {
  it("returns dashboard and alerts, registering the dependency key", async () => {
    server.use(
      http.get(`${AGENT}/api/v1/agent/dashboard`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("league")).toBe("NBA")
        return ok({ active_edges: { count: 1 } })
      }),
      http.get(`${AGENT}/api/v1/agent/alerts`, () => page([{ id: "alert-1" }]))
    )
    const depends = vi.fn()
    const result = await dashboardLoad(
      makeEvent({ depends, url: new URL("http://ui/?league=NBA") })
    )
    expect(depends).toHaveBeenCalledWith("app:dashboard")
    expect(result.dashboard).toMatchObject({ active_edges: { count: 1 } })
    expect(result.alerts).toHaveLength(1)
  })

  it("degrades to null/empty when the agent is down", async () => {
    server.use(
      http.get(`${AGENT}/api/v1/agent/dashboard`, () => down()),
      http.get(`${AGENT}/api/v1/agent/alerts`, () => down())
    )
    const result = await dashboardLoad(makeEvent({ url: new URL("http://ui/") }))
    expect(result.dashboard).toBeNull()
    expect(result.alerts).toEqual([])
  })
})

describe("edges load", () => {
  it("builds filters from the query string", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, ({ request }) => {
        search = new URL(request.url).searchParams
        return page([edgeListItem()], { next_cursor: "c-2", has_more: true })
      })
    )
    const result = await edgesLoad(
      makeEvent({ url: new URL("http://ui/edges?league=EPL&min_edge=3&market_type=TOTAL") })
    )
    expect(search!.get("league")).toBe("EPL")
    expect(search!.get("market_type")).toBe("TOTAL")
    expect(search!.get("min_edge")).toBe("3")
    expect(result.edges).toHaveLength(1)
    expect(result.nextCursor).toBe("c-2")
    expect(result.hasMore).toBe(true)
  })

  it("maps the props tab to a PLAYER_PROP upstream filter", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, ({ request }) => {
        search = new URL(request.url).searchParams
        return page([])
      })
    )
    const result = await edgesLoad(
      makeEvent({ url: new URL("http://ui/edges?market_class=props") })
    )
    expect(search!.get("market_type")).toBe("PLAYER_PROP")
    expect(result.nextCursor).toBeNull()
  })
})

describe("edge detail load", () => {
  it("returns edge with movement and analysis when everything is up", async () => {
    const edge = edgeDetail({
      analysis: { id: "an-1", title: "Why LAL", created_at: "2026-07-20T12:00:00Z" }
    } as never)
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges/e-1`, () => ok(edge)),
      http.get(`${LINES}/api/v1/lines/game/odds-game-1/movement`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("market_type")).toBe("SPREAD")
        return ok([{ game_id: "odds-game-1" }])
      }),
      http.get(`${AGENT}/api/v1/agent/analysis/an-1`, () => ok({ id: "an-1", content: "words" }))
    )
    const result = await edgeDetailLoad(makeEvent({ params: { id: "e-1" } }))
    expect(result.edge.id).toBe(edge.id)
    expect(result.movement).toHaveLength(1)
    expect(result.analysis).toMatchObject({ id: "an-1" })
  })

  it("renders without movement/analysis when those fetches fail", async () => {
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges/e-1`, () => ok(edgeDetail())),
      http.get(`${LINES}/api/v1/lines/game/odds-game-1/movement`, () => down())
    )
    const result = await edgeDetailLoad(makeEvent({ params: { id: "e-1" } }))
    expect(result.movement).toBeNull()
    expect(result.analysis).toBeNull() // no analysis id — never fetched
  })

  it("maps an unknown edge to a 404 page error", async () => {
    server.use(http.get(`${AGENT}/api/v1/agent/edges/ghost`, () => notFound()))
    const thrown = await edgeDetailLoad(makeEvent({ params: { id: "ghost" } })).catch(
      (cause: unknown) => cause
    )
    expect(thrown).toMatchObject({ status: 404 })
  })
})

describe("bets load", () => {
  it("returns the ledger with prefill edge for ?edge=", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("status")).toBe("open")
        return page([betData()], { next_cursor: "c-9" })
      }),
      http.get(`${AGENT}/api/v1/agent/edges/e-1`, () => ok(edgeDetail()))
    )
    const result = await betsLoad(
      makeEvent({ url: new URL("http://ui/bets?status=open&edge=e-1&live=1") })
    )
    expect(result.bets).toHaveLength(1)
    expect(result.nextCursor).toBe("c-9")
    expect(result.prefillEdge).not.toBeNull()
    expect(result.prefillLive).toBe(true)
  })

  it("degrades to an empty ledger when the emulator is down", async () => {
    server.use(http.get(`${EMULATOR}/api/v1/emulator/bets`, () => down()))
    const result = await betsLoad(makeEvent({ url: new URL("http://ui/bets") }))
    expect(result.bets).toEqual([])
    expect(result.nextCursor).toBeNull()
    expect(result.prefillEdge).toBeNull()
    expect(result.prefillLive).toBe(false)
  })
})

describe("bet detail load", () => {
  it("returns a straight bet without legs", async () => {
    server.use(http.get(`${EMULATOR}/api/v1/emulator/bets/b-1`, () => ok(betDetail())))
    const result = await betDetailLoad(makeEvent({ params: { id: "b-1" } }))
    expect(result.bet.id).toBe(betDetail().id)
    expect(result.parlayLegs).toBeNull()
  })

  it("fetches legs for a parlay parent", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets/p-1`, () => ok(betDetail({ is_parlay: true }))),
      http.get(`${EMULATOR}/api/v1/emulator/parlays/p-1`, () =>
        ok({ ...betDetail({ is_parlay: true }), legs: [parlayLeg()] })
      )
    )
    const result = await betDetailLoad(makeEvent({ params: { id: "p-1" } }))
    expect(result.parlayLegs).toHaveLength(1)
  })

  it("falls back to /parlays when /bets 404s for a parlay parent", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets/p-2`, () => notFound()),
      http.get(`${EMULATOR}/api/v1/emulator/parlays/p-2`, () =>
        ok({ ...betDetail({ is_parlay: true, id: "p-2" }), legs: [parlayLeg()] })
      )
    )
    const result = await betDetailLoad(makeEvent({ params: { id: "p-2" } }))
    expect(result.bet.id).toBe("p-2")
    expect(result.parlayLegs).toHaveLength(1)
  })

  it("renders the parent even when the leg fetch fails", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets/p-3`, () => ok(betDetail({ is_parlay: true }))),
      http.get(`${EMULATOR}/api/v1/emulator/parlays/p-3`, () => down())
    )
    const result = await betDetailLoad(makeEvent({ params: { id: "p-3" } }))
    expect(result.parlayLegs).toBeNull()
  })

  it("maps a bet unknown to both endpoints to a 404 page error", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/bets/ghost`, () => notFound()),
      http.get(`${EMULATOR}/api/v1/emulator/parlays/ghost`, () => notFound())
    )
    const thrown = await betDetailLoad(makeEvent({ params: { id: "ghost" } })).catch(
      (cause: unknown) => cause
    )
    expect(thrown).toMatchObject({ status: 404 })
  })
})

describe("parlay load", () => {
  it("fans out to details and derives sides for team-market edges", async () => {
    const spread = edgeListItem({ id: "e-spread", market_type: "SPREAD" })
    const prop = edgeListItem({ id: "e-prop", market_type: "PLAYER_PROP" })
    const stale = edgeListItem({ id: "e-stale", is_stale: true })
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, () => page([spread, prop, stale])),
      http.get(`${AGENT}/api/v1/agent/edges/e-spread`, () => ok(edgeDetail({ id: "e-spread" })))
    )
    const result = await parlayLoad(makeEvent())
    // Only the fresh team-market edge became a pickable leg.
    expect(result.edgeLegs).toHaveLength(1)
    expect(result.edgeLegs[0].leg).toMatchObject({
      edge_id: "e-spread",
      side: "HOME",
      game_external_id: "odds-game-1",
      line_value: -3.5
    })
    expect(result.edgeLegs[0].matchup).toBe("BOS @ LAL")
  })

  it("skips edges whose side cannot be derived and failed detail fetches", async () => {
    const ambiguous = edgeListItem({ id: "e-amb", market_type: "MONEYLINE" })
    const broken = edgeListItem({ id: "e-broken", market_type: "TOTAL" })
    server.use(
      http.get(`${AGENT}/api/v1/agent/edges`, () => page([ambiguous, broken])),
      http.get(`${AGENT}/api/v1/agent/edges/e-amb`, () =>
        ok(edgeDetail({ id: "e-amb", market_type: "MONEYLINE", selection: "Someone Else" }))
      ),
      http.get(`${AGENT}/api/v1/agent/edges/e-broken`, () => down())
    )
    const result = await parlayLoad(makeEvent())
    expect(result.edgeLegs).toEqual([])
  })
})

describe("performance load", () => {
  it("validates group_by and fans out to the four reads", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/performance`, () => ok({ roi: 0.06 })),
      http.get(`${EMULATOR}/api/v1/emulator/bankroll/history`, () =>
        ok({ interval: "per_bet", snapshots: [] })
      ),
      http.get(`${EMULATOR}/api/v1/emulator/performance/calibration`, () =>
        ok({ total_graded: 10 })
      ),
      http.get(`${EMULATOR}/api/v1/emulator/performance/breakdown`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("group_by")).toBe("league")
        return ok({ group_by: "league", breakdowns: [] })
      })
    )
    const result = await performanceLoad(
      makeEvent({ url: new URL("http://ui/performance?group_by=league") })
    )
    expect(result.groupBy).toBe("league")
    expect(result.performance).toMatchObject({ roi: 0.06 })
  })

  it("falls back to market_type grouping and nulls when the emulator is down", async () => {
    server.use(
      http.get(`${EMULATOR}/api/v1/emulator/performance`, () => down()),
      http.get(`${EMULATOR}/api/v1/emulator/bankroll/history`, () => down()),
      http.get(`${EMULATOR}/api/v1/emulator/performance/calibration`, () => down()),
      http.get(`${EMULATOR}/api/v1/emulator/performance/breakdown`, () => down())
    )
    const result = await performanceLoad(
      makeEvent({ url: new URL("http://ui/performance?group_by=bogus") })
    )
    expect(result.groupBy).toBe("market_type")
    expect(result.performance).toBeNull()
    expect(result.history).toBeNull()
    expect(result.calibration).toBeNull()
    expect(result.breakdown).toBeNull()
  })
})

describe("live load", () => {
  it("splits live lines from client-filtered live edges", async () => {
    server.use(
      http.get(`${LINES}/api/v1/lines/current`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("is_live")).toBe("true")
        return page([lineSnapshot({ is_live: true })])
      }),
      http.get(`${AGENT}/api/v1/agent/edges`, () =>
        page([
          { ...edgeListItem({ id: "e-live" }), is_live: true },
          edgeListItem({ id: "e-pregame" })
        ])
      )
    )
    const result = await liveLoad(makeEvent())
    expect(result.liveLines).toHaveLength(1)
    expect(result.liveEdges.map((edge: { id: string }) => edge.id)).toEqual(["e-live"])
  })

  it("keeps rendering when both services are down", async () => {
    server.use(
      http.get(`${LINES}/api/v1/lines/current`, () => down()),
      http.get(`${AGENT}/api/v1/agent/edges`, () => down())
    )
    const result = await liveLoad(makeEvent())
    expect(result.liveLines).toEqual([])
    expect(result.liveEdges).toEqual([])
  })
})

describe("lines load", () => {
  it("forwards league/market filters with the 200 cap", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${LINES}/api/v1/lines/current`, ({ request }) => {
        search = new URL(request.url).searchParams
        return page([lineSnapshot()])
      })
    )
    const result = await linesLoad(
      makeEvent({ url: new URL("http://ui/lines?league=NBA&market_type=SPREAD") })
    )
    expect(search!.get("league")).toBe("NBA")
    expect(search!.get("market_type")).toBe("SPREAD")
    expect(search!.get("limit")).toBe("200")
    expect(result.lines).toHaveLength(1)
  })
})

describe("slate load", () => {
  it("forwards league/date filters and unwraps the envelope", async () => {
    let search: URLSearchParams | null = null
    server.use(
      http.get(`${AGENT}/api/v1/agent/slate`, ({ request }) => {
        search = new URL(request.url).searchParams
        return ok({ date: "2026-07-20", games: [] })
      })
    )
    const result = await slateLoad(
      makeEvent({ url: new URL("http://ui/slate?league=EPL&date=2026-07-20") })
    )
    expect(search!.get("league")).toBe("EPL")
    expect(search!.get("date")).toBe("2026-07-20")
    expect(result.slate.date).toBe("2026-07-20")
  })
})
