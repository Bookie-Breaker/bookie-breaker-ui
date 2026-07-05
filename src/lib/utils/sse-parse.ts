/**
 * Incremental SSE frame parser for fetch-stream readers (EventSource
 * can't POST, so the chat reads response.body manually).
 */

export interface SseFrame {
  event: string
  data: string
}

export type SseParser = (chunk: string) => SseFrame[]

export function createSseParser(): SseParser {
  let buffer = ""
  return function push(chunk: string): SseFrame[] {
    buffer += chunk
    const frames: SseFrame[] = []
    let boundary = buffer.indexOf("\n\n")
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf("\n\n")
      if (!frame.trim() || frame.startsWith(":")) continue
      let event = "message"
      const dataLines: string[] = []
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim()
        else if (line.startsWith("data: ")) dataLines.push(line.slice(6))
        else if (line.startsWith("data:")) dataLines.push(line.slice(5))
      }
      frames.push({ event, data: dataLines.join("\n") })
    }
    return frames
  }
}
