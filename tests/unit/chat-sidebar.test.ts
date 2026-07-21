/**
 * ChatSidebar server-rendered against the singleton chat/pageContext stores.
 */
import { render } from "svelte/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html } }))

import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte"
import { chat } from "$lib/stores/chat.svelte"
import { pageContext } from "$lib/stores/page-context.svelte"

beforeEach(() => {
  chat.open = true
  chat.busy = false
  chat.messages = []
  pageContext.clear()
})

describe("ChatSidebar", () => {
  it("renders nothing while closed", () => {
    chat.open = false
    expect(render(ChatSidebar, { props: {} }).body.trim()).not.toContain("<aside")
  })

  it("shows the onboarding hint when there are no messages", () => {
    const { body } = render(ChatSidebar, { props: {} })
    expect(body).toContain("Ask about the edge or game")
    expect(body).toContain("Asking about performance (default)")
  })

  it("labels the active page context", () => {
    pageContext.set({ type: "edge", edgeId: "e-1", label: "LAL -3.5" })
    expect(render(ChatSidebar, { props: {} }).body).toContain("Asking about edge: LAL -3.5")

    pageContext.set({ type: "game", gameId: "g-1", label: "BOS @ LAL" })
    expect(render(ChatSidebar, { props: {} }).body).toContain("Asking about game: BOS @ LAL")

    pageContext.set({ type: "performance" })
    const { body } = render(ChatSidebar, { props: {} })
    expect(body).toContain("Asking about performance")
    expect(body).not.toContain("(default)")
  })

  it("renders user and assistant messages with markdown and cached marker", () => {
    chat.messages = [
      { role: "user", content: "Why the over?" },
      { role: "assistant", content: "**Pace** is up.", analysisId: "a-1", cached: true }
    ]
    const { body } = render(ChatSidebar, { props: {} })
    expect(body).toContain("Why the over?")
    expect(body).toContain("<strong>Pace</strong>")
    expect(body).toContain("cached analysis")
  })

  it("shows the thinking indicator while streaming with no content yet", () => {
    chat.messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "", streaming: true }
    ]
    const { body } = render(ChatSidebar, { props: {} })
    expect(body).toContain("Thinking…")
  })

  it("appends a caret to a partially streamed answer", () => {
    chat.messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "The over", streaming: true }
    ]
    const { body } = render(ChatSidebar, { props: {} })
    expect(body).toContain("▌")
  })

  it("styles error replies and disables the input while busy", () => {
    chat.messages = [{ role: "assistant", content: "agent down", error: true }]
    chat.busy = true
    const { body } = render(ChatSidebar, { props: {} })
    expect(body).toContain("preset-tonal-error")
    expect(body).toContain("disabled")
  })
})
