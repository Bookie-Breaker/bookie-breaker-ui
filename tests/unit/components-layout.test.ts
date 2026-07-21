/**
 * Layout chrome server-rendered against the singleton rune stores; each test
 * sets store state directly and asserts the resulting HTML.
 */
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("$app/state", () => ({
  page: { url: new URL("http://ui/edges?league=NBA") }
}))

import ChatToggle from "$lib/components/layout/ChatToggle.svelte"
import Header from "$lib/components/layout/Header.svelte"
import LiveStatusDot from "$lib/components/layout/LiveStatusDot.svelte"
import Nav from "$lib/components/layout/Nav.svelte"
import ThemeToggle from "$lib/components/layout/ThemeToggle.svelte"
import Toasts from "$lib/components/layout/Toasts.svelte"
import { chat } from "$lib/stores/chat.svelte"
import { liveEvents } from "$lib/stores/live-events.svelte"
import { preferences } from "$lib/stores/preferences.svelte"
import { toasts } from "$lib/stores/toasts.svelte"

describe("Nav", () => {
  it("marks the current section active and links every page", () => {
    const { body } = render(Nav, { props: {} })
    for (const href of [
      "/",
      "/edges",
      "/live",
      "/slate",
      "/lines",
      "/parlay",
      "/performance",
      "/bets"
    ]) {
      expect(body).toContain(`href="${href}"`)
    }
    // /edges matches the mocked URL; the compact live dot rides the Live entry.
    expect(body.match(/aria-current="page"/g)).toHaveLength(1)
    expect(body).toContain("Live updates:")
  })
})

describe("Header", () => {
  it("renders the brand link and theme toggle", () => {
    const { body } = render(Header, { props: {} })
    expect(body).toContain("BookieBreaker")
    expect(body).toContain("Toggle dark mode")
  })

  it("renders header children when provided", () => {
    const children = createRawSnippet(() => ({ render: () => "<span>extra-controls</span>" }))
    const { body } = render(Header, { props: { children } })
    expect(body).toContain("extra-controls")
  })
})

describe("ThemeToggle", () => {
  it("renders the toggle button in both modes", () => {
    // Lucide icons render identically in SSR, so assert the stable shell —
    // both branches still execute for the mode conditional.
    preferences.mode = "dark"
    expect(render(ThemeToggle, { props: {} }).body).toContain('aria-label="Toggle dark mode"')
    preferences.mode = "light"
    expect(render(ThemeToggle, { props: {} }).body).toContain('aria-label="Toggle dark mode"')
    preferences.mode = "dark"
  })
})

describe("ChatToggle", () => {
  it("highlights the button while the chat is open", () => {
    chat.open = false
    expect(render(ChatToggle, { props: {} }).body).toContain("hover:preset-tonal")
    chat.open = true
    expect(render(ChatToggle, { props: {} }).body).toContain("preset-filled-primary-500")
    chat.open = false
  })
})

describe("LiveStatusDot", () => {
  it("colors the dot by connection status", () => {
    liveEvents.status = "connected"
    expect(render(LiveStatusDot, { props: {} }).body).toContain("bg-success-500")
    liveEvents.status = "connecting"
    expect(render(LiveStatusDot, { props: {} }).body).toContain("bg-warning-500")
    liveEvents.status = "disconnected"
    expect(render(LiveStatusDot, { props: {} }).body).toContain("bg-error-500")
  })

  it("compact mode renders only the pulsing dot", () => {
    liveEvents.status = "connected"
    const compact = render(LiveStatusDot, { props: { compact: true } })
    expect(compact.body).toContain("animate-pulse")
    expect(compact.body).not.toContain("live<")
    liveEvents.status = "disconnected"
  })
})

describe("Toasts", () => {
  beforeEach(() => {
    toasts.items = []
  })

  it("renders queued toasts with tone classes and view links", () => {
    toasts.items = [
      { id: 1, message: "New edge: LAL -3.5 +4.2%", href: "/edges/e-1", tone: "success" },
      { id: 2, message: "Bet graded LOSS: BOS +3.5", tone: "error" },
      { id: 3, message: "heads up", tone: "info" }
    ]
    const { body } = render(Toasts, { props: {} })
    expect(body).toContain("New edge: LAL -3.5 +4.2%")
    expect(body).toContain('href="/edges/e-1"')
    expect(body).toContain("preset-filled-success-500")
    expect(body).toContain("preset-filled-error-500")
    expect(body).toContain("preset-filled-surface-100-900")
    expect(body.match(/aria-label="Dismiss"/g)).toHaveLength(3)
  })

  it("renders an empty aria-live region when there are no toasts", () => {
    const { body } = render(Toasts, { props: {} })
    expect(body).toContain('aria-live="polite"')
    expect(body).not.toContain("Dismiss")
  })
})
