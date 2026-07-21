import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pageContext } from "$lib/stores/page-context.svelte"
import { toasts } from "$lib/stores/toasts.svelte"

describe("toasts store", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toasts.items = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("queues a toast with an info tone by default", () => {
    toasts.add("hello")
    expect(toasts.items).toHaveLength(1)
    expect(toasts.items[0].message).toBe("hello")
    expect(toasts.items[0].tone).toBe("info")
    expect(toasts.items[0].href).toBeUndefined()
  })

  it("carries tone and href options and assigns unique ids", () => {
    toasts.add("won", { tone: "success", href: "/bets/b-1" })
    toasts.add("lost", { tone: "error" })
    expect(toasts.items[0].href).toBe("/bets/b-1")
    expect(toasts.items[0].tone).toBe("success")
    expect(toasts.items[1].tone).toBe("error")
    expect(toasts.items[0].id).not.toBe(toasts.items[1].id)
  })

  it("dismisses only the requested toast", () => {
    toasts.add("first")
    toasts.add("second")
    toasts.dismiss(toasts.items[0].id)
    expect(toasts.items).toHaveLength(1)
    expect(toasts.items[0].message).toBe("second")
  })

  it("auto-dismisses after the timeout", () => {
    toasts.add("temporary")
    vi.advanceTimersByTime(5_999)
    expect(toasts.items).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.items).toHaveLength(0)
  })
})

describe("pageContext store", () => {
  it("defaults to none and round-trips set/clear", () => {
    pageContext.clear()
    expect(pageContext.current).toEqual({ type: "none" })
    pageContext.set({ type: "edge", edgeId: "e-1", label: "LAL -3.5" })
    expect(pageContext.current).toEqual({ type: "edge", edgeId: "e-1", label: "LAL -3.5" })
    pageContext.clear()
    expect(pageContext.current).toEqual({ type: "none" })
  })
})
