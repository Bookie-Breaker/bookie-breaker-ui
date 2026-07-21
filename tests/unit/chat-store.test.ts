import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { chat } from "$lib/stores/chat.svelte"
import { pageContext } from "$lib/stores/page-context.svelte"

function sseResponse(frames: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(frames))
      controller.close()
    }
  })
  return new Response(stream, { headers: { "content-type": "text/event-stream" } })
}

function lastMessage() {
  return chat.messages.at(-1)!
}

beforeEach(() => {
  chat.messages = []
  chat.busy = false
  chat.open = false
  pageContext.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("chat store", () => {
  it("toggles the sidebar", () => {
    chat.toggle()
    expect(chat.open).toBe(true)
    chat.toggle()
    expect(chat.open).toBe(false)
  })

  it("ignores blank questions and re-entrant sends", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await chat.send("   ")
    expect(fetchMock).not.toHaveBeenCalled()

    chat.busy = true
    await chat.send("real question")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(chat.messages).toHaveLength(0)
  })

  it("streams chunk frames into the assistant message and finalizes on done", async () => {
    const frames =
      'event: chunk\ndata: {"text": "The over"}\n\n' +
      'event: chunk\ndata: {"text": " looks strong."}\n\n' +
      'event: done\ndata: {"data": {"id": "a-1", "content": "The over looks strong."}, "meta": {"cached": true}}\n\n'
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(frames)))

    await chat.send("Why the over?")

    expect(chat.messages).toHaveLength(2)
    expect(chat.messages[0]).toMatchObject({ role: "user", content: "Why the over?" })
    expect(lastMessage()).toMatchObject({
      role: "assistant",
      content: "The over looks strong.",
      analysisId: "a-1",
      cached: true,
      streaming: false
    })
    expect(chat.busy).toBe(false)
  })

  it("surfaces SSE error frames as an error message", async () => {
    const frames = 'event: error\ndata: {"message": "LLM budget exhausted"}\n\n'
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(frames)))

    await chat.send("hello")
    expect(lastMessage()).toMatchObject({
      role: "assistant",
      content: "LLM budget exhausted",
      error: true,
      streaming: false
    })
  })

  it("handles a JSON success fallback from older agents", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ data: { id: "a-2", content: "Degraded answer" }, meta: {} }),
            { headers: { "content-type": "application/json" } }
          )
        )
    )

    await chat.send("hello")
    expect(lastMessage()).toMatchObject({
      role: "assistant",
      content: "Degraded answer",
      analysisId: "a-2",
      streaming: false
    })
  })

  it("handles a JSON error fallback with its message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "DEPENDENCY_ERROR", message: "agent down" },
            meta: {}
          }),
          { status: 502, headers: { "content-type": "application/json" } }
        )
      )
    )

    await chat.send("hello")
    expect(lastMessage()).toMatchObject({ content: "agent down", error: true })
  })

  it("recovers from a network failure with a friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))

    await chat.send("hello")
    expect(lastMessage()).toMatchObject({ error: true, streaming: false })
    expect(lastMessage().content).toContain("unavailable")
    expect(chat.busy).toBe(false)
  })

  it("injects the page context into the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "a", content: "x" }, meta: {} }), {
        headers: { "content-type": "application/json" }
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    pageContext.set({ type: "edge", edgeId: "e-9", label: "LAL -3.5" })
    await chat.send("edge question")
    pageContext.set({ type: "game", gameId: "g-7", label: "LAL @ BOS" })
    await chat.send("game question")
    pageContext.set({ type: "performance" })
    await chat.send("perf question")

    const bodies = fetchMock.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>
    )
    expect(bodies[0]).toMatchObject({ analysis_type: "EDGE_BREAKDOWN", edge_id: "e-9" })
    expect(bodies[1]).toMatchObject({ analysis_type: "GAME_PREVIEW", game_id: "g-7" })
    expect(bodies[2]).toMatchObject({ analysis_type: "PERFORMANCE_REVIEW" })
  })

  it("truncates oversized questions to the 2000-char cap", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "a", content: "x" }, meta: {} }), {
        headers: { "content-type": "application/json" }
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await chat.send("q".repeat(2500))
    expect(chat.messages[0].content).toHaveLength(2000)
  })
})
