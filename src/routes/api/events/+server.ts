import { bridgeConfigured, onBridgeEvent } from "$lib/server/event-bridge"

import type { RequestHandler } from "./$types"

const HEARTBEAT_MS = 25_000

/**
 * Live updates: Redis pub/sub bridged to the browser as SSE. Payloads are
 * forwarded verbatim (identifiers only); the client refetches via REST.
 */
export const GET: RequestHandler = () => {
  let counter = 0
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          cleanup?.()
        }
      }

      send(`event: hello\ndata: {"bridge": ${bridgeConfigured()}}\n\n`)
      const unsubscribe = onBridgeEvent((event, payload) => {
        counter += 1
        send(`id: ${counter}\nevent: ${event}\ndata: ${payload}\n\n`)
      })
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS)
      cleanup = () => {
        unsubscribe()
        clearInterval(heartbeat)
      }
    },
    cancel() {
      cleanup?.()
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive"
    }
  })
}
