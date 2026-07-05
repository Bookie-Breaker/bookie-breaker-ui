/**
 * Chat sidebar state: sends questions to /api/chat (the agent's streaming
 * analysis proxied through the server) and renders tokens as they arrive.
 * A JSON response (older agent, degraded mode) is handled transparently.
 */
import type { AnalysisData, AnalysisRequest, Envelope } from "$lib/api/envelope"
import { pageContext } from "$lib/stores/page-context.svelte"
import { createSseParser } from "$lib/utils/sse-parse"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  analysisId?: string
  cached?: boolean
  error?: boolean
  streaming?: boolean
}

const MAX_QUESTION_CHARS = 2000

function requestFor(question: string): AnalysisRequest {
  const context = pageContext.current
  if (context.type === "edge") {
    return { analysis_type: "EDGE_BREAKDOWN", edge_id: context.edgeId, question }
  }
  if (context.type === "game") {
    return { analysis_type: "GAME_PREVIEW", game_id: context.gameId, question }
  }
  return { analysis_type: "PERFORMANCE_REVIEW", question }
}

class Chat {
  open = $state(false)
  messages = $state<ChatMessage[]>([])
  busy = $state(false)

  toggle(): void {
    this.open = !this.open
  }

  #appendAssistant(update: Partial<ChatMessage>): void {
    const last = this.messages.at(-1)
    if (!last || last.role !== "assistant") return
    this.messages = [...this.messages.slice(0, -1), { ...last, ...update }]
  }

  #appendText(text: string): void {
    const last = this.messages.at(-1)
    if (!last || last.role !== "assistant") return
    this.messages = [...this.messages.slice(0, -1), { ...last, content: last.content + text }]
  }

  async send(question: string): Promise<void> {
    const trimmed = question.trim().slice(0, MAX_QUESTION_CHARS)
    if (!trimmed || this.busy) return
    this.busy = true
    this.messages = [
      ...this.messages,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", streaming: true }
    ]
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestFor(trimmed))
      })
      const contentType = response.headers.get("content-type") ?? ""
      if (contentType.includes("text/event-stream") && response.body) {
        await this.#consumeStream(response.body)
      } else {
        await this.#consumeJson(response)
      }
    } catch {
      this.#appendAssistant({
        content: "The analyst is unavailable right now — try again shortly.",
        error: true,
        streaming: false
      })
    } finally {
      this.#appendAssistant({ streaming: false })
      this.busy = false
    }
  }

  async #consumeStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    const parse = createSseParser()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const frame of parse(decoder.decode(value, { stream: true }))) {
        if (frame.event === "chunk") {
          const payload = JSON.parse(frame.data) as { text: string }
          this.#appendText(payload.text)
        } else if (frame.event === "done") {
          const payload = JSON.parse(frame.data) as {
            data: AnalysisData
            meta: { cached?: boolean }
          }
          this.#appendAssistant({
            content: payload.data.content,
            analysisId: payload.data.id,
            cached: payload.meta.cached ?? false,
            streaming: false
          })
        } else if (frame.event === "error") {
          const payload = JSON.parse(frame.data) as { message?: string }
          this.#appendAssistant({
            content: payload.message ?? "LLM analysis failed.",
            error: true,
            streaming: false
          })
        }
      }
    }
  }

  async #consumeJson(response: Response): Promise<void> {
    const parsed = (await response.json()) as Envelope<AnalysisData> & {
      error?: { message?: string }
    }
    if (!response.ok || parsed.error) {
      this.#appendAssistant({
        content: parsed.error?.message ?? "LLM analysis failed.",
        error: true,
        streaming: false
      })
      return
    }
    this.#appendAssistant({
      content: parsed.data.content,
      analysisId: parsed.data.id,
      streaming: false
    })
  }
}

export const chat = new Chat()
