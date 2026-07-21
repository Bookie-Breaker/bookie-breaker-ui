/**
 * The preferences store reads $app/environment at import time, so each
 * scenario re-imports a fresh module copy with the mock adjusted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const environment = vi.hoisted(() => ({ browser: false }))

vi.mock("$app/environment", () => environment)

function fakeLocalStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear()
  }
}

async function freshPreferences() {
  vi.resetModules()
  const module = await import("$lib/stores/preferences.svelte")
  return module.preferences
}

afterEach(() => {
  vi.unstubAllGlobals()
  environment.browser = false
})

describe("preferences (server)", () => {
  it("defaults to dark mode and no league without a browser", async () => {
    const preferences = await freshPreferences()
    expect(preferences.mode).toBe("dark")
    expect(preferences.league).toBe("")
  })

  it("toggles mode in memory without touching the DOM", async () => {
    const preferences = await freshPreferences()
    preferences.toggleMode()
    expect(preferences.mode).toBe("light")
    preferences.toggleMode()
    expect(preferences.mode).toBe("dark")
  })
})

describe("preferences (browser)", () => {
  beforeEach(() => {
    environment.browser = true
  })

  it("hydrates from localStorage and ignores junk values", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage({ "bb:mode": "light", "bb:league": "EPL" }))
    const preferences = await freshPreferences()
    expect(preferences.mode).toBe("light")
    expect(preferences.league).toBe("EPL")

    vi.stubGlobal("localStorage", fakeLocalStorage({ "bb:mode": "neon" }))
    const fallback = await freshPreferences()
    expect(fallback.mode).toBe("dark")
    expect(fallback.league).toBe("")
  })

  it("persists mode toggles to localStorage and the document dataset", async () => {
    const storage = fakeLocalStorage()
    vi.stubGlobal("localStorage", storage)
    const dataset: Record<string, string> = {}
    vi.stubGlobal("document", { documentElement: { dataset } })
    const preferences = await freshPreferences()

    preferences.toggleMode()
    expect(preferences.mode).toBe("light")
    expect(storage.getItem("bb:mode")).toBe("light")
    expect(dataset.mode).toBe("light")
  })

  it("persists the league filter", async () => {
    const storage = fakeLocalStorage()
    vi.stubGlobal("localStorage", storage)
    const preferences = await freshPreferences()
    preferences.setLeague("NBA")
    expect(preferences.league).toBe("NBA")
    expect(storage.getItem("bb:league")).toBe("NBA")
  })
})
