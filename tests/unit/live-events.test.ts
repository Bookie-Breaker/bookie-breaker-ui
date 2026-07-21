/**
 * LiveEvents wiring: a fake EventSource captures listeners so tests can fire
 * open/error/named events and assert the debounced invalidations and toasts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigation = vi.hoisted(() => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
  invalidateAll: vi.fn().mockResolvedValue(undefined)
}))

vi.mock("$app/navigation", () => navigation)

import { EVENT_INVALIDATIONS, liveEvents } from "$lib/stores/live-events.svelte"
import { toasts } from "$lib/stores/toasts.svelte"

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  listeners = new Map<string, ((event: MessageEvent) => void)[]>()
  closed = false

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }

  emit(type: string, data?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: typeof data === "string" ? data : JSON.stringify(data) } as MessageEvent)
    }
  }

  close(): void {
    this.closed = true
  }
}

function source(): FakeEventSource {
  return FakeEventSource.instances.at(-1)!
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  toasts.items = []
  navigation.invalidate.mockClear()
  navigation.invalidateAll.mockClear()
  liveEvents.start()
})

afterEach(() => {
  liveEvents.stop()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("liveEvents connection lifecycle", () => {
  it("connects once and reports status transitions", () => {
    expect(liveEvents.status).toBe("connecting")
    liveEvents.start() // second start is a no-op — still one EventSource
    expect(FakeEventSource.instances).toHaveLength(1)
    expect(source().url).toBe("/api/events")

    source().emit("open")
    expect(liveEvents.status).toBe("connected")

    source().emit("error")
    expect(liveEvents.status).toBe("disconnected")
  })

  it("refetches everything after a reconnect (missed events are unrecoverable)", () => {
    source().emit("open")
    navigation.invalidateAll.mockClear() // clean-connect baseline

    source().emit("open")
    expect(navigation.invalidateAll).not.toHaveBeenCalled() // no error — no refetch

    source().emit("error")
    source().emit("open")
    expect(navigation.invalidateAll).toHaveBeenCalledTimes(1)
  })

  it("stop() closes the source and cancels pending invalidations", () => {
    source().emit("edge.detected", { edge_percentage: 0.03, selection: "LAL -3.5" })
    liveEvents.stop()
    expect(source().closed).toBe(true)
    expect(liveEvents.status).toBe("disconnected")
    vi.advanceTimersByTime(5_000)
    expect(navigation.invalidate).not.toHaveBeenCalled()
  })
})

describe("liveEvents invalidation routing", () => {
  it("debounces per-key invalidations from the static map", () => {
    const countBefore = liveEvents.eventCount // singleton — count accumulates
    source().emit("bet.graded", { result: "WIN", selection: "LAL -3.5" })
    source().emit("bet.graded", { result: "LOSS", selection: "BOS +3.5" })
    expect(liveEvents.eventCount).toBe(countBefore + 2)
    expect(navigation.invalidate).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1_500)
    // Coalesced: each key fires once despite two events.
    const keys = navigation.invalidate.mock.calls.map((call) => call[0] as string).sort()
    expect(keys).toEqual([...EVENT_INVALIDATIONS["bet.graded"]].sort())
  })

  it("adds app:live for live-flagged lines.updated payloads", () => {
    source().emit("lines.updated", { is_live: true })
    vi.advanceTimersByTime(1_500)
    const keys = navigation.invalidate.mock.calls.map((call) => call[0] as string)
    expect(keys).toContain("app:live")
    expect(keys).toContain("app:lines")
  })

  it("still routes when the payload is not valid JSON", () => {
    source().emit("game.completed", "not-json{")
    vi.advanceTimersByTime(1_500)
    const keys = navigation.invalidate.mock.calls.map((call) => call[0] as string).sort()
    expect(keys).toEqual([...EVENT_INVALIDATIONS["game.completed"]].sort())
    expect(toasts.items).toHaveLength(0) // no payload — no toast
  })
})

describe("liveEvents toasts", () => {
  it("announces a pregame edge with a fraction converted to points", () => {
    source().emit("edge.detected", {
      edge_percentage: 0.042,
      selection: "LAL -3.5",
      edge_id: "e-1"
    })
    expect(toasts.items).toHaveLength(1)
    expect(toasts.items[0].message).toBe("New edge: LAL -3.5 +4.2%")
    expect(toasts.items[0].href).toBe("/edges/e-1")
    expect(toasts.items[0].tone).toBe("success")
  })

  it("routes live edges to /live with a distinct label", () => {
    source().emit("edge.detected", { edge_percentage: 0.031, selection: "BOS ML", is_live: true })
    expect(toasts.items[0].message).toBe("Live edge: BOS ML +3.1%")
    expect(toasts.items[0].href).toBe("/live")
  })

  it("announces detected parlays with EV already in points", () => {
    source().emit("parlay.detected", { leg_count: 3, league: "NBA", ev_pct: 12.8 })
    expect(toasts.items[0].message).toBe("Parlay detected: 3-leg NBA +12.8% EV")
    expect(toasts.items[0].href).toBe("/parlay")
  })

  it("tones graded-bet toasts by result", () => {
    source().emit("bet.graded", { result: "WIN", selection: "LAL -3.5", bet_id: "b-1" })
    source().emit("bet.graded", { result: "LOSS", selection: "BOS +3.5" })
    source().emit("bet.graded", { result: "PUSH", selection: "Over 224.5" })
    expect(toasts.items.map((toast) => toast.tone)).toEqual(["success", "error", "info"])
    expect(toasts.items[0].href).toBe("/bets/b-1")
    expect(toasts.items[1].href).toBeUndefined()
  })
})
